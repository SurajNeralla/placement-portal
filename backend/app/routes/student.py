from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from app.db.tenant import get_current_user, get_tenant_id, RoleChecker
from app.db.connection import db
from app.models.schemas import OTPRequest  # reuse email schema or direct pydantic
from pydantic import BaseModel, EmailStr
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
from bson import ObjectId
import pandas as pd
import io
import math

router = APIRouter()

# Webhook payload representation
class GFormWebhookPayload(BaseModel):
    name: str
    roll_number: str
    dob: str
    gender: str
    mobile: str
    personal_email: EmailStr
    institute_email: EmailStr
    program_name: str
    department_name: str
    class_name: str
    cgpa: float
    active_backlogs: int
    total_backlogs: int
    tenth_board: str
    tenth_marks: Optional[float] = None
    tenth_percentage: Optional[float] = None
    twelfth_board: Optional[str] = None
    twelfth_marks: Optional[float] = None
    twelfth_percentage: Optional[float] = None
    diploma_board: Optional[str] = None
    diploma_marks: Optional[float] = None
    diploma_percentage: Optional[float] = None
    skills: List[str] = []
    projects: List[str] = []
    resume_url: Optional[str] = None
    photo_url: Optional[str] = None

    class Config:
        extra = "allow"

class StudentUpdatePayload(BaseModel):
    mobile: Optional[str] = None
    cgpa: Optional[float] = None
    active_backlogs: Optional[int] = None
    total_backlogs: Optional[int] = None
    skills: Optional[List[str]] = None
    projects: Optional[List[str]] = None
    resume_url: Optional[str] = None
    photo_url: Optional[str] = None
    dob: Optional[str] = None
    gender: Optional[str] = None
    institute_email: Optional[EmailStr] = None
    personal_email: Optional[EmailStr] = None

def standardize_score(board: str, marks: Optional[float], percentage: Optional[float]):
    cgpa = None
    pct = None
    board_upper = (board or "").upper()
    
    if percentage and percentage > 10:
        pct = percentage
        cgpa = percentage / 9.5 if "CBSE" in board_upper else percentage / 10.0
    elif marks and marks <= 10:
        cgpa = marks
        pct = marks * 9.5 if "CBSE" in board_upper else marks * 10.0
    elif marks and marks > 10:
        pct = percentage if percentage else (marks if marks <= 100 else (marks/500)*100)
        cgpa = pct / 9.5 if "CBSE" in board_upper else pct / 10.0
        
    return cgpa, pct

