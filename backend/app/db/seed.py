import datetime
import uuid
import logging
from app.services.security import hash_password

logger = logging.getLogger("app.db.seed")

async def seed_initial_data(db):
    try:
        user_count = await db.users.count_documents({})
        if user_count > 0:
            logger.info(f"Database already contains {user_count} users. Skipping seed.")
            return

        logger.info("Database is empty. Seeding initial accounts and sample data...")
        
        inst_id = str(uuid.uuid4())
        await db.institutions.insert_one({
            "id": inst_id,
            "name": "Global Tech University",
            "address": "123 Tech Lane, Innovation City",
            "website": "https://gtu.edu",
            "institution_code": "GTU01"
        })

        prog_btech_id = str(uuid.uuid4())
        await db.programs.insert_one({"id": prog_btech_id, "institution_id": inst_id, "name": "B.Tech"})

        dept_cse_id = str(uuid.uuid4())
        await db.departments.insert_one({"id": dept_cse_id, "program_id": prog_btech_id, "name": "Computer Science"})

        class_cse_a_id = str(uuid.uuid4())
        await db.classes.insert_one({"id": class_cse_a_id, "department_id": dept_cse_id, "name": "CSE-A"})

        users = [
            {
                "id": str(uuid.uuid4()),
                "institution_id": inst_id,
                "email": "dean@gtu.edu",
                "name": "Dr. Alan Turing",
                "role": "Dean",
                "password_hash": hash_password("dean123"),
                "requires_password_setup": False
            },
            {
                "id": str(uuid.uuid4()),
                "institution_id": inst_id,
                "email": "tpo@gtu.edu",
                "name": "Alice Smith",
                "role": "TPO",
                "password_hash": hash_password("tpo123"),
                "requires_password_setup": False
            },
            {
                "id": str(uuid.uuid4()),
                "institution_id": inst_id,
                "email": "faculty@gtu.edu",
                "name": "Bob Jones",
                "role": "Faculty",
                "password_hash": hash_password("faculty123"),
                "class_id": class_cse_a_id,
                "requires_password_setup": False
            }
        ]

        s1_uid = str(uuid.uuid4())
        s2_uid = str(uuid.uuid4())
        s3_uid = str(uuid.uuid4())

        student_user_1 = {
            "id": s1_uid,
            "institution_id": inst_id,
            "email": "student1@gtu.edu",
            "name": "Charlie Brown",
            "role": "Student",
            "password_hash": hash_password("student123"),
            "requires_password_setup": False
        }
        student_user_2 = {
            "id": s2_uid,
            "institution_id": inst_id,
            "email": "student2@gtu.edu",
            "name": "Diana Prince",
            "role": "Student",
            "password_hash": hash_password("student123"),
            "requires_password_setup": False
        }
        student_user_3 = {
            "id": s3_uid,
            "institution_id": inst_id,
            "email": "student3@gtu.edu",
            "name": "Ethan Hunt",
            "role": "Student",
            "password_hash": hash_password("student123"),
            "requires_password_setup": False
        }

        users.extend([student_user_1, student_user_2, student_user_3])
        await db.users.insert_many(users)

        students = [
            {
                "user_id": s1_uid,
                "institution_id": inst_id,
                "roll_number": "GTU-CSE-001",
                "name": "Charlie Brown",
                "emails": {"institute": "student1@gtu.edu", "personal": "charlie@gmail.com"},
                "contact": {"institutional_email": "student1@gtu.edu", "personal_email": "charlie@gmail.com"},
                "institute_email": "student1@gtu.edu",
                "personal_email": "charlie@gmail.com",
                "password_hash": hash_password("student123"),
                "mobile": "9876543210",
                "gender": "Male",
                "dob": "2000-01-01",
                "program_id": prog_btech_id,
                "department_id": dept_cse_id,
                "department_name": "Computer Science & Engineering",
                "program_name": "B.Tech",
                "passout_year": 2027,
                "class_id": class_cse_a_id,
                "cgpa": 8.5,
                "active_backlogs": 0,
                "total_backlogs": 0,
                "skills": ["Python", "React", "Node.js"],
                "projects": ["E-Commerce Site", "Chatbot"],
                "status": "APPROVED",
                "approval": {"faculty_status": "APPROVED"},
                "authentication": {"account_status": "ACTIVE", "password_hash": hash_password("student123")},
                "placement_info": {"placed": True, "company_name": "Google", "package": "24 LPA", "role": "SDE"},
                "extra_data": {"10th Marks": "95%", "12th Marks": "92%", "Address": "City Center"}
            },
            {
                "user_id": s2_uid,
                "institution_id": inst_id,
                "roll_number": "GTU-CSE-002",
                "name": "Diana Prince",
                "emails": {"institute": "student2@gtu.edu", "personal": "diana@gmail.com"},
                "contact": {"institutional_email": "student2@gtu.edu", "personal_email": "diana@gmail.com"},
                "institute_email": "student2@gtu.edu",
                "personal_email": "diana@gmail.com",
                "password_hash": hash_password("student123"),
                "mobile": "9876543211",
                "gender": "Female",
                "dob": "2001-05-15",
                "program_id": prog_btech_id,
                "department_id": dept_cse_id,
                "department_name": "Computer Science & Engineering",
                "program_name": "B.Tech",
                "passout_year": 2027,
                "class_id": class_cse_a_id,
                "cgpa": 9.2,
                "active_backlogs": 0,
                "total_backlogs": 0,
                "skills": ["Java", "Spring Boot", "AWS"],
                "projects": ["Cloud storage"],
                "status": "APPROVED",
                "approval": {"faculty_status": "APPROVED"},
                "authentication": {"account_status": "ACTIVE", "password_hash": hash_password("student123")},
                "extra_data": {"10th Marks": "98%", "12th Marks": "96%"}
            },
            {
                "user_id": s3_uid,
                "institution_id": inst_id,
                "roll_number": "GTU-CSE-003",
                "name": "Ethan Hunt",
                "emails": {"institute": "student3@gtu.edu", "personal": "ethan@gmail.com"},
                "contact": {"institutional_email": "student3@gtu.edu", "personal_email": "ethan@gmail.com"},
                "institute_email": "student3@gtu.edu",
                "personal_email": "ethan@gmail.com",
                "password_hash": hash_password("student123"),
                "mobile": "9876543212",
                "gender": "Male",
                "dob": "1999-11-20",
                "program_id": prog_btech_id,
                "department_id": dept_cse_id,
                "department_name": "Computer Science & Engineering",
                "program_name": "B.Tech",
                "passout_year": 2027,
                "class_id": class_cse_a_id,
                "cgpa": 7.1,
                "active_backlogs": 1,
                "total_backlogs": 2,
                "skills": ["C++", "Linux", "Networking"],
                "projects": ["Spy gadget interface"],
                "status": "APPROVED",
                "approval": {"faculty_status": "APPROVED"},
                "authentication": {"account_status": "ACTIVE", "password_hash": hash_password("student123")},
                "extra_data": {"10th Marks": "85%", "12th Marks": "80%"}
            }
        ]
        await db.students.insert_many(students)

        d1_id = str(uuid.uuid4())
        d2_id = str(uuid.uuid4())
        drives = [
            {
                "id": d1_id,
                "institution_id": inst_id,
                "company_name": "Google",
                "job_role": "Software Development Engineer",
                "package": "24 LPA",
                "location": "Bangalore",
                "mode": "On-Campus",
                "drive_deadline": (datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=5)).isoformat(),
                "min_cgpa": 8.0,
                "max_backlogs": 0,
                "gender_filter": "All",
                "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
            },
            {
                "id": d2_id,
                "institution_id": inst_id,
                "company_name": "Amazon",
                "job_role": "Cloud Architect",
                "package": "30 LPA",
                "location": "Hyderabad",
                "mode": "Virtual",
                "drive_deadline": (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=2)).isoformat(),
                "min_cgpa": 7.5,
                "max_backlogs": 1,
                "gender_filter": "All",
                "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
            }
        ]
        await db.placement_drives.insert_many(drives)

        logger.info("Database initial seed complete! Default logins are ready.")
    except Exception as e:
        logger.error(f"Error seeding database: {e}", exc_info=True)
