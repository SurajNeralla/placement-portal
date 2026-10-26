import re

file_path = r"c:\Users\suraj\Desktop\placement\backend\app\routes\student.py"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

new_func = """@router.post("/bulk-upload", dependencies=[Depends(RoleChecker(["TPO", "Faculty", "Dean"]))])
async def bulk_upload_students(
    class_id: str = Form(...),
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    institution_id: str = Depends(get_tenant_id)
):
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Invalid file format. Please upload an Excel file.")
    
    # Fetch class details to populate submission
    cls = await db.db.classes.find_one({"_id": ObjectId(class_id), "institution_id": institution_id})
    if not cls:
        raise HTTPException(status_code=404, detail="Target class not found.")
        
    dept = await db.db.departments.find_one({"_id": ObjectId(cls["department_id"])})
    prog = await db.db.programs.find_one({"_id": ObjectId(cls["program_id"])})
    
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
        
        submission_doc = {
            "institution_id": institution_id,
            "program_id": str(prog["_id"]),
            "department_id": str(dept["_id"]),
            "class_id": class_id,
            "name": name,
            "roll_number": roll_number,
            "dob": None,
            "gender": None,
            "mobile": mobile if mobile != 'nan' else None,
            "institute_email": domain_email if domain_email and domain_email != 'nan' else None,
            "personal_email": personal_email if personal_email and personal_email != 'nan' else None,
            "program_name": prog["program_name"],
            "department_name": dept["department_name"],
            "class_name": cls["class_name"],
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
"""

# Now replace the old function in the content
import re
pattern = re.compile(r'@router\.post\("/bulk-upload".*?return \{\n\s+"message": "Bulk upload completed successfully\.",\n\s+"inserted": inserted_count,\n\s+"updated": updated_count\n\s+\}\n', re.DOTALL)

if pattern.search(content):
    content = pattern.sub(new_func, content)
    
    # Also add Form to imports if not there
    if "from fastapi import" in content and "Form" not in content:
        content = content.replace("from fastapi import APIRouter", "from fastapi import APIRouter, Form")
        
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Replaced successfully!")
else:
    print("Could not find the function to replace!")
