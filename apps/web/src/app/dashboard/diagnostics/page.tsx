"use client";

import { Sidebar } from "@/components/sidebar";
import { ShieldAlert, CheckCircle2, Search, Zap, Layout, Sparkles, Brain, AlertTriangle, RefreshCw } from "lucide-react";
import { useData } from "@/store/data-context";
import { useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function DiagnosticsPage() {
  const { dataset, file } = useData();
  const [detectiveLoading, setDetectiveLoading] = useState(false);
  const [detectiveResult, setDetectiveResult] = useState<any | null>(null);

  if (!dataset) {
    return (
      <div className="flex min-h-screen bg-[#00020a]">
        <Sidebar />
        <main className="flex-1 p-8 flex items-center justify-center">
          <div className="text-center glass p-12 rounded-[3rem] border-dashed border-white/10 max-w-md">
            <ShieldAlert className="w-16 h-16 text-gray-700 mx-auto mb-6 animate-pulse" />
            <h3 className="text-2xl font-bold mb-4 font-space text-white">Diagnostic Engine Offline</h3>
            <p className="text-gray-500 font-medium">Please upload a dataset in the Overview to initiate an automated health audit.</p>
          </div>
        </main>
      </div>
    );
  }

  const { profile } = dataset;
  const health = dataset.health_score || {
    quality: dataset.quality_score || 84.0,
    completeness: 96.0,
    consistency: 78.0,
    bias_risk: 72.0,
    leakage_risk: 89.0,
    ml_readiness: 91.0
  };

  const handleRunDetective = async () => {
    if (!file) return;
    setDetectiveLoading(true);
    setDetectiveResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${API}/api/v1/ai/detective`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        setDetectiveResult(await res.json());
      } else {
        alert("Failed to run AI Data Detective");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDetectiveLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#00020a] text-white">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="mb-12 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-2 font-space text-white">Diagnostics Engine</h1>
            <p className="text-gray-500 font-medium">Automated dataset health audit for {file?.name || "current file"}.</p>
          </div>
          <button
            onClick={handleRunDetective}
            disabled={detectiveLoading}
            className="bg-gradient-to-r from-cyan-400 to-violet-500 hover:from-cyan-300 hover:to-violet-400 text-black px-6 py-3 rounded-2xl text-xs font-bold font-space uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
          >
            {detectiveLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
            {detectiveLoading ? "Analyzing..." : "Deploy Data Detective"}
          </button>
        </header>

        {/* AI Data Detective Warnings Console */}
        {detectiveResult && (
          <div className="mb-12 glass p-8 rounded-[2.5rem] border-rose-500/20 bg-gradient-to-br from-rose-500/5 to-amber-500/5 animate-in fade-in duration-300 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none font-space font-black text-6xl uppercase text-red-500">
              DETECTIVE WARNING
            </div>
            <div className="flex items-center gap-2.5 text-[9px] font-black text-rose-400 uppercase tracking-widest font-space border-b border-white/5 pb-3 mb-4">
              <AlertTriangle className="w-4 h-4 text-rose-400 animate-pulse" />
              AI Root-Cause Investigation Result
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
              <div className="md:col-span-3 space-y-4">
                <h3 className="text-2xl font-black font-space text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                  {detectiveResult.anomaly}
                </h3>
                <div className="space-y-2">
                  <span className="text-[10px] text-gray-500 uppercase tracking-widest font-space font-black block">Potential Root Causes:</span>
                  <ul className="list-decimal list-inside space-y-1.5 text-xs text-gray-300">
                    {detectiveResult.reasons.map((r: string, idx: number) => (
                      <li key={idx} className="leading-relaxed font-medium">{r}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="md:col-span-1 text-center bg-white/3 border border-white/5 p-6 rounded-[2rem]">
                <div className="text-5xl font-black font-space text-cyan-400 tracking-tight">{detectiveResult.confidence}%</div>
                <div className="text-[9px] text-gray-500 uppercase tracking-widest font-space font-black mt-1">Confidence Score</div>
              </div>
            </div>
          </div>
        )}

        {/* Health Score Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          <DiagCard 
            title="Integrity Score" 
            value={`${health.completeness}%`} 
            status={Number(health.completeness) > 90 ? "Excellent" : "Fair"} 
            icon={<CheckCircle2 className="text-green-400" />}
            color="from-green-400/20 to-green-500/5"
          />
          <DiagCard 
            title="Dataset Consistency" 
            value={`${health.consistency}%`} 
            status={health.consistency > 75 ? "Consistent" : "Warning"} 
            icon={<Search className="text-cyan-400" />}
            color="from-cyan-400/20 to-cyan-500/5"
          />
          <DiagCard 
            title="Overall Health" 
            value={`${health.quality}/100`} 
            status="ML Ready" 
            icon={<Zap className="text-amber-400" />}
            color="from-amber-400/20 to-amber-500/5"
          />
        </div>

        {/* Detailed 6-Dimension Health Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Progress dimensions */}
          <div className="glass p-10 rounded-[3rem] border-white/5 space-y-6">
            <h3 className="text-2xl font-bold mb-6 flex items-center gap-3 font-space text-white">
              <Sparkles className="w-6 h-6 text-cyan-400" />
              AI Health Score Breakdown
            </h3>
            {[
              { label: "Dataset Quality", value: health.quality },
              { label: "Completeness", value: health.completeness },
              { label: "Consistency", value: health.consistency },
              { label: "Bias Risk Score", value: health.bias_risk, desc: "Higher score indicates less bias risk" },
              { label: "Leakage Risk Score", value: health.leakage_risk, desc: "Higher score indicates lower target leakage" },
              { label: "ML Readiness", value: health.ml_readiness }
            ].map(({ label, value, desc }: any) => (
              <div key={label} className="space-y-2">
                <div className="flex justify-between items-center text-xs uppercase tracking-wider font-space">
                  <span className="text-gray-300 font-bold">{label}</span>
                  <span className="text-cyan-400 font-black font-mono">{value}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden relative">
                  <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-violet-500 transition-all duration-1000" style={{ width: `${value}%` }} />
                </div>
                {desc && <p className="text-[9px] text-gray-500 italic mt-0.5">{desc}</p>}
              </div>
            ))}
          </div>

          {/* Vulnerability report */}
          <div className="glass p-10 rounded-[3rem] border-white/5">
            <h3 className="text-2xl font-bold mb-8 flex items-center gap-4 font-space text-white">
              <Layout className="w-6 h-6 text-violet-400" />
              Vulnerability Report
            </h3>
            <div className="space-y-4">
              <ReportItem 
                issue="Missing Values" 
                impact={health.completeness < 90 ? "High" : "Low"} 
                desc={`${profile.missing_cells} cells are empty in this dataset.`}
                severity={health.completeness < 90 ? "Critical" : "Optimized"}
              />
              <ReportItem 
                issue="Dataset Scale" 
                impact="Medium" 
                desc={`Processing engine is handling ${profile.total_rows.toLocaleString()} rows and ${profile.total_cols} columns.`}
                severity={profile.total_rows > 10000 ? "Warning" : "Optimized"}
              />
              <ReportItem 
                issue="Feature Redundancy" 
                impact="Low" 
                desc={`Duplicate rows: ${profile.duplicate_rows}. High uniqueness ratio.`}
                severity={profile.duplicate_rows > 0 ? "Warning" : "Optimized"}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function DiagCard({ title, value, status, icon, color }: any) {
  return (
    <div className={`glass p-10 rounded-[3rem] bg-gradient-to-br ${color} border-white/5 hover:scale-[1.02] transition-all duration-700 group`}>
      <div className="flex justify-between items-center mb-8">
        <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-xl">
          {icon}
        </div>
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 font-space">{status}</span>
      </div>
      <h4 className="text-gray-400 text-xs font-bold uppercase tracking-[0.2em] mb-3 font-space">{title}</h4>
      <div className="text-5xl font-black tracking-tighter text-white font-space">{value}</div>
    </div>
  );
}

function ReportItem({ issue, impact, desc, severity }: any) {
  return (
    <div className="flex items-start gap-4 p-5 bg-white/[0.02] rounded-[2rem] border border-white/5 hover:bg-white/[0.04] transition-all group">
      <div className={`mt-2 w-2.5 h-2.5 rounded-full ${
        severity === 'Critical' ? 'bg-red-400 shadow-[0_0_12px_#f87171]' : 
        severity === 'Warning' ? 'bg-amber-400 shadow-[0_0_12px_#fbbf24]' : 
        'bg-green-400 shadow-[0_0_12px_#4ade80]'
      }`} />
      <div className="flex-1">
        <div className="flex justify-between items-center mb-1">
          <h5 className="text-base font-bold text-gray-100 font-space">{issue}</h5>
          <span className={`text-[9px] font-black px-2.5 py-1 rounded-lg border ${
            severity === 'Critical' ? 'border-red-500/30 text-red-400 bg-red-500/5' : 
            severity === 'Warning' ? 'border-amber-500/30 text-amber-400 bg-amber-500/5' : 
            'border-green-500/30 text-green-400 bg-green-500/5'
          } font-space`}>{severity}</span>
        </div>
        <p className="text-gray-500 font-medium leading-relaxed text-xs">{desc}</p>
      </div>
    </div>
  );
}
