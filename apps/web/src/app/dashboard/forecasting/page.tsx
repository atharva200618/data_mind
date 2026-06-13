"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/sidebar";
import { TrendingUp, Loader2, Zap, Search, Sliders, AlertTriangle } from "lucide-react";
import { useData } from "@/store/data-context";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function ForecastingPage() {
  const { dataset, file } = useData();
  const [column, setColumn] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Decision Simulator State
  const [simQuestion, setSimQuestion] = useState("");
  const [simLoading, setSimLoading] = useState(false);
  const [simResult, setSimResult] = useState<any | null>(null);

  const numericCols = dataset?.numeric_columns || [];

  useEffect(() => {
    if (numericCols.length > 0 && !column) setColumn(numericCols[0]);
  }, [numericCols, column]);

  const runForecast = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!file && !dataset?.id) || !column) return;

    setLoading(true);
    setError(null);
    const formData = new FormData();
    if (file) {
      formData.append("file", file);
    }
    if (dataset?.id) {
      formData.append("dataset_id", dataset.id);
    }
    if (dataset?.version_id) {
      formData.append("dataset_version_id", dataset.version_id);
    }

    try {
      const response = await fetch(
        `${API}/api/v1/analytics/analyze-advanced?column=${encodeURIComponent(column)}`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) throw new Error("Forecasting engine failed.");
      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRunSimulation = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!file && !dataset?.id) || !simQuestion.trim()) return;
    setSimLoading(true);
    setSimResult(null);
    try {
      const formData = new FormData();
      if (file) {
        formData.append("file", file);
      }
      if (dataset?.id) {
        formData.append("dataset_id", dataset.id);
      }
      if (dataset?.version_id) {
        formData.append("dataset_version_id", dataset.version_id);
      }
      formData.append("question", simQuestion);

      const response = await fetch(`${API}/api/v1/ai/simulate-decision`, {
        method: "POST",
        body: formData,
      });
      if (response.ok) {
        setSimResult(await response.json());
      } else {
        alert("Failed to run decision simulation.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSimLoading(false);
    }
  };

  if (!dataset) {
    return (
      <div className="flex min-h-screen bg-[#00020a]">
        <Sidebar />
        <main className="flex-1 p-8 flex items-center justify-center">
          <div className="text-center glass p-12 rounded-[3rem] border-dashed border-white/10 max-w-md">
            <TrendingUp className="w-16 h-16 text-gray-700 mx-auto mb-6" />
            <h3 className="text-2xl font-bold mb-4 font-space text-white">Forecasting Offline</h3>
            <p className="text-gray-500 font-medium">Upload a dataset in Overview to activate predictive models.</p>
          </div>
        </main>
      </div>
    );
  }

  const chartData = result ? [
    ...result.trend.historical.map((v: number, i: number) => ({ name: `T-${20-i}`, value: v, type: 'historical' })),
    ...result.trend.forecast.map((v: number, i: number) => ({ name: `F+${i+1}`, value: v, type: 'forecast' }))
  ] : [];

  return (
    <div className="flex min-h-screen bg-[#00020a] text-white">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="mb-12">
          <h1 className="text-4xl font-bold tracking-tight mb-2 font-space text-white">Predictive Engine</h1>
          <p className="text-gray-500 font-medium">Linear forecasting and anomaly detection on {file?.name || "active dataset"}.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-8">
          <div className="lg:col-span-1 space-y-6">
            <div className="glass p-8 rounded-[2.5rem]">
               <h3 className="text-xl font-semibold mb-6 flex items-center gap-3 text-white font-space">
                <Search className="w-5 h-5 text-amber-400" />
                Scan Logic
              </h3>
              <form onSubmit={runForecast} className="space-y-6">
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-3 font-space">Feature to Map</label>
                  <select 
                    value={column}
                    onChange={(e) => setColumn(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white outline-none focus:border-amber-400/50 appearance-none cursor-pointer font-space"
                  >
                    {numericCols.map((c: string) => <option key={c} value={c} className="bg-black">{c}</option>)}
                  </select>
                </div>
                <button
                  disabled={loading}
                  className="w-full glass bg-amber-400/10 hover:bg-amber-400/20 text-amber-400 font-black text-xs uppercase tracking-[0.2em] py-5 rounded-2xl transition-all flex items-center justify-center gap-3 disabled:opacity-50 shadow-xl cursor-pointer"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                  Train Model
                </button>
              </form>
            </div>
            
            {result && (
              <div className="glass p-8 rounded-[2.5rem] bg-gradient-to-br from-cyan-400/10 to-transparent">
                 <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400 mb-4 font-space">Anomaly Scan</h4>
                 <div className="text-4xl font-black text-white mb-1 font-space">{result.anomalies.count}</div>
                 <p className="text-xs text-gray-500 font-bold uppercase tracking-widest font-space">Outliers Detected</p>
                 <div className="mt-6 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" style={{ width: `${result.anomalies.percentage}%` }}></div>
                 </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-3 space-y-8">
            {error && (
              <div className="glass p-8 rounded-[2rem] border-red-500/20 bg-red-500/5 flex items-center gap-4 text-red-400 animate-in fade-in duration-300">
                <AlertTriangle className="w-6 h-6 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-bold font-space uppercase tracking-wider">Analysis Failed</h4>
                  <p className="text-xs text-gray-400 mt-1 font-medium">{error}</p>
                </div>
              </div>
            )}

            {result ? (
              <div className="glass p-10 rounded-[3rem] h-[550px] flex flex-col animate-in fade-in duration-1000">
                <div className="flex justify-between items-center mb-10">
                   <div>
                     <h3 className="text-2xl font-bold text-white font-space">Trend Progression</h3>
                     <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1 font-space">Confidence Interval: 95% • R²: {result.trend.r2.toFixed(4)}</p>
                   </div>
                   <div className="flex gap-4">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-amber-400 shadow-[0_0_8px_#fbbf24]"></div>
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest font-space">Historical</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></div>
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest font-space">Forecast</span>
                      </div>
                   </div>
                </div>
                <div className="flex-1 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#fbbf24" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                      <XAxis dataKey="name" hide />
                      <YAxis stroke="#444" fontSize={10} fontStyle="bold" axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#000', borderRadius: '16px', border: '1px solid #ffffff10', padding: '16px' }} />
                      <Area 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#fbbf24" 
                        strokeWidth={4}
                        fill="url(#colorTrend)" 
                        dot={({ payload, cx, cy }: any) => payload.type === 'forecast' ? <circle key={cx} cx={cx} cy={cy} r={4} fill="#22d3ee" stroke="none" /> : null}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div className="h-full min-h-[500px] glass rounded-[3rem] border-dashed border-white/10 flex flex-col items-center justify-center text-center p-12">
                 <div className="w-24 h-24 bg-white/5 rounded-[2.5rem] flex items-center justify-center mb-8 border border-white/5 shadow-2xl">
                    <TrendingUp className="w-12 h-12 text-gray-700 animate-pulse" />
                 </div>
                 <h3 className="text-2xl font-bold mb-4 text-white font-space">Engine Awaiting Input</h3>
                 <p className="text-gray-500 max-w-sm font-medium">Select a numeric column to map temporal trends and detect structural anomalies within the active pipeline.</p>
              </div>
            )}
          </div>
        </div>

        {/* Strategic Decision Simulator */}
        <div className="glass p-8 rounded-[2.5rem] bg-gradient-to-br from-cyan-500/5 to-violet-500/5 border-white/5">
          <h3 className="text-2xl font-bold mb-4 flex items-center gap-3 font-space text-white">
            <Sliders className="w-6 h-6 text-cyan-400 animate-pulse" />
            Decision Simulator (Strategic Projection)
          </h3>
          <p className="text-xs text-gray-500 leading-relaxed mb-6">
            Input business decision scenarios (e.g. "What happens if marketing budget increases by 20%?") to simulate target value sensitivities using regression models.
          </p>

          <form onSubmit={handleRunSimulation} className="flex gap-4 mb-6">
            <input
              type="text"
              required
              placeholder="e.g., 'What happens if marketing budget increases by 20%?'"
              value={simQuestion}
              onChange={(e) => setSimQuestion(e.target.value)}
              className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-xs text-white outline-none focus:border-cyan-400/35 transition-colors font-space"
            />
            <button
              disabled={simLoading}
              type="submit"
              className="bg-white hover:bg-cyan-400 disabled:opacity-40 text-black px-6 py-4 rounded-2xl text-xs font-bold font-space uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-md transition-colors"
            >
              {simLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 fill-black" />}
              {simLoading ? "Simulating..." : "Run Simulator"}
            </button>
          </form>

          {simResult && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center animate-in fade-in duration-300">
              <div className="md:col-span-1 glass p-6 rounded-[2rem] text-center border-emerald-500/10">
                <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 font-space block mb-1">Predicted Target change</span>
                <div className="text-3xl font-black font-space text-emerald-400 mt-2 font-mono">
                  {simResult.predicted_target_change_pct > 0 ? "+" : ""}{simResult.predicted_target_change_pct}%
                </div>
                <span className="text-[9px] text-gray-500 font-space mt-1 block">Target column: {simResult.target_column}</span>
              </div>
              <div className="md:col-span-1 glass p-6 rounded-[2rem] text-center border-cyan-500/10">
                <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 font-space block mb-1">Predicted Profit Change</span>
                <div className="text-3xl font-black font-space text-cyan-400 mt-2 font-mono">
                  {simResult.predicted_secondary_change_pct > 0 ? "+" : ""}{simResult.predicted_secondary_change_pct}%
                </div>
                <span className="text-[9px] text-gray-500 font-space mt-1 block">Secondary effects</span>
              </div>
              <div className="md:col-span-1 glass p-6 rounded-[2rem] text-center border-amber-500/10">
                <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 font-space block mb-1">Risk Level Score</span>
                <div className="text-3xl font-black font-space mt-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-black font-space border ${
                    simResult.risk_level === 'Low' ? 'border-green-500/30 text-green-400 bg-green-500/5' :
                    simResult.risk_level === 'Medium' ? 'border-amber-500/30 text-amber-400 bg-amber-500/5' :
                    'border-red-500/30 text-red-400 bg-red-500/5'
                  }`}>{simResult.risk_level}</span>
                </div>
                <span className="text-[9px] text-gray-500 font-space mt-2 block font-mono">Sensitivity Model R²: {simResult.r2_score}</span>
              </div>
              <div className="md:col-span-1 p-6 bg-white/3 border border-white/5 rounded-[2rem]">
                <span className="text-[9px] font-black uppercase tracking-widest text-violet-400 font-space block mb-1">Simulation Narrative</span>
                <p className="text-xs text-gray-300 leading-relaxed font-medium mt-1">{simResult.narrative}</p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
