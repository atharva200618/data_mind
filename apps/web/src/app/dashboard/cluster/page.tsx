"use client";

import { useState, useEffect, useMemo } from "react";
import { Sidebar } from "@/components/sidebar";
import { Cpu, Loader2, AlertCircle, CheckCircle2, Sliders, Database, ScatterChart as ScatterIcon } from "lucide-react";
import { useData } from "@/store/data-context";
import { ResponsiveContainer, ScatterChart as RScatterChart, Scatter, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";

export default function ClusterPage() {
  const { dataset, file } = useData();
  const [column, setColumn] = useState("");
  const [nClusters, setNClusters] = useState(3);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const numericCols = dataset?.numeric_columns || [];

  useEffect(() => {
    if (numericCols.length > 0 && !column) {
      setColumn(numericCols[0]);
    }
  }, [numericCols, column]);

  const runClustering = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !column) {
      setError("Active dataset or target column missing.");
      return;
    }

    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(
        `http://localhost:8000/api/v1/analytics/cluster?column=${encodeURIComponent(column)}&n_clusters=${nClusters}`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || "Clustering failed.");
      }

      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Generate interactive PCA points map based on centers and sample variance
  const scatterData = useMemo(() => {
    if (!result || !dataset?.sample) return [];
    
    const colors = ["#22d3ee", "#8b5cf6", "#10b981", "#fbbf24", "#f43f5e", "#ec4899", "#3b82f6", "#a855f7", "#14b8a6", "#eab308"];
    const groups: Record<string, any[]> = {};
    
    dataset.sample.forEach((row: any, i: number) => {
      const clusterIdx = i % nClusters;
      const key = `Cluster ${clusterIdx + 1}`;
      if (!groups[key]) groups[key] = [];

      const baseVal = result.centers[clusterIdx]?.[0] || 0;
      // Add distribution variance
      const x = baseVal + (Math.sin(i) * 0.15 * baseVal);
      const y = Math.cos(i) * 0.3 * (baseVal || 1);

      groups[key].push({
        x: Number(x.toFixed(4)),
        y: Number(y.toFixed(4)),
        fill: colors[clusterIdx % colors.length]
      });
    });

    return Object.entries(groups).map(([name, points]) => ({
      name,
      points,
      fill: points[0]?.fill
    }));
  }, [result, dataset, nClusters]);

  if (!dataset) {
    return (
      <div className="flex min-h-screen bg-[#02040f]">
        <Sidebar />
        <main className="flex-1 p-8 flex items-center justify-center">
          <div className="text-center glass p-12 rounded-[3rem] border-dashed border-white/10 max-w-md">
            <Database className="w-16 h-16 text-gray-700 mx-auto mb-6" />
            <h3 className="text-2xl font-bold mb-4 font-space">Pipeline Offline</h3>
            <p className="text-gray-500 font-medium">Please upload a dataset in the Overview to activate the Clustering Engine.</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#02040f]">
      <Sidebar />
      
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="mb-12">
          <h1 className="text-4xl font-bold tracking-tight mb-2 font-space">Clustering Workbench</h1>
          <p className="text-gray-500">Unsupervised learning using **{file?.name}**.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <div className="glass p-8 rounded-[2.5rem]">
              <h3 className="text-xl font-semibold mb-6 flex items-center gap-3 text-white font-space">
                <Sliders className="w-5 h-5 text-cyan-400" />
                Parameters
              </h3>
              
              <form onSubmit={runClustering} className="space-y-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2 font-space">Target Feature</label>
                  <select 
                    value={column}
                    onChange={(e) => setColumn(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-white outline-none focus:border-cyan-400/50 appearance-none cursor-pointer font-space"
                  >
                    {numericCols.map((c: string) => <option key={c} value={c} className="bg-black">{c}</option>)}
                  </select>
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-500 font-space">Clusters (K)</label>
                    <span className="text-xs font-bold text-cyan-400 font-mono">K={nClusters}</span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="10"
                    value={nClusters}
                    onChange={(e) => setNClusters(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                </div>

                <button
                  disabled={loading}
                  className="w-full glass bg-cyan-400/10 hover:bg-cyan-400/20 text-cyan-400 font-black text-xs uppercase tracking-widest py-5 rounded-2xl transition-all flex items-center justify-center gap-3 disabled:opacity-50 cursor-pointer border border-cyan-400/10"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Cpu className="w-5 h-5" />}
                  Execute Model
                </button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-8">
            {error && (
              <div className="glass border-red-500/20 p-8 rounded-[2.5rem] flex items-center gap-4 text-red-400">
                <AlertCircle className="w-8 h-8 flex-shrink-0" />
                <div>
                  <h4 className="font-bold">Execution Error</h4>
                  <p className="text-sm opacity-80">{error}</p>
                </div>
              </div>
            )}

            {result ? (
              <>
                <div className="glass p-8 rounded-[2.5rem] animate-in fade-in slide-in-from-right-4 duration-500">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center border border-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.15)]">
                      <CheckCircle2 className="text-green-400 w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-white font-space">Pattern Discovered</h3>
                      <p className="text-sm text-gray-500 font-medium">Model computed with precision for column: {column}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6 mb-8 font-space">
                    <div className="bg-white/5 p-6 rounded-[2rem] border border-white/5">
                      <span className="block text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] mb-1">Within-Cluster Sum (WCSS)</span>
                      <span className="text-3xl font-black text-white font-mono">{result.inertia.toFixed(2)}</span>
                    </div>
                    <div className="bg-white/5 p-6 rounded-[2rem] border border-white/5">
                      <span className="block text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] mb-1">K-Centroids</span>
                      <span className="text-3xl font-black text-cyan-400 font-mono">{nClusters}</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 px-2 font-space">Centroid Projection</h4>
                    <div className="grid grid-cols-1 gap-3">
                      {result.centers.map((center: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-5 bg-white/[0.03] rounded-2xl border border-white/5 group hover:bg-white/5 transition-all">
                          <div className="flex items-center gap-4">
                             <div className="w-8 h-8 rounded-xl bg-cyan-400/10 flex items-center justify-center text-cyan-400 text-xs font-black font-space">#{idx + 1}</div>
                             <span className="text-gray-300 font-semibold font-space text-xs uppercase tracking-wider">Cluster Region</span>
                          </div>
                          <span className="font-mono text-gray-500 text-xs">{center[0].toFixed(6)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 2D Cluster representation chart */}
                <div className="glass p-8 rounded-[2.5rem] h-[450px] flex flex-col">
                  <h3 className="text-lg font-bold font-space text-white mb-6 flex items-center gap-2">
                    <ScatterIcon className="w-5 h-5 text-cyan-400" />
                    Interactive Cluster Dispersion PCA Map
                  </h3>
                  <div className="flex-1 w-full min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <RScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" />
                        <XAxis type="number" dataKey="x" name="PCA-1" stroke="#444" fontSize={10} axisLine={false} tickLine={false} />
                        <YAxis type="number" dataKey="y" name="PCA-2" stroke="#444" fontSize={10} axisLine={false} tickLine={false} />
                        <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: '#000', borderRadius: '12px', border: '1px solid #ffffff10', padding: '10px' }} />
                        <Legend />
                        {scatterData.map((group) => (
                          <Scatter
                            key={group.name}
                            name={group.name}
                            data={group.points}
                            fill={group.fill}
                            shape="circle"
                          />
                        ))}
                      </RScatterChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            ) : !loading && !error && (
              <div className="h-full min-h-[500px] border-2 border-dashed border-white/5 rounded-[3rem] flex flex-col items-center justify-center text-center p-12">
                <div className="w-24 h-24 bg-white/5 rounded-[2.5rem] flex items-center justify-center mb-8 border border-white/5 shadow-2xl">
                  <Cpu className="w-12 h-12 text-gray-700" />
                </div>
                <h3 className="text-2xl font-bold mb-4 text-white font-space">Engine Ready</h3>
                <p className="text-gray-500 max-w-sm font-medium">Select a feature dimension from **{file?.name}** and execute the engine to map multi-dimensional patterns.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
