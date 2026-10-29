from motor.motor_asyncio import AsyncIOMotorClient
from mongomock_motor import AsyncMongoMockClient
from app.config import settings
from app.db.seed import seed_initial_data
import logging

logger = logging.getLogger(__name__)

class Database:
    client = None
    db = None

db = Database()

async def connect_to_mongo():
    logger.info("Connecting to Database...")
    if settings.MONGO_URI == "mock":
        logger.info("Using IN-MEMORY Mock MongoDB Client (mongomock-motor)")
        db.client = AsyncMongoMockClient()
        db.db = db.client[settings.MONGO_DB]
        logger.info("Mock MongoDB connection ready.")
        try:
            await seed_initial_data(db.db)
        except Exception as e:
            logger.warning(f"Failed to seed initial data: {e}")
        return
        
    try:
        logger.info(f"Connecting to real MongoDB at {settings.MONGO_URI}...")
        # Limit connection timeout to 2 seconds to fail fast and fall back
        db.client = AsyncIOMotorClient(settings.MONGO_URI, serverSelectionTimeoutMS=2000)
        db.db = db.client[settings.MONGO_DB]
        await db.db.command("ping")
        logger.info(f"Successfully connected to MongoDB at {settings.MONGO_URI}")
    except Exception as e:
        logger.warning(f"Failed to connect to real MongoDB: {e}")
        logger.info("FALLING BACK to IN-MEMORY Mock MongoDB Client (mongomock-motor)")
        db.client = AsyncMongoMockClient()
        db.db = db.client[settings.MONGO_DB]
        logger.info("Mock MongoDB connection fallback ready.")

    try:
        await seed_initial_data(db.db)
    except Exception as e:
        logger.warning(f"Failed to seed initial data: {e}")

async def close_mongo_connection():
    if db.client and hasattr(db.client, "close"):
        db.client.close()
        logger.info("Database connection closed.")

