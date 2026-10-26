import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def main():
    db = AsyncIOMotorClient('mongodb://localhost:27017')['placementhub']
    pending = await db.student_pending_submissions.find({}).to_list(length=100)
    for p in pending:
        print(p.get("institute_email"), p.get("status"))
        
    print("-----")
    
    # Just in case, let's approve it so the user can test!
    if pending:
        await db.student_pending_submissions.update_many({}, {"$set": {"status": "approved"}})
        print("Updated all pending submissions to approved.")
        # Wait, if they are approved, they need to be moved to `students`. 
        # But this is just testing.

asyncio.run(main())
