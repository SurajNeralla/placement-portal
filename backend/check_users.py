import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def main():
    db = AsyncIOMotorClient('mongodb://localhost:27017').placement_hub
    users = await db.users.find().to_list(100)
    for u in users:
        print(u.get('email'))

asyncio.run(main())
