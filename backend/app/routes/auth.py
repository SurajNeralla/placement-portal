from fastapi import APIRouter, HTTPException, status, Request, Depends
from pydantic import BaseModel
from app.models.schemas import OTPRequest, OTPVerify, TokenResponse, LoginRequest, SetPasswordRequest
from app.db.connection import db
from app.services.security import generate_otp, create_access_token, verify_password, hash_password
from app.services.email import send_otp_email
from app.db.tenant import get_current_user
from slowapi import Limiter
from slowapi.util import get_remote_address
from datetime import datetime, timezone, timedelta
import logging

limiter = Limiter(key_func=get_remote_address)

router = APIRouter()
logger = logging.getLogger("app.routes.auth")

class StudentRegistrationPayload(BaseModel):
    name: str
    roll_number: str
    institute_email: str
    mobile: str
    department_id: str
    class_id: str
    institution_id: str

@router.post("/register-student")
@limiter.limit("5/minute")
async def register_student(request: Request, payload: StudentRegistrationPayload):
    email = payload.institute_email.strip().lower()
    if not email.endswith("@gvpcdpgc.edu.in"):
        raise HTTPException(status_code=400, detail="Only @gvpcdpgc.edu.in domain emails are allowed.")
        
    # Check if they are already in students
    existing_student = await db.db.students.find_one({"emails.institute": email})
    if existing_student:
        raise HTTPException(status_code=400, detail="Student with this email is already registered.")
        
    # Check if they are already pending
    existing_pending = await db.db.student_pending_submissions.find_one({"institute_email": email})
    if existing_pending:
        raise HTTPException(status_code=400, detail="Registration already submitted and pending approval.")
        
    from bson import ObjectId
    # Validate class
    class_doc = await db.db.classes.find_one({"_id": ObjectId(payload.class_id), "department_id": payload.department_id})
    if not class_doc:
        raise HTTPException(status_code=400, detail="Invalid class or department selection.")
        
    dept_doc = await db.db.departments.find_one({"_id": ObjectId(payload.department_id)})
    prog_doc = await db.db.programs.find_one({"_id": ObjectId(class_doc.get("program_id"))})
        
    submission_doc = {
        "name": payload.name.strip(),
        "roll_number": payload.roll_number.strip().upper(),
        "institute_email": email,
        "personal_email": "",
        "mobile": payload.mobile.strip(),
        "class_id": payload.class_id,
        "class_name": class_doc.get("class_name"),
        "department_id": payload.department_id,
        "department_name": dept_doc.get("department_name") if dept_doc else "Unknown",
        "program_id": str(class_doc.get("program_id")),
        "program_name": prog_doc.get("program_name") if prog_doc else "Unknown",
        "institution_id": payload.institution_id,
        "status": "pending",
        "created_at": datetime.now(timezone.utc),
        "source": "self_registration",
        "cgpa": 0,
        "active_backlogs": 0,
        "total_backlogs": 0,
        "extra_data": {
            "Father Name": "",
            "Mother Name": "",
            "Date of birth": "",
            "Gender": "",
            "Aadhar number": "",
            "Parent Mobile Number": "",
            "Religion": "",
            "Caste": "",
            "Category": "",
            "State": "",
            "District": "",
            "Mandal": "",
            "Village": "",
            "Pincode": "",
            "10th Board": "",
            "10th school name": "",
            "10th CGPA/percentage": "",
            "10th Year of passing": "",
            "12th Board": "",
            "12th College name": "",
            "12th CGPA/percentage": "",
            "12th Year of passing": "",
            "Diploma/Degree": "",
            "Diploma/Degree College Name": "",
            "Diploma/Degree Branch": "",
            "Diploma/Degree CGPA/Percentage": "",
            "Diploma/Degree Year of Passing": "",
            "Current B.Tech Branch": "",
            "Are you a hostler/Day Scholar": "",
            "B.Tech College Name": "",
            "Address": "",
            "Any special skills": ""
        }
    }
    
    await db.db.student_pending_submissions.insert_one(submission_doc)
    return {"message": "Registration submitted successfully. Please wait for faculty approval."}


