from fastapi import APIRouter, UploadFile, File, HTTPException, Form, Depends
from fastapi.responses import FileResponse
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.supabase import get_db
from app.db.models import User, MLModel, AuditLog
from app.api.routes.auth import get_current_user
from app.services import ml_service
from app.services.dataset_service import get_dataset_data
import pandas as pd
import io
import os
import uuid
import joblib

router = APIRouter()

MODEL_DIR = "storage/models"
os.makedirs(MODEL_DIR, exist_ok=True)

@router.post("/train")
async def train_automl(
    target_col: str = Form(...),
    feature_cols: str = Form(...), # comma separated string of feature column names
    tuning_method: str = Form("default"),
    dataset_id: str = Form(None),
    dataset_version_id: str = Form(None),
    file: UploadFile = File(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Train multiple ML models and return leaderboard with hyperparameter tuning, SHAP values, and model registry persistence."""
    try:
        # Load dataset (registers in DB automatically if 'file' upload is sent)
        df, dataset, version = await get_dataset_data(
            db, dataset_id, dataset_version_id, file, workspace_id=None, user_id=current_user.id
        )

        features = [f.strip() for f in feature_cols.split(",") if f.strip()]
        if not target_col or not features:
            raise HTTPException(status_code=400, detail="Target column and feature columns are required")

        # Run AutoML
        result = ml_service.run_automl(df, target_col, features, tuning_method)
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])

        trained_models = result.get("trained_models", {})
        leaderboard = result["leaderboard"]
        best_model_name = result["best_model"]

        winning_model_record = None

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
                MLModel.dataset_id == dataset.id,
                MLModel.algorithm == algo_name
            )
            res_m = await db.execute(stmt_m)
            existing_models = res_m.scalars().all()
            model_version = len(existing_models) + 1

            # Save model artifact to disk
            model_id = str(uuid.uuid4())
            artifact_path = os.path.join(MODEL_DIR, f"{model_id}.pkl")
            
            model_payload = {
                "model": model_obj,
                "preprocessor": result["preprocessor"],
                "features": result["feature_cols"],
                "target_column": result["target_col"],
                "algorithm": algo_name,
                "is_classification": result["is_classification"]
            }
            joblib.dump(model_payload, artifact_path)

            is_best = (algo_name == best_model_name)
            feature_columns = result["feature_cols"]
            assert feature_columns is not None and len(feature_columns) > 0, "feature_columns must not be empty"

            # Store metadata into the models table
            model_record = MLModel(
                id=model_id,
                workspace_id=dataset.workspace_id,
                dataset_id=dataset.id,
                name=f"{algo_name} - v{model_version}",
                algorithm=algo_name,
                target_column=result["target_col"],
                features=feature_columns,
                r2_score=r2,
                rmse=rmse,
                file_path=artifact_path,
                version=model_version,
                metrics_json={
                    "leaderboard": leaderboard,
                    "shap_drivers": result.get("shap_drivers", []) if is_best else []
                },
                is_best_model=is_best,
                dataset_version_id=version.id,
                artifact_path=artifact_path,
                feature_columns=feature_columns
            )
            db.add(model_record)

            # Create AuditLog
            log = AuditLog(
                workspace_id=dataset.workspace_id,
                user_id=current_user.id,
                action=f"Trained & registered AutoML model '{model_record.name}' (Accuracy/R2: {r2:.4f}, Best: {is_best})"
            )
            db.add(log)

            if is_best:
                winning_model_record = model_record

        await db.commit()
        if winning_model_record:
            await db.refresh(winning_model_record)

        # Format return result
        return {
            "model_id": winning_model_record.id if winning_model_record else None,
            "best_model": best_model_name,
            "best_r2": result["best_r2"],
            "best_rmse": result.get("best_rmse"),
            "leaderboard": leaderboard,
            "shap_drivers": result.get("shap_drivers", []),
            "warnings": result.get("warnings", []),
            "version": winning_model_record.version if winning_model_record else 1
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AutoML error: {str(e)}")

@router.get("/export")
async def export_model(format: str = "pkl", model_id: str = None, db: AsyncSession = Depends(get_db)):
    """Export the trained model as a downloadable file."""
    if not model_id:
        # Fallback to the latest trained model
        stmt = select(MLModel).order_by(MLModel.created_at.desc())
        res = await db.execute(stmt)
        model_record = res.scalars().first()
    else:
        stmt = select(MLModel).filter(MLModel.id == model_id)
        res = await db.execute(stmt)
        model_record = res.scalars().first()

    if not model_record or not os.path.exists(model_record.file_path):
        raise HTTPException(status_code=404, detail="No model found in registry")
        
    return FileResponse(model_record.file_path, filename=f"{model_record.name}.{format}", media_type="application/octet-stream")

@router.post("/predict/{model_id}")
async def predict_endpoint(
    model_id: str,
    payload: dict,
    db: AsyncSession = Depends(get_db)
):
    """Dynamically load a trained model and run inference on features."""
    stmt = select(MLModel).filter(MLModel.id == model_id)
    res = await db.execute(stmt)
    model_record = res.scalars().first()
    if not model_record:
        raise HTTPException(status_code=404, detail="Model not found in registry")

    # Check active status
    is_active = model_record.is_active if hasattr(model_record, "is_active") and model_record.is_active is not None else True
    if not is_active:
        raise HTTPException(status_code=400, detail="Model deployment is currently inactive")

    if not os.path.exists(model_record.file_path):
        raise HTTPException(status_code=404, detail="Model artifact file missing from storage")

    # Load model and preprocessor
    try:
        model_payload = joblib.load(model_record.file_path)
        model_object = model_payload["model"]
        preprocessor = model_payload["preprocessor"]
        required_features = model_record.feature_columns or model_record.features or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load model: {str(e)}")

    # Validate payload
    missing_feats = [feat for feat in required_features if feat not in payload]
    if missing_feats:
        raise HTTPException(
            status_code=400,
            detail=f"Inference validation failed. Missing required feature inputs: {missing_feats}"
        )

    try:
        # Convert payload to DataFrame with only the required features in order
        input_data = {feat: [payload[feat]] for feat in required_features}
        df_input = pd.DataFrame(input_data)

        # Preprocess
        X_clean = preprocessor.transform(df_input)

        # Predict
        preds = model_object.predict(X_clean)
        
        prediction_val = preds[0]
        if hasattr(prediction_val, "item"):
            prediction_val = prediction_val.item()

        # Audit Log
        log = AuditLog(
            workspace_id=model_record.workspace_id,
            action=f"Executed inference request on model '{model_record.name}' ({model_record.algorithm})"
        )
        db.add(log)
        await db.commit()

        # Calculate feature means from preprocessor num scaler
        means = {}
        try:
            num_trans = preprocessor.named_transformers_.get('num')
            if num_trans:
                scaler = num_trans.named_steps.get('scaler')
                for trans_name, trans_obj, trans_cols in preprocessor.transformers:
                    if trans_name == 'num' and scaler is not None:
                        for col, mean_val in zip(trans_cols, scaler.mean_):
                            means[col] = float(mean_val)
        except Exception:
            pass

        # Calculate local contributions
        feat_imp = {}
        if model_record.metrics_json and "leaderboard" in model_record.metrics_json:
            for entry in model_record.metrics_json["leaderboard"]:
                if entry.get("model") == model_record.algorithm:
                    feat_imp = entry.get("feature_importance", {})
                    break

        local_contributions = []
        for feat in required_features:
            val = payload.get(feat)
            weight = feat_imp.get(feat, 1.0 / max(len(required_features), 1))
            
            direction = "+"
            if model_record.metrics_json and "shap_drivers" in model_record.metrics_json:
                for driver in model_record.metrics_json["shap_drivers"]:
                    if driver.get("feature") == feat:
                        direction = driver.get("direction", "+")
                        break
                        
            if feat in means and isinstance(val, (int, float)):
                diff = float(val) - means[feat]
                sign = 1.0 if direction == "+" else -1.0
                contribution = diff * weight * sign
            else:
                contribution = weight
                
            local_contributions.append({
                "feature": feat,
                "value": val,
                "contribution": float(contribution),
                "importance": float(weight),
                "direction": direction
            })

        return {
            "model_id": model_id,
            "prediction": prediction_val,
            "algorithm": model_record.algorithm,
            "target_column": model_record.target_column,
            "local_contributions": local_contributions
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference execution error: {str(e)}")


@router.get("/models")
async def list_models(db: AsyncSession = Depends(get_db)):
    """List all models in the registry ordered by created_at DESC."""
    stmt = select(MLModel).order_by(MLModel.created_at.desc())
    res = await db.execute(stmt)
    models = res.scalars().all()
    
    # Resolve dataset name/version info if possible
    # (Since this is simple, we will return dataset_version_id and format clean metadata)
    return [{
        "id": m.id,
        "name": m.name,
        "algorithm": m.algorithm,
        "target_column": m.target_column,
        "r2_score": m.r2_score,
        "rmse": m.rmse,
        "version": m.version,
        "created_at": m.created_at.isoformat() if m.created_at else None,
        "is_best_model": m.is_best_model,
        "is_active": m.is_active if hasattr(m, "is_active") and m.is_active is not None else True,
        "dataset_version_id": m.dataset_version_id,
        "feature_columns": m.feature_columns,
        "metrics_json": m.metrics_json
    } for m in models]


@router.post("/models/{model_id}/toggle-active")
async def toggle_model_active(model_id: str, db: AsyncSession = Depends(get_db)):
    """Toggle the active status of a model in the registry."""
    stmt = select(MLModel).filter(MLModel.id == model_id)
    res = await db.execute(stmt)
    model = res.scalars().first()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    
    model.is_active = not (model.is_active if hasattr(model, "is_active") and model.is_active is not None else True)
    await db.commit()
    
    # Audit log
    log = AuditLog(
        workspace_id=model.workspace_id,
        action=f"Toggled model '{model.name}' active status to {model.is_active}"
    )
    db.add(log)
    await db.commit()
    
    return {"id": model.id, "is_active": model.is_active}
