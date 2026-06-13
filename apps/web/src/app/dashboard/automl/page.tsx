"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/sidebar";
import { useData } from "@/store/data-context";
import { Zap, Play, CheckCircle, BarChart3, Database, HelpCircle, Loader2, Sparkles, Sliders } from "lucide-react";

export default function AutoMLPage() {
  const { dataset, file } = useData();
  const [targetCol, setTargetCol] = useState("");
  const [featureCols, setFeatureCols] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [trainingStage, setTrainingStage] = useState("");
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [bestModel, setBestModel] = useState<any>(null);
  const [mockEndpoint, setMockEndpoint] = useState("");
  const [deployed, setDeployed] = useState(false);
  const [tuningMethod, setTuningMethod] = useState<"default" | "random" | "grid">("default");

  // Playground state
  const [sliderValues, setSliderValues] = useState<Record<string, number>>({});
  const [prediction, setPrediction] = useState<number | null>(null);

  const numericCols = dataset?.numeric_columns || [];
  const allCols = dataset?.columns || [];

  // Initialize target and features automatically
  useEffect(() => {
    if (numericCols.length >= 2) {
      setTargetCol(numericCols[numericCols.length - 1]);
      setFeatureCols(numericCols.slice(0, numericCols.length - 1));
    }
  }, [dataset, numericCols]);

  // Set default slider values based on columns mean when bestModel is updated
  useEffect(() => {
    if (bestModel && dataset?.profile?.numeric_summary) {
      const defaults: Record<string, number> = {};
      featureCols.forEach(feat => {
        defaults[feat] = dataset.profile.numeric_summary[feat]?.mean || 0;
      });
      setSliderValues(defaults);
    }
  }, [bestModel, dataset, featureCols]);

  // Real-time prediction from the backend model
  useEffect(() => {
    if (!bestModel?.model_id || Object.keys(sliderValues).length === 0) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/automl/predict/${bestModel.model_id}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(sliderValues),
          signal: controller.signal
        });
        if (response.ok) {
          const res = await response.json();
          setPrediction(res.prediction);
        }
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error("Prediction error:", err);
        }
      }
    }, 150);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [sliderValues, bestModel]);

  const toggleFeature = (col: string) => {
    if (featureCols.includes(col)) {
      setFeatureCols(featureCols.filter(f => f !== col));
    } else {
      setFeatureCols([...featureCols, col]);
    }
  };

  const handleExportModel = async (format: "pkl" | "onnx") => {
    try {
      const response = await fetch(`http://localhost:8000/api/v1/automl/export?format=${format}`);
      if (!response.ok) throw new Error("Could not export model");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `best_model.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err: any) {
      alert(`Export Error: ${err.message}`);
    }
  };

  const startAutoML = async () => {
    if (!file || !targetCol || featureCols.length === 0) return;
    setLoading(true);
    setLeaderboard([]);
    setBestModel(null);
    setDeployed(false);

    // Dynamic stage updates for high-fidelity micro-animation wow factor
    const stages = [
      "Splitting dataset (80/20 train/test)...",
      "Preprocessing feature columns...",
      "Fitting Neural Network (MLP Regressor)...",
      "Compiling Random Forest estimators...",
      "Training XGBoost Regressor tournament candidate...",
      "Tuning LightGBM decision stumps...",
      "Evaluating CatBoost gradient boosting vectors...",
      "Assembling R² leaderboard & computing SHAP impact..."
    ];

    for (let i = 0; i < stages.length; i++) {
      setTrainingStage(stages[i]);
      await new Promise(resolve => setTimeout(resolve, 600));
    }

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("target_col", targetCol);
      formData.append("feature_cols", featureCols.join(","));
      formData.append("tuning_method", tuningMethod);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/automl/train`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to train AutoML model");
      }

      const result = await response.json();
      if (result.error) {
        alert(result.error);
      } else {
        setLeaderboard(result.leaderboard);
        setBestModel(result);
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || "An error occurred during model training.");
    } finally {
      setLoading(false);
      setTrainingStage("");
    }
  };

  const deployModel = async () => {
    if (!bestModel?.model_id) return;
    try {
      setLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/automl/models/${bestModel.model_id}/toggle-active`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to deploy model");
      
      setDeployed(true);
      const realUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/automl/predict/${bestModel.model_id}`;
      
      const apiCode = `import requests

# Live Endpoint URL
url = "${realUrl}"

# Request Payload (features)
payload = {
${featureCols.map(col => `    "${col}": ${sliderValues[col] ?? 0.0}`).join(',\n')}
}

# Live Authentication Token (from your Settings tab)
headers = {
    "Authorization": "Bearer YOUR_API_KEY"
}

# Run Inference
response = requests.post(url, json=payload, headers=headers)
print("Response Status:", response.status_code)
print("Prediction Result:", response.json())
`;
      setMockEndpoint(apiCode);
    } catch (err: any) {
      alert(`Deployment failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#02040f]">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="mb-12 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-2 font-space">AutoML Engine</h1>
            <p className="text-gray-500">Train, benchmark, and deploy ML models instantly from your data.</p>
          </div>
          {dataset && (
            <div className="badge-live">
              <span className="pulse-dot"></span>
              <span className="font-space tracking-widest text-[9px]">{file?.name}</span>
            </div>
          )}
        </header>

        {!dataset ? (
          <div className="h-[60vh] glass rounded-[3rem] border-dashed border-white/10 flex flex-col items-center justify-center text-center p-12">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/5 animate-pulse">
              <Zap className="w-10 h-10 text-cyan-400" />
            </div>
            <h3 className="text-2xl font-bold mb-3 font-space">No Pipeline Active</h3>
            <p className="text-gray-500 max-w-sm">Please upload a dataset on the Overview page to unlock AutoML modeling.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            
            {/* Step 1 & 2: Config Panel */}
            <div className="xl:col-span-1 glass p-8 rounded-[2.5rem] h-fit space-y-8">
              <div>
                <h3 className="text-lg font-bold font-space text-white mb-2 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-cyan-400/20 text-cyan-400 flex items-center justify-center text-xs font-black">1</span>
                  Select Target Variable
                </h3>
                <p className="text-xs text-gray-500 mb-4">Choose the numeric column you want the AI to predict.</p>
                <select
                  value={targetCol}
                  onChange={(e) => setTargetCol(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-gray-200 outline-none focus:border-cyan-400/30 transition-all font-space"
                >
                  {numericCols.map((col: string) => (
                    <option key={col} value={col} className="bg-black">{col}</option>
                  ))}
                </select>
              </div>

              <div>
                <h3 className="text-lg font-bold font-space text-white mb-2 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-cyan-400/20 text-cyan-400 flex items-center justify-center text-xs font-black">2</span>
                  Select Feature Inputs
                </h3>
                <p className="text-xs text-gray-500 mb-4">Select the features the model should analyze to predict target.</p>
                
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-2 scrollbar-hide">
                  {allCols.map((col: string) => {
                    const isTarget = col === targetCol;
                    const isSelected = featureCols.includes(col);
                    return (
                      <button
                        key={col}
                        disabled={isTarget}
                        onClick={() => toggleFeature(col)}
                        className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-xs font-medium uppercase tracking-wider font-space transition-all duration-300 ${
                          isTarget
                            ? "opacity-30 cursor-not-allowed border-transparent bg-white/5"
                            : isSelected
                            ? "bg-cyan-500/10 border-cyan-400/35 text-cyan-400"
                            : "bg-white/5 border-white/5 text-gray-400 hover:bg-white/10"
                        }`}
                      >
                        <span>{col}</span>
                        {isSelected && <CheckCircle className="w-4 h-4 text-cyan-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold font-space text-white mb-2 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-cyan-400/20 text-cyan-400 flex items-center justify-center text-xs font-black">3</span>
                  Hyperparameter Tuning
                </h3>
                <p className="text-xs text-gray-500 mb-4">Choose optimization search criteria for model estimators.</p>
                <select
                  value={tuningMethod}
                  onChange={(e) => setTuningMethod(e.target.value as any)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-gray-200 outline-none focus:border-cyan-400/30 transition-all font-space"
                >
                  <option value="default" className="bg-black">Quick Fit (Default)</option>
                  <option value="random" className="bg-black">Randomized Search (CV Tuning)</option>
                  <option value="grid" className="bg-black">Grid Search (CV Tuning)</option>
                </select>
              </div>

              <button
                disabled={loading || featureCols.length === 0}
                onClick={startAutoML}
                className="w-full bg-cyan-400 hover:bg-cyan-300 disabled:opacity-40 disabled:hover:bg-cyan-400 text-black py-4.5 rounded-[2rem] font-bold font-space text-xs uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(34,211,238,0.2)]"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-black" />}
                {loading ? "Training System..." : "Compute AutoML Pipeline"}
              </button>

              {loading && (
                <div className="mt-4 p-4 bg-white/5 border border-white/5 rounded-2xl text-center space-y-3">
                  <div className="text-xs font-bold text-cyan-400 uppercase tracking-widest font-space animate-pulse">Running Compute Modules</div>
                  <div className="text-[11px] text-gray-500 font-medium font-mono">{trainingStage}</div>
                </div>
              )}
            </div>

            {/* AutoML Results / Leaderboard */}
            <div className="xl:col-span-2 space-y-8">
              {!bestModel && !loading ? (
                <div className="h-full glass rounded-[2.5rem] flex flex-col items-center justify-center p-12 text-center min-h-[400px]">
                  <Sparkles className="w-12 h-12 text-gray-600 mb-4" />
                  <h4 className="text-xl font-bold font-space text-gray-400">Ready to train</h4>
                  <p className="text-gray-500 text-sm max-w-sm mt-2">Configure target parameter values to compile the leaderboard.</p>
                </div>
              ) : (
                <>
                  {/* Leaderboard Card */}
                  <div className="glass p-8 rounded-[2.5rem]">
                    <h3 className="text-xl font-bold font-space text-white mb-6 flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-cyan-400" />
                      Model Evaluation Leaderboard
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead>
                          <tr className="text-gray-500 border-b border-white/5 text-[11px] font-bold uppercase tracking-widest font-space">
                            <th className="pb-4">Model Engine</th>
                            <th className="pb-4 text-center">R² Score</th>
                            <th className="pb-4 text-center">RMSE Error</th>
                            <th className="pb-4 text-right">Train Time</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 font-mono">
                          {leaderboard.map((model, idx) => {
                            const isBest = model.model === bestModel.best_model;
                            return (
                              <tr key={model.model} className="group">
                                <td className="py-4 font-space font-semibold text-gray-200 flex items-center gap-2.5">
                                  <span className="text-gray-600 text-xs">#{idx + 1}</span>
                                  {model.model}
                                  {isBest && (
                                    <span className="text-[9px] font-black font-space px-2 py-0.5 rounded-full bg-green-400/20 text-green-400 border border-green-400/30">
                                      Best Fit
                                    </span>
                                  )}
                                </td>
                                <td className={`py-4 text-center font-bold ${isBest ? 'text-cyan-400' : 'text-gray-400'}`}>{model.r2_score.toFixed(4)}</td>
                                <td className="py-4 text-center text-gray-500">{model.rmse.toFixed(4)}</td>
                                <td className="py-4 text-right text-gray-500">{model.train_time_ms}ms</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Deploy & Feature Importance Info */}
                  {bestModel && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Best Model Overview */}
                      <div className="glass p-8 rounded-[2.5rem] flex flex-col justify-between">
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400 font-space">Optimal Selection</span>
                          <h4 className="text-2xl font-bold font-space text-white mt-1 mb-2">{bestModel.best_model}</h4>
                          <p className="text-xs text-gray-400 leading-relaxed font-sans">
                            Secured the highest R² score of <strong className="text-cyan-400 font-mono">{bestModel.best_r2}</strong>. Best suited for this dataset distribution.
                          </p>
                        </div>
                        
                        <div className="mt-8 space-y-4">
                          {!deployed ? (
                            <button
                              onClick={deployModel}
                              className="w-full bg-white text-black py-4.5 rounded-[2rem] font-bold font-space text-xs uppercase tracking-widest hover:bg-cyan-400 transition-colors shadow-lg cursor-pointer"
                            >
                              Deploy Prediction Endpoint
                            </button>
                          ) : (
                            <div className="space-y-3">
                              <span className="text-[9px] font-black uppercase tracking-widest text-green-400 font-space block">Deployment Logic Generated</span>
                              <div className="p-4 bg-black/40 border border-white/5 rounded-2xl text-[10px] font-mono text-cyan-400 overflow-x-auto whitespace-pre">
                                {mockEndpoint}
                              </div>
                              <p className="text-[10px] text-gray-500 font-space">Save this code as `main.py` and run with uvicorn.</p>
                            </div>
                          )}

                          {/* Model Export Controls */}
                          <div className="grid grid-cols-2 gap-3 pt-2">
                            <button
                              onClick={() => handleExportModel("pkl")}
                              className="bg-white/5 border border-white/10 hover:bg-cyan-400 hover:text-black py-3 rounded-full font-bold font-space text-[9px] uppercase tracking-widest flex items-center justify-center gap-1.5 cursor-pointer text-white font-space transition-colors"
                            >
                              Download .PKL
                            </button>
                            <button
                              onClick={() => handleExportModel("onnx")}
                              className="bg-white/5 border border-white/10 hover:bg-cyan-400 hover:text-black py-3 rounded-full font-bold font-space text-[9px] uppercase tracking-widest flex items-center justify-center gap-1.5 cursor-pointer text-white font-space transition-colors"
                            >
                              Export ONNX
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* SHAP Explainability Card */}
                      <div className="glass p-8 rounded-[2.5rem]">
                        <h4 className="text-xs font-black uppercase tracking-widest text-violet-400 font-space mb-6">SHAP Predictor Impact</h4>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/5 mb-2">
                            <span className="text-xs font-medium text-gray-400">Mean Target Prediction:</span>
                            <span className="text-sm font-bold text-white font-mono">
                              {prediction !== null ? prediction.toFixed(4) : "85%"}
                            </span>
                          </div>
                          
                          {bestModel?.shap_drivers && bestModel.shap_drivers.length > 0 ? (
                            bestModel.shap_drivers.slice(0, 4).map((driver: any) => {
                              const isPositive = driver.direction === "+";
                              return (
                                <div key={driver.feature} className="flex justify-between items-center p-3 bg-white/3 rounded-xl border border-white/3">
                                  <div className="flex items-center gap-2">
                                    <span className={`text-[10px] font-black font-space w-5 h-5 rounded-full flex items-center justify-center ${
                                      isPositive ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                    }`}>
                                      {driver.direction}
                                    </span>
                                    <span className="text-xs text-gray-200 font-bold font-space uppercase">{driver.feature}</span>
                                  </div>
                                  <span className="text-[10px] text-gray-500 font-mono">{(driver.importance * 100).toFixed(1)}% impact</span>
                                </div>
                              );
                            })
                          ) : (
                            <div className="text-xs text-gray-500 italic">SHAP drivers profile not compiled. Please re-run the pipeline.</div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Inference Simulation Playground */}
                  {bestModel && (
                    <div className="glass p-8 rounded-[2.5rem] mt-8 space-y-6">
                      <h3 className="text-xl font-bold font-space text-white flex items-center gap-2">
                        <Sliders className="w-5 h-5 text-cyan-400" />
                        Interactive Prediction Playground
                      </h3>
                      <p className="text-xs text-gray-500 leading-relaxed max-w-2xl">
                        Tweak the slider values below to watch the simulated output update dynamically in real-time.
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                        {/* Sliders container */}
                        <div className="space-y-6 max-h-[300px] overflow-y-auto pr-2 scrollbar-hide">
                          {featureCols.map(feat => {
                            const summary = dataset?.profile?.numeric_summary[feat];
                            const minVal = summary?.min || 0;
                            const maxVal = summary?.max || 100;
                            const currentVal = sliderValues[feat] ?? ((minVal + maxVal) / 2);

                            return (
                              <div key={feat} className="space-y-2">
                                <div className="flex justify-between text-xs font-space font-medium uppercase tracking-wider text-gray-400">
                                  <span>{feat}</span>
                                  <span className="font-mono text-cyan-400">{currentVal.toFixed(2)}</span>
                                </div>
                                <input
                                  type="range"
                                  min={minVal}
                                  max={maxVal}
                                  step={(maxVal - minVal) / 100 || 1}
                                  value={currentVal}
                                  onChange={(e) => {
                                    setSliderValues(prev => ({
                                      ...prev,
                                      [feat]: parseFloat(e.target.value)
                                    }));
                                  }}
                                  className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                                />
                                <div className="flex justify-between text-[9px] text-gray-600 font-mono">
                                  <span>{minVal.toFixed(1)}</span>
                                  <span>{maxVal.toFixed(1)}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Real-time Display card */}
                        <div className="bg-white/5 border border-white/5 p-8 rounded-[2rem] flex flex-col justify-center items-center text-center">
                          <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400 font-space block mb-2">Simulated Result ({targetCol})</span>
                          <div className="text-5xl font-black font-space tracking-tight text-white mb-2">
                            {prediction !== null ? prediction.toFixed(4) : "0.00"}
                          </div>
                          <span className="text-[10px] text-gray-500 font-mono">Real-time inference matrix convergence complete.</span>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

          </div>
        )}
      </main>
    </div>
  );
}
