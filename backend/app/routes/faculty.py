from fastapi import APIRouter, Depends, HTTPException, status
from app.db.tenant import get_current_user, get_tenant_id, RoleChecker
from app.db.connection import db
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, timezone
from bson import ObjectId
from app.services.security import hash_password

router = APIRouter()

async def get_faculty_department_id(user_id: str) -> str:
    faculty = await db.db.users.find_one({"_id": ObjectId(user_id)})
    if not faculty or "class_id" not in faculty:
        raise HTTPException(status_code=400, detail="Faculty has no class assigned.")
    cls_doc = await db.db.classes.find_one({"_id": ObjectId(faculty["class_id"])})
    if not cls_doc or "department_id" not in cls_doc:
        raise HTTPException(status_code=400, detail="Faculty class has no department.")
    return str(cls_doc["department_id"])


class FacultyStudentUpdatePayload(BaseModel):
    name: Optional[str] = None
    roll_number: Optional[str] = None
    dob: Optional[str] = None
    gender: Optional[str] = None
    mobile: Optional[str] = None
    institute_email: Optional[str] = None
    personal_email: Optional[str] = None
    cgpa: Optional[float] = None
    active_backlogs: Optional[int] = None
    total_backlogs: Optional[int] = None
    skills: Optional[List[str]] = None
    projects: Optional[List[str]] = None
    resume_url: Optional[str] = None
    photo_url: Optional[str] = None

class FacultyRegisterPayload(BaseModel):

    name: str
    email: EmailStr
    password: str
    phone: Optional[str] = None
    class_id: str

# TPO registers a Faculty Coordinator
@router.post("/register", status_code=status.HTTP_201_CREATED, dependencies=[Depends(RoleChecker(["TPO"]))])
async def register_faculty(payload: FacultyRegisterPayload, institution_id: str = Depends(get_tenant_id)):
    # Verify class exists under this institution
    cls = await db.db.classes.find_one({"_id": ObjectId(payload.class_id), "institution_id": institution_id})
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found under this institution.")
        
    # Check if email is already taken
    email_check = payload.email.strip().lower()
    existing_user = await db.db.users.find_one({"email": email_check})
    if existing_user:
        raise HTTPException(status_code=400, detail="User with this email already exists.")
        
    # Create faculty user
    faculty_doc = {
        "name": payload.name.strip(),
        "email": email_check,
        "password_hash": hash_password(payload.password),
        "phone": payload.phone.strip() if payload.phone else None,
        "role": "Faculty",
        "class_id": payload.class_id,
        "institution_id": institution_id,
        "created_at": datetime.now(timezone.utc)
    }
    
    res = await db.db.users.insert_one(faculty_doc)
    return {"message": "Faculty Coordinator registered successfully.", "faculty_id": str(res.inserted_id)}

# Faculty Coordinator gets pending reviews for their class
@router.get("/reviews/pending", dependencies=[Depends(RoleChecker(["Faculty"]))])
async def get_pending_reviews(
    current_user: dict = Depends(get_current_user),
    institution_id: str = Depends(get_tenant_id)
):
    # Get active faculty details to find their assigned class
    faculty = await db.db.users.find_one({"_id": ObjectId(current_user["user_id"])})
    if not faculty or "class_id" not in faculty:
        raise HTTPException(status_code=400, detail="Faculty has no class assigned.")
        
    # Fetch department for the faculty's class
    cls_doc = await db.db.classes.find_one({"_id": ObjectId(faculty["class_id"])})
    if not cls_doc or "department_id" not in cls_doc:
        raise HTTPException(status_code=400, detail="Faculty class has no department.")
    department_id = str(cls_doc["department_id"])
    
    # 1. Fetch pending registrations (GForm submissions) for the department
    submissions_cursor = db.db.student_pending_submissions.find({
        "institution_id": institution_id,
        "department_id": department_id,
        "status": "pending"
    }).sort("roll_number", 1)
    submissions = await submissions_cursor.to_list(length=10000)
    for sub in submissions:
        sub["id"] = str(sub["_id"])
        del sub["_id"]
        
    # 2. Fetch pending profile updates for the department
    updates_cursor = db.db.student_pending_updates.find({
        "institution_id": institution_id,
        "department_id": department_id,
        "status": "pending"
    })
    updates = await updates_cursor.to_list(length=10000)
    for upd in updates:
        upd["id"] = str(upd["_id"])
        del upd["_id"]
        
    return {
        "department_id": department_id,
        "submissions": submissions,
        "updates": updates
    }

