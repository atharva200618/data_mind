from fastapi import APIRouter, Depends, HTTPException, Form
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.supabase import get_db
from app.db.models import User, Workspace, WorkspaceMember, AuditLog
from app.api.routes.auth import get_current_user

router = APIRouter()

@router.get("")
async def list_workspaces(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    # Find all workspaces the user belongs to
    stmt = select(Workspace).join(WorkspaceMember).filter(WorkspaceMember.user_id == current_user.id)
    result = await db.execute(stmt)
    workspaces = result.scalars().all()
    
    # If no workspaces exist (e.g. for demo user), create a default one
    if not workspaces:
        workspace = Workspace(name="Personal Workspace", owner_id=current_user.id)
        db.add(workspace)
        await db.commit()
        await db.refresh(workspace)
        
        member = WorkspaceMember(workspace_id=workspace.id, user_id=current_user.id, role="owner")
        db.add(member)
        await db.commit()
        
        workspaces = [workspace]
        
    return [{"id": w.id, "name": w.name, "owner_id": w.owner_id} for w in workspaces]

@router.post("")
async def create_workspace(name: str = Form(...), current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    workspace = Workspace(name=name, owner_id=current_user.id)
    db.add(workspace)
    await db.commit()
    await db.refresh(workspace)
    
    member = WorkspaceMember(workspace_id=workspace.id, user_id=current_user.id, role="owner")
    db.add(member)
    
    # Log audit event
    log = AuditLog(workspace_id=workspace.id, user_id=current_user.id, action=f"Created workspace '{name}'")
    db.add(log)
    await db.commit()
    
    return {"id": workspace.id, "name": workspace.name}

@router.get("/{workspace_id}/members")
async def get_workspace_members(workspace_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    # Verify user belongs to workspace
    stmt = select(WorkspaceMember).filter(WorkspaceMember.workspace_id == workspace_id, WorkspaceMember.user_id == current_user.id)
    res = await db.execute(stmt)
    if not res.scalars().first():
        raise HTTPException(status_code=403, detail="Not authorized to view members of this workspace")
        
    stmt = select(WorkspaceMember, User.email).join(User).filter(WorkspaceMember.workspace_id == workspace_id)
    res = await db.execute(stmt)
    members = res.all()
    return [{"user_id": m[0].user_id, "email": m[1], "role": m[0].role} for m in members]

@router.post("/{workspace_id}/invite")
async def invite_workspace_member(
    workspace_id: str,
    email: str = Form(...),
    role: str = Form("viewer"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Verify inviter is owner/editor
    stmt = select(WorkspaceMember).filter(WorkspaceMember.workspace_id == workspace_id, WorkspaceMember.user_id == current_user.id)
    res = await db.execute(stmt)
    inviter = res.scalars().first()
    if not inviter or inviter.role not in ["owner", "editor"]:
        raise HTTPException(status_code=403, detail="Only owners and editors can invite members")
        
    # Find user to invite
    stmt = select(User).filter(User.email == email)
    res = await db.execute(stmt)
    invited_user = res.scalars().first()
    if not invited_user:
        # Create a mock placeholder user so they can log in later
        from app.api.routes.auth import get_password_hash
        invited_user = User(email=email, password_hash=get_password_hash("password123"))
        db.add(invited_user)
        await db.commit()
        await db.refresh(invited_user)
        
    # Check if already a member
    stmt = select(WorkspaceMember).filter(WorkspaceMember.workspace_id == workspace_id, WorkspaceMember.user_id == invited_user.id)
    res = await db.execute(stmt)
    if res.scalars().first():
        raise HTTPException(status_code=400, detail="User is already a member of this workspace")
        
    member = WorkspaceMember(workspace_id=workspace_id, user_id=invited_user.id, role=role)
    db.add(member)
    
    # Audit log
    log = AuditLog(workspace_id=workspace_id, user_id=current_user.id, action=f"Invited {email} as {role}")
    db.add(log)
    await db.commit()
    
    return {"message": f"Successfully invited {email} as {role}"}

@router.get("/{workspace_id}/audit-logs")
async def get_audit_logs(
    workspace_id: str,
    search: str = None,
    action_type: str = None,
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Verify user belongs to workspace
    stmt = select(WorkspaceMember).filter(WorkspaceMember.workspace_id == workspace_id, WorkspaceMember.user_id == current_user.id)
    res = await db.execute(stmt)
    if not res.scalars().first():
        raise HTTPException(status_code=403, detail="Not authorized to view audit logs")
        
    # Build query
    query_stmt = select(AuditLog, User.email).outerjoin(User, AuditLog.user_id == User.id).filter(AuditLog.workspace_id == workspace_id)
    
    if search:
        query_stmt = query_stmt.filter(AuditLog.action.like(f"%{search}%"))
        
    if action_type:
        action_type = action_type.lower()
        if action_type == "dataset":
            query_stmt = query_stmt.filter(AuditLog.action.like("%dataset%") | AuditLog.action.like("%profile%"))
        elif action_type == "etl":
            query_stmt = query_stmt.filter(AuditLog.action.like("%etl%") | AuditLog.action.like("%transform%"))
        elif action_type == "automl":
            query_stmt = query_stmt.filter(AuditLog.action.like("%automl%") | AuditLog.action.like("%model%") | AuditLog.action.like("%trained%"))
        elif action_type == "prediction":
            query_stmt = query_stmt.filter(AuditLog.action.like("%predict%") | AuditLog.action.like("%inference%"))
        elif action_type == "deployment":
            query_stmt = query_stmt.filter(AuditLog.action.like("%toggle%") | AuditLog.action.like("%active%") | AuditLog.action.like("%deploy%"))
        else:
            query_stmt = query_stmt.filter(AuditLog.action.like(f"%{action_type}%"))
            
    # Count total matching records
    from sqlalchemy import func
    count_stmt = select(func.count(AuditLog.id)).filter(AuditLog.workspace_id == workspace_id)
    if search:
        count_stmt = count_stmt.filter(AuditLog.action.like(f"%{search}%"))
    if action_type:
        # Reapply action type filters
        if action_type == "dataset":
            count_stmt = count_stmt.filter(AuditLog.action.like("%dataset%") | AuditLog.action.like("%profile%"))
        elif action_type == "etl":
            count_stmt = count_stmt.filter(AuditLog.action.like("%etl%") | AuditLog.action.like("%transform%"))
        elif action_type == "automl":
            count_stmt = count_stmt.filter(AuditLog.action.like("%automl%") | AuditLog.action.like("%model%") | AuditLog.action.like("%trained%"))
        elif action_type == "prediction":
            count_stmt = count_stmt.filter(AuditLog.action.like("%predict%") | AuditLog.action.like("%inference%"))
        elif action_type == "deployment":
            count_stmt = count_stmt.filter(AuditLog.action.like("%toggle%") | AuditLog.action.like("%active%") | AuditLog.action.like("%deploy%"))
        else:
            count_stmt = count_stmt.filter(AuditLog.action.like(f"%{action_type}%"))
            
    res_count = await db.execute(count_stmt)
    total_count = res_count.scalar() or 0
            
    query_stmt = query_stmt.order_by(AuditLog.timestamp.desc()).offset(offset).limit(limit)
    res_logs = await db.execute(query_stmt)
    logs = res_logs.all()
    
    return {
        "total": total_count,
        "logs": [{
            "id": row[0].id,
            "action": row[0].action,
            "timestamp": row[0].timestamp.isoformat(),
            "user": row[1] or "System"
        } for row in logs]
    }


@router.get("/{workspace_id}/audit-logs/export")
async def export_audit_logs(
    workspace_id: str,
    search: str = None,
    action_type: str = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Verify user belongs to workspace
    stmt = select(WorkspaceMember).filter(WorkspaceMember.workspace_id == workspace_id, WorkspaceMember.user_id == current_user.id)
    res = await db.execute(stmt)
    if not res.scalars().first():
        raise HTTPException(status_code=403, detail="Not authorized to view audit logs")
        
    # Query all matching logs
    query_stmt = select(AuditLog, User.email).outerjoin(User, AuditLog.user_id == User.id).filter(AuditLog.workspace_id == workspace_id)
    if search:
        query_stmt = query_stmt.filter(AuditLog.action.like(f"%{search}%"))
    if action_type:
        action_type = action_type.lower()
        if action_type == "dataset":
            query_stmt = query_stmt.filter(AuditLog.action.like("%dataset%") | AuditLog.action.like("%profile%"))
        elif action_type == "etl":
            query_stmt = query_stmt.filter(AuditLog.action.like("%etl%") | AuditLog.action.like("%transform%"))
        elif action_type == "automl":
            query_stmt = query_stmt.filter(AuditLog.action.like("%automl%") | AuditLog.action.like("%model%") | AuditLog.action.like("%trained%"))
        elif action_type == "prediction":
            query_stmt = query_stmt.filter(AuditLog.action.like("%predict%") | AuditLog.action.like("%inference%"))
        elif action_type == "deployment":
            query_stmt = query_stmt.filter(AuditLog.action.like("%toggle%") | AuditLog.action.like("%active%") | AuditLog.action.like("%deploy%"))
        else:
            query_stmt = query_stmt.filter(AuditLog.action.like(f"%{action_type}%"))
            
    query_stmt = query_stmt.order_by(AuditLog.timestamp.desc())
    res_logs = await db.execute(query_stmt)
    logs = res_logs.all()
    
    # Generate CSV in memory
    from fastapi.responses import StreamingResponse
    import io
    import csv
    
    def generate_csv():
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["ID", "Timestamp", "User Email", "Action Details"])
        yield output.getvalue()
        output.seek(0)
        output.truncate(0)
        
        for row in logs:
            writer.writerow([
                row[0].id,
                row[0].timestamp.isoformat(),
                row[1] or "System",
                row[0].action
            ])
            yield output.getvalue()
            output.seek(0)
            output.truncate(0)
            
    return StreamingResponse(
        generate_csv(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=audit_logs_{workspace_id}.csv"}
    )
