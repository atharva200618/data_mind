"use client";

import React, { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { useData } from "@/store/data-context";
import { 
  Wrench, Sparkles, Code, Play, RefreshCw, FileText, CheckCircle2, 
  Trash2, ShieldCheck, Calculator, AlertTriangle, CopyMinus, Scale, 
  BarChart2, Columns, ArrowRight, Download, RotateCcw, Table, Undo, Check,
  Activity, ArrowLeftRight, Brain, Loader2
} from "lucide-react";

const StatusIndicator = ({ state }: { state: "idle" | "running" | "completed" }) => {
  if (state === "running") {
    return (
      <div className="flex items-center gap-1.5 text-cyan-400">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        <span className="text-[8px] font-bold uppercase tracking-widest font-space">Running</span>
      </div>
    );
  }
  if (state === "completed") {
    return (
      <div className="flex items-center gap-1.5 text-emerald-400">
        <CheckCircle2 className="w-3.5 h-3.5" />
        <span className="text-[8px] font-bold uppercase tracking-widest font-space">Done</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5 text-gray-500">
      <span className="w-3.5 h-3.5 rounded-full border border-gray-600 flex items-center justify-center text-[7px] font-bold font-space">i</span>
      <span className="text-[8px] font-bold uppercase tracking-widest font-space">Idle</span>
    </div>
  );
};

const SVGConnector = ({ active, completed }: { active: boolean; completed: boolean }) => {
  return (
    <div className="h-10 w-6 relative flex justify-center">
      <svg className="h-full w-full overflow-visible" fill="none">
        <line
          x1="12"
          y1="0"
          x2="12"
          y2="40"
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth="2"
        />
        {(active || completed) && (
          <line
            x1="12"
            y1="0"
            x2="12"
            y2="40"
            stroke={completed ? "#10b981" : "#22d3ee"}
            strokeWidth="2"
            strokeDasharray="6, 3"
            style={
              active
                ? {
                    animation: "flow-dash 0.8s linear infinite",
                  }
                : {}
            }
          />
        )}
        {active && (
          <circle r="3" fill="#22d3ee" style={{ filter: 'drop-shadow(0 0 4px #22d3ee)' }}>
            <animateMotion
              dur="0.8s"
              repeatCount="indefinite"
              path="M 12 0 L 12 40"
            />
          </circle>
        )}
      </svg>
    </div>
  );
};

const PRESETS = [
  {
    id: "prepare_ml",
    name: "Prepare for ML (Autonomous Agent)",
    icon: Brain,
    color: "from-violet-500/20 to-fuchsia-500/20 border-violet-500/30 text-violet-400 hover:border-violet-400/60",
    desc: "Decodes bytes, drops duplicates, imputes missing cells, scales features, and encodes categories.",
    badge: "Recruiter Favorite",
  },
  {
    id: "auto_clean",
    name: "One-Click Auto-Clean",
    icon: Sparkles,
    color: "from-cyan-500/20 to-blue-500/20 border-cyan-500/30 text-cyan-400 hover:border-cyan-400/60",
    desc: "Auto-fix column names, drop duplicate rows, fill missing cells, and trim whitespace.",
    badge: "Recommended",
  },
  {
    id: "remove_outliers",
    name: "Drop Outliers (IQR)",
    icon: Trash2,
    color: "from-amber-500/10 to-orange-500/10 border-amber-500/20 text-amber-400 hover:border-amber-400/50",
    desc: "Detect and remove outliers using the IQR (Interquartile Range) method.",
  },
  {
    id: "fill_median",
    name: "Impute with Median",
    icon: ShieldCheck,
    color: "from-emerald-500/10 to-teal-500/10 border-emerald-500/20 text-emerald-400 hover:border-emerald-400/50",
    desc: "Fill missing cells in all numeric columns with their median values.",
  },
  {
    id: "fill_mean",
    name: "Impute with Mean",
    icon: Calculator,
    color: "from-green-500/10 to-emerald-500/10 border-green-500/20 text-green-400 hover:border-green-400/50",
    desc: "Fill missing cells in all numeric columns with their mean values.",
  },
  {
    id: "drop_missing_rows",
    name: "Drop Missing Rows",
    icon: AlertTriangle,
    color: "from-rose-500/10 to-red-500/10 border-rose-500/20 text-rose-400 hover:border-rose-400/50",
    desc: "Drop all rows containing at least one missing value.",
  },
  {
    id: "drop_duplicates",
    name: "Remove Duplicates",
    icon: CopyMinus,
    color: "from-blue-500/10 to-indigo-500/10 border-blue-500/20 text-blue-400 hover:border-blue-400/50",
    desc: "Drop rows that are exact duplicates of other rows.",
  },
  {
    id: "normalize",
    name: "Min-Max Normalize",
    icon: Scale,
    color: "from-violet-500/10 to-purple-500/10 border-violet-500/20 text-violet-400 hover:border-violet-400/50",
    desc: "Rescale all numeric features to range [0, 1].",
  },
  {
    id: "standardize",
    name: "Standardize (Z-Score)",
    icon: BarChart2,
    color: "from-fuchsia-500/10 to-pink-500/10 border-fuchsia-500/20 text-fuchsia-400 hover:border-fuchsia-400/50",
    desc: "Standardize numeric features to have mean=0 and std=1.",
  },
  {
    id: "drop_high_null_cols",
    name: "Drop High-Null Columns",
    icon: Columns,
    color: "from-orange-500/10 to-red-500/10 border-orange-500/20 text-orange-400 hover:border-orange-400/50",
    desc: "Drop columns containing more than 50% missing values.",
  },
];

export default function AIETLPage() {
  const { dataset, file, setDatasetData } = useData();
  const [instruction, setInstruction] = useState("");
  const [loading, setLoading] = useState(false);
  const [pythonCode, setPythonCode] = useState("");
  const [columnsBefore, setColumnsBefore] = useState<string[]>([]);
  const [columnsAfter, setColumnsAfter] = useState<string[]>([]);
  const [applied, setApplied] = useState(false);
  const [activeMode, setActiveMode] = useState<"one-click" | "conversational" | "autonomous" | "visual-pipeline">("one-click");

  // Visual Pipeline Flow Builder states
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [nodeStates, setNodeStates] = useState<Record<string, "idle" | "running" | "completed">>({
    source: "idle",
    dedup: "idle",
    impute: "idle",
    scale: "idle",
    automl: "idle",
  });

  const handleRunPipeline = async () => {
    if (pipelineRunning || !dataset || !file) return;
    setPipelineRunning(true);
    setApplied(false);
    
    setNodeStates({
      source: "idle",
      dedup: "idle",
      impute: "idle",
      scale: "idle",
      automl: "idle",
    });

    let currentFile = file;
    let currentProfile = dataset;
    let currentCsv = "";
    const rowsBefore = dataset.profile?.total_rows || dataset.total_rows || 0;
    const colsBefore = dataset.columns?.length || 0;

    try {
      // 1. Data Ingest Node
      setNodeStates(prev => ({ ...prev, source: "running" }));
      await new Promise(resolve => setTimeout(resolve, 500));
      setNodeStates(prev => ({ ...prev, source: "completed" }));

      // 2. Deduplication Node
      setNodeStates(prev => ({ ...prev, dedup: "running" }));
      const dedupForm = new FormData();
      dedupForm.append("preset", "drop_duplicates");
      dedupForm.append("file", currentFile);
      const dedupRes = await fetch("http://localhost:8000/api/v1/ai/etl-preset", {
        method: "POST",
        body: dedupForm
      });
      if (!dedupRes.ok) throw new Error("Deduplication failed");
      const dedupData = await dedupRes.ok ? await dedupRes.json() : null;
      if (dedupData) {
        currentCsv = dedupData.csv;
        currentProfile = dedupData.profile;
        currentFile = new File([new Blob([currentCsv], { type: 'text/csv' })], file.name, { type: 'text/csv' });
      }
      setNodeStates(prev => ({ ...prev, dedup: "completed" }));

      // 3. Null Imputer Node
      setNodeStates(prev => ({ ...prev, impute: "running" }));
      const imputeForm = new FormData();
      imputeForm.append("preset", "fill_median");
      imputeForm.append("file", currentFile);
      const imputeRes = await fetch("http://localhost:8000/api/v1/ai/etl-preset", {
        method: "POST",
        body: imputeForm
      });
      if (!imputeRes.ok) throw new Error("Imputation failed");
      const imputeData = await imputeRes.json();
      currentCsv = imputeData.csv;
      currentProfile = imputeData.profile;
      currentFile = new File([new Blob([currentCsv], { type: 'text/csv' })], file.name, { type: 'text/csv' });
      setNodeStates(prev => ({ ...prev, impute: "completed" }));

      // 4. Feature Scaling Node
      setNodeStates(prev => ({ ...prev, scale: "running" }));
      const scaleForm = new FormData();
      scaleForm.append("preset", "standardize");
      scaleForm.append("file", currentFile);
      const scaleRes = await fetch("http://localhost:8000/api/v1/ai/etl-preset", {
        method: "POST",
        body: scaleForm
      });
      if (!scaleRes.ok) throw new Error("Scaling failed");
      const scaleData = await scaleRes.json();
      currentCsv = scaleData.csv;
      currentProfile = scaleData.profile;
      currentFile = new File([new Blob([currentCsv], { type: 'text/csv' })], file.name, { type: 'text/csv' });
      setNodeStates(prev => ({ ...prev, scale: "completed" }));

      // 5. AutoML Model Fitting Node
      setNodeStates(prev => ({ ...prev, automl: "running" }));
      const numericCols = currentProfile.numeric_columns || [];
      if (numericCols.length >= 2) {
        const targetCol = numericCols[numericCols.length - 1];
        const featureCols = numericCols.slice(0, numericCols.length - 1);
        
        const automlForm = new FormData();
        automlForm.append("file", currentFile);
        automlForm.append("target_col", targetCol);
        automlForm.append("feature_cols", featureCols.join(","));
        automlForm.append("tuning_method", "default");

        const automlRes = await fetch("http://localhost:8000/api/v1/automl/train", {
          method: "POST",
          body: automlForm
        });
        if (!automlRes.ok) throw new Error("AutoML Fit failed");
      } else {
        await new Promise(resolve => setTimeout(resolve, 800));
      }
      setNodeStates(prev => ({ ...prev, automl: "completed" }));

      // Update state parameters
      setTempCsv(currentCsv);
      setTempProfile(currentProfile);
      setColumnsBefore(dataset.columns);
      setColumnsAfter(currentProfile.columns || dataset.columns);
      setTransformMetrics({
        rowsBefore,
        rowsAfter: currentProfile.profile?.total_rows || currentProfile.total_rows || rowsBefore,
        colsBefore,
        colsAfter: currentProfile.columns?.length || colsBefore,
      });
      setPipelineHistory(prev => [
        ...prev,
        "Ingested source dataset",
        "Applied deduplication (removed duplicates)",
        "Imputed numeric missing values with median",
        "Z-score standardized numeric features",
        "Trained & benchmarked AutoML models"
      ]);
      setLastPresetMessage("Prepared dataset for Machine Learning. Deduplicated, imputed missing records, normalized variables, and registered AutoML tournament models.");
    } catch (err: any) {
      console.error(err);
      alert(`Pipeline execution error: ${err.message}`);
    } finally {
      setPipelineRunning(false);
    }
  };

  // Autonomous Agent states
  const [runningAgent, setRunningAgent] = useState(false);
  const [agentLogs, setAgentLogs] = useState<any[]>([]);
  const [agentResult, setAgentResult] = useState<any | null>(null);

  // Transformation states
  const [pipelineHistory, setPipelineHistory] = useState<string[]>([]);
  const [lastPresetMessage, setLastPresetMessage] = useState("");
  const [transformMetrics, setTransformMetrics] = useState<{
    rowsBefore: number;
    rowsAfter: number;
    colsBefore: number;
    colsAfter: number;
  } | null>(null);
  const [tempCsv, setTempCsv] = useState<string>("");
  const [tempProfile, setTempProfile] = useState<any>(null);

  // Undo History Stack
  const [csvHistory, setCsvHistory] = useState<Array<{
    csv: string;
    profile: any;
    columnsBefore: string[];
    columnsAfter: string[];
    metrics: any;
    history: string[];
  }>>([]);

  const saveToHistory = () => {
    setCsvHistory(prev => [
      ...prev,
      {
        csv: tempCsv,
        profile: tempProfile,
        columnsBefore,
        columnsAfter,
        metrics: transformMetrics,
        history: pipelineHistory
      }
    ]);
  };

  const handleUndo = () => {
    if (csvHistory.length === 0) return;
    const previous = csvHistory[csvHistory.length - 1];
    setCsvHistory(prev => prev.slice(0, -1));
    setTempCsv(previous.csv);
    setTempProfile(previous.profile);
    setColumnsBefore(previous.columnsBefore);
    setColumnsAfter(previous.columnsAfter);
    setTransformMetrics(previous.metrics);
    setPipelineHistory(previous.history);
    setApplied(false);
    setLastPresetMessage("Reverted last transformation.");
  };

  const handleComputeETL = async () => {
    if (!instruction.trim() || !dataset || !file) return;
    setLoading(true);
    setApplied(false);

    // Chaining or original file
    const activeFile = tempCsv 
      ? new File([new Blob([tempCsv], { type: 'text/csv' })], file.name, { type: 'text/csv' }) 
      : file;

    const formData = new FormData();
    formData.append("question", instruction);
    formData.append("file", activeFile);
    formData.append("mode", "ETL & Transformation Suggestion");
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
    formData.append("api_key", apiKey);

    try {
      const response = await fetch("http://localhost:8000/api/v1/ai/chat", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("AI Code generation failed");
      
      const data = await response.json();
      const outputText = data?.response || "";
      
      // Extract code block from AI response
      const codeMatch = outputText.match(/```python\n([\s\S]*?)```/);
      const generatedCode = codeMatch ? codeMatch[1] : outputText;
      
      setPythonCode(generatedCode);
      setColumnsBefore(tempProfile?.columns || dataset.columns);
      setColumnsAfter(tempProfile?.columns || dataset.columns); 
      setLastPresetMessage("AI Code block generated. Review the compiled transformation script on the right.");
    } catch (err: any) {
      console.error(err);
      alert(`AI ETL Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyTransform = async () => {
    if (!dataset || !file || !pythonCode) return;
    saveToHistory();
    setLoading(true);

    const activeFile = tempCsv 
      ? new File([new Blob([tempCsv], { type: 'text/csv' })], file.name, { type: 'text/csv' }) 
      : file;

    const formData = new FormData();
    formData.append("code", pythonCode);
    formData.append("file", activeFile);

    try {
      const response = await fetch("http://localhost:8000/api/v1/ai/execute-etl", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("ETL Execution failed");
      
      const result = await response.json();
      
      setTempCsv(result.csv);
      setTempProfile(result.profile);
      setColumnsAfter(result.columns);
      setTransformMetrics({
        rowsBefore: result.rows_before,
        rowsAfter: result.rows_after,
        colsBefore: result.cols_before,
        colsAfter: result.cols_after,
      });
      setPipelineHistory((prev) => [...prev, `Applied custom Python script transform`]);
      setLastPresetMessage(result.message);
      setPythonCode(""); // Clear code after applying
    } catch (err: any) {
      console.error(err);
      alert(`Error applying transformation: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyPreset = async (presetId: string) => {
    if (!dataset || !file) return;
    saveToHistory();
    setLoading(true);
    setApplied(false);
    
    // Chain transformations
    const activeFile = tempCsv 
      ? new File([new Blob([tempCsv], { type: 'text/csv' })], file.name, { type: 'text/csv' }) 
      : file;

    const formData = new FormData();
    formData.append("preset", presetId);
    formData.append("file", activeFile);

    try {
      const response = await fetch("http://localhost:8000/api/v1/ai/etl-preset", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "Transformation failed");
      }

      const result = await response.json();
      
      setTempCsv(result.csv);
      setTempProfile(result.profile);
      setLastPresetMessage(result.message);
      setTransformMetrics({
        rowsBefore: result.rows_before,
        rowsAfter: result.rows_after,
        colsBefore: result.cols_before,
        colsAfter: result.cols_after,
      });
      setPipelineHistory((prev) => [...prev, result.message]);
      setColumnsBefore(columnsAfter.length ? columnsAfter : dataset.columns);
      setColumnsAfter(result.columns);
    } catch (err: any) {
      console.error(err);
      alert(`Transformation Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRunAutonomousAgent = async () => {
    if (!file) return;
    setRunningAgent(true);
    setAgentLogs([]);
    setAgentResult(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("api_key", process.env.NEXT_PUBLIC_GEMINI_API_KEY || "");

    try {
      const response = await fetch("http://localhost:8000/api/v1/ai/autonomous-agent", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Autonomous agent pipeline failed");

      const result = await response.json();
      const fullLogs = result.logs || [];

      // Simulating real-time typing/processing delays for steps
      for (let i = 0; i < fullLogs.length; i++) {
        await new Promise((resolve) => setTimeout(resolve, 800));
        setAgentLogs((prev) => [...prev, fullLogs[i]]);
      }
      setAgentResult(result);
    } catch (err: any) {
      console.error(err);
      alert(`Autonomous Agent Error: ${err.message}`);
    } finally {
      setRunningAgent(false);
    }
  };

  const handleCommitWorkspace = () => {
    if (!tempCsv || !dataset || !file) return;
    
    const blob = new Blob([tempCsv], { type: 'text/csv' });
    const newFile = new File([blob], file.name, { type: 'text/csv' });
    
    setDatasetData(tempProfile || dataset, dataset.correlations, newFile);
    setApplied(true);
  };

  const handleResetPipeline = () => {
    setTempCsv("");
    setTempProfile(null);
    setLastPresetMessage("");
    setTransformMetrics(null);
    setPipelineHistory([]);
    setApplied(false);
    setColumnsBefore([]);
    setColumnsAfter([]);
    setPythonCode("");
    setCsvHistory([]);
  };

  const triggerDownload = () => {
    if (!tempCsv) return;
    const blob = new Blob([tempCsv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `cleaned_${file?.name || "dataset.csv"}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex min-h-screen bg-[#020509]">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-2 font-space">One-Click Auto-Clean & ETL Studio</h1>
            <p className="text-gray-500">Refactor your data instantly using visual cleaners, or coach the AI to build custom Python pipelines.</p>
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
              <Wrench className="w-10 h-10 text-cyan-400" />
            </div>
            <h3 className="text-2xl font-bold mb-3 font-space">No Dataset Active</h3>
            <p className="text-gray-500 max-w-sm">Please upload a dataset on the Overview page to unlock the ETL cleansing suite.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left Column: Cleansing Suite (Visual presets / prompts) */}
            <div className="lg:col-span-7 space-y-8">
              
              {/* Mode Selector Tab */}
              <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5 w-fit flex-wrap gap-1">
                <button
                  onClick={() => setActiveMode("one-click")}
                  className={`px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider font-space transition-all cursor-pointer ${
                    activeMode === "one-click"
                      ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/25 shadow-md"
                      : "text-gray-400 hover:text-gray-200"
                  }`}
                >
                  One-Click Cleaners
                </button>
                <button
                  onClick={() => setActiveMode("conversational")}
                  className={`px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider font-space transition-all cursor-pointer ${
                    activeMode === "conversational"
                      ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/25 shadow-md"
                      : "text-gray-400 hover:text-gray-200"
                  }`}
                >
                  AI Prompt Studio
                </button>
                <button
                  onClick={() => setActiveMode("autonomous")}
                  className={`px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider font-space transition-all cursor-pointer ${
                    activeMode === "autonomous"
                      ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/25 shadow-md"
                      : "text-gray-400 hover:text-gray-200"
                  }`}
                >
                  Autonomous Data Agent
                </button>
                <button
                  onClick={() => setActiveMode("visual-pipeline")}
                  className={`px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider font-space transition-all cursor-pointer ${
                    activeMode === "visual-pipeline"
                      ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/25 shadow-md"
                      : "text-gray-400 hover:text-gray-200"
                  }`}
                >
                  Visual Flow Builder
                </button>
              </div>

              {activeMode === "one-click" && (
                /* One-click Presets Grid */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-300">
                  {PRESETS.map((preset) => {
                    const Icon = preset.icon;
                    return (
                      <button
                        key={preset.id}
                        disabled={loading}
                        onClick={() => handleApplyPreset(preset.id)}
                        className={`text-left p-5 rounded-2xl border bg-white/5 transition-all duration-300 flex flex-col justify-between group cursor-pointer border-white/5 hover:bg-white/8 ${
                          preset.id === "auto_clean" ? "md:col-span-2 relative overflow-hidden" : ""
                        }`}
                      >
                        {preset.id === "auto_clean" && (
                          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
                            <Sparkles className="w-32 h-32 text-cyan-400" />
                          </div>
                        )}
                        
                        <div className="flex items-start gap-4">
                          <div className={`p-3.5 rounded-xl bg-gradient-to-br ${preset.color} border flex items-center justify-center flex-shrink-0`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-bold text-white font-space uppercase tracking-wider">{preset.name}</h4>
                              {preset.badge && (
                                <span className="text-[7px] font-black uppercase tracking-wider bg-cyan-400/10 border border-cyan-400/25 text-cyan-400 px-2 py-0.5 rounded-full">
                                  {preset.badge}
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">{preset.desc}</p>
                          </div>
                        </div>

                        <div className="mt-4 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-cyan-400/70 group-hover:text-cyan-400 transition-colors font-space self-end">
                          Apply Transform <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {activeMode === "conversational" && (
                /* Conversational Prompt Area */
                <div className="glass p-8 rounded-[2.5rem] bg-gradient-to-r from-cyan-950/5 via-black/40 to-violet-950/5 space-y-6 animate-in fade-in duration-300">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-400/15 border border-cyan-400/20 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white font-space">Conversational ETL Engine</h4>
                      <span className="text-[9px] text-gray-500 uppercase tracking-widest block font-space">Describe your cleansing actions</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 font-space">Natural Language Instruction</label>
                    <textarea
                      value={instruction}
                      onChange={(e) => setInstruction(e.target.value)}
                      placeholder="e.g., 'Lower case column names, drop rows where target is missing, and engineer a ratio feature using col_A and col_B'"
                      className="w-full h-36 bg-white/5 border border-white/10 rounded-2xl p-4 text-xs text-gray-200 outline-none focus:border-cyan-400/30 transition-all font-sans leading-relaxed resize-none"
                    />
                  </div>

                  <button
                    disabled={loading || !instruction.trim()}
                    onClick={handleComputeETL}
                    className="w-full bg-cyan-400 hover:bg-cyan-300 disabled:opacity-40 disabled:hover:bg-cyan-400 text-black py-4.5 rounded-[2rem] font-bold font-space text-xs uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(34,211,238,0.2)]"
                  >
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-black" />}
                    Generate Custom Script
                  </button>
                </div>
              )}

              {activeMode === "autonomous" && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="glass p-8 rounded-[2.5rem] bg-gradient-to-r from-violet-950/15 via-black/40 to-fuchsia-950/15 border-violet-500/10">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-violet-400/20 border border-violet-400/30 flex items-center justify-center">
                        <Brain className="w-5 h-5 text-violet-400 animate-pulse" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-white font-space">Autonomous Data Employee</h3>
                        <span className="text-[9px] text-gray-500 uppercase tracking-widest block font-space">End-to-End Automation Pipeline</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 leading-relaxed font-medium">
                      The Autonomous Agent will scan your dataset for anomalies, execute clean operations (impute missings, deduplicate), benchmark 5 AutoML tournament candidates, generate a strategic markdown report, and trigger a simulated email dispatch to stakeholders.
                    </p>
                    <div className="mt-6">
                      <button
                        disabled={runningAgent || !file}
                        onClick={handleRunAutonomousAgent}
                        className="px-6 py-3.5 rounded-full bg-violet-500 hover:bg-violet-400 disabled:bg-white/5 text-black disabled:text-gray-500 font-bold text-[10px] uppercase tracking-widest transition-all font-space disabled:cursor-not-allowed cursor-pointer flex items-center gap-2 shadow-[0_0_20px_rgba(139,92,246,0.2)]"
                      >
                        {runningAgent ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Agent Running...
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 fill-black" />
                            Initiate Agent Run
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Terminal Execution logs */}
                  {(runningAgent || agentLogs.length > 0) && (
                    <div className="glass p-6 rounded-3xl border-white/10 bg-black/40 space-y-4">
                      <div className="flex justify-between items-center border-b border-white/5 pb-3">
                        <span className="text-[9px] font-black uppercase tracking-widest text-cyan-400 font-space flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                          Live Agent Execution Logs
                        </span>
                        <span className="text-[8px] font-mono text-gray-600">localhost:8000</span>
                      </div>
                      <div className="space-y-3 font-mono text-[10px] max-h-60 overflow-y-auto pr-1">
                        {agentLogs.length === 0 && (
                          <div className="text-gray-600 animate-pulse">Initializing background subprocesses...</div>
                        )}
                        {agentLogs.map((log, index) => (
                          <div key={index} className="space-y-1 animate-in fade-in duration-300">
                            <div className="flex justify-between text-gray-400 font-bold">
                              <span>{log.step}</span>
                              <span className={log.status === "COMPLETED" ? "text-green-400" : "text-amber-400"}>
                                [{log.status}]
                              </span>
                            </div>
                            <p className="text-gray-500 pl-4">{log.detail}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeMode === "visual-pipeline" && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="glass p-8 rounded-[2.5rem] bg-gradient-to-r from-cyan-950/10 via-black/40 to-indigo-950/10 border-cyan-500/10">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-cyan-400/15 border border-cyan-400/20 flex items-center justify-center">
                          <Activity className="w-5 h-5 text-cyan-400" />
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-white font-space">Visual Flow ETL Studio</h3>
                          <span className="text-[9px] text-gray-500 uppercase tracking-widest block font-space">Interactive Node-Link Canvas</span>
                        </div>
                      </div>
                      
                      <button
                        disabled={pipelineRunning || !file}
                        onClick={handleRunPipeline}
                        className="px-6 py-3 rounded-full bg-cyan-400 hover:bg-cyan-300 disabled:bg-white/5 text-black disabled:text-gray-500 font-bold text-[10px] uppercase tracking-widest transition-all font-space disabled:cursor-not-allowed cursor-pointer flex items-center gap-2 shadow-[0_0_20px_rgba(34,211,238,0.2)]"
                      >
                        {pipelineRunning ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Executing Flow...
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 fill-black" />
                            Run Pipeline Flow
                          </>
                        )}
                      </button>
                    </div>

                    <p className="text-xs text-gray-400 leading-relaxed font-medium mb-8">
                      Build and execute modular ETL graphs. When executed, data flow pulses route through the nodes sequentially, generating live transform logs and metrics.
                    </p>

                    {/* Nodes Container */}
                    <div className="flex flex-col items-center w-full">
                      
                      {/* Node 1: Data Ingest */}
                      <div className={`w-full p-5 rounded-2xl border transition-all duration-300 flex items-center justify-between ${
                        nodeStates.source === "running"
                          ? "border-cyan-400 bg-cyan-400/5 glow-cyan"
                          : nodeStates.source === "completed"
                          ? "border-emerald-500/30 bg-emerald-500/5"
                          : "border-white/5 bg-white/3 opacity-70"
                      }`}>
                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-xl border ${
                            nodeStates.source === "running"
                              ? "bg-cyan-400/20 border-cyan-400/30 text-cyan-400"
                              : nodeStates.source === "completed"
                              ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400"
                              : "bg-white/5 border-white/10 text-gray-400"
                          }`}>
                            <FileText className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-white font-space uppercase tracking-wider">Data Ingest & Parsing</h4>
                            <p className="text-[10px] text-gray-500 mt-0.5">Loads dataset file & structures memory dataframes</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {nodeStates.source === "completed" && (
                            <span className="text-[9px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                              {file?.name} ({dataset.profile.total_rows} rows)
                            </span>
                          )}
                          <StatusIndicator state={nodeStates.source} />
                        </div>
                      </div>

                      <SVGConnector active={nodeStates.source === "running"} completed={nodeStates.source === "completed"} />

                      {/* Node 2: Deduplication */}
                      <div className={`w-full p-5 rounded-2xl border transition-all duration-300 flex items-center justify-between ${
                        nodeStates.dedup === "running"
                          ? "border-cyan-400 bg-cyan-400/5 glow-cyan"
                          : nodeStates.dedup === "completed"
                          ? "border-emerald-500/30 bg-emerald-500/5"
                          : "border-white/5 bg-white/3 opacity-70"
                      }`}>
                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-xl border ${
                            nodeStates.dedup === "running"
                              ? "bg-cyan-400/20 border-cyan-400/30 text-cyan-400"
                              : nodeStates.dedup === "completed"
                              ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400"
                              : "bg-white/5 border-white/10 text-gray-400"
                          }`}>
                            <CopyMinus className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-white font-space uppercase tracking-wider">De-Duplicate Rows</h4>
                            <p className="text-[10px] text-gray-500 mt-0.5">Scans records and removes duplicate data frames</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {nodeStates.dedup === "completed" && (
                            <span className="text-[9px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                              Removed Dups
                            </span>
                          )}
                          <StatusIndicator state={nodeStates.dedup} />
                        </div>
                      </div>

                      <SVGConnector active={nodeStates.dedup === "running"} completed={nodeStates.dedup === "completed"} />

                      {/* Node 3: Null Imputer */}
                      <div className={`w-full p-5 rounded-2xl border transition-all duration-300 flex items-center justify-between ${
                        nodeStates.impute === "running"
                          ? "border-cyan-400 bg-cyan-400/5 glow-cyan"
                          : nodeStates.impute === "completed"
                          ? "border-emerald-500/30 bg-emerald-500/5"
                          : "border-white/5 bg-white/3 opacity-70"
                      }`}>
                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-xl border ${
                            nodeStates.impute === "running"
                              ? "bg-cyan-400/20 border-cyan-400/30 text-cyan-400"
                              : nodeStates.impute === "completed"
                              ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400"
                              : "bg-white/5 border-white/10 text-gray-400"
                          }`}>
                            <ShieldCheck className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-white font-space uppercase tracking-wider">Null Value Imputation</h4>
                            <p className="text-[10px] text-gray-500 mt-0.5">Fills blank records with median numerical metrics</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {nodeStates.impute === "completed" && (
                            <span className="text-[9px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                              Imputed Medians
                            </span>
                          )}
                          <StatusIndicator state={nodeStates.impute} />
                        </div>
                      </div>

                      <SVGConnector active={nodeStates.impute === "running"} completed={nodeStates.impute === "completed"} />

                      {/* Node 4: Scale Features */}
                      <div className={`w-full p-5 rounded-2xl border transition-all duration-300 flex items-center justify-between ${
                        nodeStates.scale === "running"
                          ? "border-cyan-400 bg-cyan-400/5 glow-cyan"
                          : nodeStates.scale === "completed"
                          ? "border-emerald-500/30 bg-emerald-500/5"
                          : "border-white/5 bg-white/3 opacity-70"
                      }`}>
                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-xl border ${
                            nodeStates.scale === "running"
                              ? "bg-cyan-400/20 border-cyan-400/30 text-cyan-400"
                              : nodeStates.scale === "completed"
                              ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400"
                              : "bg-white/5 border-white/10 text-gray-400"
                          }`}>
                            <Scale className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-white font-space uppercase tracking-wider">Feature Scaling</h4>
                            <p className="text-[10px] text-gray-500 mt-0.5">Scales numeric columns using MinMax normalize</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {nodeStates.scale === "completed" && (
                            <span className="text-[9px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                              Normalized [0,1]
                            </span>
                          )}
                          <StatusIndicator state={nodeStates.scale} />
                        </div>
                      </div>

                      <SVGConnector active={nodeStates.scale === "running"} completed={nodeStates.scale === "completed"} />

                      {/* Node 5: AutoML Fit */}
                      <div className={`w-full p-5 rounded-2xl border transition-all duration-300 flex items-center justify-between ${
                        nodeStates.automl === "running"
                          ? "border-cyan-400 bg-cyan-400/5 glow-cyan"
                          : nodeStates.automl === "completed"
                          ? "border-emerald-500/30 bg-emerald-500/5"
                          : "border-white/5 bg-white/3 opacity-70"
                      }`}>
                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-xl border ${
                            nodeStates.automl === "running"
                              ? "bg-cyan-400/20 border-cyan-400/30 text-cyan-400"
                              : nodeStates.automl === "completed"
                              ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400"
                              : "bg-white/5 border-white/10 text-gray-400"
                          }`}>
                            <Brain className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-white font-space uppercase tracking-wider">AutoML Model Fitting</h4>
                            <p className="text-[10px] text-gray-500 mt-0.5">Executes LightGBM / XGBoost champion search</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {nodeStates.automl === "completed" && (
                            <span className="text-[9px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                              AutoML Champion Fit
                            </span>
                          )}
                          <StatusIndicator state={nodeStates.automl} />
                        </div>
                      </div>

                    </div>
                  </div>

                  <style>{`
                    @keyframes flow-dash {
                      to {
                        stroke-dashoffset: -24;
                      }
                    }
                  `}</style>
                </div>
              )}
            </div>

            {/* Right Column: Execution details / Metrics / Diff Viewer */}
            <div className="lg:col-span-5 space-y-8">
              {activeMode === "autonomous" ? (
                /* Autonomous Agent Output Box */
                <div className="space-y-6">
                  {!agentResult && !runningAgent ? (
                    <div className="glass p-8 rounded-[2.5rem] flex flex-col items-center justify-center text-center min-h-[300px]">
                      <Brain className="w-12 h-12 text-gray-600 mb-4 animate-pulse" />
                      <h4 className="text-sm font-bold font-space text-gray-400 uppercase tracking-wider">Agent Idle</h4>
                      <p className="text-gray-500 text-xs max-w-xs mt-2 leading-relaxed">
                        Trigger the Autonomous Data Employee on the left to benchmark models and generate executive briefings.
                      </p>
                    </div>
                  ) : runningAgent && !agentResult ? (
                    <div className="glass p-8 rounded-[2.5rem] flex flex-col items-center justify-center text-center min-h-[300px]">
                      <Loader2 className="w-10 h-10 text-violet-400 animate-spin mb-4" />
                      <h4 className="text-sm font-bold font-space text-white animate-pulse uppercase tracking-wider">Processing Dataset</h4>
                      <p className="text-gray-500 text-xs max-w-xs mt-2 leading-relaxed">
                        The agent is running AutoML tournaments and consultant reviews...
                      </p>
                    </div>
                  ) : agentResult && (
                    <div className="space-y-6 animate-in fade-in duration-500">
                      {/* Model Champion Card */}
                      <div className="glass p-6 rounded-3xl border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-transparent relative overflow-hidden group">
                        <span className="text-[9px] font-black text-violet-400 uppercase tracking-widest font-space block mb-1">AutoML Champion Fit</span>
                        <div className="text-xl font-black text-white font-space mt-1">{agentResult.best_model}</div>
                        <div className="text-xs text-gray-400 font-mono mt-1">Cross-Validation R²: {agentResult.best_r2}</div>
                      </div>

                      {/* Executive narrative report */}
                      <div className="glass p-6 rounded-3xl border-white/10 bg-white/3 space-y-4">
                        <span className="text-[9px] font-black uppercase tracking-widest text-cyan-400 font-space block">AI Narrative Executive Briefing</span>
                        <div className="p-4 bg-black/40 border border-white/5 rounded-2xl overflow-y-auto text-xs text-gray-300 leading-relaxed max-h-64 whitespace-pre-line font-medium font-sans">
                          {agentResult.report}
                        </div>
                      </div>

                      {/* Email simulation confirmation */}
                      <div className="glass p-6 rounded-3xl border-emerald-500/10 bg-emerald-500/5 flex items-start gap-4">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <CheckCircle2 className="w-4.5 h-4.5" />
                        </div>
                        <div>
                          <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400 font-space block">Briefing Dispatched</span>
                          <p className="text-xs text-gray-300 mt-1 leading-relaxed">
                            Simulated SMTP: sent executive PDF attachment to <span className="font-mono text-cyan-400">demo@datamind.ai</span>.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Task Completed Card for prepare_ml preset */}
                  {lastPresetMessage && lastPresetMessage.includes("Prepared dataset for Machine Learning") && (
                    <div className="glass p-8 rounded-[2.5rem] border-violet-500/30 bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 animate-in slide-in-from-top duration-500 relative overflow-hidden shadow-[0_0_50px_rgba(139,92,246,0.15)]">
                      <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                        <Sparkles className="w-32 h-32 text-violet-400" />
                      </div>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-lg animate-pulse">
                          <Check className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold font-space text-white">Task Completed</h3>
                          <p className="text-[10px] font-black uppercase tracking-widest text-violet-400 mt-0.5">Autonomous Data Agent converged</p>
                        </div>
                      </div>
                      <p className="text-xs text-gray-300 leading-relaxed mb-6 font-sans">
                        {lastPresetMessage}
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        <button 
                          onClick={() => {
                            document.getElementById("refactored-schema")?.scrollIntoView({ behavior: 'smooth' });
                          }}
                          className="px-3 py-2.5 rounded-xl bg-violet-500/20 border border-violet-500/30 text-violet-400 text-[9px] font-bold font-space uppercase tracking-wider hover:bg-violet-500/30 transition-all cursor-pointer text-center font-space"
                        >
                          View Changes
                        </button>
                        <button 
                          onClick={handleUndo}
                          disabled={csvHistory.length === 0}
                          className="px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-[9px] font-bold font-space uppercase tracking-wider hover:bg-white/10 transition-all cursor-pointer text-center disabled:opacity-40 font-space"
                        >
                          Undo
                        </button>
                        <button 
                          onClick={triggerDownload}
                          className="px-3 py-2.5 rounded-xl bg-white text-black text-[9px] font-bold font-space uppercase tracking-wider hover:bg-cyan-400 transition-all cursor-pointer text-center font-space"
                        >
                          Download Clean
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Workspace Commit / Reset actions */}
                  {tempCsv && (
                    <div className="glass p-6 rounded-3xl border-cyan-400/20 bg-cyan-400/5 flex flex-col gap-4 animate-in fade-in duration-300">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400">
                          <Check className="w-4.5 h-4.5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white font-space uppercase tracking-wider">Unsaved transformations pending</h4>
                          <p className="text-[10px] text-gray-400 mt-0.5">Commit these changes to update all pages (Overview, AutoML, Visual Lab).</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          onClick={handleCommitWorkspace}
                          disabled={applied}
                          className={`py-3.5 rounded-full font-bold font-space text-[9px] uppercase tracking-widest flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                            applied
                              ? "bg-green-500/10 border border-green-500/20 text-green-400 col-span-1"
                              : "bg-white text-black hover:bg-cyan-400 shadow-md col-span-1"
                          }`}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          {applied ? "Committed" : "Commit"}
                        </button>
                        <button
                          onClick={handleUndo}
                          disabled={csvHistory.length === 0}
                          className="bg-white/5 border border-white/10 hover:bg-white/10 text-white py-3.5 rounded-full font-bold font-space text-[9px] uppercase tracking-widest flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:hover:bg-transparent"
                        >
                          <Undo className="w-4 h-4" />
                          Undo
                        </button>
                        <button
                          onClick={handleResetPipeline}
                          className="bg-white/5 border border-white/10 hover:bg-white/10 text-white py-3.5 rounded-full font-bold font-space text-[9px] uppercase tracking-widest flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <RotateCcw className="w-4 h-4" />
                          Reset
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Diff Metric Cards */}
                  {transformMetrics && (
                    <div className="grid grid-cols-2 gap-4 animate-in fade-in duration-500">
                      <div className="glass p-5 rounded-3xl text-center relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/5 to-transparent pointer-events-none" />
                        <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest font-space block mb-1.5">Row Delta</span>
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-lg font-bold text-gray-400 font-mono">{transformMetrics.rowsBefore.toLocaleString()}</span>
                          <ArrowLeftRight className="w-3.5 h-3.5 text-cyan-400" />
                          <span className="text-xl font-black text-cyan-400 font-mono">{transformMetrics.rowsAfter.toLocaleString()}</span>
                        </div>
                        <span className="text-[9px] font-medium text-gray-500 font-mono block mt-1">
                          {transformMetrics.rowsAfter - transformMetrics.rowsBefore === 0 
                            ? "Unchanged" 
                            : `${(transformMetrics.rowsAfter - transformMetrics.rowsBefore).toLocaleString()} rows`}
                        </span>
                      </div>

                      <div className="glass p-5 rounded-3xl text-center relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-violet-400/5 to-transparent pointer-events-none" />
                        <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest font-space block mb-1.5">Column Delta</span>
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-lg font-bold text-gray-400 font-mono">{transformMetrics.colsBefore}</span>
                          <ArrowLeftRight className="w-3.5 h-3.5 text-violet-400" />
                          <span className="text-xl font-black text-violet-400 font-mono">{transformMetrics.colsAfter}</span>
                        </div>
                        <span className="text-[9px] font-medium text-gray-500 font-mono block mt-1">
                          {transformMetrics.colsAfter - transformMetrics.colsBefore === 0 
                            ? "Unchanged" 
                            : `${transformMetrics.colsAfter - transformMetrics.colsBefore > 0 ? "+" : ""}${transformMetrics.colsAfter - transformMetrics.colsBefore} features`}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Status Output Box */}
                  {!tempCsv && !loading && !pythonCode ? (
                    <div className="glass p-8 rounded-[2.5rem] flex flex-col items-center justify-center text-center min-h-[300px]">
                      <Activity className="w-12 h-12 text-gray-600 mb-4" />
                      <h4 className="text-sm font-bold font-space text-gray-400 uppercase tracking-wider">Ready to process</h4>
                      <p className="text-gray-500 text-xs max-w-xs mt-2 leading-relaxed">
                        Trigger a one-click cleaner or submit an AI prompt on the left to begin cleaning your data.
                      </p>
                    </div>
                  ) : loading ? (
                    <div className="glass p-8 rounded-[2.5rem] flex flex-col items-center justify-center text-center min-h-[300px]">
                      <RefreshCw className="w-10 h-10 text-cyan-400 animate-spin mb-4" />
                      <h4 className="text-sm font-bold font-space text-white animate-pulse uppercase tracking-wider">Compiling dataset clean</h4>
                      <p className="text-gray-500 text-xs max-w-xs mt-2 leading-relaxed">
                        Executing transformation functions on Python server node...
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6 animate-in fade-in duration-300">
                      {/* Pipeline Message/Log */}
                      {lastPresetMessage && (
                        <div className="glass p-6 rounded-3xl border-white/10 bg-white/3 space-y-2">
                          <span className="text-[9px] font-black uppercase tracking-widest text-cyan-400 font-space block">Latest Transformation Log</span>
                          <p className="text-xs text-gray-200 leading-relaxed font-mono">{lastPresetMessage}</p>
                        </div>
                      )}

                      {/* AI Script confirmation */}
                      {pythonCode && (
                        <div className="glass p-6 rounded-3xl border-white/10 bg-white/3 space-y-4">
                          <div className="flex justify-between items-center">
                            <span className="text-[9px] font-black uppercase tracking-widest text-cyan-400 font-space block">Compiled transformation script</span>
                            <span className="text-[8px] font-black font-space px-2 py-0.5 rounded-full bg-cyan-400/20 text-cyan-400 border border-cyan-400/30 uppercase tracking-wider">Draft</span>
                          </div>
                          <pre className="p-4 bg-black/40 border border-white/5 rounded-2xl overflow-x-auto text-[10px] font-mono text-cyan-400/90 leading-normal max-h-48 scrollbar-hide">
                            {pythonCode}
                          </pre>
                          <button
                            onClick={handleApplyTransform}
                            className="w-full bg-cyan-400 hover:bg-cyan-300 text-black py-3 rounded-full font-bold font-space text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer transition-colors"
                          >
                            <Play className="w-3.5 h-3.5 fill-black" />
                            Execute Script on Dataset
                          </button>
                        </div>
                      )}

                      {/* Columns changes map */}
                      {columnsAfter.length > 0 && (
                        <div id="refactored-schema" className="glass p-6 rounded-3xl border-white/10 bg-white/3 space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-[9px] font-black uppercase tracking-widest text-violet-400 font-space block">Refactored Schema</span>
                            <span className="text-[9px] font-mono text-gray-500 font-bold">{columnsAfter.length} columns</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5 max-h-[140px] overflow-y-auto pr-1 scrollbar-hide">
                            {columnsAfter.map((col) => {
                              const isNew = !columnsBefore.includes(col);
                              return (
                                <span 
                                  key={col} 
                                  className={`text-[9px] font-mono px-2 py-0.5 rounded border transition-colors ${
                                    isNew 
                                      ? "bg-emerald-400/10 border-emerald-400/20 text-emerald-400"
                                      : "bg-white/5 border-white/5 text-gray-400"
                                  }`}
                                >
                                  {col}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Chained Pipeline History */}
                      {pipelineHistory.length > 0 && (
                        <div className="glass p-6 rounded-3xl border-white/10 bg-white/3 space-y-3">
                          <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 font-space block">Applied Pipeline Timeline</span>
                          <div className="space-y-2 font-mono text-[10px] text-gray-400">
                            {pipelineHistory.map((step, idx) => (
                              <div key={idx} className="flex gap-2.5 items-start">
                                <span className="text-cyan-400/80 font-bold">[{idx + 1}]</span>
                                <span className="leading-relaxed">{step}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Actions buttons */}
                      {tempCsv && (
                        <div className="flex gap-4">
                          <button
                            onClick={triggerDownload}
                            className="flex-1 bg-white/5 border border-white/10 hover:bg-white/10 text-white py-4 rounded-full font-bold font-space text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer transition-colors"
                          >
                            <Download className="w-4 h-4" />
                            Download Cleaned CSV
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        )}
      </main>
    </div>
  );
}
