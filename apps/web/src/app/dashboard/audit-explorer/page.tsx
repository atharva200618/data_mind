"use client";

import { useState, useEffect, useCallback } from "react";
import { Sidebar } from "@/components/sidebar";
import { 
  FileText, Search, Download, Shield, Clock, User, 
  ChevronLeft, ChevronRight, RefreshCw, Layers, Database, 
  Cpu, Activity, CheckSquare, Loader2
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Workspace {
  id: string;
  name: string;
  owner_id: string;
}

interface AuditLog {
  id: string;
  action: string;
  timestamp: string;
  user: string;
}

export default function AuditExplorerPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<string>("");
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  
  // Filters & Pagination State
  const [search, setSearch] = useState("");
  const [actionType, setActionType] = useState<string>("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 15;

  const [loading, setLoading] = useState(true);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // reset to page 1 on search
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const fetchWorkspaces = async () => {
    try {
      const response = await fetch(`${API}/api/v1/workspaces`);
      if (response.ok) {
        const data = await response.json();
        setWorkspaces(data);
        if (data.length > 0) {
          setActiveWorkspace(data[0].id);
        }
      }
    } catch (error) {
      console.error("Failed to load workspaces", error);
    }
  };

  const fetchLogs = useCallback(async () => {
    if (!activeWorkspace) return;
    setLoading(true);
    try {
      const offset = (page - 1) * limit;
      let url = `${API}/api/v1/workspaces/${activeWorkspace}/audit-logs?limit=${limit}&offset=${offset}`;
      
      if (debouncedSearch) {
        url += `&search=${encodeURIComponent(debouncedSearch)}`;
      }
      if (actionType) {
        url += `&action_type=${encodeURIComponent(actionType)}`;
      }
      
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.logs || []);
        setTotal(data.total || 0);
      }
    } catch (e) {
      console.error("Failed to fetch audit logs", e);
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace, debouncedSearch, actionType, page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleExportCSV = () => {
    if (!activeWorkspace) return;
    let url = `${API}/api/v1/workspaces/${activeWorkspace}/audit-logs/export?`;
    if (debouncedSearch) {
      url += `&search=${encodeURIComponent(debouncedSearch)}`;
    }
    if (actionType) {
      url += `&action_type=${encodeURIComponent(actionType)}`;
    }
    // Trigger download by opening url in window or downloading blob
    window.open(url, "_blank");
  };

  const totalPages = Math.max(Math.ceil(total / limit), 1);

  // Badge colors for action types
  const getActionTypeInfo = (action: string) => {
    const act = action.toLowerCase();
    if (act.includes("dataset") || act.includes("profile")) {
      return { label: "Dataset", color: "bg-cyan-500/10 text-cyan-400 border-cyan-400/20", icon: Database };
    }
    if (act.includes("etl") || act.includes("transform")) {
      return { label: "ETL", color: "bg-amber-500/10 text-amber-400 border-amber-400/20", icon: Layers };
    }
    if (act.includes("automl") || act.includes("model") || act.includes("trained")) {
      return { label: "AutoML", color: "bg-purple-500/10 text-purple-400 border-purple-400/20", icon: Cpu };
    }
    if (act.includes("predict") || act.includes("inference")) {
      return { label: "Prediction", color: "bg-emerald-500/10 text-emerald-400 border-emerald-400/20", icon: Activity };
    }
    if (act.includes("toggle") || act.includes("active") || act.includes("deploy")) {
      return { label: "Deployment", color: "bg-rose-500/10 text-rose-400 border-rose-500/20", icon: Shield };
    }
    return { label: "System", color: "bg-gray-500/10 text-gray-400 border-gray-500/20", icon: CheckSquare };
  };

  const filterTabs = [
    { value: "", label: "All Events" },
    { value: "dataset", label: "Datasets" },
    { value: "etl", label: "ETL Pipeline" },
    { value: "automl", label: "AutoML Fits" },
    { value: "prediction", label: "Inferences" },
    { value: "deployment", label: "Deployments" }
  ];

  return (
    <div className="flex min-h-screen bg-[#02040f]">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-2 font-space flex items-center gap-3">
              <Shield className="w-8 h-8 text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.4)]" />
              Audit Log Explorer
            </h1>
            <p className="text-gray-500">Access full event trace records for compliance, governance, and model debugging.</p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            {workspaces.length > 1 && (
              <select
                value={activeWorkspace}
                onChange={(e) => {
                  setActiveWorkspace(e.target.value);
                  setPage(1);
                }}
                className="bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-xs text-gray-300 outline-none focus:border-cyan-400/30 transition-all font-space"
              >
                {workspaces.map(w => (
                  <option key={w.id} value={w.id} className="bg-black">{w.name}</option>
                ))}
              </select>
            )}
            <button
              onClick={handleExportCSV}
              disabled={auditLogs.length === 0}
              className="flex items-center gap-2 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-40 text-black px-5 py-2.5 rounded-full font-bold font-space text-xs uppercase tracking-widest cursor-pointer shadow-[0_0_15px_rgba(34,211,238,0.15)] transition-colors"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </header>

        {/* Filters Controls Panel */}
        <div className="glass p-6 rounded-[2rem] mb-8 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="relative flex-1">
              <Search className="w-4.5 h-4.5 text-gray-500 absolute left-4 top-3.5" />
              <input
                type="text"
                placeholder="Search event logs by keyword (e.g. model, dataset)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-black/40 border border-white/5 rounded-2xl pl-11 pr-4 py-3.5 text-xs text-gray-300 placeholder-gray-500 outline-none focus:border-cyan-400/20 focus:bg-black/60 transition-all"
              />
            </div>
            <button
              onClick={fetchLogs}
              className="bg-white/5 border border-white/10 hover:bg-white/10 p-3.5 rounded-2xl text-gray-400 hover:text-white transition-all flex items-center justify-center cursor-pointer"
              title="Refresh logs"
            >
              <RefreshCw className={`w-4.5 h-4.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
          </div>

          {/* Tab Filters */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5">
            {filterTabs.map(tab => {
              const isSelected = actionType === tab.value;
              return (
                <button
                  key={tab.value}
                  onClick={() => {
                    setActionType(tab.value);
                    setPage(1);
                  }}
                  className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider font-space border transition-all cursor-pointer ${
                    isSelected 
                      ? "bg-cyan-400/10 border-cyan-400/30 text-cyan-400" 
                      : "bg-white/3 border-white/5 text-gray-400 hover:text-gray-200 hover:bg-white/5"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="glass p-6 rounded-[2rem] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-400">
              <thead>
                <tr className="border-b border-white/5 text-[10px] font-bold uppercase tracking-widest text-gray-500 font-space pb-4">
                  <th className="pb-4 pl-4">Timestamp</th>
                  <th className="pb-4">Category</th>
                  <th className="pb-4">Actor</th>
                  <th className="pb-4">Action Event Details</th>
                  <th className="pb-4 pr-4 text-right">Log ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-20 text-center">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                        <span className="text-[11px] text-gray-500 font-space uppercase">Loading event traces...</span>
                      </div>
                    </td>
                  </tr>
                ) : auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-20 text-center">
                      <div className="text-xs text-gray-500 italic font-space">
                        No audit records found matching the criteria.
                      </div>
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => {
                    const typeInfo = getActionTypeInfo(log.action);
                    const TypeIcon = typeInfo.icon;
                    return (
                      <tr key={log.id} className="group hover:bg-white/1 transition-all">
                        <td className="py-4 pl-4 text-gray-400 text-[10px] flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-gray-600" />
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[9px] font-bold font-space uppercase ${typeInfo.color}`}>
                            <TypeIcon className="w-3 h-3" />
                            {typeInfo.label}
                          </span>
                        </td>
                        <td className="py-4 text-gray-300 font-sans text-xs">
                          <span className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-gray-500" />
                            {log.user}
                          </span>
                        </td>
                        <td className="py-4 text-gray-100 font-sans text-xs leading-relaxed max-w-md">
                          {log.action}
                        </td>
                        <td className="py-4 pr-4 text-right text-gray-600 text-[10px] font-mono select-all">
                          {log.id.substring(0, 8)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && !loading && (
            <div className="flex items-center justify-between border-t border-white/5 pt-6 mt-6 px-4">
              <div className="text-[10px] text-gray-500 font-space uppercase">
                Showing {((page - 1) * limit) + 1} - {Math.min(page * limit, total)} of {total} events
              </div>
              <div className="flex items-center gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(p => Math.max(p - 1, 1))}
                  className="bg-white/3 border border-white/5 hover:border-white/10 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/5 p-2 rounded-xl text-gray-400 transition-all cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                
                <span className="text-xs text-gray-400 font-mono">
                  {page} / {totalPages}
                </span>

                <button
                  disabled={page === totalPages}
                  onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                  className="bg-white/3 border border-white/5 hover:border-white/10 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/5 p-2 rounded-xl text-gray-400 transition-all cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
