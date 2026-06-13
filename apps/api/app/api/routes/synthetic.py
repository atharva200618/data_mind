from fastapi import APIRouter, UploadFile, File, HTTPException, Form, Depends
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.supabase import get_db
from app.db.models import User, AuditLog
from app.api.routes.auth import get_current_user
from app.services import ml_service
from app.services.dataset_service import get_dataset_data
import pandas as pd

router = APIRouter()

@router.post("/generate")
async def generate_synthetic_data(
    n_rows: int = Form(1000),
    dataset_id: str = Form(None),
    dataset_version_id: str = Form(None),
    file: UploadFile = File(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Generate synthetic data that preserves statistical distributions, using central dataset registry."""
    try:
        df, dataset, version = await get_dataset_data(
            db, dataset_id, dataset_version_id, file, user_id=current_user.id
        )
        result = ml_service.generate_synthetic(df, n_rows)
        
        # Log audit action
        log = AuditLog(
            workspace_id=dataset.workspace_id,
            user_id=current_user.id,
            action=f"Generated {n_rows} synthetic rows for dataset '{dataset.name}'"
        )
        db.add(log)
        await db.commit()

        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Synthetic generation error: {str(e)}")
