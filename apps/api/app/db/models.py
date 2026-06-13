import uuid
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text, JSON, Float, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.supabase import Base

class User(Base):
    __tablename__ = "users"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    subscription_tier = Column(String(50), default="Free")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Workspace(Base):
    __tablename__ = "workspaces"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    owner_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class WorkspaceMember(Base):
    __tablename__ = "workspace_members"
    workspace_id = Column(String(36), ForeignKey("workspaces.id", ondelete="CASCADE"), primary_key=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    role = Column(String(50), default="viewer") # owner, editor, viewer
    joined_at = Column(DateTime(timezone=True), server_default=func.now())

class Dataset(Base):
    __tablename__ = "datasets"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    workspace_id = Column(String(36), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    current_version = Column(Integer, default=1)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class DatasetVersion(Base):
    __tablename__ = "dataset_versions"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    dataset_id = Column(String(36), ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False)
    version_num = Column(Integer, nullable=False)
    file_path_or_url = Column(Text, nullable=False)
    row_count = Column(Integer, default=0)
    col_count = Column(Integer, default=0)
    file_size = Column(Integer, default=0)
    dataset_hash = Column(String(64), nullable=True)
    profile_json = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Chart(Base):
    __tablename__ = "charts"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    workspace_id = Column(String(36), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    dataset_id = Column(String(36), ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    spec_json = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Report(Base):
    __tablename__ = "reports"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    workspace_id = Column(String(36), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    type = Column(String(50), nullable=False) # executive, ml, anomalies
    schedule_json = Column(JSON, nullable=True) # cron schedule metadata
    narrative = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class MLModel(Base):
    __tablename__ = "models"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    workspace_id = Column(String(36), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    dataset_id = Column(String(36), ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False) # model_name
    algorithm = Column(String(100), nullable=True)
    target_column = Column(String(100), nullable=True)
    features = Column(JSON, nullable=True) # list of features
    r2_score = Column(Float, nullable=True)
    rmse = Column(Float, nullable=True)
    file_path = Column(Text, nullable=True) # artifact_path
    version = Column(Integer, default=1)
    metrics_json = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # AutoML Tournament updates
    is_best_model = Column(Boolean, default=False)
    dataset_version_id = Column(String(36), ForeignKey("dataset_versions.id", ondelete="CASCADE"), nullable=True)
    artifact_path = Column(Text, nullable=True)
    feature_columns = Column(JSON, nullable=True)
    is_active = Column(Boolean, default=True)

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    workspace_id = Column(String(36), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action = Column(Text, nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

class APIKey(Base):
    __tablename__ = "api_keys"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    key_hash = Column(String(255), unique=True, nullable=False, index=True)
    label = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class ChatSession(Base):
    __tablename__ = "chat_sessions"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    dataset_id = Column(String(36), ForeignKey("datasets.id", ondelete="CASCADE"), nullable=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class ChatMessage(Base):
    __tablename__ = "chat_messages"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String(36), ForeignKey("chat_sessions.id", ondelete="CASCADE"), nullable=False)
    role = Column(String(50), nullable=False) # assistant, user
    text = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Connection(Base):
    """Saved database connections for SQL Studio multi-source execution."""
    __tablename__ = "connections"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    workspace_id = Column(String(36), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=True)
    name = Column(String(255), nullable=False)
    type = Column(String(50), nullable=False)  # sqlite, postgresql, mysql, google_sheets
    encrypted_credentials = Column(JSON, nullable=True)  # {host, port, database, username, password, sheet_url, ...}
    is_favorite = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class QueryHistory(Base):
    """Query execution audit trail for SQL Studio."""
    __tablename__ = "query_history"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    workspace_id = Column(String(36), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=True)
    connection_id = Column(String(36), ForeignKey("connections.id", ondelete="SET NULL"), nullable=True)
    connector_type = Column(String(50), nullable=False)  # sqlite, postgresql, mysql, google_sheets
    nl_query = Column(Text, nullable=True)  # original natural language input
    sql_query = Column(Text, nullable=False)  # generated or raw SQL
    execution_time_ms = Column(Integer, default=0)
    row_count = Column(Integer, default=0)
    status = Column(String(20), default="success")  # success, error
    error_detail = Column(Text, nullable=True)
    is_favorite = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
