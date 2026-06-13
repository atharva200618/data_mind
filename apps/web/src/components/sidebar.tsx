"use client";

import { LayoutDashboard, BarChart3, Settings, LogOut, Cpu, Zap, Activity, MessageSquare, Database, TrendingUp, Sparkles, Binary, FileText, Wrench, Monitor, Rocket, History, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { useState } from "react";
import { TelemetryHUD } from "@/components/telemetry-hud";
import { useAuth } from "@/store/auth-context";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function Sidebar() {
  const pathname = usePathname();
  const [hudOpen, setHudOpen] = useState(false);
  const { user, logout } = useAuth();

  const navItems = [
    { name: "Overview", icon: LayoutDashboard, href: "/dashboard" },
    { name: "Workspaces", icon: LayoutDashboard, href: "/dashboard/workspaces", badge: "SaaS" },
    { name: "SQL Studio", icon: Database, href: "/dashboard/sql", badge: "SaaS" },
    { name: "Visual Lab", icon: BarChart3, href: "/dashboard/visual-lab" },
    { name: "Conversational ETL", icon: Wrench, href: "/dashboard/ai-etl", badge: "NextGen" },
    { name: "AutoML Engine", icon: Zap, href: "/dashboard/automl", badge: "New" },
    { name: "Deployment Hub", icon: Rocket, href: "/dashboard/deployment-hub", badge: "Prod" },
    { name: "Audit Explorer", icon: History, href: "/dashboard/audit-explorer", badge: "Audit" },
    { name: "Synthetic Gen", icon: Binary, href: "/dashboard/synthetic", badge: "New" },
    { name: "Reports Hub", icon: FileText, href: "/dashboard/reports", badge: "New" },
    { name: "Clustering", icon: Cpu, href: "/dashboard/cluster" },
    { name: "Forecasting", icon: TrendingUp, href: "/dashboard/forecasting" },
    { name: "Diagnostics", icon: Activity, href: "/dashboard/diagnostics" },
    { name: "AI Analyst", icon: MessageSquare, href: "/dashboard/ai" },
    { name: "Integrations", icon: Database, href: "/dashboard/integrations" },
  ];

  return (
    <>
      <aside className="w-72 border-r border-white/5 bg-black/40 backdrop-blur-3xl h-screen sticky top-0 flex flex-col p-6 overflow-hidden z-20">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 via-violet-500 to-amber-400 flex items-center justify-center font-bold text-black text-sm shadow-[0_0_20px_rgba(139,92,246,0.3)] animate-float-subtle">
            {user ? user.email.slice(0, 2).toUpperCase() : "DM"}
          </div>
          <div className="overflow-hidden">
            <h2 className="text-base font-black tracking-wider uppercase font-space bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent truncate">
              {user ? user.email.split("@")[0] : "DataMind AI"}
            </h2>
            <p className="text-[9px] text-cyan-400/80 uppercase tracking-widest font-black flex items-center gap-1.5 mt-0.5">
              <span className="pulse-dot"></span> {user ? "Secure Session" : "Recruiter Flow"}
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-1.5 overflow-y-auto scrollbar-hide pr-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-semibold uppercase tracking-wider transition-all duration-300 group relative border border-transparent",
                  isActive 
                    ? "bg-gradient-to-r from-cyan-500/10 to-violet-500/10 text-white border-white/10 shadow-[0_0_15px_rgba(34,211,238,0.05)]" 
                    : "text-gray-400 hover:text-gray-200 hover:bg-white/5 hover:border-white/5"
                )}
              >
                <div className="flex items-center gap-3">
                  <item.icon className={cn("w-4.5 h-4.5 transition-all duration-300", 
                    isActive ? "text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)] scale-110" : "text-gray-500 group-hover:text-gray-300"
                  )} />
                  <span className="font-space tracking-widest">{item.name}</span>
                </div>
                {item.badge && (
                  <span className="text-[8px] font-black px-2 py-0.5 rounded-full bg-cyan-400/20 text-cyan-400 border border-cyan-400/30">
                    {item.badge}
                  </span>
                )}
                {isActive && (
                  <div className="absolute left-0 top-1/4 bottom-1/4 w-[3px] rounded-r-full bg-cyan-400" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="pt-6 border-t border-white/5 space-y-1.5">
          <button 
            onClick={() => setHudOpen(!hudOpen)}
            className="flex items-center gap-3 px-4 py-3 w-full text-xs font-semibold uppercase tracking-wider font-space text-cyan-400 hover:text-cyan-300 hover:bg-cyan-400/5 rounded-2xl transition-all cursor-pointer border border-transparent hover:border-cyan-400/10"
          >
            <Monitor className="w-4.5 h-4.5" />
            Telemetry HUD
          </button>
          <Link href="/dashboard/settings" className="flex items-center gap-3 px-4 py-3 w-full text-xs font-semibold uppercase tracking-wider font-space text-gray-400 hover:text-gray-200 hover:bg-white/5 rounded-2xl transition-all">
            <Settings className="w-4.5 h-4.5" />
            Settings
          </Link>
          <button 
            onClick={logout}
            className="flex items-center gap-3 px-4 py-3 w-full text-xs font-semibold uppercase tracking-wider font-space text-rose-500/80 hover:text-rose-400 hover:bg-rose-500/5 rounded-2xl transition-all cursor-pointer border border-transparent text-left"
          >
            <LogOut className="w-4.5 h-4.5" />
            Logout
          </button>
        </div>
      </aside>

      <TelemetryHUD isOpen={hudOpen} onClose={() => setHudOpen(false)} />
    </>
  );
}
