"""
SQL Studio Enterprise — Multi-Source Query Router
Supports SQLite, PostgreSQL, MySQL, and Google Sheets connectors.
"""
from fastapi import APIRouter, Depends, HTTPException, Form, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.future import select
from sqlalchemy import text, inspect, func, delete
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.supabase import get_db, engine
from app.db.models import User, Connection, QueryHistory, AuditLog, Workspace, WorkspaceMember
from app.api.routes.auth import get_current_user
from app.services.sql_connectors import (
    get_connector, validate_sql, DIALECT_MAP, MAX_ROWS,
    SQLiteConnector, PostgreSQLConnector, MySQLConnector, GoogleSheetsConnector
)
import os
import re
import time
import json
import uuid
import io
import csv

router = APIRouter()


# ─── Schema Introspection (preserved for backward compat) ────────────────────

def get_db_schema_sync(connection) -> str:
    """Synchronous helper function to inspect database schema metadata."""
    inspector = inspect(connection)
    tables = inspector.get_table_names()
    schema_parts = []
    
    for table in tables:
        # Ignore system/internal tables
        if table.startswith("sqlite_") or table.startswith("pg_"):
            continue
            
        columns = inspector.get_columns(table)
        col_strs = []
        for col in columns:
            col_name = col['name']
            col_type = str(col['type'])
            pk = " (PK)" if col.get('primary_key') else ""
            nullable = "" if col.get('nullable', True) else " NOT NULL"
            col_strs.append(f"    - {col_name} ({col_type}){pk}{nullable}")
            
        # Get foreign keys to help with JOIN representation
        fkeys = inspector.get_foreign_keys(table)
        fk_strs = []
        for fk in fkeys:
            referred_table = fk.get('referred_table')
            constrained_cols = fk.get('constrained_columns', [])
            referred_cols = fk.get('referred_columns', [])
            for c_col, r_col in zip(constrained_cols, referred_cols):
                fk_strs.append(f"    - FK: {c_col} references {referred_table}({r_col})")
                
        table_schema = f"Table '{table}':\n" + "\n".join(col_strs)
        if fk_strs:
            table_schema += "\n" + "\n".join(fk_strs)
        schema_parts.append(table_schema)
        
    return "\n\n".join(schema_parts)

async def get_live_schema() -> str:
    """Asynchronously inspect the live schema via engine connection."""
    async with engine.connect() as conn:
        return await conn.run_sync(get_db_schema_sync)



async def _resolve_workspace_id(user_id: str, db: AsyncSession) -> str:
    """Resolve a workspace ID for the user, creating a default one if none exists."""
    stmt = select(Workspace).join(WorkspaceMember).filter(WorkspaceMember.user_id == user_id).limit(1)
    res = await db.execute(stmt)
    ws = res.scalars().first()
    if ws:
        return ws.id
    
    workspace = Workspace(name="Personal Workspace", owner_id=user_id)
    db.add(workspace)
    await db.commit()
    await db.refresh(workspace)
    
    member = WorkspaceMember(workspace_id=workspace.id, user_id=user_id, role="owner")
    db.add(member)
    await db.commit()
    return workspace.id


# ─── Helper: Resolve Connector ───────────────────────────────────────────────

async def _resolve_connector(
    connector_type: str,
    connection_id: str | None,
    credentials: dict | None,
    db: AsyncSession
):
    """Resolve connector from connection_id, inline credentials, or default SQLite."""
    if connector_type == "sqlite":
        return get_connector("sqlite"), None

    if connection_id:
        stmt = select(Connection).filter(Connection.id == connection_id)
        res = await db.execute(stmt)
        conn_record = res.scalars().first()
        if not conn_record:
            raise HTTPException(status_code=404, detail="Saved connection not found")
        creds = conn_record.encrypted_credentials or {}
        return get_connector(conn_record.type, creds), conn_record

    if credentials:
        return get_connector(connector_type, credentials), None

    raise HTTPException(status_code=400, detail=f"Credentials are required for {connector_type} connector.")


# ─── Helper: Generate SQL from NL ────────────────────────────────────────────

