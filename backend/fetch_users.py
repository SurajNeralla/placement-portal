import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def main():
    db = AsyncIOMotorClient('mongodb://localhost:27017')['placementhub']
    users = await db.users.find().to_list(100)
    for u in users:
        print(u.get('email'), u.get('role'))
        
    student = await db.students.find_one()
    if student:
        print(student.get('emails', {}).get('institute'), 'Student')

asyncio.run(main())
