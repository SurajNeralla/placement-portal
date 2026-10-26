import asyncio
import math
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URI = "mongodb://localhost:27017"
MONGO_DB = "placementhub"

async def main():
    client = AsyncIOMotorClient(MONGO_URI)
    db = client[MONGO_DB]
    
    count = 0
    async for student in db.students.find():
        updates = {}
        if type(student.get("cgpa")) is float and math.isnan(student.get("cgpa")):
            updates["cgpa"] = 0.0
        
        # also check active_backlogs and total_backlogs
        if type(student.get("active_backlogs")) is float and math.isnan(student.get("active_backlogs")):
            updates["active_backlogs"] = 0
            
        if type(student.get("total_backlogs")) is float and math.isnan(student.get("total_backlogs")):
            updates["total_backlogs"] = 0

        if updates:
            await db.students.update_one({"_id": student["_id"]}, {"$set": updates})
            count += 1
            
    print(f"Fixed {count} students with NaN values.")

if __name__ == "__main__":
    asyncio.run(main())
