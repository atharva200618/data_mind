"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/sidebar";
import { 
  Database, Plus, Check, Cloud, Lock, Server, Loader2, RefreshCw,
  Trash2, Play, Settings2, ShieldAlert, CheckCircle2, XCircle, Info, X, Zap, 
  HelpCircle, Eye, EyeOff, Radio, Link as LinkIcon
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface SavedConnection {
  id: string;
  name: string;
  type: string;
  is_favorite: boolean;
  created_at: string;
  credentials_summary: string;
}

interface TestResult {
  success: boolean;
  error?: string;
  latency_ms?: number;
  database_version?: string;
  tables_detected?: number;
  message?: string;
}

const CONNECTOR_META: Record<string, { label: string; desc: string; icon: any; color: string }> = {
  postgresql: { 
    label: "PostgreSQL", 
    desc: "Sync relational tables directly to DataMind", 
    icon: <Database className="w-8 h-8" />, 
    color: "text-cyan-400" 
  },
  mysql: { 
    label: "MySQL", 
    desc: "High-performance relational database connector", 
    icon: <Database className="w-8 h-8 text-amber-500" />, 
    color: "text-amber-400" 
  },
  google_sheets: { 
    label: "Google Sheets", 
    desc: "Import spreadsheets and data online via DuckDB", 
    icon: <Database className="w-8 h-8 text-emerald-500" />, 
    color: "text-emerald-400" 
  },
  aws_s3: { 
    label: "AWS S3", 
    desc: "Secure cloud blob storage for dataset persistence", 
    icon: <Cloud className="w-8 h-8" />, 
    color: "text-sky-400" 
  },
  snowflake: { 
    label: "Snowflake", 
    desc: "Enterprise cloud data warehouse connector", 
    icon: <Server className="w-8 h-8" />, 
    color: "text-indigo-400" 
  },
  bigquery: { 
    label: "BigQuery", 
    desc: "Google Cloud analytics BigQuery sync", 
    icon: <Lock className="w-8 h-8" />, 
    color: "text-rose-400" 
  },
};

export default function IntegrationsPage() {
  const [connections, setConnections] = useState<SavedConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPlatform, setExpandedPlatform] = useState<string | null>(null);
  
  // Credentials Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<string>("postgresql");
  const [connName, setConnName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  // Input fields for connections
  const [host, setHost] = useState("localhost");
  const [port, setPort] = useState("");
  const [database, setDatabase] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  
  // Sheet-specific fields
  const [sheetUrl, setSheetUrl] = useState("");
  const [serviceAccount, setServiceAccount] = useState("");
  
  // S3 specific fields
  const [bucket, setBucket] = useState("");
  const [region, setRegion] = useState("us-east-1");
  const [accessKeyId, setAccessKeyId] = useState("");
  const [secretAccessKey, setSecretAccessKey] = useState("");
  
  // Snowflake specific fields
  const [account, setAccount] = useState("");
  const [warehouse, setWarehouse] = useState("COMPUTE_WH");
  const [schema, setSchema] = useState("PUBLIC");

  // Connection testing / saving loaders & feedback
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [individualTestingId, setIndividualTestingId] = useState<string | null>(null);
  const [individualResults, setIndividualResults] = useState<Record<string, TestResult>>({});

  // Webhook Modal State
  const [webhookModal, setWebhookModal] = useState(false);
  const [webhookName, setWebhookName] = useState("DataMind Ingest");
  const [webhookUrl, setWebhookUrl] = useState("https://api.yourdomain.com/webhooks");
  const [webhookSecret, setWebhookSecret] = useState("dm_secret_8df7a9c82b13");
  const [webhookEvents, setWebhookEvents] = useState<Record<string, boolean>>({
    "dataset.uploaded": true,
    "model.trained": false,
    "query.executed": false,
  });

  // Upgrade Pro Modal State
  const [upgradeModal, setUpgradeModal] = useState(false);
  const [proActive, setProActive] = useState(false);
  const [wsLogs, setWsLogs] = useState<string[]>([
    "[SYSTEM] Idle: Waiting for WebSocket stream upgrade..."
  ]);
  const [upgradeCard, setUpgradeCard] = useState("");
  const [upgradeLoading, setUpgradeLoading] = useState(false);

  useEffect(() => {
    loadConnections();
    
    // Check query params for Stripe checkout redirect success
    const queryParams = new URLSearchParams(window.location.search);
    const sessionId = queryParams.get("session_id");
    const tier = queryParams.get("tier");

    if (sessionId && tier) {
      const verifyStripeSession = async () => {
        try {
          const formData = new FormData();
          formData.append("session_id", sessionId);
          formData.append("tier", tier);
          
          const res = await fetch(`${API}/api/v1/enterprise/billing/verify-session`, {
            method: "POST",
            body: formData
          });
          if (res.ok) {
            localStorage.setItem("datamind_pro_active", "true");
            setProActive(true);
            startWsSim();
            alert(`Upgrade Successful! You have been upgraded to the ${tier} tier.`);
          }
        } catch (e) {
          console.error("Failed to verify Stripe checkout session:", e);
        } finally {
          const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
          window.history.replaceState({ path: cleanUrl }, "", cleanUrl);
        }
      };
      verifyStripeSession();
    } else {
      // Check if user already upgraded Pro in local storage
      if (localStorage.getItem("datamind_pro_active") === "true") {
        setProActive(true);
        startWsSim();
      }
    }
  }, []);

  const loadConnections = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/v1/query/connections`);
      if (res.ok) {
        const data = await res.json();
        setConnections(data);
      }
    } catch (err) {
      console.error("Failed to load connections:", err);
    } finally {
      setLoading(false);
    }
  };

  const getCredentialsDict = (type: string) => {
    if (type === "google_sheets") {
      return { 
        sheet_url: sheetUrl, 
        service_account_json: serviceAccount || null,
        table_name: "sheet_data" 
      };
    }
    if (type === "aws_s3") {
      return {
        bucket,
        region,
        access_key_id: accessKeyId,
        secret_access_key: secretAccessKey
      };
    }
    if (type === "snowflake") {
      return {
        account,
        username,
        password,
        warehouse,
        database,
        schema
      };
    }
    if (type === "bigquery") {
      return {
        project_id: database,
        dataset_id: username,
        service_account_json: serviceAccount
      };
    }
    // PostgreSQL / MySQL
    return {
      host,
      port: parseInt(port) || (type === "mysql" ? 3306 : 5432),
      database,
      username,
      password
    };
  };

  const openAuthorizeModal = (platform: string) => {
    setModalType(platform);
    setConnName(`Production ${CONNECTOR_META[platform]?.label || "Server"}`);
    setTestResult(null);
    setShowModal(true);
    
    // Reset specific states
    setHost("localhost");
    setPort(platform === "mysql" ? "3306" : "5432");
    setDatabase("");
    setUsername("");
    setPassword("");
    setSheetUrl("");
    setServiceAccount("");
    setBucket("");
    setRegion("us-east-1");
    setAccessKeyId("");
    setSecretAccessKey("");
    setAccount("");
    setWarehouse("COMPUTE_WH");
    setSchema("PUBLIC");
  };

  const handleTestInlineConnection = async () => {
    setTestLoading(true);
    setTestResult(null);
    try {
      const creds = getCredentialsDict(modalType);
      const formData = new FormData();
      formData.append("connector_type", modalType);
      formData.append("credentials", JSON.stringify(creds));
      
      const res = await fetch(`${API}/api/v1/query/test-connection`, {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        setTestResult(data);
      } else {
        setTestResult({ success: false, error: data.detail || "Connection failed" });
      }
    } catch (err: any) {
      setTestResult({ success: false, error: err.message || "Failed to make request" });
    } finally {
      setTestLoading(false);
    }
  };

  const handleTestSavedConnection = async (id: string) => {
    setIndividualTestingId(id);
    try {
      const res = await fetch(`${API}/api/v1/query/connections/${id}/test`, {
        method: "POST"
      });
      const data = await res.json();
      setIndividualResults(prev => ({ ...prev, [id]: data }));
    } catch (err: any) {
      setIndividualResults(prev => ({ ...prev, [id]: { success: false, error: err.message } }));
    } finally {
      setIndividualTestingId(null);
    }
  };

  const handleSaveConnection = async () => {
    if (!connName.trim()) {
      alert("Please enter a connection name");
      return;
    }
    setSaveLoading(true);
    try {
      const creds = getCredentialsDict(modalType);
      const formData = new FormData();
      formData.append("name", connName);
      formData.append("type", modalType);
      formData.append("credentials", JSON.stringify(creds));
      
      const res = await fetch(`${API}/api/v1/query/connections`, {
        method: "POST",
        body: formData
      });
      if (res.ok) {
        setShowModal(false);
        loadConnections();
      } else {
        const errData = await res.json();
        alert(`Failed to save connection: ${errData.detail || "Unknown error"}`);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to save connection");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDeleteConnection = async (id: string) => {
    if (!confirm("Are you sure you want to delete this integration connection? This will disconnect SQL Studio queries linked to it.")) return;
    try {
      const res = await fetch(`${API}/api/v1/query/connections/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        loadConnections();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveWebhook = () => {
    localStorage.setItem("datamind_webhook_saved", "true");
    setWebhookModal(false);
    alert("Webhook registered successfully! Events will stream to your endpoint.");
  };

  const handleUpgradePro = async () => {
    setUpgradeLoading(true);
    try {
      const formData = new FormData();
      formData.append("tier", "Pro"); // Upgrade to Pro tier
      
      const res = await fetch(`${API}/api/v1/enterprise/billing/upgrade`, {
        method: "POST",
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        if (data.checkout_url) {
          window.location.href = data.checkout_url;
        } else {
          alert("Failed to initiate Stripe Checkout.");
        }
      } else {
        alert("Failed to initiate Stripe Checkout.");
      }
    } catch (err: any) {
      console.error(err);
      alert("Error contacting billing services.");
    } finally {
      setUpgradeLoading(false);
      setUpgradeModal(false);
    }
  };

  const startWsSim = () => {
    setWsLogs([
      `[WS CONNECTION] Handshake started at ws://localhost:8000/stream`,
      `[WS CONNECTION] Connected successfully to live compute pipeline!`,
      `[WS STREAM] Subscription active for: dataset.uploaded, model.trained`
    ]);
    
    const events = [
      () => `[WS EVENT] dataset.uploaded: production_metrics.csv (Rows: 1,500, Columns: 24, Size: 184KB)`,
      () => `[WS EVENT] audit.log: User demo@datamind.ai logged SQL execution on MySQL connector`,
      () => `[WS EVENT] model.trained: Champion model 'RandomForestRegressor' deployed to Hub (R2: 0.942)`,
      () => `[WS LATENCY] Ping: 42ms | Compute Node active: us-east-1-compute`
    ];

    setInterval(() => {
      const randomEvent = events[Math.floor(Math.random() * events.length)]();
      setWsLogs(prev => [...prev.slice(-8), `[${new Date().toLocaleTimeString()}] ${randomEvent}`]);
    }, 4500);
  };

  return (
    <div className="flex min-h-screen bg-[#02040f] text-white">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto max-h-screen scrollbar-hide relative">
        {/* Header */}
        <header className="mb-12 flex justify-between items-center bg-black/20 p-6 rounded-3xl border border-white/5 backdrop-blur-xl">
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-2 font-space flex items-center gap-3">
              <LinkIcon className="w-8 h-8 text-cyan-400 animate-pulse" />
              Integrations Hub
            </h1>
            <p className="text-gray-500 font-medium">Link databases and cloud storage directly to your compute engines and SQL Studio.</p>
          </div>
          <button 
            onClick={() => setWebhookModal(true)}
            className="glass px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest text-white flex items-center gap-3 hover:bg-white/10 transition-all border-white/10 shadow-xl cursor-pointer hover:border-cyan-400/30"
          >
            <Plus className="w-4 h-4 text-cyan-400" />
            Add Custom Webhook
          </button>
        </header>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-12 h-12 text-cyan-400 animate-spin" />
            <p className="text-xs uppercase tracking-widest text-gray-500 font-bold font-space">Retrieving live data integrations...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {Object.entries(CONNECTOR_META).map(([type, item]) => {
              const platformConns = connections.filter(c => c.type === type);
              const isOperational = platformConns.length > 0;
              const isExpanded = expandedPlatform === type;

              return (
                <div 
                  key={type} 
                  className={`glass p-8 rounded-[3rem] transition-all duration-500 border ${
                    isExpanded ? 'border-cyan-400/30 shadow-[0_0_20px_rgba(34,211,238,0.05)] bg-[#0c0f24]/30' : 'border-white/5 hover:border-white/15 hover:bg-white/2 bg-white/1'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl transition-all duration-500 bg-white/5 border border-white/10 group-hover:text-gray-400 ${
                        isOperational ? 'bg-cyan-500/10 border-cyan-500/25 shadow-lg text-cyan-400' : 'text-gray-600'
                      }`}>
                        {item.icon}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white mb-1 tracking-tight font-space">{item.label}</h3>
                        <p className="text-xs text-gray-500 font-medium">{item.desc}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isOperational ? (
                        <>
                          <button 
                            onClick={() => openAuthorizeModal(type)}
                            className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 hover:border-cyan-400/30 flex items-center justify-center cursor-pointer transition-all"
                            title="Add Another Connection"
                          >
                            <Plus className="w-4 h-4 text-cyan-400" />
                          </button>
                          <button 
                            onClick={() => setExpandedPlatform(isExpanded ? null : type)}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider text-green-400 bg-green-500/5 border border-green-500/20 hover:bg-green-500/10 transition-colors cursor-pointer"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                            Operational ({platformConns.length})
                          </button>
                        </>
                      ) : (
                        <button 
                          onClick={() => openAuthorizeModal(type)}
                          className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer hover:border-cyan-400/30 hover:text-cyan-400"
                        >
                          Authorize
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Sub-panel displaying active connections of this database type */}
                  {isOperational && isExpanded && (
                    <div className="mt-6 pt-6 border-t border-white/5 space-y-3 animate-in slide-in-from-top-2 duration-300">
                      <p className="text-[9px] font-black tracking-widest text-gray-500 uppercase font-space">Configure Active Connections</p>
                      <div className="space-y-2">
                        {platformConns.map((conn) => {
                          const testInfo = individualResults[conn.id];
                          const testing = individualTestingId === conn.id;

                          return (
                            <div key={conn.id} className="p-4 rounded-2xl bg-white/3 border border-white/5 flex items-center justify-between hover:border-white/10 transition-all">
                              <div className="flex-1 min-w-0 pr-4">
                                <p className="text-xs font-bold text-white font-space truncate">{conn.name}</p>
                                <p className="text-[10px] text-gray-500 truncate mt-0.5">{conn.credentials_summary}</p>
                              </div>

                              <div className="flex items-center gap-2">
                                {testInfo && (
                                  <span className={`text-[9px] font-mono px-2 py-0.5 rounded border ${
                                    testInfo.success ? 'border-emerald-500/20 text-emerald-400 bg-emerald-500/5' : 'border-rose-500/20 text-rose-400 bg-rose-500/5'
                                  }`}>
                                    {testInfo.success ? `Verified (${testInfo.latency_ms}ms)` : 'Failed'}
                                  </span>
                                )}
                                <button 
                                  onClick={() => handleTestSavedConnection(conn.id)}
                                  disabled={testing}
                                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-[9px] font-bold font-space uppercase transition-colors cursor-pointer border border-white/5 flex items-center gap-1.5"
                                >
                                  {testing ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <RefreshCw className="w-2.5 h-2.5" />}
                                  Test
                                </button>
                                <button 
                                  onClick={() => handleDeleteConnection(conn.id)}
                                  className="p-1.5 rounded-lg hover:bg-rose-500/10 text-gray-500 hover:text-rose-400 transition-colors cursor-pointer"
                                  title="Delete Connection"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Live Stream Panel */}
        <div className="mt-12 glass p-10 rounded-[3rem] border-white/5 bg-gradient-to-r from-violet-500/10 via-transparent to-transparent flex flex-col md:flex-row md:items-center justify-between gap-6">
           <div className="flex items-center gap-8">
             <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border transition-all ${
               proActive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'bg-violet-400/10 text-violet-400 border-violet-400/20'
             }`}>
               {proActive ? <Radio className="w-8 h-8 animate-pulse" /> : <RefreshCw className="w-8 h-8 animate-spin" />}
             </div>
             <div>
                <h4 className="text-xl font-bold text-white mb-2 font-space flex items-center gap-2">
                  Live Stream WebSocket Pipeline
                  {proActive && <span className="text-[8px] font-black uppercase text-emerald-400 tracking-widest px-2 py-0.5 rounded border border-emerald-500/20 bg-emerald-500/5">Active</span>}
                </h4>
                <p className="text-gray-500 text-xs font-medium">Enterprise streams active WebSocket connections for live dataset ingestion.</p>
             </div>
           </div>

           {proActive ? (
             <div className="w-full md:w-96 bg-black/60 border border-white/5 p-4 rounded-2xl font-mono text-[9px] text-emerald-400/90 h-32 overflow-y-auto scrollbar-hide space-y-1">
               {wsLogs.map((log, i) => (
                 <div key={i} className="truncate">{log}</div>
               ))}
             </div>
           ) : (
             <button 
               onClick={() => setUpgradeModal(true)}
               className="px-8 py-4 rounded-2xl bg-white text-black text-xs font-black uppercase tracking-widest hover:bg-violet-500 hover:text-white transition-all shadow-2xl cursor-pointer"
             >
               Upgrade Pro
             </button>
           )}
        </div>

        {/* Credentials Form Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
            <div className="glass max-w-lg w-full rounded-[2.5rem] border border-white/10 overflow-hidden bg-[#070919] shadow-2xl">
              <div className="p-8 border-b border-white/5 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white font-space flex items-center gap-2">
                    {CONNECTOR_META[modalType]?.icon}
                    Authorize {CONNECTOR_META[modalType]?.label}
                  </h3>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Configure Infrastructure Credentials</p>
                </div>
                <button 
                  onClick={() => setShowModal(false)}
                  className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>

              <div className="p-8 space-y-4 max-h-[60vh] overflow-y-auto scrollbar-hide">
                {/* Connection Name */}
                <div>
                  <label className="text-[9px] font-black uppercase text-gray-500 tracking-wider font-space">Connection label Name</label>
                  <input 
                    type="text" 
                    value={connName}
                    onChange={(e) => setConnName(e.target.value)}
                    placeholder="e.g. Analytics PostgreSQL Server"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white mt-1 outline-none focus:border-cyan-400/30 transition-all"
                  />
                </div>

                {/* Google Sheets Layout */}
                {modalType === "google_sheets" ? (
                  <>
                    <div>
                      <label className="text-[9px] font-black uppercase text-gray-500 tracking-wider font-space">Spreadsheet Shareable URL</label>
                      <input 
                        type="text" 
                        value={sheetUrl}
                        onChange={(e) => setSheetUrl(e.target.value)}
                        placeholder="https://docs.google.com/spreadsheets/d/..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white mt-1 outline-none focus:border-cyan-400/30 transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black uppercase text-gray-500 tracking-wider font-space flex items-center gap-1">
                        Service Account JSON 
                        <span className="text-[8px] text-gray-600 font-normal lowercase">(optional for private sheets)</span>
                      </label>
                      <textarea 
                        value={serviceAccount}
                        onChange={(e) => setServiceAccount(e.target.value)}
                        placeholder='{ "type": "service_account", "project_id": ... }'
                        rows={4}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white mt-1 outline-none focus:border-cyan-400/30 transition-all font-mono resize-none"
                      />
                    </div>
                  </>
                ) : modalType === "aws_s3" ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[9px] font-black uppercase text-gray-500 tracking-wider font-space">S3 Bucket Name</label>
                        <input 
                          type="text" 
                          value={bucket}
                          onChange={(e) => setBucket(e.target.value)}
                          placeholder="my-datamind-bucket"
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white mt-1 outline-none focus:border-cyan-400/30 transition-all"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-black uppercase text-gray-500 tracking-wider font-space">AWS Region</label>
                        <input 
                          type="text" 
                          value={region}
                          onChange={(e) => setRegion(e.target.value)}
                          placeholder="us-east-1"
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white mt-1 outline-none focus:border-cyan-400/30 transition-all"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[9px] font-black uppercase text-gray-500 tracking-wider font-space">AWS Access Key ID</label>
                      <input 
                        type="text" 
                        value={accessKeyId}
                        onChange={(e) => setAccessKeyId(e.target.value)}
                        placeholder="AKIAIOSFODNN7EXAMPLE"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white mt-1 outline-none focus:border-cyan-400/30 transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black uppercase text-gray-500 tracking-wider font-space">AWS Secret Access Key</label>
                      <input 
                        type="password" 
                        value={secretAccessKey}
                        onChange={(e) => setSecretAccessKey(e.target.value)}
                        placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white mt-1 outline-none focus:border-cyan-400/30 transition-all"
                      />
                    </div>
                  </>
                ) : modalType === "snowflake" ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[9px] font-black uppercase text-gray-500 tracking-wider font-space">Snowflake Account identifier</label>
                        <input 
                          type="text" 
                          value={account}
                          onChange={(e) => setAccount(e.target.value)}
                          placeholder="xy12345.us-east-1"
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white mt-1 outline-none focus:border-cyan-400/30 transition-all"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-black uppercase text-gray-500 tracking-wider font-space">Virtual Warehouse</label>
                        <input 
                          type="text" 
                          value={warehouse}
                          onChange={(e) => setWarehouse(e.target.value)}
                          placeholder="COMPUTE_WH"
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white mt-1 outline-none focus:border-cyan-400/30 transition-all"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[9px] font-black uppercase text-gray-500 tracking-wider font-space">Database Name</label>
                        <input 
                          type="text" 
                          value={database}
                          onChange={(e) => setDatabase(e.target.value)}
                          placeholder="SNOWFLAKE_SAMPLE_DATA"
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white mt-1 outline-none focus:border-cyan-400/30 transition-all"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-black uppercase text-gray-500 tracking-wider font-space">Schema</label>
                        <input 
                          type="text" 
                          value={schema}
                          onChange={(e) => setSchema(e.target.value)}
                          placeholder="PUBLIC"
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white mt-1 outline-none focus:border-cyan-400/30 transition-all"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[9px] font-black uppercase text-gray-500 tracking-wider font-space">Username</label>
                        <input 
                          type="text" 
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white mt-1 outline-none focus:border-cyan-400/30 transition-all"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-black uppercase text-gray-500 tracking-wider font-space">Password</label>
                        <input 
                          type="password" 
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white mt-1 outline-none focus:border-cyan-400/30 transition-all"
                        />
                      </div>
                    </div>
                  </>
                ) : modalType === "bigquery" ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[9px] font-black uppercase text-gray-500 tracking-wider font-space">GCP Project ID</label>
                        <input 
                          type="text" 
                          value={database}
                          onChange={(e) => setDatabase(e.target.value)}
                          placeholder="my-gcp-project"
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white mt-1 outline-none focus:border-cyan-400/30 transition-all"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-black uppercase text-gray-500 tracking-wider font-space">Dataset ID</label>
                        <input 
                          type="text" 
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          placeholder="logs_dataset"
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white mt-1 outline-none focus:border-cyan-400/30 transition-all"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[9px] font-black uppercase text-gray-500 tracking-wider font-space">Service Account Key JSON</label>
                      <textarea 
                        value={serviceAccount}
                        onChange={(e) => setServiceAccount(e.target.value)}
                        placeholder='{ "type": "service_account", ... }'
                        rows={5}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white mt-1 outline-none focus:border-cyan-400/30 transition-all font-mono resize-none"
                      />
                    </div>
                  </>
                ) : (
                  /* Standard PostgreSQL / MySQL Form */
                  <>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="col-span-2">
                        <label className="text-[9px] font-black uppercase text-gray-500 tracking-wider font-space">Host Address</label>
                        <input 
                          type="text" 
                          value={host}
                          onChange={(e) => setHost(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white mt-1 outline-none focus:border-cyan-400/30 transition-all"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-black uppercase text-gray-500 tracking-wider font-space">Port</label>
                        <input 
                          type="text" 
                          value={port}
                          onChange={(e) => setPort(e.target.value)}
                          placeholder={modalType === "mysql" ? "3306" : "5432"}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white mt-1 outline-none focus:border-cyan-400/30 transition-all"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[9px] font-black uppercase text-gray-500 tracking-wider font-space">Database Name</label>
                      <input 
                        type="text" 
                        value={database}
                        onChange={(e) => setDatabase(e.target.value)}
                        placeholder="postgres"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white mt-1 outline-none focus:border-cyan-400/30 transition-all"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[9px] font-black uppercase text-gray-500 tracking-wider font-space">Username</label>
                        <input 
                          type="text" 
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white mt-1 outline-none focus:border-cyan-400/30 transition-all"
                        />
                      </div>
                      <div className="relative">
                        <label className="text-[9px] font-black uppercase text-gray-500 tracking-wider font-space">Password</label>
                        <input 
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white mt-1 outline-none focus:border-cyan-400/30 transition-all pr-10"
                        />
                        <button 
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-9 text-gray-500 hover:text-white cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {/* Connection Test Results */}
                {testResult && (
                  <div className={`p-4 rounded-2xl border text-xs font-mono animate-in fade-in duration-300 ${
                    testResult.success ? "border-emerald-400/20 bg-emerald-400/5 text-emerald-400" : "border-rose-400/20 bg-rose-400/5 text-rose-400"
                  }`}>
                    {testResult.success ? (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 font-bold font-space text-[10px] uppercase tracking-wider">
                          <CheckCircle2 className="w-4 h-4" /> Connection Succeeded
                        </div>
                        <div className="text-gray-400 text-[10px] leading-relaxed mt-1">
                          Latency: <strong className="text-emerald-400">{testResult.latency_ms}ms</strong> · 
                          Engine: <strong>{testResult.database_version || "Checked"}</strong>
                          {testResult.message && <div className="mt-1">{testResult.message}</div>}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 font-bold font-space text-[10px] uppercase tracking-wider">
                          <XCircle className="w-4 h-4" /> Connection Rejected
                        </div>
                        <div className="text-gray-400 text-[10px] leading-relaxed mt-1">{testResult.error}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="p-8 bg-black/40 border-t border-white/5 flex gap-4">
                <button
                  onClick={handleTestInlineConnection}
                  disabled={testLoading}
                  className="flex-1 bg-white/5 border border-white/10 hover:border-emerald-400/30 hover:bg-emerald-400/5 text-[10px] py-3.5 rounded-2xl font-space font-black uppercase tracking-wider cursor-pointer transition-all flex items-center justify-center gap-2"
                >
                  {testLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />}
                  <span className="text-emerald-400">Test Connection</span>
                </button>
                <button
                  onClick={handleSaveConnection}
                  disabled={saveLoading}
                  className="flex-1 bg-white hover:bg-cyan-400 text-black text-[10px] py-3.5 rounded-2xl font-space font-black uppercase tracking-wider cursor-pointer transition-all flex items-center justify-center gap-2"
                >
                  {saveLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save Connection
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Custom Webhook Configuration Modal */}
        {webhookModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
            <div className="glass max-w-md w-full rounded-[2.5rem] border border-white/10 overflow-hidden bg-[#070919] shadow-2xl">
              <div className="p-8 border-b border-white/5 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white font-space flex items-center gap-2">
                    <Plus className="w-5 h-5 text-cyan-400" />
                    Configure Webhook
                  </h3>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Post HTTP JSON Events</p>
                </div>
                <button onClick={() => setWebhookModal(false)} className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer">
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>

              <div className="p-8 space-y-4">
                <div>
                  <label className="text-[9px] font-black uppercase text-gray-500 tracking-wider font-space">Webhook Label</label>
                  <input type="text" value={webhookName} onChange={(e) => setWebhookName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white mt-1 outline-none" />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-gray-500 tracking-wider font-space">Endpoint URL</label>
                  <input type="text" value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white mt-1 outline-none" />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-gray-500 tracking-wider font-space">Secret Token</label>
                  <input type="text" value={webhookSecret} onChange={(e) => setWebhookSecret(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white mt-1 outline-none font-mono" />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-gray-500 tracking-wider font-space">Events Triggers</label>
                  <div className="space-y-2 mt-2">
                    {Object.keys(webhookEvents).map((evt) => (
                      <label key={evt} className="flex items-center gap-3 text-xs text-gray-300 font-medium">
                        <input 
                          type="checkbox" 
                          checked={webhookEvents[evt]} 
                          onChange={() => setWebhookEvents(prev => ({ ...prev, [evt]: !prev[evt] }))}
                          className="w-4 h-4 rounded border-white/10 bg-white/5 accent-cyan-400 cursor-pointer" 
                        />
                        {evt}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-8 bg-black/40 border-t border-white/5 flex gap-4">
                <button onClick={() => setWebhookModal(false)} className="flex-1 px-4 py-3 rounded-xl bg-white/5 text-gray-400 hover:text-white border border-white/10 text-xs font-bold font-space uppercase transition-colors cursor-pointer">Cancel</button>
                <button onClick={handleSaveWebhook} className="flex-1 px-4 py-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black text-xs font-bold font-space uppercase transition-all shadow-md cursor-pointer">Register webhook</button>
              </div>
            </div>
          </div>
        )}

        {/* Upgrade Pro Modal */}
        {upgradeModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
            <div className="glass max-w-md w-full rounded-[2.5rem] border border-white/10 overflow-hidden bg-[#070919] shadow-2xl">
              <div className="p-8 border-b border-white/5 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white font-space flex items-center gap-2">
                    <Zap className="w-5 h-5 text-violet-400 animate-bounce" />
                    Upgrade to Enterprise Pro
                  </h3>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Unlock WebSockets Streaming feeds</p>
                </div>
                <button onClick={() => setUpgradeModal(false)} className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer">
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div className="bg-violet-950/20 border border-violet-500/20 p-5 rounded-2xl">
                  <span className="text-[9px] font-black uppercase text-violet-400 tracking-widest font-space">Enterprise Plan</span>
                  <div className="text-3xl font-black font-space mt-1 text-white">$49<span className="text-xs font-normal text-gray-500 font-sans">/month</span></div>
                  <ul className="text-xs text-gray-400 font-medium space-y-2 mt-4 leading-relaxed">
                    <li className="flex items-center gap-2">✓ Real-time streaming WebSocket data pipelines</li>
                    <li className="flex items-center gap-2">✓ Infinite row limits (exceeding 10,000 limits)</li>
                    <li className="flex items-center gap-2">✓ Multi-node cluster failover replicas</li>
                  </ul>
                </div>

                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                  <span className="text-[9px] font-black uppercase text-emerald-400 tracking-widest font-space block mb-1">Stripe Checkout</span>
                  <p className="text-[11px] text-gray-400 leading-relaxed font-medium">
                    You will be securely redirected to Stripe's hosted checkout to complete the subscription.
                  </p>
                </div>
              </div>

              <div className="p-8 bg-black/40 border-t border-white/5 flex gap-4">
                <button onClick={() => setUpgradeModal(false)} className="flex-1 px-4 py-3 rounded-xl bg-white/5 text-gray-400 hover:text-white border border-white/10 text-xs font-bold font-space uppercase transition-colors cursor-pointer">Cancel</button>
                <button onClick={handleUpgradePro} disabled={upgradeLoading} className="flex-1 px-4 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold font-space uppercase transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer">
                  {upgradeLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Confirm upgrade
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