async def _generate_sql(nl_query: str, schema_info: str, dialect: str) -> str:
    """Use LLM to generate SQL from natural language."""
    api_key = os.getenv("OPENAI_API_KEY", "")
    if not api_key or api_key.strip() == "" or "your_" in api_key.lower():
        raise HTTPException(
            status_code=400,
            detail="AI service is not configured. OPENAI_API_KEY or Gemini API key is missing."
        )

    try:
        from langchain_google_genai import ChatGoogleGenerativeAI
        from langchain_openai import ChatOpenAI
        from langchain_core.messages import SystemMessage, HumanMessage

        if api_key.startswith("AQ") or api_key.startswith("AIza"):
            llm = ChatGoogleGenerativeAI(
                model="gemini-2.5-flash",
                temperature=0.1,
                google_api_key=api_key,
            )
        else:
            llm = ChatOpenAI(model="gpt-4o", temperature=0.1, api_key=api_key)

        system_prompt = f"""You are an expert SQL Generator. Your task is to output ONLY a raw executable {dialect} SQL query matching the user request.
Do not output markdown code blocks (like ```sql), do not write explanations, just the SQL query string.
The target database schema is as follows:
{schema_info}
"""
        msg = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=f"Query: {nl_query}")
        ]
        response = llm.invoke(msg)
        generated_sql = response.content.replace("```sql", "").replace("```", "").strip()
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"AI SQL generation failed: {str(e)}"
        )

    if not generated_sql:
        raise HTTPException(status_code=500, detail="AI generated an empty SQL query.")

    return generated_sql


