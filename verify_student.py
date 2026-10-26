import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def main():
    db = AsyncIOMotorClient('mongodb://localhost:27017')['placementhub']
    res = await db.students.update_many(
        {'emails.institute': {'$regex': '52.*@gvpcdpgc.edu.in'}}, 
        {'$set': {'status': 'verified'}}
    )
    print('Updated:', res.modified_count)

asyncio.run(main())
