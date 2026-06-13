from fastapi import APIRouter, Depends, HTTPException, status, Form
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.supabase import get_db
from app.db.models import User, Workspace, WorkspaceMember
from jose import JWTError, jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta

router = APIRouter()

SECRET_KEY = "datamind_super_secret_key"
ALGORITHM = "HS256"
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/login", auto_error=False)

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=7)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)):
    # Fallback to demo user if no token is provided (to make recruiter evaluation seamless)
    if not token:
        result = await db.execute(select(User).filter(User.email == "demo@datamind.ai"))
        user = result.scalars().first()
        if not user:
            user = User(email="demo@datamind.ai", password_hash=pwd_context.hash("demo123"))
            db.add(user)
            await db.commit()
            await db.refresh(user)
        return user

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Could not validate credentials")
    except JWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")
    
    result = await db.execute(select(User).filter(User.email == email))
    user = result.scalars().first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user

@router.post("/signup")
async def signup(email: str = Form(...), password: str = Form(...), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).filter(User.email == email))
    existing_user = result.scalars().first()
    if existing_user:
        # Check if the user was created as a placeholder during workspace membership invite.
        # Placeholder users won't own any workspaces.
        stmt_w = select(Workspace).filter(Workspace.owner_id == existing_user.id)
        res_w = await db.execute(stmt_w)
        owned_workspaces = res_w.scalars().all()
        
        if owned_workspaces:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        # Complete registration for invited placeholder user
        hashed_pwd = get_password_hash(password)
        existing_user.password_hash = hashed_pwd
        db.add(existing_user)
        
        # Create a personal workspace for them
        workspace = Workspace(name="Personal Workspace", owner_id=existing_user.id)
        db.add(workspace)
        await db.commit()
        await db.refresh(workspace)
        
        member = WorkspaceMember(workspace_id=workspace.id, user_id=existing_user.id, role="owner")
        db.add(member)
        await db.commit()
        
        token = create_access_token({"sub": existing_user.email})
        return {"access_token": token, "token_type": "bearer", "user": {"id": existing_user.id, "email": existing_user.email}}
    
    hashed_pwd = get_password_hash(password)
    user = User(email=email, password_hash=hashed_pwd)
    db.add(user)
    await db.commit()
    await db.refresh(user)

    # Automatically create a default personal workspace for the new user
    workspace = Workspace(name="Personal Workspace", owner_id=user.id)
    db.add(workspace)
    await db.commit()
    await db.refresh(workspace)

    # Add as owner of the workspace
    member = WorkspaceMember(workspace_id=workspace.id, user_id=user.id, role="owner")
    db.add(member)
    await db.commit()

    token = create_access_token({"sub": user.email})
    return {"access_token": token, "token_type": "bearer", "user": {"id": user.id, "email": user.email}}

@router.post("/login")
async def login(email: str = Form(...), password: str = Form(...), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).filter(User.email == email))
    user = result.scalars().first()
    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    token = create_access_token({"sub": user.email})
    return {"access_token": token, "token_type": "bearer", "user": {"id": user.id, "email": user.email}}
