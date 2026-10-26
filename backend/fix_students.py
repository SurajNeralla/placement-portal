import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URI = "mongodb://localhost:27017"
MONGO_DB = "placementhub"

async def main():
    client = AsyncIOMotorClient(MONGO_URI)
    db = client[MONGO_DB]
    
    count = 0
    # Find all users with role="Student"
    async for user in db.users.find({"role": "Student"}):
        # find the corresponding student record using the email
        email = user.get("email")
        if email:
            student = await db.students.find_one({"emails.institute": email})
            if student:
                # copy password_hash to student
                await db.students.update_one(
                    {"_id": student["_id"]},
                    {"$set": {"password_hash": user["password_hash"]}}
                )
                # delete from users
                await db.users.delete_one({"_id": user["_id"]})
                count += 1
                
    print(f"Migrated {count} students from 'users' to 'students' collection.")

if __name__ == "__main__":
    asyncio.run(main())
