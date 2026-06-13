from fastapi import APIRouter, UploadFile, File, HTTPException, Form, Depends
from app.services import ml_service
from app.services.dataset_service import get_dataset_data, register_dataset_in_db
from app.db.supabase import get_db
from app.api.routes.auth import get_current_user
from app.db.models import User, AuditLog
from sqlalchemy.ext.asyncio import AsyncSession
import pandas as pd
import numpy as np
import io

router = APIRouter()

def _read_df(contents: bytes) -> pd.DataFrame:
    try:
        return pd.read_csv(io.BytesIO(contents))
    except Exception:
        return pd.read_excel(io.BytesIO(contents))

@router.post("/profile")
async def profile_dataset(
    file: UploadFile = File(...),
    workspace_id: str = Form(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    try:
        contents = await file.read()
        dataset, version = await register_dataset_in_db(
            db, file.filename, contents, workspace_id, current_user.id
        )
        
        # Audit Log
        log = AuditLog(
            workspace_id=dataset.workspace_id,
            user_id=current_user.id,
            action=f"Uploaded and profiled dataset '{dataset.name}' (version {version.version_num})"
        )
        db.add(log)
        await db.commit()

        profile_data = version.profile_json
        
        return {
            "id": dataset.id,
            "version_id": version.id,
            "version_num": version.version_num,
            **profile_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Data engine error: {str(e)}")

@router.post("/analyze-advanced")
async def advanced_analysis(
    column: str,
    dataset_id: str = Form(None),
    dataset_version_id: str = Form(None),
    file: UploadFile = File(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    df, dataset, version = await get_dataset_data(
        db, dataset_id, dataset_version_id, file, user_id=current_user.id
    )
    anomalies = ml_service.detect_anomalies(df, column)
    trend = ml_service.predict_trend(df, column)
    return {"anomalies": anomalies, "trend": trend}

@router.post("/cluster")
async def run_clustering(
    column: str,
    n_clusters: int = 3,
    dataset_id: str = Form(None),
    dataset_version_id: str = Form(None),
    file: UploadFile = File(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    df, dataset, version = await get_dataset_data(
        db, dataset_id, dataset_version_id, file, user_id=current_user.id
    )
    result = ml_service.perform_clustering(df, column, n_clusters)
    return result

@router.post("/synthetic-futures")
async def synthetic_futures(
    target_col: str = Form(...),
    dataset_id: str = Form(None),
    dataset_version_id: str = Form(None),
    file: UploadFile = File(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Generates synthetic futures for 12 months (Best, Normal, Worst case) based on linear trend of target column."""
    df, dataset, version = await get_dataset_data(
        db, dataset_id, dataset_version_id, file, user_id=current_user.id
    )

    if target_col not in df.columns:
        raise HTTPException(status_code=400, detail=f"Column '{target_col}' not found in dataset")
        
    col_data = df[target_col].dropna()
    if not pd.api.types.is_numeric_dtype(col_data) or col_data.empty:
        raise HTTPException(status_code=400, detail=f"Column '{target_col}' must be numeric and not empty")
        
    try:
        y = col_data.values
        X = np.arange(len(y)).reshape(-1, 1)
        
        from sklearn.linear_model import LinearRegression
        model = LinearRegression()
        model.fit(X, y)
        
        future_steps = 12
        future_X = np.arange(len(y), len(y) + future_steps).reshape(-1, 1)
        preds = model.predict(future_X)
        
        std_dev = float(np.std(y)) if len(y) > 1 else 1.0
        if std_dev == 0: std_dev = 1.0
        
        forecast_data = []
        months = ["Month 1", "Month 2", "Month 3", "Month 4", "Month 5", "Month 6", "Month 7", "Month 8", "Month 9", "Month 10", "Month 11", "Month 12"]
        
        for i, val in enumerate(preds):
            normal_val = float(val)
            uncertainty = std_dev * (0.8 + 0.1 * i)
            best_val = normal_val + 1.28 * uncertainty
            worst_val = normal_val - 1.28 * uncertainty
            
            if (col_data >= 0).all():
                normal_val = max(0.0, normal_val)
                best_val = max(0.0, best_val)
                worst_val = max(0.0, worst_val)
                
            forecast_data.append({
                "period": months[i],
                "normal": round(normal_val, 2),
                "best": round(best_val, 2),
                "worst": round(worst_val, 2)
            })
            
        return {
            "target_column": target_col,
            "forecast": forecast_data,
            "historical_mean": round(float(np.mean(y)), 2),
            "historical_std": round(std_dev, 2)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Simulation error: {str(e)}")
