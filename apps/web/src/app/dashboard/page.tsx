"use client";

import { useState, useCallback, useEffect } from "react";
import { Sidebar } from "@/components/sidebar";
import {
  Activity, Database, Layout, AlertTriangle, Sparkles, Info,
  TrendingUp, Shield, Zap, BarChart3, CheckCircle2, XCircle,
  Upload, ChevronRight, Eye, Brain, Layers, GitBranch, Loader2
} from "lucide-react";
import { useData } from "@/store/data-context";
import { DataUploader } from "@/components/data-uploader";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function Dashboard() {
  const { dataset, setDatasetData, clearDataset, file } = useData();
  const data = dataset?.profile;
  const insights = dataset?.insights as string[] | undefined;
  const qualityScore: number = dataset?.quality_score ?? 0;
  const advancedStats = dataset?.advanced_stats as Record<string, any> | undefined;

  const [versions, setVersions] = useState<any[]>([]);
  const [rollingBack, setRollingBack] = useState<number | null>(null);
  const [selectedVersions, setSelectedVersions] = useState<string[]>([]);
  const [comparing, setComparing] = useState(false);
  const [comparisonResult, setComparisonResult] = useState<any | null>(null);

  const toggleVersionSelection = (id: string) => {
    setSelectedVersions((prev) => {
      if (prev.includes(id)) {
        return prev.filter((vId) => vId !== id);
      }
      if (prev.length >= 2) {
        return [prev[1], id];
      }
      return [...prev, id];
    });
  };

  const handleCompare = async () => {
    if (selectedVersions.length !== 2) return;
    setComparing(true);
    setComparisonResult(null);
    try {
      const formData = new FormData();
      formData.append("version_a_id", selectedVersions[0]);
      formData.append("version_b_id", selectedVersions[1]);
      formData.append("api_key", process.env.NEXT_PUBLIC_GEMINI_API_KEY || "");

      const res = await fetch(`${API}/api/v1/datasets/compare`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const result = await res.json();
        setComparisonResult(result);
      } else {
        const err = await res.json();
        alert(err.detail || "Failed to compare versions");
      }
    } catch (e) {
      console.error(e);
      alert("Error comparing versions");
    } finally {
      setComparing(false);
    }
  };

  const fetchVersions = useCallback(async () => {
    if (!dataset?.id) return;
    try {
      const res = await fetch(`${API}/api/v1/datasets/${dataset.id}/versions`);
      if (res.ok) {
        setVersions(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
  }, [dataset?.id]);

  useEffect(() => {
    fetchVersions();
  }, [fetchVersions]);

  const handleRollback = async (versionNum: number) => {
    if (!dataset?.id) return;
    setRollingBack(versionNum);
    try {
      const formData = new FormData();
      formData.append("version_num", String(versionNum));
      const res = await fetch(`${API}/api/v1/datasets/${dataset.id}/rollback`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const result = await res.json();
        setDatasetData({ ...dataset, profile: result.profile, current_version: result.current_version }, dataset.correlations, file);
        alert(`Successfully rolled back to version ${versionNum}`);
        fetchVersions();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRollingBack(null);
    }
  };

  const handleUploadSuccess = (result: any, file: File) => {
    setDatasetData(result, result.correlations, file);
  };

  const qColor = qualityScore >= 80 ? "#10b981" : qualityScore >= 60 ? "#f59e0b" : "#f43f5e";
  const qLabel = qualityScore >= 80 ? "Excellent" : qualityScore >= 60 ? "Good" : "Needs Attention";

  return (
    <div className="flex min-h-screen bg-[#020509]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">

        {!data ? (
          /* ── UPLOAD STATE ── */
          <div className="flex flex-col items-center justify-center min-h-screen p-12 relative">
            {/* Background orbs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/8 rounded-full blur-[120px] animate-orb-drift" />
              <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-violet-500/8 rounded-full blur-[100px] animate-orb-drift" style={{ animationDelay: "7s" }} />
            </div>
            <div className="relative z-10 w-full max-w-2xl">
              <div className="text-center mb-10">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 text-[10px] font-black uppercase tracking-widest mb-6">
                  <span className="pulse-dot" />
                  DataMind AI · Analytical Engine v2
                </div>
                <h1 className="text-5xl font-black tracking-tight mb-4 font-space">
                  <span className="gradient-text-aurora">Drop your data.</span>
                  <br />
                  <span className="text-white/90">We do the rest.</span>
                </h1>
                <p className="text-gray-400 text-lg max-w-md mx-auto leading-relaxed">
                  Upload any CSV or Excel file. Get instant AI insights, quality scores, visualizations, and one-click transformations.
                </p>
              </div>
              <DataUploader onUploadSuccess={handleUploadSuccess} />
              <div className="mt-8 grid grid-cols-3 gap-4">
                {[
                  { icon: Brain, label: "AI Analysis", desc: "GPT-4o powered" },
                  { icon: Zap, label: "Instant ETL", desc: "One-click transforms" },
                  { icon: BarChart3, label: "Auto Charts", desc: "Beautiful visuals" },
                ].map(({ icon: Icon, label, desc }) => (
                  <div key={label} className="glass p-4 rounded-2xl text-center">
                    <Icon className="w-5 h-5 text-cyan-400 mx-auto mb-2" />
                    <div className="text-xs font-bold text-white font-space">{label}</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">{desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* ── DATA LOADED STATE ── */
          <div className="p-8 space-y-8 animate-slide-in-up">

            {/* Header */}
            <header className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="badge-live">
                    <span className="pulse-dot" />
                    <span className="font-space tracking-widest text-[9px]">Dataset Active</span>
                  </div>
                  <span className="text-[10px] text-gray-600 font-space uppercase tracking-widest">
                    {data.total_rows.toLocaleString()} rows · {data.total_cols} features
                  </span>
                </div>
                <h1 className="text-3xl font-black tracking-tight font-space gradient-text">Data Studio</h1>
                <p className="text-gray-500 text-sm mt-1">Full dataset profile, quality analysis, and AI insights.</p>
              </div>
              <button
                onClick={clearDataset}
                className="text-xs font-bold text-rose-400 hover:text-rose-300 transition-colors uppercase tracking-widest bg-rose-400/10 hover:bg-rose-400/20 px-4 py-2 rounded-full border border-rose-400/20"
              >
                Clear Workspace
              </button>
            </header>

            {/* Quality Score + Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {/* Quality Score — big card */}
              <div className="md:col-span-1 glass p-6 rounded-3xl flex flex-col items-center justify-center relative overflow-hidden group">
                <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity"
                  style={{ background: `radial-gradient(circle at center, ${qColor}, transparent 70%)` }} />
                <div className="relative z-10 text-center">
                  <div className="text-4xl font-black font-space mb-1" style={{ color: qColor }}>
                    {qualityScore}
                  </div>
                  <div className="text-[9px] text-gray-500 uppercase tracking-widest font-space font-black">Quality Score</div>
                  <div className="text-[10px] font-bold mt-1" style={{ color: qColor }}>{qLabel}</div>
                  <div className="mt-3 w-16 h-1.5 rounded-full bg-white/10 mx-auto overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-1000"
                      style={{ width: `${qualityScore}%`, background: qColor }} />
                  </div>
                </div>
              </div>
              {/* Stat cards */}
              {[
                { label: "Total Rows", value: data.total_rows.toLocaleString(), icon: Database, color: "text-cyan-400", bg: "bg-cyan-400/10" },
                { label: "Features", value: data.total_cols, icon: Layout, color: "text-violet-400", bg: "bg-violet-400/10" },
                { label: "Missing Cells", value: data.missing_cells.toLocaleString(), icon: AlertTriangle, color: data.missing_cells > 0 ? "text-amber-400" : "text-green-400", bg: data.missing_cells > 0 ? "bg-amber-400/10" : "bg-green-400/10" },
                { label: "Duplicates", value: data.duplicate_rows, icon: GitBranch, color: data.duplicate_rows > 0 ? "text-rose-400" : "text-green-400", bg: data.duplicate_rows > 0 ? "bg-rose-400/10" : "bg-green-400/10" },
              ].map(({ label, value, icon: Icon, color, bg }) => (
                <div key={label} className="glass p-6 rounded-3xl group hover:bg-white/[0.06] transition-all duration-500">
                  <div className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center mb-4 border border-white/5`}>
                    <Icon className={`w-4.5 h-4.5 ${color}`} />
                  </div>
                  <div className="text-2xl font-black tracking-tight text-white font-space">{value}</div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-widest font-black mt-1">{label}</div>
                </div>
              ))}
            </div>

            {/* AI Insights */}
            {insights && insights.length > 0 && (
              <div className="glass p-8 rounded-[2.5rem] relative overflow-hidden border-cyan-400/10 bg-gradient-to-br from-cyan-400/5 to-violet-400/5">
                <div className="absolute -top-20 -right-20 w-60 h-60 bg-cyan-400/15 rounded-full blur-3xl pointer-events-none animate-orb-drift" />
                <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-violet-400/15 rounded-full blur-3xl pointer-events-none animate-orb-drift" style={{ animationDelay: "5s" }} />
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-cyan-400/20 border border-cyan-400/30 flex items-center justify-center animate-ai-pulse">
                      <Sparkles className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div>
                      <h3 className="text-base font-black font-space text-white tracking-tight">Automated Intelligence Engine</h3>
                      <p className="text-[10px] text-gray-500 uppercase tracking-widest">AI-Generated pattern insights</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {insights.map((insight, idx) => (
                      <div key={idx}
                        className="flex gap-3 p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-cyan-400/25 transition-all duration-300 group cursor-default"
                        style={{ animationDelay: `${idx * 100}ms` }}>
                        <div className="w-8 h-8 rounded-xl bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-cyan-400/20 transition-colors">
                          <Info className="w-4 h-4 text-cyan-400" />
                        </div>
                        <p className="text-sm text-gray-300 leading-relaxed">
                          {insight.replace(/\*\*(.*?)\*\*/g, (_, m) => m)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Schema Intelligence */}
              <div className="glass p-8 rounded-[2.5rem]">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-9 h-9 rounded-xl bg-violet-400/10 border border-violet-400/20 flex items-center justify-center">
                    <Layers className="w-4.5 h-4.5 text-violet-400" />
                  </div>
                  <h3 className="text-base font-bold font-space">Schema Intelligence</h3>
                </div>
                <div className="space-y-3">
                  {[
                    { label: "Numeric Columns", value: data.numeric_cols, icon: TrendingUp, color: "text-cyan-400" },
                    { label: "Categorical Columns", value: data.categorical_cols, icon: BarChart3, color: "text-violet-400" },
                    { label: "Duplicate Rows", value: data.duplicate_rows, icon: data.duplicate_rows > 0 ? XCircle : CheckCircle2, color: data.duplicate_rows > 0 ? "text-rose-400" : "text-green-400" },
                    { label: "Memory Usage", value: `${data.memory_mb.toFixed(2)} MB`, icon: Activity, color: "text-amber-400" },
                  ].map(({ label, value, icon: Icon, color }) => (
                    <div key={label} className="flex items-center justify-between p-4 bg-white/4 hover:bg-white/7 rounded-2xl border border-white/5 hover:border-white/10 transition-all group">
                      <div className="flex items-center gap-3">
                        <Icon className={`w-4 h-4 ${color}`} />
                        <span className="text-sm text-gray-400">{label}</span>
                      </div>
                      <span className="font-bold text-white text-sm">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Statistical Preview */}
              <div className="glass p-8 rounded-[2.5rem] overflow-hidden">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-9 h-9 rounded-xl bg-green-400/10 border border-green-400/20 flex items-center justify-center">
                    <TrendingUp className="w-4.5 h-4.5 text-green-400" />
                  </div>
                  <h3 className="text-base font-bold font-space">Statistical Preview</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-[10px] text-gray-600 uppercase tracking-widest border-b border-white/5">
                        <th className="pb-4 font-black text-left">Feature</th>
                        <th className="pb-4 font-black text-right">Mean</th>
                        <th className="pb-4 font-black text-right">Std</th>
                        <th className="pb-4 font-black text-right">Max</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {Object.keys(data.numeric_summary).slice(0, 6).map((col) => (
                        <tr key={col} className="group hover:bg-white/3 transition-colors">
                          <td className="py-3.5 text-gray-300 font-medium font-mono text-xs">{col}</td>
                          <td className="py-3.5 text-right text-gray-500 tabular-nums">{data.numeric_summary[col]?.mean?.toFixed(2) ?? "—"}</td>
                          <td className="py-3.5 text-right text-gray-500 tabular-nums">{data.numeric_summary[col]?.std?.toFixed(2) ?? "—"}</td>
                          <td className="py-3.5 text-right text-cyan-400/80 tabular-nums font-medium">{data.numeric_summary[col]?.max?.toFixed(2) ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Version History & Rollback Center */}
              <div className="glass p-8 rounded-[2.5rem] overflow-hidden flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-9 h-9 rounded-xl bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center">
                      <GitBranch className="w-4.5 h-4.5 text-cyan-400" />
                    </div>
                    <h3 className="text-base font-bold font-space">Version Control</h3>
                  </div>
                  <div className="space-y-4 max-h-[160px] overflow-y-auto pr-1">
                    {versions.length === 0 ? (
                      <div className="text-xs text-gray-500 p-4 border border-dashed border-white/5 rounded-2xl text-center uppercase tracking-widest">
                        Local temporary version active
                      </div>
                    ) : (
                      versions.map((v) => (
                        <div
                          key={v.id}
                          className={`p-4 rounded-2xl border transition-all duration-300 flex items-center justify-between ${
                            v.is_active
                              ? "bg-cyan-500/10 border-cyan-400/25 text-white"
                              : "bg-white/4 border-transparent text-gray-400 hover:bg-white/7"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={selectedVersions.includes(v.id)}
                              onChange={() => toggleVersionSelection(v.id)}
                              className="w-4 h-4 rounded border-white/10 bg-black/40 text-cyan-400 focus:ring-cyan-500 focus:ring-opacity-25 focus:ring-offset-0 cursor-pointer"
                            />
                            <div className="flex flex-col">
                              <span className="text-xs font-bold font-space">version {v.version_num}</span>
                              <span className="text-[9px] text-gray-500 font-mono mt-0.5">{v.row_count.toLocaleString()} rows</span>
                            </div>
                          </div>
                          {v.is_active ? (
                            <span className="text-[8px] font-black uppercase tracking-widest bg-cyan-400/10 text-cyan-400 px-2 py-0.5 rounded-full border border-cyan-400/20">Active</span>
                          ) : (
                            <button
                              disabled={rollingBack !== null}
                              onClick={() => handleRollback(v.version_num)}
                              className="text-[9px] font-black text-cyan-400 hover:underline font-space uppercase tracking-widest cursor-pointer disabled:opacity-50"
                            >
                              {rollingBack === v.version_num ? "Restoring..." : "Restore"}
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {versions.length >= 2 && (
                  <div className="mt-4 pt-4 border-t border-white/5">
                    <button
                      disabled={selectedVersions.length !== 2 || comparing}
                      onClick={handleCompare}
                      className="w-full py-3 rounded-2xl bg-cyan-400 disabled:bg-white/5 text-black disabled:text-gray-500 font-bold text-[10px] uppercase tracking-widest hover:bg-cyan-300 transition-all font-space disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
                    >
                      {comparing ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Comparing...
                        </>
                      ) : (
                        <>
                          <GitBranch className="w-3.5 h-3.5" />
                          Compare Snapshots ({selectedVersions.length}/2)
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Column Health Grid */}
            {advancedStats && (
              <div className="glass p-8 rounded-[2.5rem]">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center">
                      <Shield className="w-4.5 h-4.5 text-amber-400" />
                    </div>
                    <h3 className="text-base font-bold font-space">Column Health Map</h3>
                  </div>
                  <span className="text-[10px] text-gray-600 font-space uppercase tracking-widest">
                    {Object.keys(advancedStats).length} columns scanned
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {Object.entries(advancedStats).slice(0, 16).map(([col, info]: [string, any]) => {
                    const missingPct = info.null_pct || 0;
                    const healthColor = missingPct === 0 ? "#10b981" : missingPct < 20 ? "#f59e0b" : "#f43f5e";
                    const isNumeric = info.mean !== undefined;
                    return (
                      <div key={col} className="bg-white/4 hover:bg-white/7 border border-white/5 hover:border-white/12 rounded-2xl p-4 transition-all duration-300 group cursor-default">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest truncate flex-1">{col}</span>
                          <div className="w-2 h-2 rounded-full flex-shrink-0 ml-2" style={{ background: healthColor }} />
                        </div>
                        <div className="text-xs font-mono text-gray-600 mb-2">{info.dtype}</div>
                        {isNumeric ? (
                          <div className="space-y-1">
                            <div className="flex justify-between text-[9px]">
                              <span className="text-gray-600">Mean</span>
                              <span className="text-gray-300 font-bold">{info.mean?.toFixed(2) ?? "—"}</span>
                            </div>
                            {info.outlier_count > 0 && (
                              <div className="flex justify-between text-[9px]">
                                <span className="text-amber-400">Outliers</span>
                                <span className="text-amber-400 font-bold">{info.outlier_count} ({info.outlier_pct?.toFixed(1)}%)</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-[9px] text-gray-500 truncate">
                            Top: <span className="text-gray-300">{info.top_value ?? "—"}</span>
                          </div>
                        )}
                        {missingPct > 0 && (
                          <div className="mt-2 w-full h-0.5 rounded-full bg-white/8 overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${100 - missingPct}%`, background: healthColor }} />
                          </div>
                        )}
                        {missingPct > 0 && (
                          <div className="text-[9px] mt-1" style={{ color: healthColor }}>{missingPct.toFixed(1)}% missing</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Comparison Modal Overlay */}
            {comparisonResult && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
                <div className="relative glass w-full max-w-3xl p-8 rounded-[2.5rem] border-cyan-400/20 max-h-[85vh] overflow-y-auto space-y-6">
                  <button
                    onClick={() => setComparisonResult(null)}
                    className="absolute top-6 right-6 text-gray-400 hover:text-rose-400 transition-colors"
                  >
                    <XCircle className="w-6 h-6" />
                  </button>

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-400/20 border border-cyan-400/30 flex items-center justify-center animate-pulse">
                      <Sparkles className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black font-space text-white tracking-tight">Dataset Memory Engine</h3>
                      <p className="text-[10px] text-gray-500 uppercase tracking-widest">Snapshot comparison summary</p>
                    </div>
                  </div>

                  {/* AI Summary */}
                  <div className="p-5 rounded-2xl bg-cyan-500/5 border border-cyan-400/20 space-y-2">
                    <div className="flex items-center gap-2 text-cyan-400 font-bold text-[10px] uppercase tracking-widest font-space">
                      <Sparkles className="w-3.5 h-3.5" />
                      AI Analysis Summary
                    </div>
                    <p className="text-xs text-gray-300 leading-relaxed font-medium">
                      {comparisonResult.summary}
                    </p>
                  </div>

                  {/* Row & Col Diffs */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-5 rounded-2xl bg-white/4 border border-white/5 space-y-1">
                      <div className="text-[10px] text-gray-500 uppercase tracking-widest font-black font-space">Row Evolution</div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black text-white font-space">{comparisonResult.rows_b.toLocaleString()}</span>
                        <span className="text-xs text-gray-400">from {comparisonResult.rows_a.toLocaleString()}</span>
                      </div>
                      <div className={`text-[10px] font-bold ${comparisonResult.row_diff >= 0 ? 'text-green-400' : 'text-rose-400'}`}>
                        {comparisonResult.row_diff >= 0 ? `+${comparisonResult.row_diff.toLocaleString()}` : comparisonResult.row_diff.toLocaleString()} rows
                      </div>
                    </div>
                    <div className="p-5 rounded-2xl bg-white/4 border border-white/5 space-y-1">
                      <div className="text-[10px] text-gray-500 uppercase tracking-widest font-black font-space">Feature Evolution</div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black text-white font-space">{comparisonResult.cols_b.toLocaleString()}</span>
                        <span className="text-xs text-gray-400">from {comparisonResult.cols_a.toLocaleString()}</span>
                      </div>
                      <div className={`text-[10px] font-bold ${comparisonResult.col_diff >= 0 ? 'text-green-400' : 'text-rose-400'}`}>
                        {comparisonResult.col_diff >= 0 ? `+${comparisonResult.col_diff.toLocaleString()}` : comparisonResult.col_diff.toLocaleString()} columns
                      </div>
                    </div>
                  </div>

                  {/* Added / Deleted Columns */}
                  {((comparisonResult.added_cols && comparisonResult.added_cols.length > 0) || (comparisonResult.deleted_cols && comparisonResult.deleted_cols.length > 0)) && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-5 rounded-2xl bg-white/4 border border-white/5 space-y-2">
                        <div className="text-[10px] text-gray-500 uppercase tracking-widest font-black text-green-400 font-space">Added Features ({comparisonResult.added_cols?.length ?? 0})</div>
                        {comparisonResult.added_cols && comparisonResult.added_cols.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {comparisonResult.added_cols.map((c: string) => (
                              <span key={c} className="text-[10px] font-mono bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5 rounded-full">{c}</span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-600">None</span>
                        )}
                      </div>
                      <div className="p-5 rounded-2xl bg-white/4 border border-white/5 space-y-2">
                        <div className="text-[10px] text-gray-500 uppercase tracking-widest font-black text-rose-400 font-space">Removed Features ({comparisonResult.deleted_cols?.length ?? 0})</div>
                        {comparisonResult.deleted_cols && comparisonResult.deleted_cols.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {comparisonResult.deleted_cols.map((c: string) => (
                              <span key={c} className="text-[10px] font-mono bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded-full">{c}</span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-600">None</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Metric Shifts */}
                  {comparisonResult.metric_shifts && comparisonResult.metric_shifts.length > 0 && (
                    <div className="space-y-3">
                      <div className="text-[10px] text-gray-500 uppercase tracking-widest font-black font-space">Feature Value Drift (Mean Shifts)</div>
                      <div className="border border-white/5 rounded-2xl overflow-hidden divide-y divide-white/5">
                        <div className="grid grid-cols-4 p-4 bg-white/2 text-[9px] font-black uppercase tracking-widest text-gray-500 font-space">
                          <div>Column</div>
                          <div className="text-right">V{comparisonResult.version_num_a} Mean</div>
                          <div className="text-right">V{comparisonResult.version_num_b} Mean</div>
                          <div className="text-right">Drift %</div>
                        </div>
                        {comparisonResult.metric_shifts.map((shift: any) => (
                          <div key={shift.column} className="grid grid-cols-4 p-4 text-xs font-medium items-center hover:bg-white/3 transition-colors">
                            <div className="font-mono text-gray-300 truncate">{shift.column}</div>
                            <div className="text-right text-gray-500 tabular-nums">{shift.mean_a.toLocaleString()}</div>
                            <div className="text-right text-gray-300 tabular-nums">{shift.mean_b.toLocaleString()}</div>
                            <div className={`text-right tabular-nums font-bold ${shift.pct_change > 0 ? 'text-emerald-400' : shift.pct_change < 0 ? 'text-rose-400' : 'text-gray-400'}`}>
                              {shift.pct_change > 0 ? `+${shift.pct_change}%` : `${shift.pct_change}%`}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={() => setComparisonResult(null)}
                      className="px-6 py-2.5 rounded-full bg-cyan-400 text-black font-bold text-xs uppercase tracking-widest hover:bg-cyan-300 transition-colors font-space"
                    >
                      Close Report
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}
      </main>
    </div>
  );
}
