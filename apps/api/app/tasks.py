import asyncio
import os
import json
import uuid
import pandas as pd
import numpy as np
from celery import shared_task
from app.core.celery_app import celery_app
from app.db.supabase import AsyncSessionLocal
from app.db.models import DatasetVersion, Dataset, MLModel, Report, AuditLog
from app.services import ml_service
from sqlalchemy.future import select

def run_async(coro):
    try:
        return asyncio.run(coro)
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        return loop.run_until_complete(coro)

@celery_app.task
def process_file_upload_task(version_id: str):
    """Asynchronously reads uploaded file, generates profiles/stats, and saves to database."""
    async def _process():
        async with AsyncSessionLocal() as db:
            # Fetch DatasetVersion
            res = await db.execute(select(DatasetVersion).filter(DatasetVersion.id == version_id))
            version = res.scalars().first()
            if not version:
                print(f"[Worker Error] Version {version_id} not found.")
                return

            file_path = version.file_path_or_url
            if not os.path.exists(file_path):
                print(f"[Worker Error] File not found at path: {file_path}")
                return

            try:
                # Read file
                if file_path.endswith('.csv'):
                    df = pd.read_csv(file_path)
                else:
                    df = pd.read_excel(file_path)
            except Exception as e:
                print(f"[Worker Error] Failed to read file: {e}")
                return

            # Generate profile
            profile = ml_service.get_data_profile(df)
            
            # Additional metrics
            insights = ml_service.generate_business_insights(df)
            health_score_data = ml_service.compute_advanced_health_score(df)
            
            # Build full profile JSON
            profile_data = {
                "profile": profile,
                "insights": insights,
                "quality_score": health_score_data["quality"],
                "health_score": health_score_data,
                "numeric_columns": df.select_dtypes(include=[np.number]).columns.tolist(),
                "categorical_columns": df.select_dtypes(include=['object', 'category']).columns.tolist(),
                # Store sample records (first 100)
                "sample": json.loads(df.head(100).to_json(orient='records'))
            }

            # Generate advanced stats
            advanced_stats = {}
            for col in df.columns:
                null_cnt = int(df[col].isnull().sum())
                null_pct = float(null_cnt / len(df) * 100)
                dtype_str = str(df[col].dtype)
                
                col_stats = {
                    "dtype": dtype_str,
                    "null_cnt": null_cnt,
                    "null_pct": null_pct
                }
                
                if pd.api.types.is_numeric_dtype(df[col]):
                    col_stats["mean"] = float(df[col].mean()) if not pd.isna(df[col].mean()) else None
                    col_stats["std"] = float(df[col].std()) if not pd.isna(df[col].std()) else None
                    
                    # Outliers
                    Q1 = df[col].quantile(0.25)
                    Q3 = df[col].quantile(0.75)
                    IQR = Q3 - Q1
                    outliers = df[(df[col] < Q1 - 1.5*IQR) | (df[col] > Q3 + 1.5*IQR)]
                    col_stats["outlier_count"] = int(len(outliers))
                    col_stats["outlier_pct"] = float(len(outliers) / len(df) * 100)
                else:
                    top_vals = df[col].value_counts()
                    col_stats["top_value"] = str(top_vals.index[0]) if not top_vals.empty else None
                    
                advanced_stats[col] = col_stats
                
            profile_data["advanced_stats"] = advanced_stats

            # Update DatasetVersion in DB
            version.row_count = len(df)
            version.col_count = len(df.columns)
            # Use standard serialization for numpy/pandas types
            version.profile_json = json.loads(json.dumps(profile_data, default=ml_service.convert_to_json_serializable))
            
            # Update Dataset current version
            res_ds = await db.execute(select(Dataset).filter(Dataset.id == version.dataset_id))
            dataset = res_ds.scalars().first()
            if dataset:
                dataset.current_version = version.version_num

            await db.commit()
            print(f"[Worker Success] Processed version {version_id} with {len(df)} rows.")

    run_async(_process())

