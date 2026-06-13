"use client";
import { Sidebar } from "@/components/sidebar";
import { MessageSquare, Send, Bot, User, Sparkles, Database, Code, Globe, HelpCircle, Loader2, Play, Activity } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useData } from "@/store/data-context";
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, Tooltip, CartesianGrid, AreaChart, Area } from "recharts";

interface Message {
  role: "assistant" | "user";
  text: string;
}

function parseAssistantMessage(text: string) {
  let cleanText = text;
  
  // 1. Extract chart spec
  let chartSpec: any = null;
  const chartSpecRegex = /\[CHART_SPEC:\s*(\{[\s\S]*?\})\s*\]/;
  const chartMatch = cleanText.match(chartSpecRegex);
  if (chartMatch) {
    try {
      chartSpec = JSON.parse(chartMatch[1]);
      cleanText = cleanText.replace(chartSpecRegex, "");
    } catch (e) {
      console.error("Failed to parse chart spec:", e);
    }
  }

  // 2. Extract suggested questions
  const suggestedQuestions: string[] = [];
  const lines = cleanText.split("\n");
  const filteredLines = lines.filter(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith("►")) {
      suggestedQuestions.push(trimmed.replace("►", "").trim());
      return false; // remove from text
    }
    if (trimmed.toLowerCase().includes("suggested questions:")) {
      return false; // remove the header line
    }
    return true;
  });
  cleanText = filteredLines.join("\n");

  // 3. Extract quick actions (e.g. [ Fix Data Types ] [ Analyze Vicprice ])
  const quickActions: string[] = [];
  const actionLines = cleanText.split("\n");
  const finalLines = actionLines.filter(line => {
    if (line.toLowerCase().includes("quick actions:")) {
      return false;
    }
    // Check if line contains standalone bracketed actions
    const matches = [...line.matchAll(/\[\s*([^\]]+?)\s*\]/g)];
    if (matches.length > 0 && matches.every(m => m[1].length < 30 && !m[1].includes("http"))) {
      matches.forEach(m => quickActions.push(m[1].trim()));
      return false; // remove line from text
    }
    return true;
  });
  cleanText = finalLines.join("\n").trim();

  // 4. Extract health score
  let healthScore: number | null = null;
  const scoreMatch = cleanText.match(/Dataset Health Score:\s*(\d+)\/100/i);
  if (scoreMatch) {
    healthScore = parseInt(scoreMatch[1]);
  }

  return {
    cleanText,
    healthScore,
    quickActions,
    suggestedQuestions,
    chartSpec
  };
}

function ChatChartRenderer({ spec, data }: { spec: any; data: any[] }) {
  if (!spec || !data || data.length === 0) return null;
  const { type, x, y, title } = spec;

  return (
    <div className="mt-4 p-5 bg-black/40 border border-white/5 rounded-3xl space-y-3">
      {title && <div className="text-xs font-bold text-white font-space uppercase tracking-wider">{title}</div>}
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {type === "scatter" ? (
            <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
              <XAxis type="number" dataKey={x} name={x} stroke="#555" fontSize={9} tickLine={false} axisLine={false} />
              <YAxis type="number" dataKey={y} name={y} stroke="#555" fontSize={9} tickLine={false} axisLine={false} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: '#000', borderRadius: '12px', border: '1px solid #ffffff10', fontSize: '10px' }} />
              <Scatter name="Data" data={data} fill="#22d3ee" />
            </ScatterChart>
          ) : (
            <AreaChart data={data} margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
              <XAxis dataKey={x} stroke="#555" fontSize={9} tickLine={false} axisLine={false} />
              <YAxis stroke="#555" fontSize={9} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ backgroundColor: '#000', borderRadius: '12px', border: '1px solid #ffffff10', fontSize: '10px' }} />
              <Area type="monotone" dataKey={y} stroke="#8b7cf6" fill="#8b7cf6" fillOpacity={0.2} strokeWidth={2} />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>
      <div className="text-[9px] text-gray-500 font-mono">Auto generated from dataset sample (WebGL rendering)</div>
    </div>
  );
}

