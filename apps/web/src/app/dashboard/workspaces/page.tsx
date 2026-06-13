"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/sidebar";
import { LayoutDashboard, Users, UserPlus, Key, Shield, ShieldCheck, CreditCard, RefreshCw, Terminal, CheckCircle2 } from "lucide-react";

interface Workspace {
  id: string;
  name: string;
  owner_id: string;
}

interface WorkspaceMember {
  user_id: string;
  email: string;
  role: string;
}

interface AuditLog {
  id: string;
  action: string;
  timestamp: string;
  user: string;
}

interface APIKey {
  id: string;
  label: string;
  created_at: string;
  key_prefix: string;
}

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function WorkspacesPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<string>("");
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("viewer");
  
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [keyLabel, setKeyLabel] = useState("");
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  
  const [subscription, setSubscription] = useState<any>({
    tier: "Free",
    limits: { max_file_size_mb: 15, max_workspaces: 1, api_access: false, monitoring: false }
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  useEffect(() => {
    if (activeWorkspace) {
      fetchWorkspaceDetails(activeWorkspace);
    }
  }, [activeWorkspace]);

  const fetchWorkspaces = async () => {
    try {
      const response = await fetch(`${API}/api/v1/workspaces`);
      if (!response.ok) throw new Error("Failed to load workspaces");
      const data = await response.json();
      setWorkspaces(data);
      if (data.length > 0) {
        setActiveWorkspace(data[0].id);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const fetchWorkspaceDetails = async (wId: string) => {
    setLoading(true);
    try {
      // 1. Members
      const resMembers = await fetch(`${API}/api/v1/workspaces/${wId}/members`);
      if (resMembers.ok) {
        setMembers(await resMembers.json());
      }

      // 2. Audit Logs
      const resLogs = await fetch(`${API}/api/v1/workspaces/${wId}/audit-logs`);
      if (resLogs.ok) {
        const data = await resLogs.json();
        setAuditLogs(Array.isArray(data) ? data : (data.logs || []));
      }

      // 3. API Keys
      const resKeys = await fetch(`${API}/api/v1/enterprise/keys`);
      if (resKeys.ok) {
        setApiKeys(await resKeys.json());
      }

      // 4. Subscription Limit
      const resSub = await fetch(`${API}/api/v1/enterprise/billing/subscription`);
      if (resSub.ok) {
        setSubscription(await resSub.json());
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = prompt("Enter workspace name:");
    if (!name) return;

    try {
      const formData = new FormData();
      formData.append("name", name);
      const res = await fetch(`${API}/api/v1/workspaces`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const newW = await res.json();
        setWorkspaces((prev) => [...prev, newW]);
        setActiveWorkspace(newW.id);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;

    try {
      const formData = new FormData();
      formData.append("email", inviteEmail);
      formData.append("role", inviteRole);
      const res = await fetch(`${API}/api/v1/workspaces/${activeWorkspace}/invite`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        alert("Invitation sent successfully!");
        setInviteEmail("");
        fetchWorkspaceDetails(activeWorkspace);
      } else {
        const err = await res.json();
        alert("Invite error: " + err.detail);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleGenerateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyLabel) return;

    try {
      const formData = new FormData();
      formData.append("label", keyLabel);
      const res = await fetch(`${API}/api/v1/enterprise/keys`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setNewlyCreatedKey(data.raw_key);
        setKeyLabel("");
        fetchWorkspaceDetails(activeWorkspace);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    if (!confirm("Are you sure you want to revoke this API key?")) return;
    try {
      const res = await fetch(`${API}/api/v1/enterprise/keys/${keyId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setApiKeys((prev) => prev.filter((k) => k.id !== keyId));
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleUpgrade = async (tier: string) => {
    try {
      const formData = new FormData();
      formData.append("tier", tier);
      const res = await fetch(`${API}/api/v1/enterprise/billing/upgrade`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        alert(data.message);
        window.open(data.checkout_url, "_blank");
        // Reload details
        setTimeout(() => fetchWorkspaceDetails(activeWorkspace), 1000);
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#02040f]">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-2 font-space">Workspace Studio</h1>
            <p className="text-gray-500">Manage collaborative spaces, generate API integrations, and oversee audit streams.</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={activeWorkspace}
              onChange={(e) => setActiveWorkspace(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-xs text-white font-bold outline-none focus:border-cyan-400/35 cursor-pointer font-space uppercase tracking-wider"
            >
              {workspaces.map((w) => (
                <option key={w.id} value={w.id} className="bg-[#02040f] text-white">
                  {w.name}
                </option>
              ))}
            </select>
            <button
              onClick={handleCreateWorkspace}
              className="bg-cyan-400 hover:bg-cyan-300 text-black px-5 py-3 rounded-2xl text-xs font-bold font-space uppercase tracking-widest cursor-pointer shadow-[0_0_20px_rgba(34,211,238,0.2)] transition-all"
            >
              Create New
            </button>
          </div>
        </header>

        {loading ? (
          <div className="h-[50vh] flex flex-col items-center justify-center text-center">
            <RefreshCw className="w-10 h-10 text-cyan-400 animate-spin mb-4" />
            <h4 className="text-xl font-bold font-space text-white animate-pulse">Loading Workspace Environment...</h4>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* Left Col: Collaborators & API Keys */}
            <div className="xl:col-span-2 space-y-8">
              {/* Team Members */}
              <div className="glass p-8 rounded-[2.5rem] space-y-6">
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-cyan-400" />
                    <h3 className="text-lg font-bold font-space">Workspace Collaborators</h3>
                  </div>
                  <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest font-space">{members.length} Members</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* List */}
                  <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2">
                    {members.map((m) => (
                      <div key={m.user_id} className="flex items-center justify-between p-3.5 bg-white/4 border border-white/5 rounded-2xl">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-white font-mono">{m.email}</span>
                          <span className="text-[9px] text-gray-500 uppercase tracking-wider font-space mt-0.5">{m.user_id.slice(0, 8)}...</span>
                        </div>
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase font-space ${
                          m.role === "owner" ? "bg-amber-400/20 text-amber-400 border border-amber-400/30" :
                          m.role === "editor" ? "bg-cyan-400/20 text-cyan-400 border border-cyan-400/30" : "bg-white/10 text-gray-400"
                        }`}>
                          {m.role}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Invite Form */}
                  <form onSubmit={handleInviteMember} className="bg-white/3 border border-white/5 p-6 rounded-3xl space-y-4">
                    <h4 className="text-xs font-bold font-space uppercase tracking-wider text-gray-400">Invite Collaborator</h4>
                    <div className="space-y-3">
                      <input
                        type="email"
                        placeholder="collaborator@email.com"
                        required
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-cyan-400/35"
                      />
                      <div className="flex gap-2">
                        <select
                          value={inviteRole}
                          onChange={(e) => setInviteRole(e.target.value)}
                          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none"
                        >
                          <option value="viewer" className="bg-[#02040f]">Viewer</option>
                          <option value="editor" className="bg-[#02040f]">Editor</option>
                        </select>
                        <button type="submit" className="bg-white hover:bg-cyan-400 text-black px-4 py-2 rounded-xl text-xs font-bold font-space flex items-center gap-1.5 cursor-pointer transition-colors">
                          <UserPlus className="w-3.5 h-3.5" />
                          Send Invite
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              </div>

              {/* API Access Keys */}
              <div className="glass p-8 rounded-[2.5rem] space-y-6">
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <div className="flex items-center gap-3">
                    <Key className="w-5 h-5 text-violet-400" />
                    <h3 className="text-lg font-bold font-space">API Integrations</h3>
                  </div>
                  <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest font-space">Client-Level Access Keys</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Generated Keys */}
                  <div className="space-y-3">
                    {apiKeys.length === 0 ? (
                      <div className="h-[120px] bg-white/3 rounded-3xl border border-dashed border-white/5 flex flex-col items-center justify-center text-center p-4">
                        <Key className="w-8 h-8 text-gray-700 mb-1" />
                        <span className="text-[10px] text-gray-500 uppercase font-black font-space">No API Keys Generated</span>
                      </div>
                    ) : (
                      apiKeys.map((k) => (
                        <div key={k.id} className="flex items-center justify-between p-3.5 bg-white/4 border border-white/5 rounded-2xl">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-white font-space">{k.label}</span>
                            <span className="text-[10px] text-cyan-400/80 font-mono mt-1 font-bold">{k.key_prefix}</span>
                          </div>
                          <button
                            onClick={() => handleRevokeKey(k.id)}
                            className="text-[9px] font-black text-rose-400 hover:text-rose-300 font-space uppercase tracking-wider bg-rose-400/10 hover:bg-rose-400/20 px-3 py-1.5 rounded-lg border border-rose-400/20 cursor-pointer"
                          >
                            Revoke
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Create Key Form */}
                  <div className="space-y-4">
                    <form onSubmit={handleGenerateKey} className="bg-white/3 border border-white/5 p-6 rounded-3xl space-y-4">
                      <h4 className="text-xs font-bold font-space uppercase tracking-wider text-gray-400">Generate API Key</h4>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="e.g. Production API Client"
                          required
                          value={keyLabel}
                          onChange={(e) => setKeyLabel(e.target.value)}
                          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-cyan-400/35"
                        />
                        <button type="submit" className="bg-cyan-400 hover:bg-cyan-300 text-black px-4 py-2 rounded-xl text-xs font-bold font-space cursor-pointer shadow-md">
                          Generate
                        </button>
                      </div>
                    </form>

                    {newlyCreatedKey && (
                      <div className="bg-emerald-500/10 border border-emerald-500/20 p-4.5 rounded-3xl space-y-2 relative overflow-hidden animate-in fade-in duration-300">
                        <div className="flex items-center gap-2 text-emerald-400 text-[10px] font-black font-space uppercase">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Key Generated Successfully
                        </div>
                        <p className="text-[10px] text-gray-400 leading-relaxed">Copy this key now. For safety, it will not be displayed again.</p>
                        <div className="bg-black/60 border border-white/5 rounded-xl p-3 font-mono text-[10px] text-white select-all break-all tracking-wider font-bold">
                          {newlyCreatedKey}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Col: Billing Portal & Audit Log Timeline */}
            <div className="space-y-8">
              {/* SaaS Subscription Info */}
              <div className="glass p-8 rounded-[2.5rem] relative overflow-hidden border-cyan-400/10 bg-gradient-to-br from-cyan-400/5 to-violet-400/5">
                <div className="absolute top-0 right-0 p-8 opacity-5 text-black font-space font-black text-6xl pointer-events-none uppercase">{subscription.tier}</div>
                
                <div className="flex items-center gap-3 border-b border-white/5 pb-4 mb-5">
                  <CreditCard className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-lg font-bold font-space">SaaS Subscription</h3>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="text-[9px] font-black uppercase text-gray-500 tracking-wider font-space">Active Plan</div>
                    <div className="text-2xl font-black font-space text-white mt-1 flex items-center gap-2">
                      {subscription.tier} Tier
                      <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400 px-2 py-0.5 bg-emerald-400/10 rounded-full border border-emerald-400/20">ACTIVE</span>
                    </div>
                  </div>

                  <div className="space-y-2 pt-3 border-t border-white/5">
                    <div className="flex justify-between text-[11px] font-medium text-gray-400">
                      <span>Max File Size</span>
                      <span className="font-bold text-white">{subscription.limits.max_file_size_mb} MB</span>
                    </div>
                    <div className="flex justify-between text-[11px] font-medium text-gray-400">
                      <span>Workspaces Limit</span>
                      <span className="font-bold text-white">{subscription.limits.max_workspaces} Max</span>
                    </div>
                    <div className="flex justify-between text-[11px] font-medium text-gray-400">
                      <span>API integrations</span>
                      <span className={`font-bold ${subscription.limits.api_access ? "text-emerald-400" : "text-rose-400"}`}>
                        {subscription.limits.api_access ? "Enabled" : "Disabled"}
                      </span>
                    </div>
                  </div>

                  <div className="pt-4 grid grid-cols-3 gap-2">
                    {["Pro", "Team", "Enterprise"].map((plan) => (
                      <button
                        key={plan}
                        onClick={() => handleUpgrade(plan)}
                        className={`py-2 rounded-xl text-[9px] font-black font-space uppercase tracking-widest border transition-all cursor-pointer ${
                          subscription.tier === plan
                            ? "bg-cyan-400 border-cyan-400 text-black font-black"
                            : "bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/8"
                        }`}
                      >
                        {plan}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Audit Logs */}
              <div className="glass p-8 rounded-[2.5rem] space-y-6">
                <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                  <Shield className="w-5 h-5 text-amber-400" />
                  <h3 className="text-lg font-bold font-space">Workspace Audits</h3>
                </div>

                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                  {auditLogs.length === 0 ? (
                    <div className="text-center p-6 text-gray-500 text-xs">No audit events generated yet.</div>
                  ) : (
                    auditLogs.map((log) => (
                      <div key={log.id} className="relative pl-6 border-l border-white/5 space-y-1 group">
                        <div className="absolute -left-1 top-1 w-2 h-2 rounded-full bg-cyan-400 group-hover:scale-125 transition-transform" />
                        <div className="text-[10px] text-gray-400 font-semibold leading-relaxed">{log.action}</div>
                        <div className="flex items-center gap-2 text-[8px] font-black font-mono text-gray-600 uppercase tracking-wider">
                          <span>{log.user}</span>
                          <span>·</span>
                          <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