@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
async def login(request: Request, payload: LoginRequest):
    email = payload.email.strip().lower()
    
    # 1. Search in users collection (Staff)
    user = await db.db.users.find_one({"email": email})
    
    user_id = None
    role = None
    institution_id = None
    name = None
    password_hash = None
    
    if user:
        user_id = str(user["_id"])
        role = user.get("role")
        institution_id = user.get("institution_id")
        name = user.get("name")
        password_hash = user.get("password_hash")
    else:
        # 2. Search in students collection (matching ONLY domain/institute email)
        student = await db.db.students.find_one({
            "emails.institute": email
        })
        
        if student:
            user_id = str(student["_id"])
            role = "Student"
            institution_id = student.get("institution_id")
            name = student.get("name")
            password_hash = student.get("password_hash")
        else:
            # Check if they are pending approval
            pending = await db.db.student_pending_submissions.find_one({
                "$or": [
                    {"institute_email": email},
                    {"personal_email": email}
                ]
            })
            if pending:
                raise HTTPException(status_code=403, detail="Your registration is still pending faculty approval.")
            
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid email or password.")
        
    if not password_hash:
        raise HTTPException(status_code=401, detail="Password not set. Please login with OTP first.")
        
    if not verify_password(payload.password, password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
        
    # Issue JWT
    token_data = {
        "user_id": user_id,
        "email": email,
        "role": role,
        "institution_id": institution_id,
        "name": name
    }
    
    access_token = create_access_token(token_data, remember_me=payload.remember_me)
    
    await db.db.audit_logs.insert_one({
        "action": "password_login",
        "email": email,
        "user_id": user_id,
        "role": role,
        "institution_id": institution_id,
        "timestamp": datetime.now(timezone.utc),
        "status": "success"
    })
    
    return TokenResponse(
        access_token=access_token,
        role=role,
        institution_id=institution_id,
        user_id=user_id,
        user_name=name
    )

@router.post("/set-password")
async def set_password(
    payload: SetPasswordRequest,
    current_user: dict = Depends(get_current_user)
):
    user_id = current_user["user_id"]
    role = current_user["role"]
    hashed_password = hash_password(payload.password)
    
    if role == "Student":
        from bson import ObjectId
        # Storing plain text password ONLY because of explicit business requirement from user
        # "student can set his own password which is visible for the faculty"
        await db.db.students.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"password_hash": hashed_password, "password_plain": payload.password}}
        )
    else:
        from bson import ObjectId
        await db.db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"password_hash": hashed_password}}
        )
        
    return {"message": "Password updated successfully."}

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

@router.put("/change-password")
async def change_password(
    payload: ChangePasswordRequest,
    current_user: dict = Depends(get_current_user)
):
    user_id = current_user["user_id"]
    role = current_user["role"]
    from bson import ObjectId

    # Get current user record to verify password
    if role == "Student":
        user_record = await db.db.students.find_one({"_id": ObjectId(user_id)})
    else:
        user_record = await db.db.users.find_one({"_id": ObjectId(user_id)})

    if not user_record:
        raise HTTPException(status_code=404, detail="User not found.")

    if not verify_password(payload.current_password, user_record.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Incorrect current password.")

    hashed_password = hash_password(payload.new_password)

    if role == "Student":
        await db.db.students.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"password_hash": hashed_password, "password_plain": payload.new_password}}
        )
    else:
        await db.db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"password_hash": hashed_password}}
        )

    return {"message": "Password changed successfully."}