# Public Google Form webhook endpoint (multi-tenant isolated by path)
@router.post("/webhook/gform/{institution_id}")
async def gform_webhook(institution_id: str, payload: GFormWebhookPayload):
    # Verify institution exists
    inst = await db.db.institutions.find_one({"_id": ObjectId(institution_id)})
    if not inst:
        raise HTTPException(status_code=404, detail="Institution not found")
        
    # Resolve hierarchy IDs
    program = await db.db.programs.find_one({
        "institution_id": institution_id,
        "program_name": payload.program_name.strip()
    })
    if not program:
        raise HTTPException(status_code=400, detail=f"Program '{payload.program_name}' not found under this institution.")
        
    program_id = str(program["_id"])
    
    department = await db.db.departments.find_one({
        "institution_id": institution_id,
        "program_id": program_id,
        "department_name": payload.department_name.strip()
    })
    if not department:
        raise HTTPException(status_code=400, detail=f"Department '{payload.department_name}' not found under program.")
        
    department_id = str(department["_id"])
    
    cls = await db.db.classes.find_one({
        "institution_id": institution_id,
        "department_id": department_id,
        "class_name": payload.class_name.strip()
    })
    if not cls:
        raise HTTPException(status_code=400, detail=f"Class '{payload.class_name}' not found under department.")
        
    class_id = str(cls["_id"])
    
    # Check if student is already in temporary submissions or permanent collection
    email_check = payload.institute_email.strip().lower()
    existing_pending = await db.db.student_pending_submissions.find_one({
        "institution_id": institution_id,
        "institute_email": email_check
    })
    if existing_pending:
        return {"message": "Student registration is already pending verification."}
        
    existing_permanent = await db.db.students.find_one({
        "institution_id": institution_id,
        "emails.institute": email_check
    })
    if existing_permanent:
        raise HTTPException(status_code=400, detail="Student is already registered in the permanent database.")

    # Calculate standardized scores
    t_cgpa, t_pct = standardize_score(payload.tenth_board, payload.tenth_marks, payload.tenth_percentage)
    
    tw_cgpa, tw_pct = None, None
    if payload.twelfth_board:
        tw_cgpa, tw_pct = standardize_score(payload.twelfth_board, payload.twelfth_marks, payload.twelfth_percentage)
        
    d_cgpa, d_pct = None, None
    if payload.diploma_board:
        d_cgpa, d_pct = standardize_score(payload.diploma_board, payload.diploma_marks, payload.diploma_percentage)

    extra_fields = payload.dict(exclude_unset=True)
    # Remove standard fields to isolate dynamic ones
    for key in GFormWebhookPayload.__fields__.keys():
        extra_fields.pop(key, None)

    # Save to temporary submissions database
    submission = {
        "institution_id": institution_id,
        "program_id": program_id,
        "department_id": department_id,
        "class_id": class_id,
        "name": payload.name.strip(),
        "roll_number": payload.roll_number.strip(),
        "dob": payload.dob,
        "gender": payload.gender,
        "mobile": payload.mobile.strip(),
        "personal_email": payload.personal_email.strip().lower(),
        "institute_email": email_check,
        "program_name": payload.program_name,
        "department_name": payload.department_name,
        "class_name": payload.class_name,
        "cgpa": payload.cgpa,
        "active_backlogs": payload.active_backlogs,
        "total_backlogs": payload.total_backlogs,
        "education": {
            "tenth": {
                "board": payload.tenth_board,
                "marks": payload.tenth_marks,
                "percentage": payload.tenth_percentage,
                "std_cgpa": t_cgpa,
                "std_percentage": t_pct
            },
            "twelfth": {
                "board": payload.twelfth_board,
                "marks": payload.twelfth_marks,
                "percentage": payload.twelfth_percentage,
                "std_cgpa": tw_cgpa,
                "std_percentage": tw_pct
            } if payload.twelfth_board else None,
            "diploma": {
                "board": payload.diploma_board,
                "marks": payload.diploma_marks,
                "percentage": payload.diploma_percentage,
                "std_cgpa": d_cgpa,
                "std_percentage": d_pct
            } if payload.diploma_board else None,
        },
        "skills": payload.skills,
        "projects": payload.projects,
        "resume_url": payload.resume_url,
        "photo_url": payload.photo_url,
        "extra_data": extra_fields,
        "status": "pending",
        "submitted_at": datetime.now(timezone.utc)
    }
    
    await db.db.student_pending_submissions.insert_one(submission)
    return {"message": "Google Form submission received and queued for Faculty approval."}

# Student profile endpoint
@router.get("/profile")
async def get_student_profile(
    current_user: dict = Depends(get_current_user),
    institution_id: str = Depends(get_tenant_id)
):
    student = await db.db.students.find_one({
        "institution_id": institution_id,
        "_id": ObjectId(current_user["user_id"])
    })
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found.")
    
    # Cast MongoDB ObjectId to string for JSON serialization
    student["id"] = str(student["_id"])
    del student["_id"]
    return student

