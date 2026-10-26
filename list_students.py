import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def main():
    db = AsyncIOMotorClient('mongodb://localhost:27017')['placementhub']
    students = await db.students.find({}, {'emails': 1, 'name': 1, 'status': 1}).to_list(length=100)
    for s in students:
        print(s)

asyncio.run(main())
