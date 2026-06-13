import os
import sys
import asyncio
import joblib

# Set python path to find app module
sys.path.append(os.path.dirname(__file__))

from app.db.supabase import AsyncSessionLocal
from app.db.models import MLModel
from sqlalchemy import select

async def repair():
    print("Starting manual repair of models with NULL feature_columns...")
    async with AsyncSessionLocal() as db:
        try:
            stmt = select(MLModel).filter(MLModel.feature_columns == None)
            res = await db.execute(stmt)
            models_to_repair = res.scalars().all()
            
            print(f"Found {len(models_to_repair)} models requiring repair.")
            repaired_count = 0
            for model in models_to_repair:
                features_list = None
                # 1. Try to load from serialized artifact
                path_to_try = model.artifact_path or model.file_path
                if path_to_try and os.path.exists(path_to_try):
                    try:
                        payload = joblib.load(path_to_try)
                        if isinstance(payload, dict) and "features" in payload:
                            features_list = payload["features"]
                            print(f"Loaded features from artifact for model {model.id}: {features_list}")
                    except Exception as e:
                        print(f"Error loading joblib file {path_to_try} for model {model.id}: {e}")
                
                # 2. Fallback to existing features column in DB
                if not features_list and model.features:
                    features_list = model.features
                    print(f"Fell back to database features column for model {model.id}: {features_list}")
                
                if features_list:
                    model.feature_columns = features_list
                    repaired_count += 1
                else:
                    print(f"Warning: Could not resolve features list for model {model.id}")
                    
            if repaired_count > 0:
                await db.commit()
                print(f"✅ Successfully repaired feature_columns for {repaired_count} models.")
            else:
                print("No models were repaired.")
        except Exception as e:
            print(f"❌ Repair failed: {e}")

if __name__ == "__main__":
    asyncio.run(repair())
