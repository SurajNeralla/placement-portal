import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def main():
    db = AsyncIOMotorClient('mongodb://localhost:27017')['placementhub']
    users = await db.users.find({}).to_list(length=100)
    for u in users:
        print(f"{u.get('email')} - {u.get('role')} - {u.get('status')}")

asyncio.run(main())
