import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URI = "mongodb://localhost:27017"
MONGO_DB = "placementhub"

async def main():
    client = AsyncIOMotorClient(MONGO_URI)
    db = client[MONGO_DB]
    
    faculty = await db["users"].find_one({"email": "faculty@gtu.edu"})
    if faculty and "assigned_class_ids" in faculty:
        class_id = faculty["assigned_class_ids"][0]
        await db["users"].update_one(
            {"email": "faculty@gtu.edu"},
            {"$set": {"class_id": class_id}, "$unset": {"assigned_class_ids": ""}}
        )
        print("Faculty user updated successfully.")
    else:
        print("Faculty not found or already updated.")

if __name__ == "__main__":
    asyncio.run(main())
