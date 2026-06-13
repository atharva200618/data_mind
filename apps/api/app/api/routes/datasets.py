from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.supabase import get_db
from app.db.models import User, Workspace, WorkspaceMember, Dataset, DatasetVersion, AuditLog
from app.api.routes.auth import get_current_user
from app.core.celery_app import enqueue_task
from app.tasks import process_file_upload_task
import os
import uuid
import pandas as pd
import json

router = APIRouter()

STORAGE_DIR = "storage/datasets"
os.makedirs(STORAGE_DIR, exist_ok=True)

@router.get("")
async def list_datasets(workspace_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    # Verify user belongs to workspace
    stmt = select(WorkspaceMember).filter(WorkspaceMember.workspace_id == workspace_id, WorkspaceMember.user_id == current_user.id)
    res = await db.execute(stmt)
    if not res.scalars().first():
        raise HTTPException(status_code=403, detail="Not authorized to view datasets in this workspace")
        
    stmt = select(Dataset).filter(Dataset.workspace_id == workspace_id)
    res = await db.execute(stmt)
    datasets = res.scalars().all()
    
    result = []
    for d in datasets:
        # Get active version profile
        stmt = select(DatasetVersion).filter(DatasetVersion.dataset_id == d.id, DatasetVersion.version_num == d.current_version)
        res_v = await db.execute(stmt)
        version = res_v.scalars().first()
        result.append({
            "id": d.id,
            "name": d.name,
            "current_version": d.current_version,
            "created_at": d.created_at.isoformat(),
            "profile": version.profile_json if version else None,
            "row_count": version.row_count if version else 0,
            "col_count": version.col_count if version else 0
        })
    return result

@router.post("/upload")
async def upload_dataset(
    workspace_id: str = Form(...),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Verify editor access
    stmt = select(WorkspaceMember).filter(
        WorkspaceMember.workspace_id == workspace_id,
        WorkspaceMember.user_id == current_user.id
    )
    res = await db.execute(stmt)
    member = res.scalars().first()
    if not member or member.role not in ["owner", "editor"]:
        raise HTTPException(status_code=403, detail="Only owners and editors can upload datasets")
        
    filename = file.filename
    dataset_name = os.path.splitext(filename)[0]
    
    # Save dataset metadata
    dataset = Dataset(workspace_id=workspace_id, name=dataset_name, current_version=1)
    db.add(dataset)
    await db.commit()
    await db.refresh(dataset)
    
    # Unique version ID and local file path
    version_id = str(uuid.uuid4())
    ext = os.path.splitext(filename)[1]
    file_path = os.path.join(STORAGE_DIR, f"{version_id}{ext}")
    
    # Write uploaded contents
    contents = await file.read()
    with open(file_path, "wb") as f:
        f.write(contents)
        
    # Create dataset version
    version = DatasetVersion(
        id=version_id,
        dataset_id=dataset.id,
        version_num=1,
        file_path_or_url=file_path
    )
    db.add(version)
    await db.commit()
    await db.refresh(version)
    
    # Audit log
    log = AuditLog(workspace_id=workspace_id, user_id=current_user.id, action=f"Uploaded dataset '{dataset_name}' v1")
    db.add(log)
    await db.commit()
    
    # Enqueue background processing task safely
    enqueue_task(process_file_upload_task, version_id)
    
    return {
        "message": "Dataset upload initiated. Processing in background.",
        "dataset_id": dataset.id,
        "version_id": version.id,
        "version_num": 1
    }

@router.get("/{dataset_id}/versions")
async def get_version_history(
    dataset_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Get dataset to check workspace access
    stmt = select(Dataset).filter(Dataset.id == dataset_id)
    res = await db.execute(stmt)
    dataset = res.scalars().first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    stmt = select(WorkspaceMember).filter(WorkspaceMember.workspace_id == dataset.workspace_id, WorkspaceMember.user_id == current_user.id)
    res = await db.execute(stmt)
    if not res.scalars().first():
        raise HTTPException(status_code=403, detail="Not authorized to view version history")
        
    stmt = select(DatasetVersion).filter(DatasetVersion.dataset_id == dataset_id).order_by(DatasetVersion.version_num.desc())
    res = await db.execute(stmt)
    versions = res.scalars().all()
    
    return [{
        "id": v.id,
        "version_num": v.version_num,
        "row_count": v.row_count,
        "col_count": v.col_count,
        "created_at": v.created_at.isoformat(),
        "is_active": v.version_num == dataset.current_version
    } for v in versions]

@router.post("/{dataset_id}/rollback")
async def rollback_dataset(
    dataset_id: str,
    version_num: int = Form(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Verify editor access
    stmt = select(Dataset).filter(Dataset.id == dataset_id)
    res = await db.execute(stmt)
    dataset = res.scalars().first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    stmt = select(WorkspaceMember).filter(WorkspaceMember.workspace_id == dataset.workspace_id, WorkspaceMember.user_id == current_user.id)
    res = await db.execute(stmt)
    member = res.scalars().first()
    if not member or member.role not in ["owner", "editor"]:
        raise HTTPException(status_code=403, detail="Only owners and editors can perform rollbacks")
        
    # Verify version exists
    stmt = select(DatasetVersion).filter(DatasetVersion.dataset_id == dataset_id, DatasetVersion.version_num == version_num)
    res = await db.execute(stmt)
    version = res.scalars().first()
    if not version:
        raise HTTPException(status_code=400, detail="Target version number not found")
        
    # Perform rollback
    dataset.current_version = version_num
    
    # Audit log
    log = AuditLog(workspace_id=dataset.workspace_id, user_id=current_user.id, action=f"Rolled back dataset '{dataset.name}' to v{version_num}")
    db.add(log)
    await db.commit()
    
    return {
        "message": f"Successfully rolled back to version {version_num}",
        "dataset_id": dataset.id,
        "current_version": version_num,
        "profile": version.profile_json
    }

@router.get("/versions/{version_id}/status")
async def get_version_processing_status(
    version_id: str,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(DatasetVersion).filter(DatasetVersion.id == version_id)
    res = await db.execute(stmt)
    version = res.scalars().first()
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
        
    if version.profile_json is not None:
        return {
            "status": "COMPLETED",
            "profile": version.profile_json,
            "row_count": version.row_count,
            "col_count": version.col_count
        }
    else:
        return {"status": "PENDING"}

@router.post("/compare")
async def compare_dataset_versions(
    version_a_id: str = Form(...),
    version_b_id: str = Form(...),
    api_key: str = Form(""),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Compare two dataset versions, returning statistical differences and an LLM summary."""
    stmt_a = select(DatasetVersion).filter(DatasetVersion.id == version_a_id)
    res_a = await db.execute(stmt_a)
    ver_a = res_a.scalars().first()
    
    stmt_b = select(DatasetVersion).filter(DatasetVersion.id == version_b_id)
    res_b = await db.execute(stmt_b)
    ver_b = res_b.scalars().first()
    
    if not ver_a or not ver_b:
        raise HTTPException(status_code=404, detail="One or both dataset versions not found")
        
    try:
        df_a = pd.read_csv(ver_a.file_path_or_url) if ver_a.file_path_or_url.endswith('.csv') else pd.read_excel(ver_a.file_path_or_url)
        df_b = pd.read_csv(ver_b.file_path_or_url) if ver_b.file_path_or_url.endswith('.csv') else pd.read_excel(ver_b.file_path_or_url)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read dataset files: {str(e)}")
        
    from app.services.ml_service import compare_datasets_sync
    diff_report = compare_datasets_sync(df_a, df_b)
    
    if not api_key:
        api_key = os.getenv("OPENAI_API_KEY", "")
        
    summary_text = ""
    if api_key and not "your_" in api_key.lower():
        try:
            from langchain_google_genai import ChatGoogleGenerativeAI
            from langchain_openai import ChatOpenAI
            from langchain_core.messages import SystemMessage, HumanMessage
            
            if api_key.startswith("AQ") or api_key.startswith("AIza"):
                llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0.1, google_api_key=api_key)
            else:
                llm = ChatOpenAI(model="gpt-4o", temperature=0.1, api_key=api_key)
                
            system_prompt = "You are a senior data architect. Analyze the statistical differences between two versions of a dataset and write a brief, highly technical summary of what changed (e.g. data cleaning, distribution shifts, column updates)."
            human_msg = f"Comparison Diff Report: {json.dumps(diff_report)}\nWrite a 3-4 sentence concise summary of this diff."
            
            response = llm.invoke([SystemMessage(content=system_prompt), HumanMessage(content=human_msg)])
            summary_text = response.content.strip()
        except Exception as e:
            summary_text = f"AI summary generation skipped: {str(e)}"
    else:
        summary_text = "AI service not configured. Snapshots successfully diffed."
        
    diff_report["summary"] = summary_text
    diff_report["version_num_a"] = ver_a.version_num
    diff_report["version_num_b"] = ver_b.version_num
    return diff_report