# Request updates
@router.put("/profile/update")
async def request_profile_update(
    payload: StudentUpdatePayload,
    current_user: dict = Depends(get_current_user),
    institution_id: str = Depends(get_tenant_id)
):
    # Verify student exists in permanent db
    student_id = current_user["user_id"]
    student = await db.db.students.find_one({
        "institution_id": institution_id,
        "_id": ObjectId(student_id)
    })
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found.")
        
    # Get only non-null updates
    update_data = {}
    for k, v in payload.dict().items():
        if v is not None:
            if k == "institute_email":
                update_data["emails.institute"] = v
            elif k == "personal_email":
                update_data["emails.personal"] = v
            else:
                update_data[k] = v
                
    if not update_data:
        raise HTTPException(status_code=400, detail="No valid update fields provided.")
        
    # Check if there is an active pending update request already
    await db.db.student_pending_updates.delete_many({
        "student_id": student_id,
        "institution_id": institution_id
    })
    
    # Store pending updates
    pending_update_doc = {
        "student_id": student_id,
        "institution_id": institution_id,
        "class_id": student.get("class_id"),
        "student_name": student.get("name"),
        "roll_number": student.get("roll_number"),
        "requested_changes": update_data,
        "current_state": {k: student.get(k) for k in update_data.keys()},
        "status": "pending",
        "requested_at": datetime.now(timezone.utc)
    }
    
    await db.db.student_pending_updates.insert_one(pending_update_doc)
    
    # Log Audit
    await db.db.audit_logs.insert_one({
        "action": "student_profile_update_request",
        "institution_id": institution_id,
        "email": current_user["email"],
        "user_id": student_id,
        "role": "Student",
        "timestamp": datetime.now(timezone.utc),
        "status": "success"
    })
    
    return {"message": "Profile update request submitted and is pending Faculty approval."}

