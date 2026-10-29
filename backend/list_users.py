import asyncio
from app.db.connection import connect_to_mongo, db, close_mongo_connection

async def main():
    await connect_to_mongo()
    users = await db.db.users.find({}, {'email': 1, 'role': 1, 'name': 1, '_id': 0}).to_list(100)
    print("COUNT:", len(users))
    for u in users:
        print(f"Role: {u.get('role')} | Email: {u.get('email')} | Name: {u.get('name')}")
    await close_mongo_connection()

if __name__ == '__main__':
    asyncio.run(main())
