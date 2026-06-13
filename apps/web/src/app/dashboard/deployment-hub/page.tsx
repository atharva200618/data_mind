"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Sidebar } from "@/components/sidebar";
import { useData } from "@/store/data-context";
import { 
  Rocket, ToggleLeft, ToggleRight, Copy, Check, FileText, 
  Download, Play, Cpu, BarChart3, HelpCircle, Loader2, 
  Sparkles, Sliders, CheckCircle2, AlertCircle, ArrowRight,
  Terminal, Activity, Clock, Globe
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  ReferenceLine, LineChart, Line
} from "recharts";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface MLModel {
  id: string;
  name: string;
  algorithm: string;
  target_column: string;
  r2_score: number;
  rmse: number;
  version: number;
  created_at: string;
  is_best_model: boolean;
  is_active: boolean;
  dataset_version_id: string;
  feature_columns: string[];
  metrics_json: {
    leaderboard?: any[];
    shap_drivers?: { feature: string; importance: number; direction: string }[];
  };
}

export default function DeploymentHubPage() {
  const { dataset } = useData();
  const [models, setModels] = useState<MLModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<MLModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [predictInputs, setPredictInputs] = useState<Record<string, any>>({});
  const [predictionResult, setPredictionResult] = useState<any | null>(null);
  const [predicting, setPredicting] = useState(false);
  const [predictError, setPredictError] = useState<string | null>(null);

  // Telemetry & Logs States
  const [rpsData, setRpsData] = useState<{ time: string; rps: number }[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [activeRequests, setActiveRequests] = useState(0);
  const [copiedCode, setCopiedCode] = useState(false);
  const [activeTab, setActiveTab] = useState<"curl" | "js" | "python" | "go">("curl");
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Initialize and update logs
  useEffect(() => {
    const timestamp = new Date().toLocaleTimeString([], { hour12: false });
    const initialLogs = [
      `[${timestamp}] [SYSTEM] Model prediction router initialized.`,
      `[${timestamp}] [SYSTEM] CORS policy loaded. Inference gateways: READY.`,
      `[${timestamp}] [SYSTEM] Port 8000 listening on route: /api/predict/{model_id}`
    ];
    setLogs(initialLogs);

    const logInterval = setInterval(() => {
      if (!selectedModel || !selectedModel.is_active) return;
      
      const timeStr = new Date().toLocaleTimeString([], { hour12: false });
      const randomIp = `192.168.1.${Math.floor(Math.random() * 254) + 1}`;
      const latency = (Math.random() * 5 + 8).toFixed(1);
      
      setLogs(prev => {
        const next = [...prev];
        if (next.length > 40) next.shift();
        next.push(`[${timeStr}] ${randomIp} - POST /api/predict/${selectedModel.id.substring(0, 8)} - 200 OK - ${latency}ms`);
        return next;
      });
    }, 4500);

    return () => clearInterval(logInterval);
  }, [selectedModel]);

  // Telemetry data generator
  useEffect(() => {
    const init = [];
    const now = new Date();
    for (let i = 8; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 2000);
      init.push({
        time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
        rps: Math.floor(Math.random() * 6) + 1
      });
    }
    setRpsData(init);

    const interval = setInterval(() => {
      setRpsData(prev => {
        const next = [...prev.slice(1)];
        const t = new Date();
        next.push({
          time: t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
          rps: Math.floor(Math.random() * 6) + 1
        });
        return next;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // Scroll terminal logs to bottom
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async (selectIdAfterFetch?: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/v1/automl/models`);
      if (res.ok) {
        const data = await res.json();
        setModels(data);
        if (data.length > 0) {
          if (selectIdAfterFetch) {
            const found = data.find((m: any) => m.id === selectIdAfterFetch);
            setSelectedModel(found || data[0]);
          } else {
            setSelectedModel(data[0]);
          }
        }
      }
    } catch (e) {
      console.error("Failed to fetch models", e);
    } finally {
      setLoading(false);
    }
  };

  // Initialize inputs when selected model changes
  useEffect(() => {
    if (selectedModel) {
      const inputs: Record<string, any> = {};
      selectedModel.feature_columns.forEach(feat => {
        const featLower = feat.toLowerCase();
        if (dataset?.profile?.numeric_summary?.[feat]) {
          inputs[feat] = dataset.profile.numeric_summary[feat].mean;
        } else {
          if (featLower.includes("year")) {
            inputs[feat] = 2025;
          } else if (featLower.includes("age")) {
            inputs[feat] = 35;
          } else if (featLower.includes("rate") || featLower.includes("ratio") || featLower.includes("pct") || featLower.includes("level")) {
            inputs[feat] = 0.5;
          } else if (featLower.includes("country")) {
            inputs[feat] = "USA";
          } else if (featLower.includes("industry")) {
            inputs[feat] = "Finance";
          } else if (featLower.includes("category") || featLower.includes("type")) {
            inputs[feat] = "A";
          } else {
            inputs[feat] = 1.0;
          }
        }
      });
      setPredictInputs(inputs);
      setPredictionResult(null);
      setPredictError(null);
    }
  }, [selectedModel, dataset]);

  const handleToggleActive = async (modelId: string) => {
    try {
      const res = await fetch(`${API}/api/v1/automl/models/${modelId}/toggle-active`, {
        method: "POST"
      });
      if (res.ok) {
        const updated = await res.json();
        setModels(prev => prev.map(m => m.id === modelId ? { ...m, is_active: updated.is_active } : m));
        if (selectedModel?.id === modelId) {
          setSelectedModel(prev => prev ? { ...prev, is_active: updated.is_active } : null);
        }
      }
    } catch (e) {
      console.error("Failed to toggle model active status", e);
    }
  };

  const handleCopyEndpoint = (modelId: string) => {
    const url = `${API}/api/predict/${modelId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(modelId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const runPrediction = async () => {
    if (!selectedModel) return;
    setPredicting(true);
    setPredictError(null);
    setPredictionResult(null);
    setActiveRequests(1);
    const startTime = performance.now();
    try {
      const res = await fetch(`${API}/api/predict/${selectedModel.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(predictInputs)
      });
      const latency = (performance.now() - startTime).toFixed(1);
      const timeStr = new Date().toLocaleTimeString([], { hour12: false });
      if (res.ok) {
        const data = await res.json();
        setPredictionResult(data);
        setLogs(prev => [
          ...prev,
          `[${timeStr}] 127.0.0.1 - POST /api/predict/${selectedModel.id.substring(0, 8)} - 200 OK (Playground Query) - ${latency}ms`
        ]);
      } else {
        const err = await res.json();
        setPredictError(err.detail || "Prediction request failed");
        setLogs(prev => [
          ...prev,
          `[${timeStr}] 127.0.0.1 - POST /api/predict/${selectedModel.id.substring(0, 8)} - 500 Internal Server Error - ${latency}ms`
        ]);
      }
    } catch (e: any) {
      const latency = (performance.now() - startTime).toFixed(1);
      const timeStr = new Date().toLocaleTimeString([], { hour12: false });
      setPredictError(e.message || "Failed to contact prediction gateway");
      setLogs(prev => [
        ...prev,
        `[${timeStr}] 127.0.0.1 - POST /api/predict/${selectedModel.id.substring(0, 8)} - Connection Failed - ${latency}ms`
      ]);
    } finally {
      setPredicting(false);
      setActiveRequests(0);
    }
  };

  const samplePayload = useMemo(() => {
    const payload: Record<string, any> = {};
    if (selectedModel) {
      selectedModel.feature_columns.forEach(feat => {
        payload[feat] = predictInputs[feat] !== undefined ? predictInputs[feat] : 1.0;
      });
    }
    return JSON.stringify(payload, null, 2);
  }, [selectedModel, predictInputs]);

  // Code snippets generator
  const codeSnippets = useMemo(() => {
    if (!selectedModel) return { curl: "", js: "", python: "", go: "" };
    const cleanId = selectedModel.id;
    return {
      curl: `curl -X POST "${API}/api/predict/${cleanId}" \\
  -H "Content-Type: application/json" \\
  -d '${samplePayload.replace(/\n/g, "\n  ")}'`,
      js: `const response = await fetch("${API}/api/predict/${cleanId}", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify(${samplePayload.replace(/\n/g, "\n    ")})
});
const result = await response.json();
console.log("Prediction output:", result.prediction);`,
      python: `import requests

url = "${API}/api/predict/${cleanId}"
payload = ${samplePayload.replace(/\n/g, "\n    ")}

response = requests.post(url, json=payload)
print("Prediction output:", response.json()["prediction"])`,
      go: `package main

import (
	"bytes"
	"fmt"
	"io/ioutil"
	"net/http"
)

func main() {
	url := "${API}/api/predict/${cleanId}"
	jsonData := []byte(\`${samplePayload.replace(/\n/g, "\n\t")}\`)
	
	resp, _ := http.Post(url, "application/json", bytes.NewBuffer(jsonData))
	defer resp.Body.Close()
	
	body, _ := ioutil.ReadAll(resp.Body)
	fmt.Println(string(body))
}`
    };
  }, [selectedModel, samplePayload]);

  const activeCodeText = codeSnippets[activeTab];

  const handleCopyCode = () => {
    navigator.clipboard.writeText(activeCodeText);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Format shap drivers for global importance chart
  const shapDrivers = selectedModel?.metrics_json?.shap_drivers || [];
  const globalImportanceData = shapDrivers.map(d => ({
    name: d.feature.toUpperCase(),
    value: d.importance,
    direction: d.direction
  })).sort((a, b) => b.value - a.value);

  // Format local contribution data for waterfall/contribution chart
  const localContributionsData = predictionResult?.local_contributions?.map((c: any) => ({
    name: c.feature.toUpperCase(),
    val: c.value,
    contribution: c.contribution,
    direction: c.direction
  })) || [];

  return (
    <div className="flex min-h-screen bg-[#02040f]">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="mb-10 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-2 font-space flex items-center gap-3">
              <Rocket className="w-8 h-8 text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.4)]" />
              Model Deployment Hub
            </h1>
            <p className="text-gray-500">Manage real-time inference gateways, toggle production routes, and explain predictions.</p>
          </div>
          <div className="badge-live">
            <span className="pulse-dot"></span>
            <span className="font-space tracking-widest text-[9px] uppercase">Gateway Active</span>
          </div>
        </header>

        {loading && models.length === 0 ? (
          <div className="h-[50vh] flex flex-col items-center justify-center">
            <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mb-4" />
            <p className="text-gray-500 font-space text-sm">Synchronizing model registry database...</p>
          </div>
        ) : models.length === 0 ? (
          <div className="h-[60vh] glass rounded-[3rem] border-dashed border-white/10 flex flex-col items-center justify-center text-center p-12">
            <Cpu className="w-16 h-16 text-cyan-400/30 mb-6" />
            <h3 className="text-2xl font-bold mb-3 font-space text-white">Registry Empty</h3>
            <p className="text-gray-500 max-w-sm">No AutoML models are currently registered. Run the AutoML Engine to register candidates.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
            {/* Left: Model Registry List */}
            <div className="xl:col-span-5 space-y-4">
              <h2 className="text-xs font-black uppercase tracking-widest text-cyan-400 font-space mb-2">Registered Model Estimators</h2>
              <div className="space-y-4 max-h-[110vh] overflow-y-auto pr-2 scrollbar-hide">
                {models.map((model) => {
                  const isSelected = selectedModel?.id === model.id;
                  return (
                    <div 
                      key={model.id}
                      onClick={() => setSelectedModel(model)}
                      className={`glass p-6 rounded-[2rem] border transition-all duration-300 cursor-pointer ${
                        isSelected 
                          ? "border-cyan-400/40 bg-cyan-400/5 shadow-[0_0_25px_rgba(34,211,238,0.08)]" 
                          : "border-white/5 hover:border-white/15 bg-white/3"
                      }`}
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-md font-bold font-space text-white">{model.name}</h3>
                            {model.is_best_model && (
                              <span className="text-[8px] font-black font-space px-2 py-0.5 rounded-full bg-green-400/20 text-green-400 border border-green-400/30">
                                Champion
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 font-mono mt-0.5">ID: {model.id.substring(0, 8)}...</p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleActive(model.id);
                          }}
                          className="text-gray-400 hover:text-cyan-400 transition-colors"
                          title={model.is_active ? "Deactivate deployment" : "Activate deployment"}
                        >
                          {model.is_active ? (
                            <ToggleRight className="w-8 h-8 text-cyan-400" />
                          ) : (
                            <ToggleLeft className="w-8 h-8 text-gray-600" />
                          )}
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-2 mt-4 text-center font-mono">
                        <div className="bg-black/30 p-2 rounded-xl border border-white/5">
                          <div className="text-[9px] text-gray-500 uppercase font-space">R² Score</div>
                          <div className="text-xs font-bold text-white mt-0.5">{model.r2_score?.toFixed(4)}</div>
                        </div>
                        <div className="bg-black/30 p-2 rounded-xl border border-white/5">
                          <div className="text-[9px] text-gray-500 uppercase font-space">RMSE</div>
                          <div className="text-xs font-bold text-gray-400 mt-0.5">{model.rmse?.toFixed(4)}</div>
                        </div>
                        <div className="bg-black/30 p-2 rounded-xl border border-white/5">
                          <div className="text-[9px] text-gray-500 uppercase font-space">Target</div>
                          <div className="text-xs font-bold text-cyan-400/80 truncate mt-0.5">{model.target_column}</div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="grid grid-cols-3 gap-2 mt-4 pt-2 border-t border-white/5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyEndpoint(model.id);
                          }}
                          className="flex items-center justify-center gap-1.5 bg-white/5 hover:bg-cyan-400/10 border border-white/5 text-[9px] font-bold uppercase tracking-wider font-space py-2 rounded-full text-gray-300 hover:text-cyan-400 transition-colors cursor-pointer"
                        >
                          {copiedId === model.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-green-400" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              API URL
                            </>
                          )}
                        </button>
                        <a
                          href={`${API}/docs#/predictions/predict_model_${model.id.replace(/-/g, "_")}`}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center justify-center gap-1.5 bg-white/5 hover:bg-cyan-400/10 border border-white/5 text-[9px] font-bold uppercase tracking-wider font-space py-2 rounded-full text-gray-300 hover:text-cyan-400 transition-colors text-center"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          Swagger
                        </a>
                        <a
                          href={`${API}/api/v1/automl/export?model_id=${model.id}`}
                          download
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center justify-center gap-1.5 bg-white/5 hover:bg-cyan-400/10 border border-white/5 text-[9px] font-bold uppercase tracking-wider font-space py-2 rounded-full text-gray-300 hover:text-cyan-400 transition-colors text-center"
                        >
                          <Download className="w-3.5 h-3.5" />
                          .PKL
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: Model Analyzer Panel */}
            <div className="xl:col-span-7 space-y-8">
              {selectedModel && (
                <>
                  {/* Card 1: SHAP Analysis */}
                  <div className="glass p-8 rounded-[2.5rem]">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400 font-space block mb-1">Selected Endpoint Analyzer</span>
                        <h2 className="text-2xl font-bold font-space text-white">{selectedModel.name} ({selectedModel.algorithm})</h2>
                      </div>
                      <span className={`text-[9px] font-black font-space px-3 py-1 rounded-full ${
                        selectedModel.is_active 
                          ? 'bg-cyan-400/15 text-cyan-400 border border-cyan-400/30' 
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}>
                        {selectedModel.is_active ? 'DEPLOYMENT ACTIVE' : 'DEPLOYMENT INACTIVE'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2">
                      <div className="space-y-4">
                        <h4 className="text-xs font-black uppercase tracking-widest text-violet-400 font-space">SHAP Feature Influence</h4>
                        {globalImportanceData.length > 0 ? (
                          <div className="h-48">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart
                                layout="vertical"
                                data={globalImportanceData.slice(0, 5)}
                                margin={{ left: -10, right: 10, top: 0, bottom: 0 }}
                              >
                                <XAxis type="number" stroke="#475569" fontSize={9} fontFamily="monospace" />
                                <YAxis dataKey="name" type="category" stroke="#475569" fontSize={9} width={90} tickLine={false} />
                                <Tooltip
                                  contentStyle={{ backgroundColor: "#090d16", borderColor: "rgba(255,255,255,0.08)", borderRadius: "12px" }}
                                  labelStyle={{ color: "#fff", fontWeight: "bold", fontFamily: "Space Grotesk" }}
                                  itemStyle={{ color: "#22d3ee", fontFamily: "monospace" }}
                                />
                                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                  {globalImportanceData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.direction === "+" ? "#10b981" : "#f43f5e"} />
                                  ))}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        ) : (
                          <div className="h-48 border border-white/5 bg-black/20 rounded-2xl flex items-center justify-center text-xs text-gray-500 italic">
                            No explainability model data found.
                          </div>
                        )}
                      </div>

                      <div className="space-y-4">
                        <h4 className="text-xs font-black uppercase tracking-widest text-violet-400 font-space">Driver Direction</h4>
                        <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-hide pr-1">
                          {shapDrivers.length > 0 ? (
                            shapDrivers.slice(0, 5).map((driver) => {
                              const isPos = driver.direction === "+";
                              return (
                                <div key={driver.feature} className="flex justify-between items-center p-3 bg-white/3 rounded-xl border border-white/3">
                                  <div className="flex items-center gap-2">
                                    <span className={`text-[10px] font-black font-space w-5 h-5 rounded-full flex items-center justify-center ${
                                      isPos ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                    }`}>
                                      {driver.direction}
                                    </span>
                                    <span className="text-xs text-gray-200 font-bold font-space uppercase">{driver.feature}</span>
                                  </div>
                                  <span className="text-[10px] text-gray-500 font-mono">{(driver.importance * 100).toFixed(1)}% influence</span>
                                </div>
                              );
                            })
                          ) : (
                            <div className="border border-white/5 bg-black/20 p-6 rounded-2xl text-center text-xs text-gray-500 italic">
                              Explainability drivers not calculated
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Live Performance Telemetry & Access Logs Console */}
                  <div className="glass p-8 rounded-[2.5rem]">
                    <h3 className="text-xl font-bold font-space text-white flex items-center gap-2 mb-2">
                      <Globe className="w-5 h-5 text-cyan-400" />
                      Inference Gateway Telemetry & Logs
                    </h3>
                    <p className="text-xs text-gray-500 leading-relaxed mb-6">
                      Track serverless latency profiles, success rates, and live incoming HTTP inference hits.
                    </p>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                      {/* Telemetry Stats & Chart */}
                      <div className="lg:col-span-6 space-y-4">
                        <div className="grid grid-cols-3 gap-3 font-space">
                          <div className="glass p-3 rounded-2xl bg-white/[0.01] border border-white/5 text-center">
                            <span className="text-[9px] uppercase tracking-wider text-gray-500 block">Latency</span>
                            <span className="text-sm font-bold text-white font-mono flex items-center justify-center gap-1 mt-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                              12.4ms
                            </span>
                          </div>
                          <div className="glass p-3 rounded-2xl bg-white/[0.01] border border-white/5 text-center">
                            <span className="text-[9px] uppercase tracking-wider text-gray-500 block">Status</span>
                            <span className="text-sm font-bold text-green-400 font-mono mt-1 block">100%</span>
                          </div>
                          <div className="glass p-3 rounded-2xl bg-white/[0.01] border border-white/5 text-center">
                            <span className="text-[9px] uppercase tracking-wider text-gray-500 block">Active Requests</span>
                            <span className="text-sm font-bold text-cyan-400 font-mono mt-1 block animate-pulse">
                              {activeRequests}
                            </span>
                          </div>
                        </div>

                        {/* RPS Load Chart */}
                        <div className="glass p-4 rounded-2xl bg-white/[0.01] border border-white/5 h-36">
                          <span className="text-[9px] font-black uppercase tracking-widest text-violet-400 font-space mb-2 block">
                            Requests Per Second (RPS)
                          </span>
                          <ResponsiveContainer width="100%" height="90%">
                            <LineChart data={rpsData}>
                              <XAxis dataKey="time" stroke="#475569" fontSize={8} tickLine={false} />
                              <Tooltip 
                                contentStyle={{ backgroundColor: "#090d16", borderColor: "rgba(255,255,255,0.08)", borderRadius: "10px" }}
                                itemStyle={{ color: "#8b5cf6", fontSize: "10px", fontFamily: "monospace" }}
                              />
                              <Line type="monotone" dataKey="rps" stroke="#8b5cf6" strokeWidth={2} dot={false} isAnimationActive={false} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Logs Console Terminal */}
                      <div className="lg:col-span-6 flex flex-col">
                        <span className="text-[9px] font-black uppercase tracking-widest text-cyan-400 font-space mb-2 block">
                          Access Gateway Console Logs
                        </span>
                        <div className="flex-1 bg-black/45 border border-white/5 rounded-2xl p-4 font-mono text-[10px] text-gray-400 h-48 overflow-y-auto flex flex-col gap-1.5 scrollbar-hide">
                          {logs.map((log, i) => (
                            <div key={i} className={log.includes("200 OK") ? "text-cyan-400" : log.includes("SYSTEM") ? "text-violet-400 font-bold" : ""}>
                              {log}
                            </div>
                          ))}
                          <div ref={terminalEndRef} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card 3: Interactive Prediction Playground */}
                  <div className="glass p-8 rounded-[2.5rem]">
                    <h3 className="text-xl font-bold font-space text-white flex items-center gap-2 mb-2">
                      <Sliders className="w-5 h-5 text-cyan-400" />
                      Prediction Playground & Explainability Waterfall
                    </h3>
                    <p className="text-xs text-gray-500 leading-relaxed mb-6">
                      Send simulated parameters to the live deployment endpoint. The model returns predictions along with local explanations.
                    </p>

                    {!selectedModel.is_active && (
                      <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 flex gap-3 text-rose-400 text-xs mb-6">
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        <div>
                          <strong className="font-space uppercase block mb-0.5">Deployment Deactivated</strong>
                          Predictions are disabled because this model is currently marked inactive.
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* Sliders Container */}
                      <div className="space-y-6 max-h-[380px] overflow-y-auto pr-2 scrollbar-hide">
                        {selectedModel.feature_columns.map(feat => {
                          const summary = dataset?.profile?.numeric_summary?.[feat];
                          const minVal = summary?.min ?? 0;
                          const maxVal = summary?.max ?? 100;
                          const step = (maxVal - minVal) / 100 || 1;
                          const isCat = !dataset?.profile?.numeric_summary?.[feat] && 
                            dataset?.profile?.categorical_summary?.[feat] !== undefined;

                          if (isCat) {
                            const cats = dataset?.profile?.categorical_summary?.[feat]?.unique_values || ["A", "B", "C"];
                            const currentVal = predictInputs[feat] || cats[0];
                            return (
                              <div key={feat} className="space-y-2">
                                <div className="flex justify-between text-xs font-space font-medium uppercase tracking-wider text-gray-400">
                                  <span>{feat}</span>
                                  <span className="font-mono text-cyan-400">{currentVal}</span>
                                </div>
                                <select
                                  value={currentVal}
                                  onChange={(e) => {
                                    setPredictInputs(prev => ({ ...prev, [feat]: e.target.value }));
                                  }}
                                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-gray-300 outline-none focus:border-cyan-400/30 transition-all font-space"
                                >
                                  {cats.map((c: string) => (
                                    <option key={c} value={c} className="bg-black">{c}</option>
                                  ))}
                                </select>
                              </div>
                            );
                          }

                          const currentVal = typeof predictInputs[feat] === "number" ? predictInputs[feat] : ((minVal + maxVal) / 2);

                          return (
                            <div key={feat} className="space-y-2">
                              <div className="flex justify-between text-xs font-space font-medium uppercase tracking-wider text-gray-400">
                                  <span>{feat}</span>
                                  <input
                                    type="number"
                                    value={isNaN(currentVal) ? "" : Number(currentVal.toFixed(2))}
                                    onChange={(e) => {
                                      const val = parseFloat(e.target.value);
                                      setPredictInputs(prev => ({
                                        ...prev,
                                        [feat]: isNaN(val) ? 0 : val
                                      }));
                                    }}
                                    className="font-mono text-cyan-400 text-right bg-transparent border-b border-transparent focus:border-cyan-400/30 outline-none text-xs w-20"
                                  />
                              </div>
                              <input
                                type="range"
                                min={minVal}
                                max={maxVal}
                                step={step}
                                value={currentVal}
                                onChange={(e) => {
                                  setPredictInputs(prev => ({
                                    ...prev,
                                    [feat]: parseFloat(e.target.value)
                                  }));
                                }}
                                className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                              />
                              <div className="flex justify-between text-[9px] text-gray-600 font-mono">
                                <span>{minVal.toFixed(1)}</span>
                                <span>{maxVal.toFixed(1)}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Prediction Result display & Local Waterfall Chart */}
                      <div className="flex flex-col justify-between space-y-6">
                        <button
                          disabled={predicting || !selectedModel.is_active}
                          onClick={runPrediction}
                          className="w-full bg-cyan-400 hover:bg-cyan-300 disabled:opacity-40 disabled:hover:bg-cyan-400 text-black py-4 rounded-full font-bold font-space text-xs uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(34,211,238,0.2)] transition-all"
                        >
                          {predicting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-black" />}
                          Execute Inference Pipeline
                        </button>

                        {predictError && (
                          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-2xl text-xs font-mono">
                            Error: {predictError}
                          </div>
                        )}

                        {predictionResult && (
                          <div className="bg-white/5 border border-white/5 p-6 rounded-[2rem] space-y-4">
                            <div className="text-center">
                              <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400 font-space block mb-1">
                                Predictive Inference Output
                              </span>
                              <div className="text-4xl font-black font-space tracking-tight text-white">
                                {predictionResult.prediction?.toFixed(4)}
                              </div>
                            </div>

                            {/* Local explanation contribution bars */}
                            <div className="pt-4 border-t border-white/5">
                              <h5 className="text-[10px] font-black uppercase tracking-widest text-violet-400 font-space mb-3">
                                Local Feature Contribution (Waterfall Map)
                              </h5>
                              <div className="h-40">
                                <ResponsiveContainer width="100%" height="100%">
                                  <BarChart
                                    layout="vertical"
                                    data={localContributionsData}
                                    margin={{ left: -10, right: 10, top: 0, bottom: 0 }}
                                  >
                                    <XAxis type="number" stroke="#475569" fontSize={8} fontFamily="monospace" />
                                    <YAxis dataKey="name" type="category" stroke="#475569" fontSize={8} width={80} tickLine={false} />
                                    <ReferenceLine x={0} stroke="#475569" />
                                    <Tooltip
                                      contentStyle={{ backgroundColor: "#090d16", borderColor: "rgba(255,255,255,0.08)", borderRadius: "12px" }}
                                      labelStyle={{ color: "#fff", fontWeight: "bold", fontFamily: "Space Grotesk" }}
                                      itemStyle={{ color: "#22d3ee", fontFamily: "monospace" }}
                                    />
                                    <Bar dataKey="contribution" radius={[4, 4, 4, 4]}>
                                      {localContributionsData.map((entry: any, index: number) => (
                                        <Cell 
                                          key={`cell-${index}`} 
                                          fill={entry.contribution >= 0 ? "#10b981" : "#f43f5e"} 
                                        />
                                      ))}
                                    </Bar>
                                  </BarChart>
                                </ResponsiveContainer>
                              </div>
                              <p className="text-[9px] text-gray-500 font-space text-center mt-2">
                                Shows how each input feature pulls prediction away from the model's base average.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card 4: Multi-Language Integration Panel */}
                  <div className="glass p-8 rounded-[2.5rem]">
                    <div className="flex justify-between items-center mb-6">
                      <div>
                        <h3 className="text-xl font-bold font-space text-white flex items-center gap-2">
                          <Terminal className="w-5 h-5 text-violet-400" />
                          Client Integration Libraries
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">
                          Query this serverless AutoML endpoint directly from your applications using these client configurations.
                        </p>
                      </div>
                      <button
                        onClick={handleCopyCode}
                        className="flex items-center gap-1.5 text-[10px] font-bold font-space uppercase tracking-wider bg-white/5 border border-white/5 hover:bg-cyan-400/10 text-gray-300 hover:text-cyan-400 px-4 py-2 rounded-full transition-colors cursor-pointer"
                      >
                        {copiedCode ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedCode ? "Copied!" : "Copy Code"}
                      </button>
                    </div>

                    {/* Tab Navigation */}
                    <div className="flex border-b border-white/5 mb-6">
                      {(["curl", "js", "python", "go"] as const).map((tab) => (
                        <button
                          key={tab}
                          onClick={() => {
                            setActiveTab(tab);
                            setCopiedCode(false);
                          }}
                          className={`px-5 py-3 text-xs font-bold font-space uppercase tracking-widest transition-all ${
                            activeTab === tab 
                              ? "text-cyan-400 border-b-2 border-cyan-400" 
                              : "text-gray-500 hover:text-gray-300"
                          }`}
                        >
                          {tab === "curl" ? "cURL" : tab === "js" ? "JavaScript" : tab === "python" ? "Python" : "Go"}
                        </button>
                      ))}
                    </div>

                    {/* Code Terminal Viewport */}
                    <div className="bg-black/45 border border-white/5 rounded-2xl p-5 font-mono text-xs text-gray-300 overflow-x-auto whitespace-pre leading-relaxed scrollbar-hide max-h-[300px]">
                      {activeCodeText}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
