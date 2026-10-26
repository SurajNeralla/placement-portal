import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def main():
    db = AsyncIOMotorClient('mongodb://localhost:27017')['placementhub']
    
    email = '5221421081@gvpcdpgc.edu.in'
    u = await db.users.find_one({"email": email})
    s = await db.students.find_one({"emails.institute": email})
    
    print("User:", u)
    print("Student:", s)
    
    if s and s.get("status") != "verified":
        await db.students.update_one({"_id": s["_id"]}, {"$set": {"status": "verified"}})
        print("Updated student status to verified!")

asyncio.run(main())