# Approve student registration submission
@router.post("/reviews/submissions/{submission_id}/approve", dependencies=[Depends(RoleChecker(["Faculty"]))])
async def approve_submission(
    submission_id: str,
    current_user: dict = Depends(get_current_user),
    institution_id: str = Depends(get_tenant_id)
):
    # Fetch pending submission
    submission = await db.db.student_pending_submissions.find_one({
        "_id": ObjectId(submission_id),
        "institution_id": institution_id
    })
    if not submission:
        raise HTTPException(status_code=404, detail="Pending submission not found.")
        
    # Verify faculty owns this class review
    department_id = await get_faculty_department_id(current_user["user_id"])
    if submission.get("department_id") != department_id:
        raise HTTPException(status_code=403, detail="Not authorized to approve reviews outside your assigned department.")
        
    # 1. Write to permanent students collection
    student_doc = {
        "_id": ObjectId(submission_id),  # Retain same ObjectId
        "institution_id": institution_id,
        "program_id": submission["program_id"],
        "department_id": submission["department_id"],
        "class_id": submission["class_id"],
        "name": submission["name"],
        "roll_number": submission["roll_number"],
        "dob": submission.get("dob"),
        "gender": submission.get("gender"),
        "mobile": submission.get("mobile"),
        "emails": {
            "institute": submission.get("institute_email"),
            "personal": submission.get("personal_email")
        },
        "program_name": submission.get("program_name"),
        "department_name": submission.get("department_name"),
        "class_name": submission.get("class_name"),
        "cgpa": submission.get("cgpa", 0.0),
        "active_backlogs": submission.get("active_backlogs", 0),
        "total_backlogs": submission.get("total_backlogs", 0),
        "education": submission.get("education", []),
        "skills": submission.get("skills", []),
        "projects": submission.get("projects", []),
        "resume_url": submission.get("resume_url"),
        "photo_url": submission.get("photo_url"),
        "extra_data": submission.get("extra_data", {}),
        "status": "verified",
        "verified_at": datetime.now(timezone.utc),
        "verified_by": current_user["user_id"]
    }
    
    await db.db.students.insert_one(student_doc)
    
    # 3. Delete from pending submissions
    await db.db.student_pending_submissions.delete_one({"_id": ObjectId(submission_id)})
    
    # 4. Audit Log
    await db.db.audit_logs.insert_one({
        "action": "student_registration_approved",
        "institution_id": institution_id,
        "email": current_user["email"],
        "user_id": current_user["user_id"],
        "role": "Faculty",
        "student_id": submission_id,
        "timestamp": datetime.now(timezone.utc),
        "status": "success"
    })
    
    return {"message": "Student registration approved and student account created."}

# Edit student registration submission before approval
@router.put("/reviews/submissions/{submission_id}", dependencies=[Depends(RoleChecker(["Faculty"]))])
async def edit_pending_submission(
    submission_id: str,
    payload: FacultyStudentUpdatePayload,
    current_user: dict = Depends(get_current_user),
    institution_id: str = Depends(get_tenant_id)
):
    submission = await db.db.student_pending_submissions.find_one({
        "_id": ObjectId(submission_id),
        "institution_id": institution_id
    })
    if not submission:
        raise HTTPException(status_code=404, detail="Pending submission not found.")
        
    department_id = await get_faculty_department_id(current_user["user_id"])
    if submission.get("department_id") != department_id:
        raise HTTPException(status_code=403, detail="Not authorized to review this department.")
        
    update_data = {k: v for k, v in payload.dict(exclude_unset=True).items() if v is not None}
    
    if update_data:
        await db.db.student_pending_submissions.update_one(
            {"_id": ObjectId(submission_id)},
            {"$set": update_data}
        )
    
    return {"message": "Pending submission updated successfully."}

# Reject student registration submission
@router.post("/reviews/submissions/{submission_id}/reject", dependencies=[Depends(RoleChecker(["Faculty"]))])
async def reject_submission(
    submission_id: str,
    feedback: str = "Details could not be verified.",
    current_user: dict = Depends(get_current_user),
    institution_id: str = Depends(get_tenant_id)
):
    submission = await db.db.student_pending_submissions.find_one({
        "_id": ObjectId(submission_id),
        "institution_id": institution_id
    })
    if not submission:
        raise HTTPException(status_code=404, detail="Pending submission not found.")
        
    department_id = await get_faculty_department_id(current_user["user_id"])
    if submission.get("department_id") != department_id:
        raise HTTPException(status_code=403, detail="Not authorized to review this department.")
        
    # Mark as rejected
    await db.db.student_pending_submissions.update_one(
        {"_id": ObjectId(submission_id)},
        {"$set": {"status": "rejected", "rejection_reason": feedback}}
    )
    
    # Log Audit
    await db.db.audit_logs.insert_one({
        "action": "student_registration_rejected",
        "institution_id": institution_id,
        "email": current_user["email"],
        "user_id": current_user["user_id"],
        "role": "Faculty",
        "student_id": submission_id,
        "feedback": feedback,
        "timestamp": datetime.now(timezone.utc),
        "status": "success"
    })
    
    return {"message": "Student registration rejected."}

