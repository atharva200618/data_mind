"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/sidebar";
import { useData } from "@/store/data-context";
import { Binary, Download, RefreshCw, FileSpreadsheet, Loader2, Sparkles, TrendingUp, HelpCircle } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line, Legend } from "recharts";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function SyntheticPage() {
  const { dataset, file } = useData();
  const [activeTab, setActiveTab] = useState<"matrix" | "futures">("matrix");
  const [nRows, setNRows] = useState(1000);
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [csvString, setCsvString] = useState("");

  const [privacyScore, setPrivacyScore] = useState<number | null>(null);
  const [privacyRisk, setPrivacyRisk] = useState<string>("");
  const [similarityPct, setSimilarityPct] = useState<number | null>(null);
  const [meansComparison, setMeansComparison] = useState<any[]>([]);
  const [distributions, setDistributions] = useState<Record<string, any[]>>({});
  const [activeDistCol, setActiveDistCol] = useState<string>("");

  // Synthetic Futures State
  const [futuresLoading, setFuturesLoading] = useState(false);
  const [futuresTarget, setFuturesTarget] = useState("");
  const [futuresResult, setFuturesResult] = useState<any | null>(null);

  const numericCols = dataset?.numeric_columns || [];

  useEffect(() => {
    if (numericCols.length > 0) {
      setFuturesTarget(numericCols[0]);
    }
  }, [dataset, numericCols]);

  const generateData = async () => {
    if (!file) return;
    setLoading(true);
    setPreviewData([]);
    setCsvString("");
    setPrivacyScore(null);
    setPrivacyRisk("");
    setSimilarityPct(null);
    setMeansComparison([]);
    setDistributions({});

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("n_rows", nRows.toString());

      const response = await fetch(`${API}/api/v1/synthetic/generate`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to generate synthetic dataset");
      }

      const result = await response.json();
      if (result.error) {
        alert(result.error);
      } else {
        setPreviewData(result.preview);
        setColumns(result.columns);
        setCsvString(result.csv);
        setPrivacyScore(result.privacy_score);
        setPrivacyRisk(result.privacy_risk);
        setSimilarityPct(result.similarity_pct);
        setMeansComparison(result.means_comparison);
        setDistributions(result.distributions);
        
        const distCols = Object.keys(result.distributions || {});
        if (distCols.length > 0) {
          setActiveDistCol(distCols[0]);
        }
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || "An error occurred during synthetic data generation.");
    } finally {
      setLoading(false);
    }
  };

  const runSyntheticFutures = async () => {
    if (!file || !futuresTarget) return;
    setFuturesLoading(true);
    setFuturesResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("target_col", futuresTarget);

      const response = await fetch(`${API}/api/v1/analytics/synthetic-futures`, {
        method: "POST",
        body: formData,
      });
      if (response.ok) {
        setFuturesResult(await response.json());
      } else {
        alert("Failed to compile synthetic scenarios.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setFuturesLoading(false);
    }
  };

  const triggerDownload = () => {
    if (!csvString) return;
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `synthetic_${file?.name || "data"}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex min-h-screen bg-[#02040f] text-white">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="mb-12 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-2 font-space">Synthetic Generator</h1>
            <p className="text-gray-500">Generate statistically aligned fake datasets or simulate prospective futures.</p>
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
              <Binary className="w-10 h-10 text-violet-400" />
            </div>
            <h3 className="text-2xl font-bold mb-3 font-space">No Pipeline Active</h3>
            <p className="text-gray-500 max-w-sm">Please upload a dataset on the Overview page to unlock synthetic generation.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Tabs */}
            <div className="flex gap-4 border-b border-white/5 pb-2">
              <button
                onClick={() => setActiveTab("matrix")}
                className={`pb-2 text-xs font-bold font-space uppercase tracking-widest cursor-pointer ${
                  activeTab === "matrix" ? "border-b-2 border-cyan-400 text-cyan-400" : "text-gray-500 hover:text-white"
                }`}
              >
                Synthesize Dataset Matrix
              </button>
              <button
                onClick={() => setActiveTab("futures")}
                className={`pb-2 text-xs font-bold font-space uppercase tracking-widest cursor-pointer ${
                  activeTab === "futures" ? "border-b-2 border-cyan-400 text-cyan-400" : "text-gray-500 hover:text-white"
                }`}
              >
                Simulate Synthetic Futures
              </button>
            </div>

            {activeTab === "matrix" ? (
              <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 animate-in fade-in duration-300">
                {/* Control Panel */}
                <div className="xl:col-span-1 glass p-8 rounded-[2.5rem] h-fit space-y-8">
                  <div>
                    <h3 className="text-lg font-bold font-space text-white mb-2">
                      Distribution Settings
                    </h3>
                    <p className="text-xs text-gray-500 mb-6">Specify the size and replication scale of the target synthesis.</p>
                    
                    <div className="space-y-4">
                      <div className="flex justify-between text-xs font-space font-medium uppercase tracking-wider text-gray-400">
                        <span>Rows Count</span>
                        <span className="font-mono text-cyan-400 font-bold">{nRows.toLocaleString()}</span>
                      </div>
                      <input
                        type="range"
                        min="100"
                        max="50000"
                        step="100"
                        value={nRows}
                        onChange={(e) => setNRows(parseInt(e.target.value))}
                        className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                      />
                      <div className="flex justify-between text-[10px] text-gray-600 font-mono">
                        <span>100</span>
                        <span>50,000</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-white/5 border border-white/5 rounded-2xl">
                    <span className="text-[9px] font-black uppercase tracking-widest text-violet-400 font-space block mb-1">Stats Preserved</span>
                    <p className="text-[11px] text-gray-500 leading-relaxed font-medium">
                      Matches mean, variance, categorical frequencies, and skewness of the source features.
                    </p>
                  </div>

                  <button
                    disabled={loading}
                    onClick={generateData}
                    className="w-full bg-cyan-400 hover:bg-cyan-300 disabled:opacity-40 disabled:hover:bg-cyan-400 text-black py-4.5 rounded-[2rem] font-bold font-space text-xs uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(34,211,238,0.2)]"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    {loading ? "Synthesizing..." : "Synthesize Matrix"}
                  </button>

                  {csvString && (
                    <button
                      onClick={triggerDownload}
                      className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white py-4.5 rounded-[2rem] font-bold font-space text-xs uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Download Synthetic CSV
                    </button>
                  )}
                </div>

                {/* Matrix View / Output Table / Comparison */}
                <div className="xl:col-span-3 space-y-8">
                  {previewData.length === 0 ? (
                    <div className="h-full glass rounded-[2.5rem] flex flex-col items-center justify-center p-12 text-center min-h-[400px]">
                      <FileSpreadsheet className="w-12 h-12 text-gray-600 mb-4" />
                      <h4 className="text-xl font-bold font-space text-gray-400">Ready to synthesize</h4>
                      <p className="text-gray-500 text-sm max-w-sm mt-2">Adjust settings and run synthetic engine to preview details.</p>
                    </div>
                  ) : (
                    <div className="space-y-8 animate-in fade-in duration-500">
                      {/* Privacy & Similarity Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="glass p-6 rounded-[2rem] flex flex-col justify-between">
                          <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 font-space block mb-1">Privacy Score</span>
                          <div className="text-3xl font-black font-space text-emerald-400 mt-2">{privacyScore}/100</div>
                          <span className="text-[10px] text-gray-500 mt-1">High score indicates robust protection against membership leakage.</span>
                        </div>
                        <div className="glass p-6 rounded-[2rem] flex flex-col justify-between">
                          <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 font-space block mb-1">Privacy Risk</span>
                          <div className="text-3xl font-black font-space mt-2">
                            <span className={`px-3 py-1 rounded-full text-xs font-black font-space uppercase border ${
                              privacyRisk === "Low" ? "bg-green-500/10 text-green-400 border-green-500/25" : "bg-amber-500/10 text-amber-400 border-amber-500/25"
                            }`}>
                              {privacyRisk} Risk
                            </span>
                          </div>
                          <span className="text-[10px] text-gray-500 mt-1">Estimations based on cosine proximity distance vectors.</span>
                        </div>
                        <div className="glass p-6 rounded-[2rem] flex flex-col justify-between">
                          <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 font-space block mb-1">Identical Similarity</span>
                          <div className="text-3xl font-black font-space text-cyan-400 mt-2">{similarityPct}%</div>
                          <span className="text-[10px] text-gray-500 mt-1">Ratio of synthesized rows matching real records.</span>
                        </div>
                      </div>

                      {/* Graphical Overlaps and Means comparison */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Distribution Overlap Area Chart */}
                        {Object.keys(distributions).length > 0 && (
                          <div className="glass p-8 rounded-[2.5rem] space-y-4">
                            <div className="flex justify-between items-center">
                              <h4 className="text-xs font-black uppercase tracking-widest text-violet-400 font-space">Distribution Overlap</h4>
                              <select
                                value={activeDistCol}
                                onChange={(e) => setActiveDistCol(e.target.value)}
                                className="bg-white/5 border border-white/10 rounded-xl p-2 text-[10px] font-bold text-white outline-none cursor-pointer"
                              >
                                {Object.keys(distributions).map(col => (
                                  <option key={col} value={col} className="bg-black">{col}</option>
                                ))}
                              </select>
                            </div>
                            <div className="h-56 w-full">
                              <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={distributions[activeDistCol]}>
                                  <defs>
                                    <linearGradient id="origGrad" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.2}/>
                                      <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="synthGrad" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.2}/>
                                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                                    </linearGradient>
                                  </defs>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" />
                                  <XAxis dataKey="bin" stroke="#555" fontSize={9} />
                                  <YAxis stroke="#555" fontSize={9} />
                                  <Tooltip contentStyle={{ backgroundColor: '#000', borderRadius: '12px', border: '1px solid #ffffff10', fontSize: '10px' }} />
                                  <Area type="monotone" dataKey="original" stroke="#22d3ee" strokeWidth={2} fillOpacity={1} fill="url(#origGrad)" name="Original" />
                                  <Area type="monotone" dataKey="synthetic" stroke="#a855f7" strokeWidth={2} fillOpacity={1} fill="url(#synthGrad)" name="Synthetic" />
                                </AreaChart>
                              </ResponsiveContainer>
                            </div>
                            <span className="text-[9px] text-gray-500 font-mono block">Overlap of binned frequencies (%) across active range.</span>
                          </div>
                        )}

                        {/* Means comparison table */}
                        {meansComparison.length > 0 && (
                          <div className="glass p-8 rounded-[2.5rem] space-y-4">
                            <h4 className="text-xs font-black uppercase tracking-widest text-cyan-400 font-space">Mean Preservation Audit</h4>
                            <div className="overflow-y-auto max-h-56 scrollbar-hide">
                              <table className="w-full text-xs text-left">
                                <thead>
                                  <tr className="text-gray-500 border-b border-white/5 font-mono text-[9px] uppercase tracking-wider">
                                    <th className="pb-2">Column</th>
                                    <th className="pb-2 text-right">Original Mean</th>
                                    <th className="pb-2 text-right">Synthetic Mean</th>
                                    <th className="pb-2 text-right">Diff %</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 font-mono text-gray-400">
                                  {meansComparison.map((item, idx) => {
                                    const diff = Math.abs(item.original - item.synthetic);
                                    const diffPct = item.original !== 0 ? (diff / Math.abs(item.original) * 100).toFixed(2) : "0.00";
                                    return (
                                      <tr key={idx} className="hover:bg-white/3 transition-colors">
                                        <td className="py-2.5 truncate max-w-[120px] font-space font-semibold text-gray-200">{item.col}</td>
                                        <td className="py-2.5 text-right text-gray-500">{item.original.toFixed(2)}</td>
                                        <td className="py-2.5 text-right text-gray-400">{item.synthetic.toFixed(2)}</td>
                                        <td className="py-2.5 text-right text-emerald-400 font-bold">{diffPct}%</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Matrix View / Output Table */}
                      <div className="glass p-8 rounded-[2.5rem] space-y-6">
                        <div className="flex justify-between items-center">
                          <h3 className="text-xl font-bold font-space text-white flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-violet-400" />
                            Generated Vector Preview (First 50 Rows)
                          </h3>
                          <span className="text-[10px] font-black font-space px-2 py-0.5 rounded-full bg-cyan-400/20 text-cyan-400 border border-cyan-400/30">
                            Success
                          </span>
                        </div>

                        <div className="overflow-x-auto max-h-[500px] scrollbar-hide border border-white/5 rounded-2xl bg-black/10">
                          <table className="w-full text-xs text-left">
                            <thead>
                              <tr className="text-gray-500 border-b border-white/5 bg-white/5 font-mono uppercase tracking-wider">
                                {columns.map((col) => (
                                  <th key={col} className="p-4 font-semibold">{col}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 font-mono text-gray-400">
                              {previewData.map((row, rIdx) => (
                                <tr key={rIdx} className="hover:bg-white/5 transition-colors">
                                  {columns.map((col) => (
                                    <td key={col} className="p-4 whitespace-nowrap">{row[col]}</td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* ── SYNTHETIC FUTURES TAB ── */
              <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 animate-in fade-in duration-300">
                {/* Control Panel */}
                <div className="xl:col-span-1 glass p-8 rounded-[2.5rem] h-fit space-y-6">
                  <h3 className="text-lg font-bold font-space text-white mb-2 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-cyan-400" />
                    Futures Simulator
                  </h3>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Generate prospective scenario ranges for a targeted business column over the next 12 months.
                  </p>

                  <div>
                    <label className="text-[9px] font-black uppercase text-gray-500 tracking-wider font-space block mb-1">Target Numeric Value</label>
                    <select
                      value={futuresTarget}
                      onChange={(e) => setFuturesTarget(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-gray-200 outline-none focus:border-cyan-400/30 transition-all font-space"
                    >
                      {numericCols.map((col: string) => (
                        <option key={col} value={col} className="bg-black">{col}</option>
                      ))}
                    </select>
                  </div>

                  <button
                    disabled={futuresLoading || !futuresTarget}
                    onClick={runSyntheticFutures}
                    className="w-full bg-gradient-to-r from-cyan-400 to-violet-500 hover:from-cyan-300 hover:to-violet-400 text-black py-4.5 rounded-[2rem] font-bold font-space text-xs uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer shadow-md"
                  >
                    {futuresLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
                    {futuresLoading ? "Simulating..." : "Generate Futures"}
                  </button>
                </div>

                {/* Graph View / Output */}
                <div className="xl:col-span-3">
                  {!futuresResult ? (
                    <div className="h-full glass rounded-[2.5rem] flex flex-col items-center justify-center p-12 text-center min-h-[400px]">
                      <TrendingUp className="w-12 h-12 text-gray-600 mb-4 animate-pulse" />
                      <h4 className="text-xl font-bold font-space text-gray-400">Ready to simulate scenarios</h4>
                      <p className="text-gray-500 text-sm max-w-sm mt-2">Select a target column and click execute to compile projections.</p>
                    </div>
                  ) : (
                    <div className="space-y-6 animate-in fade-in duration-300">
                      {/* Metric Info cards */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="glass p-6 rounded-[2rem]">
                          <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 font-space block mb-1">Historical Mean</span>
                          <div className="text-3xl font-black font-space text-white mt-1">{futuresResult.historical_mean}</div>
                        </div>
                        <div className="glass p-6 rounded-[2rem]">
                          <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 font-space block mb-1">Historical Deviation</span>
                          <div className="text-3xl font-black font-space text-cyan-400 mt-1">{futuresResult.historical_std}</div>
                        </div>
                      </div>

                      {/* Line Chart */}
                      <div className="glass p-8 rounded-[2.5rem] space-y-4">
                        <h4 className="text-xs font-black uppercase tracking-widest text-cyan-400 font-space">Synthetic Scenario Bounds (Next 12 Months)</h4>
                        <div className="h-80 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={futuresResult.forecast}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" />
                              <XAxis dataKey="period" stroke="#555" fontSize={9} />
                              <YAxis stroke="#555" fontSize={9} />
                              <Tooltip contentStyle={{ backgroundColor: '#000', borderRadius: '12px', border: '1px solid #ffffff10', fontSize: '10px' }} />
                              <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '10px' }} />
                              <Line type="monotone" dataKey="best" stroke="#10b981" strokeWidth={2} name="Best Case (Scenario A)" dot={{ r: 3 }} />
                              <Line type="monotone" dataKey="normal" stroke="#22d3ee" strokeWidth={2} name="Normal Case (Scenario B)" dot={{ r: 3 }} />
                              <Line type="monotone" dataKey="worst" stroke="#f43f5e" strokeWidth={2} name="Worst Case (Scenario C)" dot={{ r: 3 }} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                        <span className="text-[9px] text-gray-500 font-mono block">Projections calculated using linear regressions with standard error standard deviations.</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
