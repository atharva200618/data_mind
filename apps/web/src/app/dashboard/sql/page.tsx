"use client";

import { useState, useEffect, useRef } from "react";
import { Sidebar } from "@/components/sidebar";
import {
  Database, Play, Code, AlertTriangle, RefreshCw, Layers, Plus, Star, Trash2, TestTube,
  History, Lightbulb, Download, Search, Copy, RotateCcw, ChevronRight, ChevronDown,
  Table2, Columns3, Zap, FileJson, FileSpreadsheet, FileDown, Settings2,
  ArrowUpDown, Clock, CheckCircle2, XCircle, Shield, Wifi, WifiOff
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ─── Types ───────────────────────────────────────────────────────────────────

interface QueryResult {
  sql: string;
  columns: string[];
  rows: any[];
  row_count: number;
  execution_time_ms: number;
  connector_type: string;
  history_id?: string;
}

interface SavedConnection {
  id: string;
  name: string;
  type: string;
  is_favorite: boolean;
  created_at: string;
  credentials_summary: string;
}

interface HistoryEntry {
  id: string;
  connector_type: string;
  nl_query: string | null;
  sql_query: string;
  execution_time_ms: number;
  row_count: number;
  status: string;
  error_detail: string | null;
  is_favorite: boolean;
  created_at: string;
}

interface CatalogTable {
  table: string;
  columns: { name: string; type: string; nullable: boolean; sample: any }[];
}

interface Insight {
  title: string;
  description: string;
  type: string;
}

// ─── Connector Config ────────────────────────────────────────────────────────

const CONNECTOR_META: Record<string, { label: string; color: string; icon: string }> = {
  sqlite: { label: "SQLite", color: "#22d3ee", icon: "⚡" },
  postgresql: { label: "PostgreSQL", color: "#336791", icon: "🐘" },
  mysql: { label: "MySQL", color: "#f59e0b", icon: "🐬" },
  google_sheets: { label: "Google Sheets", color: "#34a853", icon: "📊" },
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function SQLStudioPage() {
  // Core state
  const [nlQuery, setNlQuery] = useState("");
  const [activeConnector, setActiveConnector] = useState("sqlite");
  const [rawSqlMode, setRawSqlMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<QueryResult | null>(null);
  const [activeConnectionId, setActiveConnectionId] = useState<string | null>(null);

  // Inline credentials for non-saved connections
  const [inlineHost, setInlineHost] = useState("localhost");
  const [inlinePort, setInlinePort] = useState("5432");
  const [inlineDB, setInlineDB] = useState("");
  const [inlineUser, setInlineUser] = useState("");
  const [inlinePass, setInlinePass] = useState("");
  const [inlineSheetUrl, setInlineSheetUrl] = useState("");

  // Connection manager
  const [connections, setConnections] = useState<SavedConnection[]>([]);
  const [showNewConn, setShowNewConn] = useState(false);
  const [newConnName, setNewConnName] = useState("");
  const [newConnType, setNewConnType] = useState("postgresql");
  const [testResult, setTestResult] = useState<any>(null);
  const [testLoading, setTestLoading] = useState(false);

  // Bottom panel tabs
  const [bottomTab, setBottomTab] = useState<"results" | "history" | "insights" | "explain">("results");

  // History
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);

  // Data catalog
  const [catalog, setCatalog] = useState<CatalogTable[]>([]);
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());
  const [showCatalog, setShowCatalog] = useState(true);
  const [catalogLoading, setCatalogLoading] = useState(false);

  // Insights / Explain
  const [insights, setInsights] = useState<Insight[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [explainPlan, setExplainPlan] = useState<any>(null);
  const [explainLoading, setExplainLoading] = useState(false);
  const [fetchedInsightsSql, setFetchedInsightsSql] = useState<string | null>(null);
  const [fetchedExplainSql, setFetchedExplainSql] = useState<string | null>(null);

  // Optimize
  const [optimizeResult, setOptimizeResult] = useState<any>(null);
  const [optimizeLoading, setOptimizeLoading] = useState(false);

  // Export
  const [exportLoading, setExportLoading] = useState(false);

  const inputRef = useRef<HTMLTextAreaElement>(null);

  // ─── Load Data ─────────────────────────────────────────────────────────────

  useEffect(() => {
    loadConnections();
    loadHistory();
    loadCatalog("sqlite");
  }, []);

  const loadConnections = async () => {
    try {
      const res = await fetch(`${API}/api/v1/query/connections`);
      if (res.ok) setConnections(await res.json());
    } catch {}
  };

  const loadHistory = async () => {
    try {
      const res = await fetch(`${API}/api/v1/query/history?limit=50`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data.entries || []);
        setHistoryTotal(data.total || 0);
      }
    } catch {}
  };

  const loadCatalog = async (connectorOrId: string) => {
    setCatalogLoading(true);
    try {
      const res = await fetch(`${API}/api/v1/query/connections/${connectorOrId}/catalog`);
      if (res.ok) setCatalog(await res.json());
    } catch {}
    setCatalogLoading(false);
  };

  // ─── Build credentials ────────────────────────────────────────────────────

  const getInlineCredentials = () => {
    if (activeConnector === "sqlite") return {};
    if (activeConnector === "google_sheets") return { sheet_url: inlineSheetUrl, table_name: "sheet_data" };
    return {
      host: inlineHost,
      port: parseInt(inlinePort) || (activeConnector === "mysql" ? 3306 : 5432),
      database: inlineDB,
      username: inlineUser,
      password: inlinePass
    };
  };

  // ─── Execute Query ─────────────────────────────────────────────────────────

  const handleRunQuery = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!nlQuery.trim()) return;

    setLoading(true);
    setError(null);
    setResults(null);
    setInsights([]);
    setExplainPlan(null);
    setOptimizeResult(null);
    setBottomTab("results");
    setFetchedInsightsSql(null);
    setFetchedExplainSql(null);

    try {
      const formData = new FormData();
      formData.append("query", nlQuery);
      formData.append("connector_type", activeConnector);
      formData.append("raw_sql", String(rawSqlMode));

      if (activeConnectionId) {
        formData.append("connection_id", activeConnectionId);
      } else if (activeConnector !== "sqlite") {
        formData.append("credentials", JSON.stringify(getInlineCredentials()));
      }

      const response = await fetch(`${API}/api/v1/query/execute`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || "Query failed to execute");
      }

      const data = await response.json();
      setResults(data);
      loadHistory();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ─── Connection Manager Actions ────────────────────────────────────────────

  const handleSaveConnection = async () => {
    if (!newConnName.trim()) return;
    const creds = getInlineCredentials();
    const formData = new FormData();
    formData.append("name", newConnName);
    formData.append("type", newConnType);
    formData.append("credentials", JSON.stringify(creds));

    try {
      const res = await fetch(`${API}/api/v1/query/connections`, { method: "POST", body: formData });
      if (res.ok) {
        setShowNewConn(false);
        setNewConnName("");
        loadConnections();
      }
    } catch {}
  };

  const handleDeleteConnection = async (id: string) => {
    try {
      await fetch(`${API}/api/v1/query/connections/${id}`, { method: "DELETE" });
      if (activeConnectionId === id) setActiveConnectionId(null);
      loadConnections();
    } catch {}
  };

  const handleTestConnection = async (id?: string) => {
    setTestLoading(true);
    setTestResult(null);
    try {
      let res;
      if (id) {
        res = await fetch(`${API}/api/v1/query/connections/${id}/test`, { method: "POST" });
      } else {
        const formData = new FormData();
        formData.append("connector_type", activeConnector);
        formData.append("credentials", JSON.stringify(getInlineCredentials()));
        res = await fetch(`${API}/api/v1/query/test-connection`, { method: "POST", body: formData });
      }
      if (res.ok) setTestResult(await res.json());
    } catch (err: any) {
      setTestResult({ success: false, error: err.message });
    }
    setTestLoading(false);
  };

  const handleToggleFavorite = async (id: string) => {
    try {
      await fetch(`${API}/api/v1/query/connections/${id}/toggle-favorite`, { method: "POST" });
      loadConnections();
    } catch {}
  };

  // ─── AI Features ───────────────────────────────────────────────────────────

  const handleGenerateInsights = async () => {
    if (!results) return;
    setInsightsLoading(true);
    setBottomTab("insights");
    setFetchedInsightsSql(results.sql);
    try {
      const formData = new FormData();
      formData.append("sql", results.sql);
      formData.append("columns", JSON.stringify(results.columns));
      formData.append("rows", JSON.stringify(results.rows.slice(0, 50)));
      const res = await fetch(`${API}/api/v1/query/insights`, { method: "POST", body: formData });
      if (res.ok) {
        const data = await res.json();
        setInsights(data.insights || []);
      }
    } catch {}
    setInsightsLoading(false);
  };

  const handleExplain = async () => {
    if (!results) return;
    setExplainLoading(true);
    setBottomTab("explain");
    setFetchedExplainSql(results.sql);
    try {
      const formData = new FormData();
      formData.append("query", results.sql);
      formData.append("connector_type", activeConnector);
      if (activeConnectionId) formData.append("connection_id", activeConnectionId);
      const res = await fetch(`${API}/api/v1/query/explain`, { method: "POST", body: formData });
      if (res.ok) setExplainPlan(await res.json());
    } catch {}
    setExplainLoading(false);
  };

  const handleOptimize = async () => {
    if (!results) return;
    setOptimizeLoading(true);
    try {
      const formData = new FormData();
      formData.append("query", results.sql);
      formData.append("connector_type", activeConnector);
      const res = await fetch(`${API}/api/v1/query/optimize`, { method: "POST", body: formData });
      if (res.ok) setOptimizeResult(await res.json());
    } catch {}
    setOptimizeLoading(false);
  };

  // Automatically fetch insights and explain plan when results are updated
  useEffect(() => {
    if (results) {
      // Fetch insights in background if not already fetched for this SQL
      if (results.sql !== fetchedInsightsSql && !insightsLoading) {
        setFetchedInsightsSql(results.sql);
        const fetchInsights = async () => {
          setInsightsLoading(true);
          try {
            const formData = new FormData();
            formData.append("sql", results.sql);
            formData.append("columns", JSON.stringify(results.columns));
            formData.append("rows", JSON.stringify(results.rows.slice(0, 50)));
            const res = await fetch(`${API}/api/v1/query/insights`, { method: "POST", body: formData });
            if (res.ok) {
              const data = await res.json();
              setInsights(data.insights || []);
            }
          } catch (err) {
            console.error("Auto-insights error:", err);
          } finally {
            setInsightsLoading(false);
          }
        };
        fetchInsights();
      }

      // Fetch explain plan in background if not already fetched for this SQL
      if (results.sql !== fetchedExplainSql && !explainLoading) {
        setFetchedExplainSql(results.sql);
        const fetchExplain = async () => {
          setExplainLoading(true);
          try {
            const formData = new FormData();
            formData.append("query", results.sql);
            formData.append("connector_type", results.connector_type || activeConnector);
            if (activeConnectionId) formData.append("connection_id", activeConnectionId);
            const res = await fetch(`${API}/api/v1/query/explain`, { method: "POST", body: formData });
            if (res.ok) {
              setExplainPlan(await res.json());
            }
          } catch (err) {
            console.error("Auto-explain error:", err);
          } finally {
            setExplainLoading(false);
          }
        };
        fetchExplain();
      }
    }
  }, [results, activeConnector, activeConnectionId, fetchedInsightsSql, fetchedExplainSql, insightsLoading, explainLoading]);

  // ─── Export ────────────────────────────────────────────────────────────────

  const handleExport = async (format: string) => {
    if (!results) return;
    setExportLoading(true);
    try {
      const formData = new FormData();
      formData.append("format", format);
      formData.append("columns", JSON.stringify(results.columns));
      formData.append("rows", JSON.stringify(results.rows));
      const res = await fetch(`${API}/api/v1/query/export`, { method: "POST", body: formData });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `query_results.${format === "excel" ? "xlsx" : format}`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {}
    setExportLoading(false);
  };

  // ─── History Actions ───────────────────────────────────────────────────────

  const handleRerunHistory = async (entry: HistoryEntry) => {
    setNlQuery(entry.sql_query);
    setRawSqlMode(true);
    setActiveConnector(entry.connector_type);
  };

  const handleCopySQL = (sql: string) => {
    navigator.clipboard.writeText(sql);
  };

  // ─── Catalog Actions ───────────────────────────────────────────────────────

  const toggleTableExpand = (tableName: string) => {
    setExpandedTables((prev) => {
      const next = new Set(prev);
      if (next.has(tableName)) next.delete(tableName);
      else next.add(tableName);
      return next;
    });
  };

  const insertIntoQuery = (text: string) => {
    setNlQuery((prev) => (prev ? prev + " " + text : text));
  };

  // ─── Select saved connection ───────────────────────────────────────────────

  const selectConnection = (conn: SavedConnection) => {
    setActiveConnectionId(conn.id);
    setActiveConnector(conn.type);
    loadCatalog(conn.id);
  };

  const selectSQLite = () => {
    setActiveConnectionId(null);
    setActiveConnector("sqlite");
    loadCatalog("sqlite");
  };

  // ─── Connector color helper ────────────────────────────────────────────────

  const cMeta = CONNECTOR_META[activeConnector] || CONNECTOR_META.sqlite;

  return (
    <div className="flex min-h-screen bg-[#02040f]">
      <Sidebar />
      <main className="flex-1 p-6 overflow-y-auto">
        {/* ═══ Header ═══ */}
        <header className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-1 font-space flex items-center gap-3">
              SQL Studio
              <span className="text-[10px] font-black tracking-widest uppercase px-3 py-1 rounded-full border" style={{ borderColor: cMeta.color + "40", color: cMeta.color, background: cMeta.color + "10" }}>
                Enterprise
              </span>
            </h1>
            <p className="text-gray-500 text-sm">Multi-source query engine · Natural Language & Raw SQL · PostgreSQL · MySQL · Google Sheets · SQLite</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowCatalog(!showCatalog)} className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-cyan-400/30 transition-colors text-gray-400 hover:text-cyan-400 cursor-pointer" title="Toggle Data Catalog">
              <Table2 className="w-4 h-4" />
            </button>
          </div>
        </header>

        <div className="grid grid-cols-12 gap-5">
          {/* ═══ LEFT PANEL — Connection Manager ═══ */}
          <div className="col-span-12 xl:col-span-3 space-y-4">
            {/* Active Connector Selector */}
            <div className="glass p-5 rounded-[2rem] space-y-4">
              <h3 className="text-xs font-bold font-space text-white flex items-center gap-2 uppercase tracking-wider">
                <Database className="w-4 h-4 text-cyan-400" />
                Source Connector
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(CONNECTOR_META).map(([key, meta]) => (
                  <button
                    key={key}
                    onClick={() => { setActiveConnector(key); setActiveConnectionId(null); if (key === "sqlite") loadCatalog("sqlite"); }}
                    className={`p-3 rounded-xl text-left transition-all cursor-pointer border ${activeConnector === key && !activeConnectionId ? "border-cyan-400/40 bg-cyan-400/8" : "border-white/5 bg-white/3 hover:border-white/15"}`}
                  >
                    <span className="text-base">{meta.icon}</span>
                    <p className="text-[10px] font-bold font-space mt-1" style={{ color: activeConnector === key ? meta.color : "rgba(255,255,255,0.5)" }}>{meta.label}</p>
                  </button>
                ))}
              </div>

              {/* Inline credentials for non-sqlite, non-saved */}
              {activeConnector !== "sqlite" && !activeConnectionId && (
                <div className="space-y-3 pt-3 border-t border-white/5 animate-in fade-in duration-300">
                  {activeConnector === "google_sheets" ? (
                    <div>
                      <label className="text-[9px] font-black uppercase text-gray-500 tracking-wider font-space">Sheet URL</label>
                      <input type="text" value={inlineSheetUrl} onChange={(e) => setInlineSheetUrl(e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/..." className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white mt-1 outline-none focus:border-cyan-400/30 transition-colors" />
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-2">
                          <label className="text-[9px] font-black uppercase text-gray-500 tracking-wider font-space">Host</label>
                          <input type="text" value={inlineHost} onChange={(e) => setInlineHost(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white mt-1 outline-none focus:border-cyan-400/30 transition-colors" />
                        </div>
                        <div>
                          <label className="text-[9px] font-black uppercase text-gray-500 tracking-wider font-space">Port</label>
                          <input type="text" value={inlinePort} onChange={(e) => setInlinePort(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white mt-1 outline-none focus:border-cyan-400/30 transition-colors" />
                        </div>
                      </div>
                      <div>
                        <label className="text-[9px] font-black uppercase text-gray-500 tracking-wider font-space">Database</label>
                        <input type="text" value={inlineDB} onChange={(e) => setInlineDB(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white mt-1 outline-none focus:border-cyan-400/30 transition-colors" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] font-black uppercase text-gray-500 tracking-wider font-space">Username</label>
                          <input type="text" value={inlineUser} onChange={(e) => setInlineUser(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white mt-1 outline-none focus:border-cyan-400/30 transition-colors" />
                        </div>
                        <div>
                          <label className="text-[9px] font-black uppercase text-gray-500 tracking-wider font-space">Password</label>
                          <input type="password" value={inlinePass} onChange={(e) => setInlinePass(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white mt-1 outline-none focus:border-cyan-400/30 transition-colors" />
                        </div>
                      </div>
                    </>
                  )}
                  <div className="flex gap-2">
                    <button onClick={() => handleTestConnection()} disabled={testLoading} className="flex-1 bg-white/5 border border-white/10 hover:border-emerald-400/30 text-xs py-2 rounded-xl font-space font-bold cursor-pointer transition-colors flex items-center justify-center gap-1.5">
                      {testLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <TestTube className="w-3 h-3 text-emerald-400" />}
                      <span className="text-emerald-400">Test</span>
                    </button>
                    <button onClick={() => { setShowNewConn(true); setNewConnType(activeConnector); }} className="flex-1 bg-white/5 border border-white/10 hover:border-cyan-400/30 text-xs py-2 rounded-xl font-space font-bold cursor-pointer transition-colors flex items-center justify-center gap-1.5">
                      <Plus className="w-3 h-3 text-cyan-400" />
                      <span className="text-cyan-400">Save</span>
                    </button>
                  </div>
                  {testResult && (
                    <div className={`p-3 rounded-xl border text-[10px] font-mono animate-in fade-in duration-300 ${testResult.success ? "border-emerald-400/20 bg-emerald-400/5 text-emerald-400" : "border-rose-400/20 bg-rose-400/5 text-rose-400"}`}>
                      {testResult.success ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Connected</div>
                          <div className="text-gray-500">Latency: {testResult.latency_ms}ms · Tables: {testResult.tables_detected}</div>
                          <div className="text-gray-500 truncate">{testResult.database_version}</div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1"><XCircle className="w-3 h-3" /> {testResult.error}</div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Status badge */}
              <div className="bg-white/3 border border-white/5 p-3 rounded-xl">
                <span className="text-[8px] font-black uppercase tracking-widest font-space flex items-center gap-1" style={{ color: cMeta.color }}>
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: cMeta.color }} />
                  {activeConnectionId ? "Saved Connection Active" : `${cMeta.label} Active`}
                </span>
                <p className="text-[9px] text-gray-500 mt-1 leading-normal">
                  {activeConnector === "sqlite"
                    ? "Connected to local datamind.db engine."
                    : activeConnectionId
                      ? connections.find(c => c.id === activeConnectionId)?.credentials_summary
                      : "Configure credentials above to connect."}
                </p>
              </div>
            </div>

            {/* Saved Connections */}
            <div className="glass p-5 rounded-[2rem] space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold font-space text-white uppercase tracking-wider flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-violet-400" />
                  Saved Connections
                </h3>
                <button onClick={() => setShowNewConn(!showNewConn)} className="w-6 h-6 rounded-lg bg-white/5 border border-white/10 hover:border-violet-400/30 flex items-center justify-center cursor-pointer transition-colors">
                  <Plus className="w-3 h-3 text-violet-400" />
                </button>
              </div>

              {/* SQLite always available */}
              <button
                onClick={selectSQLite}
                className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${!activeConnectionId && activeConnector === "sqlite" ? "border-cyan-400/30 bg-cyan-400/5" : "border-white/5 bg-white/3 hover:border-white/10"}`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">⚡</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold font-space text-white truncate">SQLite (datamind.db)</p>
                    <p className="text-[9px] text-gray-500">Built-in · Always available</p>
                  </div>
                  <Wifi className="w-3 h-3 text-emerald-400" />
                </div>
              </button>

              {/* Dynamic connections list */}
              {connections.map((conn) => (
                <div
                  key={conn.id}
                  className={`group p-3 rounded-xl border transition-all cursor-pointer ${activeConnectionId === conn.id ? "border-cyan-400/30 bg-cyan-400/5" : "border-white/5 bg-white/3 hover:border-white/10"}`}
                  onClick={() => selectConnection(conn)}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{CONNECTOR_META[conn.type]?.icon || "🔗"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold font-space text-white truncate">{conn.name}</p>
                      <p className="text-[9px] text-gray-500 truncate">{conn.credentials_summary}</p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); handleToggleFavorite(conn.id); }} className="p-1 rounded hover:bg-white/10 cursor-pointer">
                        <Star className={`w-3 h-3 ${conn.is_favorite ? "text-amber-400 fill-amber-400" : "text-gray-600"}`} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleTestConnection(conn.id); }} className="p-1 rounded hover:bg-white/10 cursor-pointer">
                        <TestTube className="w-3 h-3 text-emerald-400" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteConnection(conn.id); }} className="p-1 rounded hover:bg-white/10 cursor-pointer">
                        <Trash2 className="w-3 h-3 text-rose-400" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {connections.length === 0 && (
                <p className="text-[10px] text-gray-600 text-center py-3 font-space">No saved connections yet.</p>
              )}

              {/* New connection form */}
              {showNewConn && (
                <div className="border border-violet-400/20 bg-violet-400/5 p-4 rounded-xl space-y-3 animate-in fade-in duration-300">
                  <input type="text" value={newConnName} onChange={(e) => setNewConnName(e.target.value)} placeholder="Connection name..." className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-violet-400/30 transition-colors" />
                  <select value={newConnType} onChange={(e) => setNewConnType(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none">
                    <option value="postgresql" className="bg-[#02040f]">PostgreSQL</option>
                    <option value="mysql" className="bg-[#02040f]">MySQL</option>
                    <option value="google_sheets" className="bg-[#02040f]">Google Sheets</option>
                  </select>
                  <div className="flex gap-2">
                    <button onClick={handleSaveConnection} className="flex-1 bg-violet-500 hover:bg-violet-400 text-white text-xs py-2 rounded-xl font-space font-bold cursor-pointer transition-colors">Save Connection</button>
                    <button onClick={() => setShowNewConn(false)} className="px-3 bg-white/5 text-xs py-2 rounded-xl cursor-pointer text-gray-400 hover:text-white transition-colors border border-white/10">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ═══ CENTER PANEL — Query Editor + Results ═══ */}
          <div className={`${showCatalog ? "col-span-12 xl:col-span-6" : "col-span-12 xl:col-span-9"} space-y-4`}>
            {/* Query Editor */}
            <div className="glass p-6 rounded-[2rem] space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold font-space uppercase tracking-wider text-gray-400 flex items-center gap-2">
                  <Code className="w-3.5 h-3.5 text-cyan-400" />
                  {rawSqlMode ? "Raw SQL Editor" : "Natural Language Prompt"}
                </h4>
                <div className="flex items-center gap-3">
                  {/* Mode Toggle */}
                  <button onClick={() => setRawSqlMode(!rawSqlMode)} className="text-[9px] font-black font-space uppercase tracking-widest px-3 py-1.5 rounded-lg border transition-colors cursor-pointer" style={{ borderColor: rawSqlMode ? "rgba(139,92,246,0.3)" : "rgba(255,255,255,0.1)", color: rawSqlMode ? "#8b5cf6" : "rgba(255,255,255,0.4)", background: rawSqlMode ? "rgba(139,92,246,0.08)" : "transparent" }}>
                    {rawSqlMode ? "SQL Mode" : "NL Mode"}
                  </button>
                  {/* Connector badge */}
                  <span className="text-[9px] font-black font-space uppercase tracking-widest px-2.5 py-1 rounded-lg border flex items-center gap-1.5" style={{ borderColor: cMeta.color + "30", color: cMeta.color, background: cMeta.color + "08" }}>
                    {cMeta.icon} {cMeta.label}
                  </span>
                </div>
              </div>

              <form onSubmit={handleRunQuery} className="space-y-3">
                <textarea
                  ref={inputRef}
                  placeholder={rawSqlMode ? "SELECT * FROM users LIMIT 10;" : "e.g. 'Show workspaces created in last 24 hours' or 'List all models with R2 score above 0.9'..."}
                  required
                  value={nlQuery}
                  onChange={(e) => setNlQuery(e.target.value)}
                  onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") handleRunQuery(); }}
                  rows={rawSqlMode ? 5 : 2}
                  className={`w-full bg-white/5 border border-white/10 focus:border-cyan-400/35 rounded-2xl px-5 py-4 text-xs text-white outline-none font-medium placeholder:text-gray-600 transition-all resize-none ${rawSqlMode ? "font-mono" : ""}`}
                />
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-gray-600 font-space">⌘+Enter to run · MAX_ROWS: {(10000).toLocaleString()}</span>
                  <div className="flex gap-2">
                    {results && (
                      <>
                        <button type="button" onClick={handleOptimize} disabled={optimizeLoading} className="bg-white/5 border border-white/10 hover:border-amber-400/30 text-amber-400 px-3 py-2.5 rounded-xl text-[10px] font-bold font-space uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-colors">
                          {optimizeLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                          Optimize
                        </button>
                        <button type="button" onClick={handleExplain} disabled={explainLoading} className="bg-white/5 border border-white/10 hover:border-violet-400/30 text-violet-400 px-3 py-2.5 rounded-xl text-[10px] font-bold font-space uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-colors">
                          {explainLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Settings2 className="w-3 h-3" />}
                          Explain
                        </button>
                      </>
                    )}
                    <button type="submit" disabled={loading} className="bg-white hover:bg-cyan-400 disabled:opacity-40 text-black px-5 py-2.5 rounded-xl text-[10px] font-bold font-space uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-md transition-colors">
                      {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                      {loading ? "Running" : "Execute"}
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* Optimize result toast */}
            {optimizeResult && (
              <div className="glass p-5 rounded-[2rem] border-l-2 border-amber-400 space-y-2 animate-in slide-in-from-top duration-300">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-black text-amber-400 uppercase tracking-widest font-space flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" /> AI Query Optimizer</h4>
                  <button onClick={() => { setNlQuery(optimizeResult.optimized_sql); setRawSqlMode(true); }} className="text-[9px] font-bold text-cyan-400 hover:text-white cursor-pointer transition-colors font-space uppercase">Apply Optimized SQL →</button>
                </div>
                <p className="text-[10px] text-gray-400">{optimizeResult.improvement}</p>
                <pre className="text-[10px] text-gray-300 font-mono bg-white/3 p-3 rounded-xl border border-white/5 whitespace-pre-wrap">{optimizeResult.optimized_sql}</pre>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 p-5 rounded-[2rem] flex gap-3 items-start animate-in fade-in duration-300">
                <AlertTriangle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-[10px] font-bold text-rose-400 uppercase tracking-widest font-space">Execution Failed</h4>
                  <pre className="text-[10px] text-gray-400 mt-1.5 font-mono whitespace-pre-wrap">{error}</pre>
                </div>
              </div>
            )}

            {/* ═══ Bottom Panel — Tabs ═══ */}
            {(results || history.length > 0) && (
              <div className="glass rounded-[2rem] overflow-hidden">
                {/* Tab bar */}
                <div className="flex border-b border-white/5">
                  {[
                    { key: "results" as const, label: "Results", icon: Layers, count: results?.row_count },
                    { key: "history" as const, label: "History", icon: History, count: historyTotal },
                    { key: "insights" as const, label: "Insights", icon: Lightbulb, count: insights.length || undefined },
                    { key: "explain" as const, label: "Explain", icon: Settings2 },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setBottomTab(tab.key)}
                      className={`flex-1 py-3 text-[10px] font-bold font-space uppercase tracking-widest flex items-center justify-center gap-1.5 transition-colors cursor-pointer border-b-2 ${bottomTab === tab.key ? "text-cyan-400 border-cyan-400" : "text-gray-500 border-transparent hover:text-gray-300"}`}
                    >
                      <tab.icon className="w-3.5 h-3.5" />
                      {tab.label}
                      {tab.count !== undefined && tab.count > 0 && (
                        <span className="text-[8px] bg-white/10 rounded-full px-1.5 py-0.5 ml-1">{tab.count}</span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Tab content */}
                <div className="p-6">
                  {/* ─── Results Tab ─── */}
                  {bottomTab === "results" && results && (
                    <div className="space-y-4 animate-in fade-in duration-300">
                      {/* SQL Display */}
                      <div className="bg-black/50 p-4 rounded-xl border border-white/5 relative group">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[9px] font-black text-cyan-400 uppercase tracking-widest font-space flex items-center gap-1.5"><Code className="w-3 h-3" /> Generated {cMeta.label} Query</span>
                          <div className="flex gap-1.5 items-center">
                            <span className="text-[9px] text-gray-600 font-mono">{results.execution_time_ms}ms</span>
                            <button onClick={() => handleCopySQL(results.sql)} className="p-1 rounded hover:bg-white/10 cursor-pointer transition-colors"><Copy className="w-3 h-3 text-gray-500 hover:text-white" /></button>
                          </div>
                        </div>
                        <pre className="text-[11px] text-gray-300 font-mono whitespace-pre-wrap select-all">{results.sql}</pre>
                      </div>

                      {/* Toolbar */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest font-space">{results.row_count.toLocaleString()} rows · {results.columns.length} columns</span>
                          <span className="text-[9px] font-mono px-2 py-0.5 rounded-md bg-white/5 border border-white/5" style={{ color: cMeta.color }}>{cMeta.icon} {cMeta.label}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button onClick={handleGenerateInsights} disabled={insightsLoading} className="text-[9px] font-bold text-amber-400 hover:text-amber-300 font-space uppercase flex items-center gap-1 cursor-pointer transition-colors">
                            {insightsLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Lightbulb className="w-3 h-3" />} Insights
                          </button>
                          <span className="text-gray-700">·</span>
                          {/* Export buttons */}
                          {["csv", "json", "excel", "parquet"].map((fmt) => (
                            <button key={fmt} onClick={() => handleExport(fmt)} disabled={exportLoading} className="text-[9px] font-bold text-gray-500 hover:text-cyan-400 font-space uppercase cursor-pointer transition-colors">{fmt}</button>
                          ))}
                        </div>
                      </div>

                      {/* Data Table */}
                      {results.row_count === 0 ? (
                        <div className="text-center p-8 text-gray-500 text-xs font-space uppercase">No rows returned by database.</div>
                      ) : (
                        <div className="overflow-x-auto max-h-[380px] scrollbar-hide rounded-xl border border-white/5">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead className="sticky top-0 bg-[#0a0c1a] z-10">
                              <tr className="text-[10px] text-gray-500 uppercase tracking-widest border-b border-white/5">
                                <th className="pb-3 pt-3 px-4 font-black text-gray-600 w-10">#</th>
                                {results.columns.map((col) => (
                                  <th key={col} className="pb-3 pt-3 font-black px-4">{col}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                              {results.rows.map((row, idx) => (
                                <tr key={idx} className="group hover:bg-white/3 transition-colors">
                                  <td className="py-3 px-4 text-gray-600 font-mono text-[10px]">{idx + 1}</td>
                                  {results.columns.map((col) => (
                                    <td key={col} className="py-3 px-4 text-gray-300 font-mono text-[11px] tabular-nums max-w-[200px] truncate" title={row[col] !== null ? String(row[col]) : "NULL"}>
                                      {row[col] !== null ? String(row[col]) : <span className="text-gray-600 italic">NULL</span>}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ─── History Tab ─── */}
                  {bottomTab === "history" && (
                    <div className="space-y-2 max-h-[400px] overflow-y-auto scrollbar-hide animate-in fade-in duration-300">
                      {history.length === 0 ? (
                        <p className="text-center text-gray-500 text-xs font-space uppercase py-8">No query history yet.</p>
                      ) : (
                        history.map((entry) => (
                          <div key={entry.id} className="group p-3 rounded-xl border border-white/5 bg-white/2 hover:border-white/10 transition-all">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-sm">{CONNECTOR_META[entry.connector_type]?.icon || "🔗"}</span>
                                  <span className={`text-[8px] font-black uppercase tracking-widest font-space px-1.5 py-0.5 rounded ${entry.status === "success" ? "bg-emerald-400/10 text-emerald-400" : "bg-rose-400/10 text-rose-400"}`}>
                                    {entry.status}
                                  </span>
                                  <span className="text-[9px] text-gray-600 font-mono">{entry.execution_time_ms}ms · {entry.row_count} rows</span>
                                  <span className="text-[9px] text-gray-700 font-mono">{new Date(entry.created_at).toLocaleTimeString()}</span>
                                </div>
                                <pre className="text-[10px] text-gray-400 font-mono truncate">{entry.sql_query}</pre>
                                {entry.nl_query && <p className="text-[9px] text-gray-600 mt-0.5 truncate">NL: {entry.nl_query}</p>}
                              </div>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleRerunHistory(entry)} className="p-1 rounded hover:bg-white/10 cursor-pointer" title="Load into editor"><RotateCcw className="w-3 h-3 text-cyan-400" /></button>
                                <button onClick={() => handleCopySQL(entry.sql_query)} className="p-1 rounded hover:bg-white/10 cursor-pointer" title="Copy SQL"><Copy className="w-3 h-3 text-gray-400" /></button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* ─── Insights Tab ─── */}
                  {bottomTab === "insights" && (
                    <div className="animate-in fade-in duration-300">
                      {insightsLoading ? (
                        <div className="flex items-center justify-center gap-2 py-12 text-gray-500 text-xs font-space">
                          <RefreshCw className="w-4 h-4 animate-spin" /> Generating AI insights...
                        </div>
                      ) : insights.length === 0 ? (
                        <div className="text-center py-12">
                          <Lightbulb className="w-8 h-8 text-gray-700 mx-auto mb-3" />
                          <p className="text-gray-500 text-xs font-space">Run a query first, then click &quot;Insights&quot; to generate AI analysis.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {insights.map((insight, idx) => (
                            <div key={idx} className="p-4 rounded-xl border border-white/5 bg-white/2 space-y-1.5">
                              <div className="flex items-center gap-2">
                                <span className={`text-[8px] font-black uppercase tracking-widest font-space px-1.5 py-0.5 rounded ${insight.type === "trend" ? "bg-cyan-400/10 text-cyan-400" : insight.type === "anomaly" ? "bg-rose-400/10 text-rose-400" : insight.type === "comparison" ? "bg-violet-400/10 text-violet-400" : "bg-amber-400/10 text-amber-400"}`}>
                                  {insight.type}
                                </span>
                              </div>
                              <h5 className="text-xs font-bold text-white font-space">{insight.title}</h5>
                              <p className="text-[10px] text-gray-400 leading-relaxed">{insight.description}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ─── Explain Tab ─── */}
                  {bottomTab === "explain" && (
                    <div className="animate-in fade-in duration-300">
                      {explainLoading ? (
                        <div className="flex items-center justify-center gap-2 py-12 text-gray-500 text-xs font-space">
                          <RefreshCw className="w-4 h-4 animate-spin" /> Running EXPLAIN...
                        </div>
                      ) : !explainPlan ? (
                        <div className="text-center py-12">
                          <Settings2 className="w-8 h-8 text-gray-700 mx-auto mb-3" />
                          <p className="text-gray-500 text-xs font-space">Execute a query, then click &quot;Explain&quot; to view the execution plan.</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="text-[9px] font-black text-violet-400 uppercase tracking-widest font-space mb-2">
                            Execution Plan ({explainPlan.dialect})
                          </div>
                          <div className="bg-black/50 rounded-xl p-4 border border-white/5 font-mono text-[10px] text-gray-300 space-y-1 max-h-[300px] overflow-y-auto scrollbar-hide">
                            {Array.isArray(explainPlan.plan) && explainPlan.plan.map((line: any, idx: number) => (
                              <div key={idx} className="hover:bg-white/3 px-2 py-0.5 rounded">
                                {typeof line === "string" ? line : JSON.stringify(line)}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ═══ RIGHT PANEL — Data Catalog ═══ */}
          {showCatalog && (
            <div className="col-span-12 xl:col-span-3 space-y-4">
              <div className="glass p-5 rounded-[2rem] space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold font-space text-white uppercase tracking-wider flex items-center gap-2">
                    <Columns3 className="w-3.5 h-3.5 text-emerald-400" />
                    Data Catalog
                  </h3>
                  <button onClick={() => loadCatalog(activeConnectionId || "sqlite")} className="p-1 rounded hover:bg-white/10 cursor-pointer transition-colors" title="Refresh catalog">
                    <RefreshCw className={`w-3 h-3 text-gray-500 ${catalogLoading ? "animate-spin" : ""}`} />
                  </button>
                </div>

                {catalogLoading ? (
                  <div className="flex items-center justify-center py-8 text-gray-500 text-xs font-space">
                    <RefreshCw className="w-4 h-4 animate-spin mr-2" /> Loading schema...
                  </div>
                ) : catalog.length === 0 ? (
                  <p className="text-[10px] text-gray-600 text-center py-6 font-space">No tables detected.</p>
                ) : (
                  <div className="space-y-1 max-h-[calc(100vh-240px)] overflow-y-auto scrollbar-hide">
                    {catalog.map((table) => (
                      <div key={table.table}>
                        <button
                          onClick={() => toggleTableExpand(table.table)}
                          className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer text-left"
                        >
                          {expandedTables.has(table.table) ? <ChevronDown className="w-3 h-3 text-gray-500" /> : <ChevronRight className="w-3 h-3 text-gray-500" />}
                          <Table2 className="w-3 h-3 text-emerald-400" />
                          <span className="text-[11px] font-bold font-space text-white flex-1 truncate">{table.table}</span>
                          <span className="text-[9px] text-gray-600 font-mono">{table.columns.length}</span>
                        </button>
                        {expandedTables.has(table.table) && (
                          <div className="ml-5 pl-3 border-l border-white/5 space-y-0.5 mb-1 animate-in fade-in duration-200">
                            {table.columns.map((col) => (
                              <button
                                key={col.name}
                                onClick={() => insertIntoQuery(rawSqlMode ? `${table.table}.${col.name}` : col.name)}
                                className="w-full flex items-center gap-2 px-2 py-1 rounded hover:bg-white/5 transition-colors cursor-pointer text-left group"
                                title={`Click to insert · Type: ${col.type} · Sample: ${col.sample}`}
                              >
                                <span className="w-1 h-1 rounded-full bg-gray-600 group-hover:bg-cyan-400 transition-colors flex-shrink-0" />
                                <span className="text-[10px] text-gray-400 group-hover:text-white transition-colors flex-1 truncate font-mono">{col.name}</span>
                                <span className="text-[8px] text-gray-700 font-mono uppercase">{col.type.split("(")[0]}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
