"use client";

import { useState, useMemo } from "react";
import { Sidebar } from "@/components/sidebar";
import { BarChart3, ScatterChart, LineChart, PieChart, Info, HelpCircle, Zap, Box, Layout, Loader2, Sparkles } from "lucide-react";
import { ResponsiveContainer, ScatterChart as RScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, CartesianGrid, AreaChart, Area } from "recharts";
import { useData } from "@/store/data-context";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { ParticleCloud3D } from "@/components/particle-cloud-3d";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function VisualLab() {
  const { dataset, file } = useData();
  const [activeTab, setActiveTab] = useState("3d");
  const [xCol, setXCol] = useState<string>("");
  const [yCol, setYCol] = useState<string>("");
  const [colorCol, setColorCol] = useState<string>("");

  const [promptInput, setPromptInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [dashboardSpec, setDashboardSpec] = useState<any | null>(null);

  const numericCols = dataset?.numeric_columns || [];
  const chartData = dataset?.sample || [];

  // Set default columns if not set
  useMemo(() => {
    if (numericCols.length >= 2 && !xCol) {
      setXCol(numericCols[0]);
      setYCol(numericCols[1]);
      setColorCol(numericCols[Math.min(2, numericCols.length - 1)]);
    }
  }, [numericCols, xCol]);

  const handleAIPrompt = async () => {
    if (!promptInput.trim() || !dataset || !file) return;
    setAiLoading(true);
    
    const isDashboard = promptInput.toLowerCase().includes("dashboard");
    const formData = new FormData();
    formData.append("file", file);

    try {
      if (isDashboard) {
        formData.append("prompt", promptInput);
        const response = await fetch(`${API}/api/v1/ai/build-dashboard`, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) throw new Error("AI Dashboard Builder failed");
        const spec = await response.json();
        setDashboardSpec(spec);
        setActiveTab("dashboard");
      } else {
        let promptText = `Based on these columns: ${numericCols.join(", ")}, generate the best chart configuration for: "${promptInput}". Output ONLY a valid JSON inside [CHART_SPEC: {"type": "scatter|line", "x": "col_x", "y": "col_y", "title": "Chart Title"}]. Do not output any other text.`;
        formData.append("question", promptText);
        formData.append("mode", "Quick Analysis");
        formData.append("api_key", "");

        const response = await fetch(`${API}/api/v1/ai/chat`, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) throw new Error("AI Chart Generator failed");
        const result = await response.json();
        const outputText = result.response || "";

        const chartMatch = outputText.match(/\[CHART_SPEC:\s*(\{[\s\S]*?\})\s*\]/);
        if (chartMatch) {
          const spec = JSON.parse(chartMatch[1]);
          setXCol(spec.x);
          setYCol(spec.y);
          setActiveTab(spec.type === "scatter" ? "distribution" : "trend");
          setDashboardSpec(null);
        } else {
          const jsonMatch = outputText.match(/```json\n([\s\S]*?)```/) || outputText.match(/(\{[\s\S]*?\})/);
          if (jsonMatch) {
            const spec = JSON.parse(jsonMatch[1]);
            setXCol(spec.x);
            setYCol(spec.y);
            setActiveTab(spec.type === "scatter" ? "distribution" : "trend");
            setDashboardSpec(null);
          }
        }
      }
      setPromptInput("");
    } catch (err: any) {
      console.error(err);
      alert(`AI Visualizer Error: ${err.message}`);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#02040f] text-white">
      <Sidebar />
      <main className="flex-1 p-8">
        <header className="mb-12 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-2 font-space text-white">Visual Lab</h1>
            <p className="text-gray-500 font-medium">High-fidelity data rendering and 3D projections.</p>
          </div>
          {dataset && (
            <div className="flex items-center gap-4 glass px-5 py-2.5 rounded-[2rem] border-white/5 font-space text-[10px] uppercase font-bold tracking-wider">
              <span className="text-gray-500">Dimensions:</span>
              <select 
                value={xCol} 
                onChange={(e) => setXCol(e.target.value)}
                className="bg-transparent text-cyan-400 outline-none cursor-pointer font-bold"
              >
                {numericCols.map((c: string) => <option key={c} value={c} className="bg-black">{c} (X)</option>)}
              </select>
              <span className="text-gray-700">/</span>
              <select 
                value={yCol} 
                onChange={(e) => setYCol(e.target.value)}
                className="bg-transparent text-violet-400 outline-none cursor-pointer font-bold"
              >
                {numericCols.map((c: string) => <option key={c} value={c} className="bg-black">{c} (Y)</option>)}
              </select>
              <span className="text-gray-700">/</span>
              <select 
                value={colorCol} 
                onChange={(e) => setColorCol(e.target.value)}
                className="bg-transparent text-emerald-400 outline-none cursor-pointer font-bold"
              >
                {numericCols.map((c: string) => <option key={c} value={c} className="bg-black">{c} (Color)</option>)}
              </select>
            </div>
          )}
        </header>

        {!dataset ? (
          <div className="h-[60vh] glass rounded-[3rem] border-dashed border-white/10 flex flex-col items-center justify-center text-center p-12">
             <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/5 animate-pulse">
                <BarChart3 className="w-10 h-10 text-gray-600" />
             </div>
             <h3 className="text-2xl font-bold mb-3 font-space text-white">No Active Pipeline</h3>
             <p className="text-gray-500 max-w-sm">Please upload a dataset in the Overview to begin high-fidelity rendering.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 animate-in fade-in duration-700">
            <div className="xl:col-span-1 glass p-6 rounded-[2.5rem] h-fit sticky top-8 space-y-8">
              {/* AI generator input */}
              <div className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-widest text-violet-400 font-space flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-violet-400 animate-pulse" />
                  AI Design Studio
                </h3>
                <p className="text-[10px] text-gray-500 leading-normal">Ask AI to generate a custom chart or create a dashboard overview.</p>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    placeholder="e.g. 'sales trend' or 'executive dashboard'"
                    value={promptInput}
                    onChange={(e) => setPromptInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAIPrompt()}
                    disabled={aiLoading}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 pr-9 text-xs text-white outline-none focus:border-violet-500/40 font-sans"
                  />
                  <button
                    onClick={handleAIPrompt}
                    disabled={aiLoading || !promptInput.trim()}
                    className="absolute right-2 text-violet-400 hover:text-white disabled:opacity-40 cursor-pointer"
                  >
                    {aiLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Zap className="w-4 h-4 fill-violet-400/20" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-white/50 font-space mb-4">Rendering Engine</h3>
                <div className="space-y-2">
                  <ChartTypeBtn active={activeTab === "3d"} onClick={() => setActiveTab("3d")} icon={<Box />} label="3D Spatial Cloud" />
                  <ChartTypeBtn active={activeTab === "distribution"} onClick={() => setActiveTab("distribution")} icon={<ScatterChart />} label="2D Scatter Matrix" />
                  <ChartTypeBtn active={activeTab === "trend"} onClick={() => setActiveTab("trend")} icon={<LineChart />} label="Trend Progression" />
                  {dashboardSpec && (
                    <ChartTypeBtn active={activeTab === "dashboard"} onClick={() => { setActiveTab("dashboard"); }} icon={<Layout />} label="AI Dashboard" />
                  )}
                </div>
              </div>
              
              <div className="p-6 bg-white/5 rounded-[2rem] border border-white/5">
                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black mb-4 font-space">Rendering Stats</p>
                <div className="space-y-4 font-mono text-xs">
                  <div className="flex justify-between items-end">
                    <span className="text-gray-400 font-space uppercase">Data Points</span>
                    <span className="text-base font-bold text-white">{chartData.length}</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <span className="text-gray-400 font-space uppercase">GPU Engine</span>
                    <span className="text-base font-bold text-cyan-400">WebGL 2.0</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="xl:col-span-3 space-y-8">
              <div className="glass p-8 rounded-[2.5rem] h-[600px] flex flex-col relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                  <Zap className="w-32 h-32 text-cyan-400 animate-float-slow" />
                </div>
                
                 <div className="flex justify-between items-center mb-6 z-10 font-space">
                  <div>
                    <h4 className="text-xl font-bold tracking-tight text-white">
                      {activeTab === "3d" && "Spatial Representation Mapping"}
                      {activeTab === "distribution" && "Linear Correlation Mapping"}
                      {activeTab === "trend" && "Time-Series Flow Engine"}
                      {activeTab === "dashboard" && "AI Executive Dashboard"}
                    </h4>
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">
                      {activeTab === "dashboard" ? "Autonomous KPI Summary & Custom Projections" : activeTab === "3d" ? `${xCol} x ${yCol} Colored by ${colorCol}` : `${xCol} vs ${yCol}`}
                    </p>
                  </div>
                </div>
                
                <div className="flex-1 w-full z-10 min-h-0">
                  {activeTab === "dashboard" && dashboardSpec ? (
                    <div className="space-y-6 overflow-y-auto h-full pr-2 scrollbar-hide animate-in fade-in duration-500">
                      {/* KPI Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {dashboardSpec.kpis?.map((kpi: any, idx: number) => (
                          <div key={idx} className="p-5 bg-white/5 border border-white/5 rounded-2xl relative overflow-hidden">
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest font-space block mb-1">{kpi.label}</span>
                            <div className="text-2xl font-black font-space text-white">{kpi.value}</div>
                            {kpi.trend && (
                              <span className={`text-[10px] font-bold ${kpi.trend.startsWith("+") ? "text-green-400" : "text-rose-400"}`}>
                                {kpi.trend} vs baseline
                              </span>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Charts Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                        {dashboardSpec.charts?.map((c: any, idx: number) => (
                          <div key={idx} className="p-5 bg-white/5 border border-white/5 rounded-2xl space-y-3">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 font-space">{c.title}</span>
                            <div className="h-44 w-full">
                              <ResponsiveContainer width="100%" height="100%">
                                {c.type === "scatter" ? (
                                  <RScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                                    <XAxis type="number" dataKey={c.x} stroke="#555" fontSize={8} tickLine={false} axisLine={false} />
                                    <YAxis type="number" dataKey={c.y} stroke="#555" fontSize={8} tickLine={false} axisLine={false} />
                                    <Tooltip contentStyle={{ backgroundColor: '#000', borderRadius: '12px', border: '1px solid #ffffff10', fontSize: '9px' }} />
                                    <Scatter name="Data" data={chartData} fill="#22d3ee" />
                                  </RScatterChart>
                                ) : (
                                  <AreaChart data={chartData}>
                                    <XAxis dataKey={c.x} stroke="#555" fontSize={8} hide />
                                    <YAxis stroke="#555" fontSize={8} tickLine={false} axisLine={false} />
                                    <Tooltip contentStyle={{ backgroundColor: '#000', borderRadius: '12px', border: '1px solid #ffffff10', fontSize: '9px' }} />
                                    <Area type="monotone" dataKey={c.y} stroke="#8b7cf6" fill="#8b7cf6" fillOpacity={0.1} strokeWidth={2} />
                                  </AreaChart>
                                )}
                              </ResponsiveContainer>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : activeTab === "3d" ? (
                    <ParticleCloud3D data={chartData} xCol={xCol} yCol={yCol} colorCol={colorCol} />
                  ) : activeTab === "distribution" ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <RScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                        <XAxis type="number" dataKey={xCol} name={xCol} stroke="#555" fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis type="number" dataKey={yCol} name={yCol} stroke="#555" fontSize={11} tickLine={false} axisLine={false} />
                        <ZAxis type="number" range={[60, 200]} />
                        <Tooltip 
                          cursor={{ strokeDasharray: '3 3' }} 
                          contentStyle={{ backgroundColor: '#000', borderRadius: '16px', border: '1px solid #ffffff10', padding: '12px' }} 
                        />
                        <Scatter name="DataPoints" data={chartData} fill="#22d3ee" className="drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
                      </RScatterChart>
                    </ResponsiveContainer>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="colorY" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b7cf6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#8b7cf6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey={xCol} stroke="#555" fontSize={11} hide />
                        <YAxis stroke="#555" fontSize={11} tickLine={false} axisLine={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#000', borderRadius: '16px', border: '1px solid #ffffff10', padding: '12px' }} 
                        />
                        <Area type="monotone" dataKey={yCol} stroke="#8b7cf6" fillOpacity={1} fill="url(#colorY)" strokeWidth={3} />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <InsightMiniCard 
                  title="Data Integrity" 
                  value={`${(100 - (dataset.profile.missing_cells / (dataset.profile.total_rows * dataset.profile.total_cols) * 100)).toFixed(1)}%`} 
                  desc="Operational health based on sparse cell count." 
                  color="text-cyan-400" 
                />
                <InsightMiniCard 
                  title="Correlation Coefficient" 
                  value={dataset.correlations[xCol]?.[yCol]?.toFixed(2) || "0.00"} 
                  desc={`Pearson value between ${xCol} and ${yCol}.`} 
                  color="text-violet-400" 
                />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function ChartTypeBtn({ active, onClick, icon, label }: any) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-2xl w-full text-left transition-all duration-300 border border-transparent font-space",
        active ? "bg-white/10 text-white border-white/5" : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
      )}
    >
      <div className={cn("p-2 rounded-lg", active ? "bg-cyan-400/20 text-cyan-400" : "bg-white/5 text-gray-500")}>
        {icon}
      </div>
      <span className="text-xs font-bold uppercase tracking-wider">{label}</span>
    </button>
  );
}

function InsightMiniCard({ title, value, desc, color }: any) {
  return (
    <div className="glass p-8 rounded-[2.5rem]">
      <div className="flex justify-between items-start mb-4">
        <h5 className="text-xs font-bold text-gray-500 uppercase tracking-widest font-space">{title}</h5>
        <span className={cn("text-3xl font-black tracking-tight font-space", color)}>{value}</span>
      </div>
      <p className="text-sm text-gray-400 leading-relaxed font-medium">{desc}</p>
    </div>
  );
}
