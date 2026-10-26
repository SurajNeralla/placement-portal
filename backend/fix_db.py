import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import math

async def main():
    db = AsyncIOMotorClient('mongodb://localhost:27017')['placementhub']
    students = await db.students.find().to_list(1000)
    count = 0
    for s in students:
        cgpa = s.get('cgpa')
        active = s.get('active_backlogs')
        total = s.get('total_backlogs')
        update = {}
        if isinstance(cgpa, float) and math.isnan(cgpa):
            update['cgpa'] = 0.0
        if isinstance(active, float) and math.isnan(active):
            update['active_backlogs'] = 0
        if isinstance(total, float) and math.isnan(total):
            update['total_backlogs'] = 0
        if update:
            await db.students.update_one({'_id': s['_id']}, {'$set': update})
            count += 1
    print(f'Fixed {count} students')

if __name__ == "__main__":
    asyncio.run(main())
