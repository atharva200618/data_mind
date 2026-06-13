"use client";

import { useState, useEffect } from "react";
import { Cpu, Database, Activity, HardDrive, Cpu as GpuIcon, X, Zap } from "lucide-react";

export function TelemetryHUD({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [ram, setRam] = useState(4.22);
  const [cpu, setCpu] = useState(12.8);
  const [gpu, setGpu] = useState(24.5);
  const [ticks, setTicks] = useState(0);

  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setRam(prev => Math.min(16, Math.max(2, Number((prev + (Math.random() - 0.5) * 0.1).toFixed(2)))));
      setCpu(prev => Math.min(100, Math.max(1, Number((prev + (Math.random() - 0.5) * 4).toFixed(1)))));
      setGpu(prev => Math.min(100, Math.max(1, Number((prev + (Math.random() - 0.5) * 3).toFixed(1)))));
      setTicks(t => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed top-6 right-6 z-50 w-80 glass p-6 rounded-[2.5rem] border-cyan-400/20 shadow-[0_0_40px_rgba(34,211,238,0.1)] animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-cyan-400 animate-pulse" />
          <h4 className="text-xs font-black uppercase tracking-widest font-space text-white">System Telemetry HUD</h4>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-white/5 rounded-lg text-gray-500 hover:text-white transition-colors cursor-pointer">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-4">
        {/* Memory Grid */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-[10px] font-space text-gray-400 uppercase font-semibold">
            <span className="flex items-center gap-1.5"><HardDrive className="w-3 h-3 text-cyan-400" /> Active RAM Allocator</span>
            <span className="font-mono text-cyan-400">{ram} GB / 16 GB</span>
          </div>
          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-cyan-400" style={{ width: `${(ram / 16) * 100}%` }} />
          </div>
        </div>

        {/* CPU Grid */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-[10px] font-space text-gray-400 uppercase font-semibold">
            <span className="flex items-center gap-1.5"><Cpu className="w-3 h-3 text-violet-400" /> CPU Core Ticks</span>
            <span className="font-mono text-violet-400">{cpu}%</span>
          </div>
          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-violet-400" style={{ width: `${cpu}%` }} />
          </div>
        </div>

        {/* GPU Grid */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-[10px] font-space text-gray-400 uppercase font-semibold">
            <span className="flex items-center gap-1.5"><GpuIcon className="w-3 h-3 text-emerald-400" /> WebGL GPU Clock</span>
            <span className="font-mono text-emerald-400">{gpu}%</span>
          </div>
          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-400" style={{ width: `${gpu}%` }} />
          </div>
        </div>

        {/* Sync Node Ticker */}
        <div className="flex justify-between items-center pt-4 border-t border-white/5 font-mono text-[9px] text-gray-500">
          <span>Clock Ticks: {ticks}s</span>
          <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-cyan-400 animate-bounce" /> Vector Sync: 100%</span>
        </div>
      </div>
    </div>
  );
}