# ═══════════════════════════════════════════════════════════════════════════════
#  EXECUTE — Multi-source NL or Raw SQL execution
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/execute")
async def execute_query(
    query: str = Form(...),
    connector_type: str = Form("sqlite"),
    connection_id: str = Form(None),
    raw_sql: bool = Form(False),
    credentials: str = Form(None),  # JSON string for inline creds
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Execute NL→SQL or raw SQL against any supported connector."""
    # Parse credentials
    creds_dict = None
    if credentials:
        try:
            creds_dict = json.loads(credentials)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid credentials JSON")

    connector, conn_record = await _resolve_connector(connector_type, connection_id, creds_dict, db)

    # Resolve workspace_id for logging/audit
    ws_id = None
    if conn_record and conn_record.workspace_id:
        ws_id = conn_record.workspace_id
    else:
        ws_id = await _resolve_workspace_id(current_user.id, db)

    # Determine SQL to execute
    # Auto-detect if user typed a raw SQL query even in NL mode to prevent rate limits
    is_raw_sql = raw_sql or bool(re.match(r'^\s*(SELECT|WITH|SHOW|DESCRIBE|DESC|EXPLAIN|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\b', query, re.IGNORECASE))

    if is_raw_sql:
        generated_sql = query.strip()
    else:
        # Get schema for the target connector
        try:
            schema_info = await connector.get_schema()
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to inspect database schema: {str(e)}")

        dialect = DIALECT_MAP.get(connector_type, "SQL")
        generated_sql = await _generate_sql(query, schema_info, dialect)

    # Execute
    t0 = time.time()
    try:
        result = await connector.execute(generated_sql)
    except ValueError as e:
        # Log failed query
        history = QueryHistory(
            workspace_id=ws_id,
            connection_id=connection_id,
            connector_type=connector_type,
            nl_query=query if not raw_sql else None,
            sql_query=generated_sql,
            execution_time_ms=int((time.time() - t0) * 1000),
            row_count=0,
            status="error",
            error_detail=str(e)
        )
        db.add(history)
        await db.commit()
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        history = QueryHistory(
            workspace_id=ws_id,
            connection_id=connection_id,
            connector_type=connector_type,
            nl_query=query if not raw_sql else None,
            sql_query=generated_sql,
            execution_time_ms=int((time.time() - t0) * 1000),
            row_count=0,
            status="error",
            error_detail=str(e)
        )
        db.add(history)
        await db.commit()
        raise HTTPException(status_code=422, detail=f"Database execution failed: {str(e)}")

    # Log successful query
    history = QueryHistory(
        workspace_id=ws_id,
        connection_id=connection_id,
        connector_type=connector_type,
        nl_query=query if not raw_sql else None,
        sql_query=generated_sql,
        execution_time_ms=result.get("execution_time_ms", 0),
        row_count=result.get("row_count", 0),
        status="success"
    )
    db.add(history)

    # Audit log
    audit = AuditLog(
        workspace_id=ws_id,
        user_id=current_user.id,
        action=f"Executed SQL query on {connector_type} connector ({result.get('row_count', 0)} rows, {result.get('execution_time_ms', 0)}ms)"
    )
    db.add(audit)
    await db.commit()

    return {
        "sql": generated_sql,
        "columns": result.get("columns", []),
        "rows": result.get("rows", []),
        "row_count": result.get("row_count", 0),
        "execution_time_ms": result.get("execution_time_ms", 0),
        "connector_type": connector_type,
        "history_id": history.id
    }


# ═══════════════════════════════════════════════════════════════════════════════
#  CONNECTIONS CRUD
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/connections")
async def list_connections(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List all saved connections."""
    stmt = select(Connection).order_by(Connection.is_favorite.desc(), Connection.created_at.desc())
    res = await db.execute(stmt)
    connections = res.scalars().all()
    return [{
        "id": c.id,
        "name": c.name,
        "type": c.type,
        "is_favorite": c.is_favorite,
        "created_at": c.created_at.isoformat() if c.created_at else None,
        "credentials_summary": _summarize_creds(c.type, c.encrypted_credentials)
    } for c in connections]


def _summarize_creds(ctype: str, creds: dict | None) -> str:
    """Return a safe summary of connection credentials (no passwords)."""
    if not creds:
        return "No credentials"
    if ctype == "sqlite":
        return "Local datamind.db"
    if ctype in ("postgresql", "mysql"):
        host = creds.get("host", "?")
        port = creds.get("port", "?")
        database = creds.get("database", "?")
        return f"{host}:{port}/{database}"
    if ctype == "google_sheets":
        url = creds.get("sheet_url", "")
        return url[:60] + "..." if len(url) > 60 else url
    return "Configured"


@router.post("/connections")
async def create_connection(
    name: str = Form(...),
    type: str = Form(...),
    credentials: str = Form("{}"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create and save a new database connection."""
    if type not in ("sqlite", "postgresql", "mysql", "google_sheets", "aws_s3", "snowflake", "bigquery"):
        raise HTTPException(status_code=400, detail=f"Invalid connector type: {type}")

    try:
        creds = json.loads(credentials)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid credentials JSON")

    conn = Connection(
        name=name,
        type=type,
        encrypted_credentials=creds,
        workspace_id=None
    )
    db.add(conn)
    await db.commit()
    await db.refresh(conn)

    return {
        "id": conn.id,
        "name": conn.name,
        "type": conn.type,
        "is_favorite": conn.is_favorite,
        "created_at": conn.created_at.isoformat() if conn.created_at else None
    }


@router.delete("/connections/{connection_id}")
async def delete_connection(
    connection_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a saved connection."""
    stmt = select(Connection).filter(Connection.id == connection_id)
    res = await db.execute(stmt)
    conn = res.scalars().first()
    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found")
    await db.delete(conn)
    await db.commit()
    return {"message": "Connection deleted"}


@router.post("/connections/{connection_id}/test")
async def test_connection(
    connection_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Test a saved connection's health and accessibility."""
    stmt = select(Connection).filter(Connection.id == connection_id)
    res = await db.execute(stmt)
    conn = res.scalars().first()
    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found")

    connector = get_connector(conn.type, conn.encrypted_credentials)
    return await connector.test_connection()


@router.post("/connections/{connection_id}/toggle-favorite")
async def toggle_connection_favorite(
    connection_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Toggle favorite status of a saved connection."""
    stmt = select(Connection).filter(Connection.id == connection_id)
    res = await db.execute(stmt)
    conn = res.scalars().first()
    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found")
    conn.is_favorite = not conn.is_favorite
    await db.commit()
    return {"id": conn.id, "is_favorite": conn.is_favorite}


@router.get("/connections/{connection_id}/catalog")
async def get_connection_catalog(
    connection_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get the data catalog (tables, columns, types, samples) for a connection."""
    if connection_id == "sqlite":
        connector = SQLiteConnector()
        return await connector.get_catalog()

    stmt = select(Connection).filter(Connection.id == connection_id)
    res = await db.execute(stmt)
    conn = res.scalars().first()
    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found")

    connector = get_connector(conn.type, conn.encrypted_credentials)
    return await connector.get_catalog()


# ═══════════════════════════════════════════════════════════════════════════════
#  QUERY HISTORY
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/history")
async def list_query_history(
    limit: int = 50,
    offset: int = 0,
    connector_type: str = None,
    status: str = None,
    search: str = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List query history with pagination, filtering, and search."""
    stmt = select(QueryHistory)

    if connector_type:
        stmt = stmt.filter(QueryHistory.connector_type == connector_type)
    if status:
        stmt = stmt.filter(QueryHistory.status == status)
    if search:
        stmt = stmt.filter(QueryHistory.sql_query.like(f"%{search}%") | QueryHistory.nl_query.like(f"%{search}%"))

    # Count
    count_stmt = select(func.count(QueryHistory.id))
    if connector_type:
        count_stmt = count_stmt.filter(QueryHistory.connector_type == connector_type)
    if status:
        count_stmt = count_stmt.filter(QueryHistory.status == status)
    if search:
        count_stmt = count_stmt.filter(QueryHistory.sql_query.like(f"%{search}%") | QueryHistory.nl_query.like(f"%{search}%"))
    res_count = await db.execute(count_stmt)
    total = res_count.scalar() or 0

    stmt = stmt.order_by(QueryHistory.created_at.desc()).offset(offset).limit(limit)
    res = await db.execute(stmt)
    entries = res.scalars().all()

    return {
        "total": total,
        "entries": [{
            "id": h.id,
            "connector_type": h.connector_type,
            "nl_query": h.nl_query,
            "sql_query": h.sql_query,
            "execution_time_ms": h.execution_time_ms,
            "row_count": h.row_count,
            "status": h.status,
            "error_detail": h.error_detail,
            "is_favorite": h.is_favorite,
            "created_at": h.created_at.isoformat() if h.created_at else None
        } for h in entries]
    }


@router.post("/history/{history_id}/rerun")
async def rerun_query(
    history_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Re-execute a historical query."""
    stmt = select(QueryHistory).filter(QueryHistory.id == history_id)
    res = await db.execute(stmt)
    entry = res.scalars().first()
    if not entry:
        raise HTTPException(status_code=404, detail="History entry not found")

    connector, _ = await _resolve_connector(entry.connector_type, entry.connection_id, None, db)
    try:
        result = await connector.execute(entry.sql_query)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Rerun failed: {str(e)}")

    return {
        "sql": entry.sql_query,
        "columns": result.get("columns", []),
        "rows": result.get("rows", []),
        "row_count": result.get("row_count", 0),
        "execution_time_ms": result.get("execution_time_ms", 0),
        "connector_type": entry.connector_type
    }


@router.post("/history/{history_id}/toggle-favorite")
async def toggle_history_favorite(
    history_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Toggle favorite on a history entry."""
    stmt = select(QueryHistory).filter(QueryHistory.id == history_id)
    res = await db.execute(stmt)
    entry = res.scalars().first()
    if not entry:
        raise HTTPException(status_code=404, detail="History entry not found")
    entry.is_favorite = not entry.is_favorite
    await db.commit()
    return {"id": entry.id, "is_favorite": entry.is_favorite}


# ═══════════════════════════════════════════════════════════════════════════════
#  EXPLAIN QUERY
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/explain")
async def explain_query(
    query: str = Form(...),
    connector_type: str = Form("sqlite"),
    connection_id: str = Form(None),
    credentials: str = Form(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Run EXPLAIN ANALYZE on a query and return the execution plan."""
    creds_dict = json.loads(credentials) if credentials else None
    connector, _ = await _resolve_connector(connector_type, connection_id, creds_dict, db)

    try:
        return await connector.explain(query)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Explain failed: {str(e)}")


# ═══════════════════════════════════════════════════════════════════════════════
#  AI QUERY OPTIMIZER
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/optimize")
async def optimize_query(
    query: str = Form(...),
    connector_type: str = Form("sqlite"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """AI-powered query optimization. Returns an improved version of the SQL."""
    api_key = os.getenv("OPENAI_API_KEY", "")
    if not api_key or api_key.strip() == "" or "your_" in api_key.lower():
        raise HTTPException(status_code=400, detail="AI service is not configured.")

    dialect = DIALECT_MAP.get(connector_type, "SQL")

    try:
        from langchain_google_genai import ChatGoogleGenerativeAI
        from langchain_openai import ChatOpenAI
        from langchain_core.messages import SystemMessage, HumanMessage

        if api_key.startswith("AQ") or api_key.startswith("AIza"):
            llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0.1, google_api_key=api_key)
        else:
            llm = ChatOpenAI(model="gpt-4o", temperature=0.1, api_key=api_key)

        system_prompt = f"""You are a senior database performance engineer. Analyze the following {dialect} SQL query and return an optimized version.

Rules:
1. Output ONLY the optimized SQL query — no markdown, no explanations, no code blocks.
2. If the query is already optimal, return it unchanged.
3. Common optimizations: avoid function calls in WHERE clauses, use date range comparisons instead of YEAR(), push filters early, avoid SELECT *, use EXISTS instead of IN for subqueries.

After the SQL, on a new line, output EXACTLY one line starting with "IMPROVEMENT:" followed by a brief description of what was improved and estimated speed gain."""

        msg = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=f"Original SQL:\n{query}")
        ]
        response = llm.invoke(msg)
        text_response = response.content.strip()

        # Parse optimized SQL and improvement note
        lines = text_response.split("\n")
        improvement_line = ""
        sql_lines = []
        for line in lines:
            if line.strip().startswith("IMPROVEMENT:"):
                improvement_line = line.strip().replace("IMPROVEMENT:", "").strip()
            else:
                sql_lines.append(line)

        optimized_sql = "\n".join(sql_lines).replace("```sql", "").replace("```", "").strip()

        return {
            "original_sql": query,
            "optimized_sql": optimized_sql,
            "improvement": improvement_line or "Query reviewed — no major improvements identified.",
            "dialect": dialect
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Optimization failed: {str(e)}")


# ═══════════════════════════════════════════════════════════════════════════════
#  QUERY INSIGHTS
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/insights")
async def generate_insights(
    sql: str = Form(...),
    columns: str = Form("[]"),
    rows: str = Form("[]"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Generate LLM-powered insights from query results."""
    api_key = os.getenv("OPENAI_API_KEY", "")
    if not api_key or api_key.strip() == "" or "your_" in api_key.lower():
        raise HTTPException(status_code=400, detail="AI service is not configured.")

    try:
        columns_list = json.loads(columns)
        rows_list = json.loads(rows)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid columns/rows JSON")

    # Limit data sent to LLM
    sample_rows = rows_list[:20]
    data_preview = json.dumps({"columns": columns_list, "sample_rows": sample_rows}, default=str)

    try:
        from langchain_google_genai import ChatGoogleGenerativeAI
        from langchain_openai import ChatOpenAI
        from langchain_core.messages import SystemMessage, HumanMessage

        if api_key.startswith("AQ") or api_key.startswith("AIza"):
            llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0.3, google_api_key=api_key)
        else:
            llm = ChatOpenAI(model="gpt-4o", temperature=0.3, api_key=api_key)

        system_prompt = """You are a senior data analyst. Given the SQL query and its results, generate 3-5 actionable insights.

Output format — a JSON array of insight objects:
[
  {"title": "Short Title", "description": "1-2 sentence insight", "type": "trend|comparison|anomaly|summary"}
]

Output ONLY the JSON array. No markdown, no code blocks, no explanations."""

        msg = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=f"SQL Query:\n{sql}\n\nResults ({len(rows_list)} total rows):\n{data_preview}")
        ]
        response = llm.invoke(msg)
        text_response = response.content.strip().replace("```json", "").replace("```", "").strip()
        insights = json.loads(text_response)
        return {"insights": insights}
    except json.JSONDecodeError:
        return {"insights": [{"title": "Analysis Complete", "description": f"Query returned {len(rows_list)} rows across {len(columns_list)} columns.", "type": "summary"}]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Insight generation failed: {str(e)}")


# ═══════════════════════════════════════════════════════════════════════════════
#  EXPORT
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/export")
async def export_results(
    format: str = Form("csv"),
    columns: str = Form("[]"),
    rows: str = Form("[]"),
    current_user: User = Depends(get_current_user),
):
    """Export query results in CSV, JSON, Excel, or Parquet format."""
    try:
        columns_list = json.loads(columns)
        rows_list = json.loads(rows)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid columns/rows JSON")

    import pandas as pd
    df = pd.DataFrame(rows_list, columns=columns_list if columns_list else None)

    if format == "csv":
        output = io.StringIO()
        df.to_csv(output, index=False)
        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=query_results.csv"}
        )
    elif format == "json":
        json_str = df.to_json(orient="records", default_handler=str)
        return StreamingResponse(
            iter([json_str]),
            media_type="application/json",
            headers={"Content-Disposition": "attachment; filename=query_results.json"}
        )
    elif format == "excel":
        output = io.BytesIO()
        df.to_excel(output, index=False, engine="openpyxl")
        output.seek(0)
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=query_results.xlsx"}
        )
    elif format == "parquet":
        output = io.BytesIO()
        df.to_parquet(output, index=False)
        output.seek(0)
        return StreamingResponse(
            output,
            media_type="application/octet-stream",
            headers={"Content-Disposition": "attachment; filename=query_results.parquet"}
        )
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported export format: {format}")


# ═══════════════════════════════════════════════════════════════════════════════
#  INLINE TEST CONNECTION (without saving)
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/test-connection")
async def test_inline_connection(
    connector_type: str = Form(...),
    credentials: str = Form("{}"),
    current_user: User = Depends(get_current_user),
):
    """Test a connection without saving it."""
    try:
        creds = json.loads(credentials)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid credentials JSON")

    connector = get_connector(connector_type, creds if connector_type != "sqlite" else None)
    return await connector.test_connection()
