import asyncio  
from motor.motor_asyncio import AsyncIOMotorClient  
async def main():  
    db = AsyncIOMotorClient('mongodb://localhost:27017')['placementhub']  
    count = await db['users'].count_documents({})  
    print('Users count:', count)  
    cursor = db['users'].find().limit(5)  
    async for doc in cursor: print(doc.get('email'))  
asyncio.run(main())  