@router.post("/bulk-upload", dependencies=[Depends(RoleChecker(["TPO", "Faculty", "Dean"]))])
async def bulk_upload_students(
    target_type: str = Form(...),
    target_id: str = Form(...),
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    institution_id: str = Depends(get_tenant_id)
):
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Invalid file format. Please upload an Excel file.")
    
    prog = None
    target_cls = None
    target_dept = None
    all_depts = []
    all_classes = []

    if target_type == "class":
        target_cls = await db.db.classes.find_one({"_id": ObjectId(target_id), "institution_id": institution_id})
        if not target_cls:
            raise HTTPException(status_code=404, detail="Target class not found.")
        target_dept = await db.db.departments.find_one({"_id": ObjectId(target_cls["department_id"])})
        prog = await db.db.programs.find_one({"_id": ObjectId(target_cls["program_id"])})
    elif target_type == "program":
        prog = await db.db.programs.find_one({"_id": ObjectId(target_id), "institution_id": institution_id})
        if not prog:
            raise HTTPException(status_code=404, detail="Target program not found.")
        all_depts = await db.db.departments.find({"program_id": str(prog["_id"])}).to_list(length=None)
        all_classes = await db.db.classes.find({"program_id": str(prog["_id"])}).to_list(length=None)
        if not all_classes:
            raise HTTPException(status_code=400, detail="No classes found in this program.")
    else:
        raise HTTPException(status_code=400, detail="Invalid target type")
    
    try:
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read Excel file: {str(e)}")

    # Standardize column names to strings and strip whitespace
    df.columns = [str(col).strip() for col in df.columns]
    
    # Replace NaN/NaT with None
    df = df.replace({float('nan'): None, pd.NaT: None})

    submissions_to_insert = []
    
    for index, row in df.iterrows():
        row_dict = row.to_dict()
        
        # Extract critical fields based on exact Google Form column headers
        name = row_dict.get('Name of Student ( As per 10th certificate)')
        if not name:
            first = row_dict.get('First Name', '') or ''
            last = row_dict.get('Last Name', '') or ''
            name = f"{first} {last}".strip()
            
        roll_number = str(row_dict.get('Roll Number', '')).strip()
        personal_email = str(row_dict.get('E mail ID ( Personal )', '')).strip().lower()
        domain_email = str(row_dict.get('Domain mail id', row_dict.get('Email Address', ''))).strip().lower()
        mobile = str(row_dict.get('Student Mobile Number', '')).strip()
        
        # Calculate CGPA
        cgpa_raw = row_dict.get('UG Total CGPA') or row_dict.get('U.G. (% or CGPA), if not there put -')
        cgpa = 0.0
        try:
            if cgpa_raw and cgpa_raw != '-':
                cgpa = float(cgpa_raw)
        except ValueError:
            pass

        if not personal_email and not domain_email:
            continue # Skip invalid rows

        # All other fields go into extra_data
        extra_data = {k: v for k, v in row_dict.items() if v is not None}
        
        assigned_cls = target_cls
        assigned_dept = target_dept
        
        if target_type == "program":
            dept_name = str(row_dict.get('Department', '')).strip().lower()
            # Try to match department by name
            matched_dept = next((d for d in all_depts if d["department_name"].lower() == dept_name), all_depts[0] if all_depts else None)
            if matched_dept:
                assigned_dept = matched_dept
                # Find the first class in this department
                matched_cls = next((c for c in all_classes if c["department_id"] == str(matched_dept["_id"])), None)
                assigned_cls = matched_cls or all_classes[0]
            else:
                assigned_cls = all_classes[0]
                assigned_dept = next((d for d in all_depts if str(d["_id"]) == assigned_cls["department_id"]), all_depts[0])

        submission_doc = {
            "institution_id": institution_id,
            "program_id": str(prog["_id"]),
            "department_id": str(assigned_dept["_id"]),
            "class_id": str(assigned_cls["_id"]),
            "name": name,
            "roll_number": roll_number,
            "dob": None,
            "gender": None,
            "mobile": mobile if mobile != 'nan' else None,
            "institute_email": domain_email if domain_email and domain_email != 'nan' else None,
            "personal_email": personal_email if personal_email and personal_email != 'nan' else None,
            "program_name": prog["program_name"],
            "department_name": assigned_dept["department_name"],
            "class_name": assigned_cls["class_name"],
            "cgpa": cgpa,
            "active_backlogs": 0,
            "total_backlogs": 0,
            "education": [],
            "skills": [],
            "projects": [],
            "resume_url": None,
            "photo_url": None,
            "extra_data": extra_data,
            "status": "pending",
            "created_by": current_user["user_id"],
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        
        submissions_to_insert.append(submission_doc)

    if not submissions_to_insert:
        raise HTTPException(status_code=400, detail="No valid student data found in the file.")
        
    inserted_count = 0
    updated_count = 0
    
    for sub in submissions_to_insert:
        filter_query = {
            "institution_id": institution_id,
            "$or": [
                {"institute_email": sub["institute_email"]} if sub["institute_email"] else None,
                {"personal_email": sub["personal_email"]} if sub["personal_email"] else None,
                {"roll_number": sub["roll_number"]} if sub["roll_number"] else None
            ]
        }
        filter_query["$or"] = [q for q in filter_query["$or"] if q is not None]
        if not filter_query["$or"]:
            filter_query.pop("$or")
            filter_query["personal_email"] = "INVALID_NEVER_MATCH"
            
        result = await db.db.student_pending_submissions.update_one(filter_query, {"$set": sub}, upsert=True)
        if result.upserted_id:
            inserted_count += 1
        else:
            updated_count += 1
            
    # Log Audit
    await db.db.audit_logs.insert_one({
        "action": "student_bulk_upload_pending",
        "institution_id": institution_id,
        "email": current_user["email"],
        "user_id": current_user["user_id"],
        "role": current_user.get("role"),
        "timestamp": datetime.now(timezone.utc),
        "status": "success",
        "details": {"inserted": inserted_count, "updated": updated_count}
    })

    return {
        "message": "Bulk upload placed in pending submissions for Faculty verification.",
        "inserted": inserted_count,
        "updated": updated_count
    }
