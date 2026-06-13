import os
import uuid
import hashlib
import pandas as pd
import numpy as np
import io
import json
import asyncio
from fastapi import HTTPException, UploadFile
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models import Dataset, DatasetVersion, AuditLog, Workspace, User
from app.services import ml_service

STORAGE_DIR = "storage/datasets"
os.makedirs(STORAGE_DIR, exist_ok=True)

def _read_df(contents: bytes, filename: str) -> pd.DataFrame:
    try:
        if filename.endswith('.xlsx') or filename.endswith('.xls'):
            return pd.read_excel(io.BytesIO(contents))
        return pd.read_csv(io.BytesIO(contents))
    except Exception:
        try:
            return pd.read_csv(io.BytesIO(contents))
        except Exception:
            return pd.read_excel(io.BytesIO(contents))

async def get_or_create_default_workspace(db: AsyncSession, user_id: str = None) -> str:
    if not user_id:
        from app.api.routes.auth import get_password_hash
        stmt = select(User).filter(User.email == "demo@datamind.ai")
        result = await db.execute(stmt)
        user = result.scalars().first()
        if not user:
            user = User(email="demo@datamind.ai", password_hash=get_password_hash("demo123"))
            db.add(user)
            await db.commit()
            await db.refresh(user)
        user_id = user.id

    stmt = select(Workspace).filter(Workspace.owner_id == user_id)
    res = await db.execute(stmt)
    ws = res.scalars().first()
    if not ws:
        ws = Workspace(name="Personal Workspace", owner_id=user_id)
        db.add(ws)
        await db.commit()
        await db.refresh(ws)
        
        from app.db.models import WorkspaceMember
        member = WorkspaceMember(workspace_id=ws.id, user_id=user_id, role="owner")
        db.add(member)
        await db.commit()
    return ws.id

async def register_dataset_in_db(
    db: AsyncSession,
    filename: str,
    contents: bytes,
    workspace_id: str = None,
    user_id: str = None
) -> tuple[Dataset, DatasetVersion]:
    if not workspace_id:
        workspace_id = await get_or_create_default_workspace(db, user_id)

    sha256 = hashlib.sha256(contents).hexdigest()
    file_size = len(contents)
    dataset_name = os.path.splitext(filename)[0]

    # Optimization: Early duplicate version check before parsing or profiling the data
    stmt_v = select(DatasetVersion).join(Dataset).filter(
        Dataset.workspace_id == workspace_id,
        DatasetVersion.dataset_hash == sha256
    )
    res_v = await db.execute(stmt_v)
    existing_version = res_v.scalars().first()
    if existing_version:
        stmt_d = select(Dataset).filter(Dataset.id == existing_version.dataset_id)
        res_d = await db.execute(stmt_d)
        dataset = res_d.scalars().first()
        return dataset, existing_version

    # If new, run Pandas read and profiling offloaded to threads to prevent event loop blocking
    df = await asyncio.to_thread(_read_df, contents, filename)
    row_count = len(df)
    col_count = len(df.columns)

    profile = await asyncio.to_thread(ml_service.get_data_profile, df)
    insights = await asyncio.to_thread(ml_service.generate_business_insights, df)
    health_score_data = await asyncio.to_thread(ml_service.compute_advanced_health_score, df)
    
    correlations = await asyncio.to_thread(ml_service.get_correlations, df)
    
    profile_data = {
        "profile": profile,
        "correlations": correlations,
        "insights": insights,
        "quality_score": health_score_data["quality"],
        "health_score": health_score_data,
        "columns": df.columns.tolist(),
        "numeric_columns": df.select_dtypes(include=[np.number]).columns.tolist(),
        "categorical_columns": df.select_dtypes(include=['object', 'category']).columns.tolist(),
        "sample": json.loads(df.head(100).to_json(orient='records'))
    }

    advanced_stats = await asyncio.to_thread(ml_service.get_advanced_stats, df)
    profile_data["advanced_stats"] = advanced_stats

    stmt_d = select(Dataset).filter(
        Dataset.workspace_id == workspace_id,
        Dataset.name == dataset_name
    )
    res_d = await db.execute(stmt_d)
    dataset = res_d.scalars().first()

    if dataset:
        new_version_num = dataset.current_version + 1
        dataset.current_version = new_version_num
    else:
        new_version_num = 1
        dataset = Dataset(workspace_id=workspace_id, name=dataset_name, current_version=1)
        db.add(dataset)
        await db.commit()
        await db.refresh(dataset)

    version_id = str(uuid.uuid4())
    ext = os.path.splitext(filename)[1] or ".csv"
    file_path = os.path.join(STORAGE_DIR, f"{version_id}{ext}")
    with open(file_path, "wb") as f:
        f.write(contents)

    version = DatasetVersion(
        id=version_id,
        dataset_id=dataset.id,
        version_num=new_version_num,
        file_path_or_url=file_path,
        row_count=row_count,
        col_count=col_count,
        file_size=file_size,
        dataset_hash=sha256,
        profile_json=json.loads(json.dumps(profile_data, default=ml_service.convert_to_json_serializable))
    )
    db.add(version)
    
    action_log = AuditLog(
        workspace_id=workspace_id,
        user_id=user_id,
        action=f"Registered dataset '{dataset_name}' version {new_version_num}"
    )
    db.add(action_log)

    await db.commit()
    await db.refresh(dataset)
    await db.refresh(version)

    return dataset, version


async def get_dataset_data(
    db: AsyncSession,
    dataset_id: str = None,
    dataset_version_id: str = None,
    file: UploadFile = None,
    workspace_id: str = None,
    user_id: str = None
) -> tuple[pd.DataFrame, Dataset, DatasetVersion]:
    if dataset_version_id:
        stmt = select(DatasetVersion).filter(DatasetVersion.id == dataset_version_id)
        res = await db.execute(stmt)
        version = res.scalars().first()
        if not version:
            raise HTTPException(status_code=404, detail="Dataset version not found")
        stmt_d = select(Dataset).filter(Dataset.id == version.dataset_id)
        res_d = await db.execute(stmt_d)
        dataset = res_d.scalars().first()
    elif dataset_id:
        stmt_d = select(Dataset).filter(Dataset.id == dataset_id)
        res_d = await db.execute(stmt_d)
        dataset = res_d.scalars().first()
        if not dataset:
            raise HTTPException(status_code=404, detail="Dataset not found")
        stmt = select(DatasetVersion).filter(
            DatasetVersion.dataset_id == dataset.id,
            DatasetVersion.version_num == dataset.current_version
        )
        res = await db.execute(stmt)
        version = res.scalars().first()
        if not version:
            raise HTTPException(status_code=404, detail="Active version not found")
    elif file:
        contents = await file.read()
        dataset, version = await register_dataset_in_db(
            db, file.filename, contents, workspace_id, user_id
        )
    else:
        raise HTTPException(status_code=400, detail="Missing dataset_id, dataset_version_id or file upload")

    file_path = version.file_path_or_url
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail=f"File not found on disk: {file_path}")
    
    df = _read_df(open(file_path, "rb").read(), file_path)
    return df, dataset, version
