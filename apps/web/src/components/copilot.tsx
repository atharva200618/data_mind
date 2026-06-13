"use client";

import { useState, useRef, useEffect } from "react";
import { useData } from "@/store/data-context";
import { Bot, User, Sparkles, Send, X, Loader2, Database, AlertCircle } from "lucide-react";

interface Message {
  role: "assistant" | "user";
  text: string;
}

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function Copilot() {
  const { file, dataset } = useData();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: "Hi! I'm your DataMind Copilot. Upload your data, and ask me anything about health, anomalies, or ML suitability from any page!",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim()) return;
    setInput("");
    setLoading(true);

    const userMsg: Message = { role: "user", text: textToSend };
    setMessages((prev) => [...prev, userMsg]);

    const formData = new FormData();
    formData.append("question", textToSend);
    formData.append("mode", "Quick Analysis");
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
    formData.append("api_key", apiKey);

    if (file) {
      formData.append("file", file);
    } else {
      // If no file uploaded, prompt a warning response directly
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            text: "⚠️ No active dataset found. Please upload a dataset in the Data Studio workspace first so I can analyze it for you!",
          },
        ]);
        setLoading(false);
      }, 800);
      return;
    }

    try {
      const response = await fetch(`${API}/api/v1/ai/chat`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to query AI Copilot");
      }

      const resData = await response.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: resData.response || "No insights found." },
      ]);
    } catch (error: any) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: `Error: ${error.message}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const parseMessageContent = (text: string) => {
    // Basic parser for highlighting bold text and removing inline [CHART_SPEC] tags to keep clean
    let clean = text.replace(/\[CHART_SPEC:[\s\S]*?\]/g, "").trim();
    
    // Extract suggested questions if present
    const suggested: string[] = [];
    const lines = clean.split("\n");
    const filteredLines = lines.filter((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("►")) {
        suggested.push(trimmed.replace("►", "").trim());
        return false;
      }
      if (trimmed.toLowerCase().includes("suggested questions:")) {
        return false;
      }
      // Also remove brackets quick actions from Copilot output for space
      if (trimmed.startsWith("[") && trimmed.endsWith("]") && trimmed.length < 150) {
        return false;
      }
      return true;
    });

    clean = filteredLines.join("\n").trim();
    return { clean, suggested };
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans print:hidden">
      {/* Copilot Chat Window */}
      {isOpen && (
        <div className="mb-4 w-[350px] sm:w-[400px] h-[500px] glass-dark rounded-[2rem] border border-white/10 flex flex-col overflow-hidden shadow-2xl relative animate-in fade-in slide-in-from-bottom-5 duration-300">
          {/* Header */}
          <div className="p-5 border-b border-white/5 bg-black/40 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-cyan-400/20 border border-cyan-400/30 flex items-center justify-center animate-ai-pulse">
                <Sparkles className="w-4 h-4 text-cyan-400" />
              </div>
              <div>
                <h4 className="text-xs font-bold font-space text-white tracking-wide">DataMind Copilot</h4>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest font-space">
                    {file ? "Dataset Connected" : "Awaiting Data"}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-hide">
            {messages.map((msg, i) => {
              const { clean, suggested } = parseMessageContent(msg.text);
              return (
                <div
                  key={i}
                  className={`flex gap-3 items-start ${
                    msg.role === "user" ? "flex-row-reverse" : ""
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      msg.role === "assistant"
                        ? "bg-cyan-500/10 border border-cyan-500/20 text-cyan-400"
                        : "bg-white/5 border border-white/10 text-white"
                    }`}
                  >
                    {msg.role === "assistant" ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                  </div>
                  <div
                    className={`p-4 rounded-2xl text-[11px] leading-relaxed max-w-[75%] ${
                      msg.role === "user"
                        ? "bg-cyan-400/10 border border-cyan-400/20 text-cyan-200"
                        : "bg-white/5 border border-white/5 text-gray-300"
                    }`}
                  >
                    <div className="whitespace-pre-line leading-relaxed">{clean}</div>
                    
                    {/* Suggested questions */}
                    {suggested.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-white/5 space-y-1.5">
                        {suggested.map((q, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSendMessage(q)}
                            className="text-left text-[9px] text-cyan-400 hover:text-cyan-300 font-bold block hover:underline"
                          >
                            ► {q}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {loading && (
              <div className="flex gap-3 items-start">
                <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
                <div className="p-4 rounded-2xl text-[10px] text-gray-500 font-bold uppercase tracking-widest bg-white/5 border border-white/5 animate-pulse font-space">
                  Thinking...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 bg-black/40 border-t border-white/5">
            <div className="relative flex items-center gap-2 bg-white/5 border border-white/10 focus-within:border-cyan-400/30 rounded-xl p-1.5 transition-all">
              <input
                type="text"
                placeholder={file ? "Ask about anomalies, features, ML..." : "Upload data to start Q&A..."}
                disabled={loading}
                className="flex-1 bg-transparent border-none outline-none text-xs text-white px-2.5 placeholder:text-gray-600 disabled:opacity-50"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSendMessage(input);
                }}
              />
              <button
                disabled={loading || !input.trim()}
                onClick={() => handleSendMessage(input)}
                className="bg-white hover:bg-cyan-400 disabled:bg-gray-800 text-black p-2.5 rounded-lg transition-colors cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 rounded-full bg-gradient-to-tr from-cyan-400 to-violet-500 hover:from-cyan-300 hover:to-violet-400 text-black flex items-center justify-center shadow-[0_0_30px_rgba(34,211,238,0.3)] hover:scale-105 transition-all duration-300 cursor-pointer relative group"
      >
        <div className="absolute inset-0 rounded-full border border-white/20 animate-ping opacity-75 group-hover:opacity-100" />
        <Sparkles className="w-6 h-6 animate-pulse" />
      </button>
    </div>
  );
}
