import os
import asyncio
from sqlalchemy import text
from app.db.supabase import engine

async def migrate():
    print("Running database schema migrations for AutoML Tournament...")
    async with engine.begin() as conn:
        for query_str in [
            "ALTER TABLE models ADD COLUMN is_best_model BOOLEAN DEFAULT 0",
            "ALTER TABLE models ADD COLUMN dataset_version_id VARCHAR(36) REFERENCES dataset_versions(id) ON DELETE CASCADE",
            "ALTER TABLE models ADD COLUMN artifact_path TEXT",
            "ALTER TABLE models ADD COLUMN feature_columns JSON",
            "ALTER TABLE models ADD COLUMN is_active BOOLEAN DEFAULT 1"
        ]:
            try:
                print(f"Executing: {query_str}")
                await conn.execute(text(query_str))
                print("✅ Success")
            except Exception as e:
                print(f"⚠️ Column already exists or error occurred: {str(e)}")
    print("Migration execution complete.")

if __name__ == "__main__":
    asyncio.run(migrate())
