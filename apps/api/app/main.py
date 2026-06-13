from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import analytics, automl, synthetic, ai, reports, auth, workspaces, datasets, query, monitoring, enterprise
from contextlib import asynccontextmanager
from app.db.supabase import engine, Base, get_db
import app.db.models # Ensure models are loaded and registered
from sqlalchemy import text

@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Migrate sqlite/postgres columns if needed
        for query_str in [
            "ALTER TABLE users ADD COLUMN subscription_tier VARCHAR(50) DEFAULT 'Free'",
            "ALTER TABLE dataset_versions ADD COLUMN file_size INTEGER DEFAULT 0",
            "ALTER TABLE dataset_versions ADD COLUMN dataset_hash VARCHAR(64)",
            "ALTER TABLE models ADD COLUMN workspace_id VARCHAR(36) REFERENCES workspaces(id) ON DELETE CASCADE",
            "ALTER TABLE models ADD COLUMN algorithm VARCHAR(100)",
            "ALTER TABLE models ADD COLUMN target_column VARCHAR(100)",
            "ALTER TABLE models ADD COLUMN features JSON",
            "ALTER TABLE models ADD COLUMN r2_score FLOAT",
            "ALTER TABLE models ADD COLUMN rmse FLOAT",
            "ALTER TABLE models ADD COLUMN version INTEGER DEFAULT 1",
            "ALTER TABLE models ADD COLUMN is_best_model BOOLEAN DEFAULT 0",
            "ALTER TABLE models ADD COLUMN dataset_version_id VARCHAR(36) REFERENCES dataset_versions(id) ON DELETE CASCADE",
            "ALTER TABLE models ADD COLUMN artifact_path TEXT",
            "ALTER TABLE models ADD COLUMN feature_columns JSON",
            "ALTER TABLE models ADD COLUMN is_active BOOLEAN DEFAULT 1"
        ]:
            try:
                await conn.execute(text(query_str))
            except Exception:
                pass
    # Run feature_columns repair for legacy records on startup
    try:
        from repair_feature_columns import repair as repair_feature_columns
        await repair_feature_columns()
    except Exception as e:
        print(f"Startup repair failed: {e}")
    yield

app = FastAPI(
    title="DataMind AI Backend",
    description="Next-Gen Async ML Pipeline",
    version="2.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://localhost:3002", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(workspaces.router, prefix="/api/v1/workspaces", tags=["workspaces"])
app.include_router(datasets.router, prefix="/api/v1/datasets", tags=["datasets"])
app.include_router(analytics.router, prefix="/api/v1/analytics", tags=["analytics"])
app.include_router(automl.router, prefix="/api/v1/automl", tags=["automl"])
app.include_router(synthetic.router, prefix="/api/v1/synthetic", tags=["synthetic"])
app.include_router(ai.router, prefix="/api/v1/ai", tags=["ai"])
app.include_router(reports.router, prefix="/api/v1/reports", tags=["reports"])
app.include_router(query.router, prefix="/api/v1/query", tags=["query"])
app.include_router(monitoring.router, prefix="/api/v1/monitoring", tags=["monitoring"])
app.include_router(enterprise.router, prefix="/api/v1/enterprise", tags=["enterprise"])

@app.post("/api/predict/{model_id}", tags=["predictions"])
async def root_predict_endpoint(
    model_id: str,
    payload: dict,
    db = Depends(get_db)
):
    """Expose a root-level prediction endpoint for model deployment."""
    from app.api.routes.automl import predict_endpoint
    return await predict_endpoint(model_id, payload, db)

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "engine": "FastAPI DataMind v2.0 Active",
        "modules": ["analytics", "automl", "synthetic"]
    }

# Custom dynamic OpenAPI injection to document all model predict schemas in Swagger UI
def custom_openapi():
    from fastapi.openapi.utils import get_openapi
    from app.db.supabase import SUPABASE_DB_URL
    from sqlalchemy import create_engine, text
    import json

    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
    )

    try:
        # Construct sync URL from async DB URL
        sync_url = SUPABASE_DB_URL.replace("+aiosqlite", "").replace("+asyncpg", "")
        sync_engine = create_engine(sync_url)
        with sync_engine.connect() as conn:
            result = conn.execute(text("SELECT id, name, algorithm, target_column, feature_columns FROM models"))
            models = result.fetchall()
            
        for m_id, m_name, m_algo, m_target, m_features in models:
            if not m_features:
                continue
            
            if isinstance(m_features, str):
                try:
                    features_list = json.loads(m_features)
                except Exception:
                    features_list = []
            else:
                features_list = m_features
                
            if not features_list:
                continue
                
            path_str = f"/api/predict/{m_id}"
            
            # Map features to OpenAPI schema properties and build dynamic mock example
            properties = {}
            example_obj = {}
            for feature in features_list:
                feature_lower = feature.lower()
                # Determine type
                if "country" in feature_lower or "industry" in feature_lower or "category" in feature_lower or "type" in feature_lower or "cat" in feature_lower:
                    feat_type = "string"
                else:
                    feat_type = "number"
                properties[feature] = {
                    "type": feat_type,
                    "description": f"Input feature: {feature}"
                }
                # Assign dynamic example value
                if "year" in feature_lower:
                    example_obj[feature] = 2025
                elif "age" in feature_lower:
                    example_obj[feature] = 35
                elif "rate" in feature_lower or "ratio" in feature_lower or "pct" in feature_lower or "level" in feature_lower or "fraction" in feature_lower:
                    example_obj[feature] = 0.55
                elif "hour" in feature_lower:
                    example_obj[feature] = 76
                elif "count" in feature_lower or "num" in feature_lower or "id" in feature_lower:
                    example_obj[feature] = 10
                elif "country" in feature_lower:
                    example_obj[feature] = "USA"
                elif "industry" in feature_lower:
                    example_obj[feature] = "Finance"
                elif "category" in feature_lower or "type" in feature_lower:
                    example_obj[feature] = "A"
                else:
                    example_obj[feature] = 1.0

            openapi_schema["paths"][path_str] = {
                "post": {
                    "tags": ["predictions"],
                    "summary": f"Predict with {m_algo} ({m_name})",
                    "description": f"Target column: {m_target}",
                    "operationId": f"predict_model_{m_id.replace('-', '_')}",
                    "requestBody": {
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "properties": properties,
                                    "required": features_list
                                },
                                "example": example_obj
                            }
                        },
                        "required": True
                    },
                    "responses": {
                        "200": {
                            "description": "Successful Response",
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "type": "object",
                                        "properties": {
                                            "model_id": {"type": "string"},
                                            "prediction": {"type": "number"},
                                            "algorithm": {"type": "string"},
                                            "target_column": {"type": "string"}
                                        }
                                    }
                                }
                            }
                        },
                        "400": {
                            "description": "Validation Error"
                        },
                        "404": {
                            "description": "Model Not Found"
                        }
                    }
                }
            }
    except Exception as e:
        print(f"Error dynamically injecting schemas into OpenAPI: {e}")
        
    return openapi_schema

app.openapi = custom_openapi