@celery_app.task
def train_automl_async_task(dataset_version_id: str, target_col: str, feature_cols: list, tuning_method: str = "default"):
    """Runs AutoML model search, parameter sweeps, saves pickles, and writes model records."""
    async def _train():
        async with AsyncSessionLocal() as db:
            res = await db.execute(select(DatasetVersion).filter(DatasetVersion.id == dataset_version_id))
            version = res.scalars().first()
            if not version:
                print(f"[Worker Error] Version {dataset_version_id} not found.")
                return

            res_ds = await db.execute(select(Dataset).filter(Dataset.id == version.dataset_id))
            dataset = res_ds.scalars().first()
            workspace_id = dataset.workspace_id if dataset else None

            file_path = version.file_path_or_url
            try:
                df = pd.read_csv(file_path) if file_path.endswith('.csv') else pd.read_excel(file_path)
            except Exception as e:
                print(f"[Worker Error] Failed to read dataset: {e}")
                return

            # Train models
            try:
                results = ml_service.run_automl(df, target_col, feature_cols, tuning_method)
                if "error" in results:
                    print(f"[Worker Error] AutoML failed: {results['error']}")
                    return

                trained_models = results.get("trained_models", {})
                leaderboard = results["leaderboard"]
                best_model_name = results["best_model"]

                # Iterate through leaderboard in reversed order (worst to best) to maintain created_at order in queries
                for entry in reversed(leaderboard):
                    algo_name = entry["model"]
                    r2 = entry["r2_score"]
                    rmse = entry["rmse"]
                    
                    model_obj = trained_models.get(algo_name)
                    if model_obj is None:
                        continue

                    # Determine versioning of models for this dataset
                    stmt_m = select(MLModel).filter(
                        MLModel.dataset_id == version.dataset_id,
                        MLModel.algorithm == algo_name
                    )
                    res_m = await db.execute(stmt_m)
                    existing_models = res_m.scalars().all()
                    model_version = len(existing_models) + 1

                    # Save model artifact to disk
                    model_dir = "storage/models"
                    os.makedirs(model_dir, exist_ok=True)
                    model_id = str(uuid.uuid4())
                    model_path = os.path.join(model_dir, f"{model_id}.pkl")
                    
                    model_payload = {
                        "model": model_obj,
                        "preprocessor": results["preprocessor"],
                        "features": results["feature_cols"],
                        "target_column": results["target_col"],
                        "algorithm": algo_name,
                        "is_classification": results["is_classification"]
                    }
                    import joblib
                    joblib.dump(model_payload, model_path)

                    is_best = (algo_name == best_model_name)
                    feature_columns = results["feature_cols"]
                    assert feature_columns is not None and len(feature_columns) > 0, "feature_columns must not be empty"

                    # Save model details in database
                    model_record = MLModel(
                        id=model_id,
                        workspace_id=workspace_id,
                        dataset_id=version.dataset_id,
                        name=f"{algo_name} - v{model_version} (Async)",
                        algorithm=algo_name,
                        target_column=results["target_col"],
                        features=feature_columns,
                        r2_score=r2,
                        rmse=rmse,
                        file_path=model_path,
                        version=model_version,
                        metrics_json={
                            "leaderboard": leaderboard,
                            "shap_drivers": results.get("shap_drivers", []) if is_best else []
                        },
                        is_best_model=is_best,
                        dataset_version_id=version.id,
                        artifact_path=model_path,
                        feature_columns=feature_columns
                    )
                    db.add(model_record)

                await db.commit()
                print(f"[Worker Success] Trained all tournament models. Best model: {best_model_name}")
            except Exception as e:
                print(f"[Worker Error] AutoML failed: {e}")

    run_async(_train())

@celery_app.task
def send_scheduled_report_task(report_id: str, email: str):
    """Compiles a report and logs email simulation."""
    async def _compile():
        async with AsyncSessionLocal() as db:
            res = await db.execute(select(Report).filter(Report.id == report_id))
            report = res.scalars().first()
            if not report:
                print(f"[Worker Error] Report {report_id} not found.")
                return

            # Simulate email sending log
            print(f"[Email Service] Sending scheduled report '{report.title}' ({report.type}) to {email}")
            print(f"[Email Body Preview]: {report.narrative[:200]}...")

    run_async(_compile())
