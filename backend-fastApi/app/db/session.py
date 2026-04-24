import motor.motor_asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.orm import sessionmaker
from redis import asyncio as aioredis
from app.core.config import settings

# --- CONFIGURACION POSTGRES (SQLAlchemy) ---

Base = declarative_base()

ASYNC_SQLALCHEMY_URL = settings.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")

engine = create_async_engine(ASYNC_SQLALCHEMY_URL, pool_pre_ping=True)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def get_db():
    """Dependencia para inyectar la sesion de sql en los endpoints"""
    async with AsyncSessionLocal() as session:
        yield session

# --- CONFIGURACION MONGODB (Motor) ---
mongo_client = motor.motor_asyncio.AsyncIOMotorClient(settings.MONGO_URL)
mongo_db = mongo_client[settings.MONGO_DB_NAME]


# --- CONFIGURACION REDIS (Async) ---
redis_client = aioredis.from_url(settings.REDIS_URL, decode_responses=True)