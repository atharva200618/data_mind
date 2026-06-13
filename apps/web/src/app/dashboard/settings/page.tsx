"use client";

import { Sidebar } from "@/components/sidebar";
import { User, Shield, Bell, Zap, Sliders } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="flex min-h-screen bg-[#00020a]">
      <Sidebar />
      <main className="flex-1 p-8">
        <header className="mb-12">
          <h1 className="text-4xl font-bold tracking-tight mb-2 text-white">Workspace Settings</h1>
          <p className="text-gray-500">Manage your engine preferences and security.</p>
        </header>

        <div className="max-w-4xl space-y-8">
          <section className="glass p-8 rounded-[2.5rem]">
            <h3 className="text-xl font-bold mb-8 flex items-center gap-3 text-white">
              <User className="w-6 h-6 text-cyan-400" />
              Profile Configuration
            </h3>
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Full Name</label>
                <input type="text" defaultValue="Atharva Upadhyay" className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-cyan-400/50" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Email Address</label>
                <input type="email" defaultValue="atharva@datamind.ai" className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-cyan-400/50" />
              </div>
            </div>
          </section>

          <section className="glass p-8 rounded-[2.5rem]">
            <h3 className="text-xl font-bold mb-8 flex items-center gap-3 text-white">
              <Sliders className="w-6 h-6 text-amber-400" />
              Engine Preferences
            </h3>
            <div className="space-y-6">
              <ToggleItem icon={<Zap className="w-5 h-5" />} title="Auto-Profiling" desc="Automatically generate data summaries on upload." active={true} />
              <ToggleItem icon={<Shield className="w-5 h-5" />} title="Anomaly Shield" desc="Run isolation forest background tasks on large streams." active={false} />
              <ToggleItem icon={<Bell className="w-5 h-5" />} title="Audit Notifications" desc="Get alerted when diagnostics detect model drift." active={true} />
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function ToggleItem({ icon, title, desc, active }: any) {
  return (
    <div className="flex items-center justify-between p-6 bg-white/[0.02] rounded-3xl border border-white/5">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-gray-400">
          {icon}
        </div>
        <div>
          <h4 className="font-bold text-white mb-1">{title}</h4>
          <p className="text-sm text-gray-500">{desc}</p>
        </div>
      </div>
      <div className={`w-12 h-6 rounded-full relative transition-all duration-300 ${active ? 'bg-cyan-500 shadow-[0_0_10px_rgba(34,211,238,0.5)]' : 'bg-white/10'}`}>
        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-300 ${active ? 'left-7' : 'left-1'}`} />
      </div>
    </div>
  );
}
