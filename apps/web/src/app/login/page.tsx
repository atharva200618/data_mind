"use client";

import { useState } from "react";
import { useAuth } from "@/store/auth-context";
import Link from "next/link";
import { Sparkles, Mail, Lock, ArrowRight, Loader2, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await login(email, password);
    if (!result.success) {
      setError(result.error || "Failed to log in");
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen flex items-center justify-center overflow-hidden px-4 py-16">
      {/* Background gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-500/10 blur-[120px] pointer-events-none animate-float-slow" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-violet-500/10 blur-[120px] pointer-events-none animate-float-delayed" />

      <div className="z-10 w-full max-w-md">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-8 text-center">
          <Link href="/" className="group flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 via-violet-500 to-amber-400 flex items-center justify-center font-bold text-black text-base shadow-[0_0_30px_rgba(139,92,246,0.4)] group-hover:scale-105 transition-transform duration-300">
              DM
            </div>
            <span className="text-xl font-black tracking-wider uppercase font-space bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
              DataMind AI
            </span>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight font-space text-white mb-2">Welcome Back</h1>
          <p className="text-sm text-gray-400">Log in to access your personal dashboard & ETL pipelines</p>
        </div>

        {/* Glassmorphic Form Card */}
        <div className="glass p-8 md:p-10 rounded-[2.5rem] relative overflow-hidden border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
            {error && (
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3 text-rose-400 animate-in fade-in duration-300">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span className="text-xs font-semibold leading-relaxed">{error}</span>
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-2">
              <label className="block text-[10px] font-black uppercase tracking-widest text-cyan-400 font-space">
                Email Address
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 group-focus-within:text-cyan-400 transition-colors">
                  <Mail className="w-4.5 h-4.5" />
                </div>
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-2xl pl-11 pr-4 py-3.5 text-sm text-white placeholder-gray-500 outline-none focus:border-cyan-400/50 focus:bg-white/[0.05] focus:shadow-[0_0_20px_rgba(34,211,238,0.05)] transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-[10px] font-black uppercase tracking-widest text-cyan-400 font-space">
                  Password
                </label>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 group-focus-within:text-cyan-400 transition-colors">
                  <Lock className="w-4.5 h-4.5" />
                </div>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-2xl pl-11 pr-4 py-3.5 text-sm text-white placeholder-gray-500 outline-none focus:border-cyan-400/50 focus:bg-white/[0.05] focus:shadow-[0_0_20px_rgba(34,211,238,0.05)] transition-all"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-cyan-400 hover:bg-cyan-300 disabled:bg-cyan-500/20 disabled:text-cyan-400/50 text-black font-semibold font-space tracking-widest text-xs uppercase py-4 rounded-2xl flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_35px_rgba(34,211,238,0.2)] hover:shadow-[0_0_40px_rgba(34,211,238,0.3)] transition-all duration-300 disabled:pointer-events-none"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  Access Studio
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Shimmer Overlay on loading */}
          {loading && (
            <div className="absolute inset-0 bg-black/20 pointer-events-none animate-shimmer" />
          )}
        </div>

        {/* Navigation Link to Sign Up */}
        <p className="text-center mt-8 text-sm text-gray-400">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="text-cyan-400 hover:text-cyan-300 font-semibold underline underline-offset-4 transition-colors"
          >
            Create an account
          </Link>
        </p>
      </div>
    </main>
  );
}