@router.post("/otp/request")
@limiter.limit("5/minute")
async def request_otp(request: Request, payload: OTPRequest):
    email = payload.email.strip().lower()
    
    # 1. Search in users collection (Dean, TPO, Faculty)
    user = await db.db.users.find_one({"email": email})
    
    user_id = None
    role = None
    institution_id = None
    name = None
    
    if user:
        user_id = str(user["_id"])
        role = user.get("role")
        institution_id = user.get("institution_id")
        name = user.get("name")
    else:
        # 2. Search in students collection (matching domain mail ONLY)
        student = await db.db.students.find_one({
            "emails.institute": email
        })
        
        if student:
            user_id = str(student["_id"])
            role = "Student"
            institution_id = student.get("institution_id")
            name = student.get("name")
        else:
            # Check if they are pending approval
            pending = await db.db.student_pending_submissions.find_one({
                "$or": [
                    {"institute_email": email},
                    {"personal_email": email}
                ]
            })
            if pending:
                raise HTTPException(status_code=403, detail="Your registration is still pending faculty approval.")
            
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email address not registered in PlacementHub."
        )
        
    # Generate OTP
    otp = generate_otp()
    
    # Expiration time
    expiry = datetime.now(timezone.utc) + timedelta(minutes=5)
    
    # Remove existing sessions for this email
    await db.db.otp_sessions.delete_many({"email": email})
    
    # Save OTP session
    await db.db.otp_sessions.insert_one({
        "email": email,
        "otp": otp,
        "user_id": user_id,
        "role": role,
        "institution_id": institution_id,
        "name": name,
        "created_at": datetime.now(timezone.utc),
        "expires_at": expiry
    })
    
    # Send OTP via email (falls back to console if SMTP not configured)
    await send_otp_email(email=email, name=name or email, otp=otp, role=role)
    
    return {"message": "OTP sent successfully to registered email."}

@router.post("/otp/verify", response_model=TokenResponse)
async def verify_otp(payload: OTPVerify):
    email = payload.email.strip().lower()
    otp = payload.otp.strip()
    
    # Find active session
    session = await db.db.otp_sessions.find_one({"email": email})
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active login session found. Request a new OTP."
        )
        
    # Check expiration
    now = datetime.now(timezone.utc)
    expires_at = session["expires_at"]
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
        
    if now > expires_at:
        await db.db.otp_sessions.delete_one({"_id": session["_id"]})
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OTP has expired. Please request a new OTP."
        )
        
    # Check OTP code
    if session["otp"] != otp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OTP. Please try again."
        )
        
    # Successful authentication! Delete session
    await db.db.otp_sessions.delete_one({"_id": session["_id"]})
    
    # Issue JWT
    token_data = {
        "user_id": session["user_id"],
        "email": session["email"],
        "role": session["role"],
        "institution_id": session["institution_id"],
        "name": session["name"]
    }
    
    access_token = create_access_token(token_data)
    
    # Log audit entry
    await db.db.audit_logs.insert_one({
        "action": "login",
        "email": email,
        "user_id": session["user_id"],
        "role": session["role"],
        "institution_id": session["institution_id"],
        "timestamp": datetime.now(timezone.utc),
        "status": "success"
    })
    
    # Check if user needs to set password
    from bson import ObjectId
    requires_password_setup = False
    if session["role"] == "Student":
        user_doc = await db.db.students.find_one({"_id": ObjectId(session["user_id"])})
    else:
        user_doc = await db.db.users.find_one({"_id": ObjectId(session["user_id"])})
        
    if user_doc and not user_doc.get("password_hash"):
        requires_password_setup = True
        
    return TokenResponse(
        access_token=access_token,
        role=session["role"],
        institution_id=session["institution_id"],
        user_id=session["user_id"],
        user_name=session["name"],
        requires_password_setup=requires_password_setup
    )

@router.get("/otp/debug/{email}")
async def get_otp_debug(email: str):
    email = email.strip().lower()
    session = await db.db.otp_sessions.find_one({"email": email})
    if not session:
        raise HTTPException(status_code=404, detail="No OTP session found.")
    return {"otp": session["otp"]}
