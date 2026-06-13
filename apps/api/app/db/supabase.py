from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
import os
from dotenv import load_dotenv

load_dotenv()

# Feature 3: Real-Time Dashboard Sharing (Supabase DB)
# Replace this with your actual Supabase PostgreSQL connection string
SUPABASE_DB_URL = os.getenv("SUPABASE_DB_URL")
if not SUPABASE_DB_URL:
    # Use SQLite async driver if no Postgres is provided
    SUPABASE_DB_URL = "sqlite+aiosqlite:///./datamind.db"

# Async engine for high-performance FastAPI interactions
engine = create_async_engine(SUPABASE_DB_URL, echo=True)

# Session factory
AsyncSessionLocal = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

Base = declarative_base()

async def get_db():
    """Dependency injection for FastAPI endpoints."""
    async with AsyncSessionLocal() as session:
        yield session

# Note: Once tables are defined, you can store Report configs here and return a UUID link
# e.g., https://datamind.ai/report/abc1234
