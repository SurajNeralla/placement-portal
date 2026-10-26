import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URI = "mongodb://localhost:27017"
MONGO_DB = "placementhub"

async def main():
    client = AsyncIOMotorClient(MONGO_URI)
    db = client[MONGO_DB]
    
    emails_to_remove = ["student1@gtu.edu", "student2@gtu.edu", "student3@gtu.edu"]
    
    for email in emails_to_remove:
        user = await db.users.find_one({"email": email})
        if user:
            await db.users.delete_one({"_id": user["_id"]})
            await db.students.delete_many({"user_id": user["id"]})
            print(f"Removed {email}")
        else:
            print(f"User {email} not found.")

if __name__ == "__main__":
    asyncio.run(main())