export default function AIAnalystPage() {
  const { dataset, file } = useData();
  const [activeTab, setActiveTab] = useState<"chat" | "consultant">("chat");
  const [messages, setMessages] = useState<Message[]>([
    { 
      role: 'assistant', 
      text: "Hello! I'm your DataMind AI intelligence assistant. Ask me to discover correlations, model target distributions, or explain numeric profiles." 
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [reasoningMode, setReasoningMode] = useState<"Quick Analysis" | "Deep Analysis" | "Executive Summary" | "Data Scientist Mode">("Quick Analysis");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [consultantData, setConsultantData] = useState<any | null>(null);
  const [loadingConsultant, setLoadingConsultant] = useState(false);

  const runConsultant = async () => {
    if (!file) return;
    setLoadingConsultant(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", process.env.NEXT_PUBLIC_GEMINI_API_KEY || "");
      const res = await fetch("http://localhost:8000/api/v1/ai/consultant", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setConsultantData(data);
      } else {
        alert("Consultant strategy engine error");
      }
    } catch (e) {
      console.error(e);
      alert("Failed to connect to Consultant strategy engine");
    } finally {
      setLoadingConsultant(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const runLLMPipeline = async (promptText: string, modeOverride?: string) => {
    if (!promptText.trim()) return;
    if (!file && !dataset?.id) {
      setMessages((prev) => [...prev, { role: 'assistant', text: "Please upload a dataset in the Data Studio first." }]);
      return;
    }

    setInput('');
    setLoading(true);

    const userMessage: Message = { role: 'user', text: promptText };
    setMessages((prev) => [...prev, userMessage]);

    const formData = new FormData();
    formData.append("question", promptText);
    if (file) {
      formData.append("file", file);
    }
    if (dataset?.id) {
      formData.append("dataset_id", dataset.id);
    }
    if (dataset?.version_id) {
      formData.append("dataset_version_id", dataset.version_id);
    }
    formData.append("mode", modeOverride || reasoningMode);
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
    formData.append("api_key", apiKey);

    try {
      const response = await fetch("http://localhost:8000/api/v1/ai/chat", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || "AI Engine failed");
      }
      
      const data = await response.json();
      const outputText = data?.response || "No insights found.";
      
      setMessages((prev) => [...prev, { role: 'assistant', text: outputText }]);
    } catch (err: any) {
      console.error(err);
      setMessages((prev) => [...prev, { role: 'assistant', text: `Error: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleModeChange = async (modeOption: "Quick Analysis" | "Deep Analysis" | "Executive Summary" | "Data Scientist Mode") => {
    if (loading) return;
    setReasoningMode(modeOption);
    
    if (!file && !dataset?.id) {
      setMessages((prev) => [...prev, { role: 'assistant', text: "Please upload a dataset in the Data Studio first." }]);
      return;
    }

    let prompt = "";
    switch (modeOption) {
      case "Quick Analysis":
        prompt = "Provide a Quick Analysis of this dataset.";
        break;
      case "Deep Analysis":
        prompt = "Provide a Deep Analysis of this dataset, explaining variance, distributions, and any key patterns.";
        break;
      case "Executive Summary":
        prompt = "Provide an Executive Summary of this dataset highlighting key strategic takeaways and business impact.";
        break;
      case "Data Scientist Mode":
        prompt = "Provide a Data Scientist Mode analysis, focusing on target variable viability, feature engineering potential, scaling, and distribution analysis.";
        break;
    }
    
    await runLLMPipeline(prompt, modeOption);
  };

  const outlierCount = dataset?.advanced_stats 
    ? Object.values(dataset.advanced_stats).reduce((acc: number, col: any) => acc + (col.outlier_count || 0), 0)
    : 0;

  return (
    <div className="flex min-h-screen bg-[#02040f]">
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen relative">
        <header className="p-8 border-b border-white/5 flex justify-between items-center bg-black/20 backdrop-blur-xl z-10">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3 text-white font-space">
              <Sparkles className="w-6 h-6 text-cyan-400 animate-pulse" />
              AI Analyst
            </h1>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1 font-space">LLM-Powered Data Reasoning</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex -space-x-2">
              <div className="w-8 h-8 rounded-full border-2 border-[#02040f] bg-cyan-500 flex items-center justify-center text-[9px] font-black font-space text-black shadow-lg">GEM</div>
              <div className="w-8 h-8 rounded-full border-2 border-[#02040f] bg-violet-500 flex items-center justify-center text-[9px] font-black font-space text-black shadow-lg">DM</div>
            </div>
            <span className="text-[9px] font-black text-cyan-400 uppercase tracking-widest font-space">Flash 2.5 Engine Active</span>
          </div>
        </header>

        {/* Tab Selector */}
        <div className="flex border-b border-white/5 bg-black/10 px-8 py-3 gap-6">
          <button
            onClick={() => setActiveTab("chat")}
            className={`pb-2 text-xs font-black uppercase tracking-widest font-space border-b-2 transition-all cursor-pointer ${
              activeTab === "chat" ? "border-cyan-400 text-cyan-400" : "border-transparent text-gray-500 hover:text-gray-300"
            }`}
          >
            Conversational Analyst
          </button>
          <button
            onClick={() => {
              setActiveTab("consultant");
              if (!consultantData && file) {
                runConsultant();
              }
            }}
            className={`pb-2 text-xs font-black uppercase tracking-widest font-space border-b-2 transition-all cursor-pointer ${
              activeTab === "consultant" ? "border-cyan-400 text-cyan-400" : "border-transparent text-gray-500 hover:text-gray-300"
            }`}
          >
            Business Strategy Consultant
          </button>
        </div>

        {activeTab === "chat" ? (
          <>
            <div className="flex-1 overflow-y-auto p-8 space-y-6 scrollbar-hide">
              {/* Top Health Dashboard */}
              {dataset && (
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8 p-6 glass rounded-3xl border-white/5 bg-gradient-to-r from-cyan-950/10 via-black/40 to-violet-950/10 animate-in fade-in duration-500">
                  <button
                    onClick={() => runLLMPipeline("Analyze the quality of this dataset and provide a breakdown of the quality score.")}
                    disabled={loading}
                    className="flex flex-col items-center justify-center p-3 text-center border-r border-white/5 hover:bg-white/5 transition-all rounded-2xl cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest font-space mb-1">Quality Score</span>
                    <div className="text-xl font-black font-space text-emerald-400">{dataset?.quality_score ?? 84}/100</div>
                  </button>
                  <button
                    onClick={() => runLLMPipeline("Find all missing values in the columns and suggest imputation methods.")}
                    disabled={loading}
                    className="flex flex-col items-center justify-center p-3 text-center border-r border-white/5 hover:bg-white/5 transition-all rounded-2xl cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest font-space mb-1">Missing Values</span>
                    <div className="text-xl font-black font-mono text-white">{dataset?.profile?.missing_cells ?? 0}</div>
                  </button>
                  <button
                    onClick={() => runLLMPipeline("Analyze duplicate rows in this dataset and show summary statistics.")}
                    disabled={loading}
                    className="flex flex-col items-center justify-center p-3 text-center border-r border-white/5 hover:bg-white/5 transition-all rounded-2xl cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest font-space mb-1">Duplicates</span>
                    <div className="text-xl font-black font-mono text-white">{dataset?.profile?.duplicate_rows ?? 0}</div>
                  </button>
                  <button
                    onClick={() => runLLMPipeline("Identify outliers in this dataset and show outlier statistics.")}
                    disabled={loading}
                    className="flex flex-col items-center justify-center p-3 text-center border-r border-white/5 hover:bg-white/5 transition-all rounded-2xl cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest font-space mb-1">Outliers</span>
                    <div className="text-xl font-black font-mono text-amber-400">{outlierCount}</div>
                  </button>
                  <button
                    onClick={() => runLLMPipeline("List all columns/features in this dataset, showing their data types and summaries.")}
                    disabled={loading}
                    className="flex flex-col items-center justify-center p-3 text-center border-r border-white/5 hover:bg-white/5 transition-all rounded-2xl cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest font-space mb-1">Features</span>
                    <div className="text-xl font-black font-mono text-white">{dataset?.profile?.total_cols ?? 0}</div>
                  </button>
                  <button
                    onClick={() => runLLMPipeline("Analyze the row counts and distribution of data across rows.")}
                    disabled={loading}
                    className="flex flex-col items-center justify-center p-3 text-center hover:bg-white/5 transition-all rounded-2xl cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest font-space mb-1">Rows</span>
                    <div className="text-xl font-black font-mono text-white">{(dataset?.profile?.total_rows ?? 0).toLocaleString()}</div>
                  </button>
                </div>
              )}

              {/* Messages */}
              {messages.map((msg, i) => {
                const parsed = msg.role === 'assistant' ? parseAssistantMessage(msg.text) : null;
                const cleanText = parsed ? parsed.cleanText : msg.text;

                return (
                  <div key={i} className={`flex items-start gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                      msg.role === 'assistant' ? 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shadow-md' : 'bg-white/5 border border-white/10 text-white'
                    }`}>
                      {msg.role === 'assistant' ? <Bot className="w-5 h-5" /> : <User className="w-5 h-5" />}
                    </div>
                    <div className={`max-w-[70%] p-6 rounded-3xl text-xs leading-relaxed font-medium ${
                      msg.role === 'assistant' ? 'glass text-gray-200' : 'bg-white/5 text-white border border-white/5'
                    }`}>
                      <div className="whitespace-pre-line leading-relaxed space-y-4">
                        {/* Clean Text Content */}
                        <div>{cleanText}</div>

                        {/* Auto Generated Chart inside Chat Bubble */}
                        {parsed?.chartSpec && dataset?.sample && (
                          <ChatChartRenderer spec={parsed.chartSpec} data={dataset.sample} />
                        )}

                        {/* Quick Action buttons */}
                        {parsed?.quickActions && parsed.quickActions.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-4 border-t border-white/5 mt-4">
                            {parsed.quickActions.map((action, idx) => (
                              <button
                                key={idx}
                                onClick={() => runLLMPipeline(action)}
                                className="px-3.5 py-2 rounded-xl bg-cyan-400/10 hover:bg-cyan-400 hover:text-black border border-cyan-400/20 text-cyan-400 text-[10px] font-bold font-space uppercase tracking-wider transition-all cursor-pointer"
                              >
                                {action}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Suggested Questions */}
                        {parsed?.suggestedQuestions && parsed.suggestedQuestions.length > 0 && (
                          <div className="pt-4 border-t border-white/5 mt-4 space-y-2">
                            <div className="text-[9px] font-black uppercase tracking-widest text-gray-500 font-space">Suggested Questions</div>
                            <div className="flex flex-col gap-1.5">
                              {parsed.suggestedQuestions.map((q, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => runLLMPipeline(q)}
                                  className="text-left text-[10px] text-cyan-400/80 hover:text-cyan-300 font-semibold hover:underline flex items-center gap-1.5 cursor-pointer font-space"
                                >
                                  <span>►</span>
                                  <span>{q}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {loading && (
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 animate-spin" />
                  </div>
                  <div className="glass p-6 rounded-3xl text-xs text-gray-500 font-bold uppercase tracking-widest font-space animate-pulse">
                    Reasoning data vectors...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Bottom Input Area */}
            <div className="p-8 bg-gradient-to-t from-[#02040f] to-transparent z-10">
              <div className="max-w-4xl mx-auto relative group">
                {/* Reasoning Mode Toggles */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                  {(["Quick Analysis", "Deep Analysis", "Executive Summary", "Data Scientist Mode"] as const).map((modeOption) => (
                    <button
                      key={modeOption}
                      onClick={() => handleModeChange(modeOption)}
                      disabled={loading}
                      className={`px-4 py-2.5 rounded-2xl text-[9px] font-black font-space uppercase tracking-widest border transition-all cursor-pointer ${
                        loading ? "opacity-50 cursor-not-allowed" : ""
                      } ${
                        reasoningMode === modeOption
                          ? "bg-cyan-500/10 border-cyan-400/35 text-cyan-400 shadow-md"
                          : "bg-white/5 border-transparent text-gray-500 hover:text-gray-300 hover:bg-white/8"
                      }`}
                    >
                      {modeOption}
                    </button>
                  ))}
                </div>

                <div className="absolute inset-0 bg-cyan-500/5 blur-2xl rounded-3xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
                <div className="relative glass p-2 rounded-[2rem] flex items-center gap-2 border-white/10 group-focus-within:border-cyan-400/30 transition-all">
                  <button className="p-4 hover:bg-white/5 rounded-2xl transition-colors text-gray-500">
                    <Code className="w-5 h-5" />
                  </button>
                  <input 
                    type="text" 
                    placeholder="Ask me to 'Find outlier vectors' or 'Examine correlation clusters'..."
                    className="flex-1 bg-transparent border-none outline-none text-xs text-white px-2 placeholder:text-gray-600 font-medium"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") runLLMPipeline(input);
                    }}
                  />
                  <button 
                    onClick={() => runLLMPipeline(input)}
                    className="bg-white text-black p-4 rounded-2xl hover:bg-cyan-400 transition-all shadow-[0_0_15px_rgba(255,255,255,0.1)] cursor-pointer"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="flex justify-center gap-6 mt-6 print:hidden">
                  <QuickAction icon={<Database />} label="Isolate Outliers" onClick={() => runLLMPipeline("Find outlier vectors in this dataset and show me outliers chart")} />
                  <QuickAction icon={<Globe />} label="Evaluate Correlations" onClick={() => runLLMPipeline("What are the strongest linear relationships in my features list?")} />
                  <QuickAction icon={<MessageSquare />} label="Summary Briefing" onClick={() => runLLMPipeline("Generate a summary analysis profile of the columns and data parameters")} />
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-y-auto p-8 space-y-6 scrollbar-hide">
            {!file ? (
              <div className="flex flex-col items-center justify-center h-[50vh] text-center max-w-md mx-auto space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-white font-space uppercase tracking-widest">No Dataset Loaded</h3>
                <p className="text-xs text-gray-500 leading-relaxed font-medium">Please upload a dataset on the Data Studio dashboard first to run AI business strategy consultations.</p>
              </div>
            ) : loadingConsultant ? (
              <div className="flex flex-col items-center justify-center h-[50vh] text-center max-w-md mx-auto space-y-4">
                <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest font-space animate-pulse">Running strategic consultation engines...</p>
              </div>
            ) : consultantData ? (
              <div className="max-w-4xl mx-auto space-y-8 animate-slide-in-up">
                {/* Top Stats Banner */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="glass p-6 rounded-3xl flex flex-col justify-between relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
                    <div>
                      <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest font-space">Expected Savings</span>
                      <div className="text-2xl font-black text-emerald-400 font-space mt-2">{consultantData.expected_savings}</div>
                    </div>
                    <div className="text-[10px] text-emerald-500/60 font-medium mt-4 font-space">Projected monthly optimization margin</div>
                  </div>

                  <div className="glass p-6 rounded-3xl flex flex-col justify-between relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent pointer-events-none" />
                    <div>
                      <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest font-space">ROI Rating</span>
                      <div className="text-2xl font-black text-cyan-400 font-space mt-2">{consultantData.roi_impact}</div>
                    </div>
                    <div className="text-[10px] text-cyan-500/60 font-medium mt-4 font-space">Implementation impact tier</div>
                  </div>

                  <div className="glass p-6 rounded-3xl flex flex-col justify-between relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent pointer-events-none" />
                    <div>
                      <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest font-space">Actions Suggested</span>
                      <div className="text-2xl font-black text-violet-400 font-space mt-2">3 Strategies</div>
                    </div>
                    <div className="text-[10px] text-violet-500/60 font-medium mt-4 font-space">High-confidence recommendations</div>
                  </div>
                </div>

                {/* Finding Card */}
                <div className="glass p-8 rounded-[2.5rem] bg-gradient-to-r from-cyan-950/15 via-black/40 to-violet-950/15 border-cyan-400/10">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-xl bg-cyan-400/20 border border-cyan-400/30 flex items-center justify-center">
                      <Activity className="w-4 h-4 text-cyan-400" />
                    </div>
                    <h3 className="text-sm font-bold text-white font-space uppercase tracking-widest">Primary Strategic Finding</h3>
                  </div>
                  <p className="text-sm text-gray-300 leading-relaxed font-medium">
                    {consultantData.finding}
                  </p>
                </div>

                {/* Recommendations */}
                <div className="space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-widest text-gray-500 font-space">Actionable Recommendations Checklist</h3>
                  <div className="grid grid-cols-1 gap-4">
                    {consultantData.recommendations.map((rec: string, idx: number) => (
                      <div key={idx} className="glass p-6 rounded-2xl border border-white/5 hover:border-cyan-400/25 transition-all duration-300 flex items-start gap-4">
                        <div className="w-8 h-8 rounded-full bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 flex items-center justify-center flex-shrink-0 text-xs font-black font-space">
                          0{idx + 1}
                        </div>
                        <div>
                          <p className="text-xs text-gray-300 font-medium leading-relaxed">{rec}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Button */}
                <div className="flex justify-end pt-4">
                  <button
                    onClick={runConsultant}
                    className="px-6 py-3 rounded-full bg-white/5 hover:bg-white/10 text-white border border-white/10 font-bold text-[10px] uppercase tracking-widest hover:border-cyan-400/30 transition-colors font-space cursor-pointer"
                  >
                    Re-run Strategy Analysis
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[50vh] text-center max-w-md mx-auto space-y-4">
                <button
                  onClick={runConsultant}
                  className="px-6 py-3 rounded-full bg-cyan-400 text-black font-bold text-[10px] uppercase tracking-widest hover:bg-cyan-300 transition-colors font-space cursor-pointer"
                >
                  Run Business Strategy Consultation
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function QuickAction({ icon, label, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-gray-500 hover:text-cyan-400 transition-colors font-space cursor-pointer"
    >
      <span className="opacity-50">{icon}</span>
      {label}
    </button>
  );
}