# Approve student profile edits
@router.post("/reviews/updates/{update_id}/approve", dependencies=[Depends(RoleChecker(["Faculty"]))])
async def approve_update(
    update_id: str,
    current_user: dict = Depends(get_current_user),
    institution_id: str = Depends(get_tenant_id)
):
    update = await db.db.student_pending_updates.find_one({
        "_id": ObjectId(update_id),
        "institution_id": institution_id
    })
    if not update:
        raise HTTPException(status_code=404, detail="Update request not found.")
        
    department_id = await get_faculty_department_id(current_user["user_id"])
    if update.get("department_id") != department_id:
        raise HTTPException(status_code=403, detail="Not authorized to review this department.")
        
    # 1. Apply edits to permanent student profile
    student_id = update["student_id"]
    await db.db.students.update_one(
        {"_id": ObjectId(student_id), "institution_id": institution_id},
        {"$set": update["requested_changes"]}
    )
    
    # 2. Delete update request
    await db.db.student_pending_updates.delete_one({"_id": ObjectId(update_id)})
    
    # 3. Log Audit
    await db.db.audit_logs.insert_one({
        "action": "student_profile_update_approved",
        "institution_id": institution_id,
        "email": current_user["email"],
        "user_id": current_user["user_id"],
        "role": "Faculty",
        "student_id": student_id,
        "timestamp": datetime.now(timezone.utc),
        "status": "success"
    })
    
    return {"message": "Student profile updates applied successfully."}

# Reject student profile updates
@router.post("/reviews/updates/{update_id}/reject", dependencies=[Depends(RoleChecker(["Faculty"]))])
async def reject_update(
    update_id: str,
    current_user: dict = Depends(get_current_user),
    institution_id: str = Depends(get_tenant_id)
):
    update = await db.db.student_pending_updates.find_one({
        "_id": ObjectId(update_id),
        "institution_id": institution_id
    })
    if not update:
        raise HTTPException(status_code=404, detail="Update request not found.")
        
    department_id = await get_faculty_department_id(current_user["user_id"])
    if update.get("department_id") != department_id:
        raise HTTPException(status_code=403, detail="Not authorized to review this department.")
        
    # Delete update request
    await db.db.student_pending_updates.delete_one({"_id": ObjectId(update_id)})
    
    # Log Audit
    await db.db.audit_logs.insert_one({
        "action": "student_profile_update_rejected",
        "institution_id": institution_id,
        "email": current_user["email"],
        "user_id": current_user["user_id"],
        "role": "Faculty",
        "student_id": update["student_id"],
        "timestamp": datetime.now(timezone.utc),
        "status": "success"
    })
    
    return {"message": "Student profile updates rejected."}

# Faculty Coordinator gets enrolled students for their class
@router.get("/students", dependencies=[Depends(RoleChecker(["Faculty"]))])
async def get_students(
    current_user: dict = Depends(get_current_user),
    institution_id: str = Depends(get_tenant_id)
):
    department_id = await get_faculty_department_id(current_user["user_id"])
    
    # Fetch students in this department — return ALL fields including extra_data
    students_cursor = db.db.students.find({
        "institution_id": institution_id,
        "department_id": department_id
    })
    
    students = await students_cursor.to_list(length=10000)
    for std in students:
        std["id"] = str(std["_id"])
        del std["_id"]
        # Explicitly fetching password_plain for faculty transparency requirement
        if "password_plain" not in std:
            std["password_plain"] = "Not Set"
        if "password_hash" in std:
            del std["password_hash"]
        
    return {"department_id": department_id, "students": students}

# Faculty edits student directly
@router.put("/students/{student_id}", dependencies=[Depends(RoleChecker(["Faculty"]))])
async def update_student_by_faculty(
    student_id: str,
    payload: FacultyStudentUpdatePayload,
    current_user: dict = Depends(get_current_user),
    institution_id: str = Depends(get_tenant_id)
):
    faculty = await db.db.users.find_one({"_id": ObjectId(current_user["user_id"])})
    if not faculty or "class_id" not in faculty:
        raise HTTPException(status_code=400, detail="Faculty has no class assigned.")
        
    student = await db.db.students.find_one({"_id": ObjectId(student_id), "institution_id": institution_id})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")
        
    if student.get("class_id") != faculty["class_id"]:
        raise HTTPException(status_code=403, detail="Not authorized to edit this student.")

    update_data = {k: v for k, v in payload.dict(exclude_unset=True).items() if v is not None}
    
    if "institute_email" in update_data or "personal_email" in update_data:
        emails = student.get("emails", {})
        if "institute_email" in update_data:
            emails["institute"] = update_data.pop("institute_email")
        if "personal_email" in update_data:
            emails["personal"] = update_data.pop("personal_email")
        update_data["emails"] = emails

    if not update_data:
        return {"message": "No fields to update."}
        
    await db.db.students.update_one(
        {"_id": ObjectId(student_id)},
        {"$set": update_data}
    )
    
    await db.db.audit_logs.insert_one({
        "action": "faculty_edited_student",
        "institution_id": institution_id,
        "email": current_user["email"],
        "user_id": current_user["user_id"],
        "role": "Faculty",
        "student_id": student_id,
        "timestamp": datetime.now(timezone.utc),
        "status": "success"
    })
    
    return {"message": "Student updated successfully."}
