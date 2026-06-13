"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Hero3D } from "@/components/hero-3d";
import { 
  UploadCloud, 
  Zap, 
  Shield, 
  Sparkles, 
  Binary, 
  FileText, 
  ArrowRight, 
  BarChart3, 
  Database,
  Search,
  Command,
  X,
  Cpu,
  RefreshCw,
  Download,
  Check,
  Terminal,
  Activity,
  ArrowLeft
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/store/auth-context";
import { LazyMotion, domMax, m, AnimatePresence } from "framer-motion";

// Taglines to cycle through
const taglines = [
  "beautifully re-imagined.",
  "trained in seconds.",
  "visually clustered.",
  "analyzed by AI."
];

interface EtlRow {
  id: number;
  name: string;
  size: string;
  status: string;
  val: string;
  isDuplicate?: boolean;
  isNull?: boolean;
}

// Initial ETL mock data
const initialEtlRows: EtlRow[] = [
  { id: 1, name: "customer_churn.csv", size: "142 KB", status: "Duplicate", val: "$48,900", isDuplicate: true },
  { id: 2, name: "user_metrics.csv", size: "94 KB", status: "NULL", val: "—", isNull: true },
  { id: 3, name: "sales_forecast.csv", size: "2.4 MB", status: "OK", val: "$182,400" },
  { id: 4, name: "customer_churn.csv", size: "142 KB", status: "Duplicate", val: "$48,900", isDuplicate: true },
  { id: 5, name: "growth_factors.csv", size: "52 KB", status: "NULL", val: "—", isNull: true },
];

// 1. FLOATING HEADER (Optimized with React.memo)
const FloatingHeader = React.memo(function FloatingHeader() {
  const { user, logout } = useAuth();
  
  return (
    <header className="absolute top-0 left-0 right-0 z-30 w-full max-w-6xl mx-auto px-6 py-6 flex items-center justify-between pointer-events-auto">
      <Link href="/" className="flex items-center gap-2 group">
        <div className="relative w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-400/20 flex items-center justify-center group-hover:border-cyan-400/40 transition-colors duration-300">
          <Zap className="w-4.5 h-4.5 text-cyan-400 group-hover:scale-110 transition-transform duration-300" />
          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
        </div>
        <span className="font-space font-bold tracking-widest text-sm text-white group-hover:text-cyan-400 transition-colors duration-300">
          DATAMIND<span className="text-cyan-400 font-extrabold">.AI</span>
        </span>
      </Link>

      <div className="flex items-center gap-4">
        {user ? (
          <div className="flex items-center gap-3">
            <Link 
              href="/dashboard"
              className="glass hover:bg-white/10 px-5 py-2.5 rounded-[2rem] text-xs font-semibold font-space tracking-wider text-white border border-white/5 hover:border-cyan-500/30"
            >
              Enter Dashboard
            </Link>
            <button 
              onClick={logout}
              className="px-4 py-2.5 text-rose-400 hover:text-rose-300 text-xs font-semibold font-space tracking-wider hover:bg-rose-500/5 rounded-full transition-all border border-transparent hover:border-rose-500/10"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link 
              href="/login"
              className="px-5 py-2.5 text-gray-300 hover:text-white text-xs font-semibold font-space tracking-wider transition-all"
            >
              Sign In
            </Link>
            <Link 
              href="/signup"
              className="bg-cyan-400 hover:bg-cyan-300 text-black px-6 py-2.5 rounded-[2rem] text-xs font-semibold font-space tracking-widest uppercase transition-all shadow-[0_0_15px_rgba(34,211,238,0.2)]"
            >
              Sign Up
            </Link>
          </div>
        )}
      </div>
    </header>
  );
});

// 2. CYCLING TAGLINE (Isolates tagline tick rendering)
const CyclingTagline = React.memo(function CyclingTagline() {
  const [taglineIndex, setTaglineIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTaglineIndex((prev) => (prev + 1) % taglines.length);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className="relative block h-[1.2em] overflow-hidden min-w-[280px] md:min-w-[500px] mt-2">
      <AnimatePresence mode="wait">
        <m.span
          key={taglineIndex}
          initial={{ y: 35, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -35, opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="gradient-text-cyan absolute left-0 right-0 text-center"
        >
          {taglines[taglineIndex]}
        </m.span>
      </AnimatePresence>
    </span>
  );
});

// 3. SEARCH TRIGGER BAR (Optimized with React.memo)
interface SearchTriggerProps {
  onOpen: () => void;
}
const SearchTrigger = React.memo(function SearchTrigger({ onOpen }: SearchTriggerProps) {
  return (
    <div 
      onClick={onOpen}
      className="flex items-center gap-3.5 glass hover:bg-white/5 border border-white/8 hover:border-cyan-500/30 px-6 py-4 rounded-[2rem] cursor-pointer w-full max-w-lg group transition-all duration-300 shadow-[0_15px_35px_rgba(0,0,0,0.4)] mb-12"
    >
      <Search className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform duration-300" />
      <span className="text-sm text-gray-400 font-space flex-1 text-left">
        Press <kbd className="bg-white/10 px-2 py-0.5 rounded text-[10px] text-white font-mono border border-white/10">⌘K</kbd> or click to run interactive simulation...
      </span>
      <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400 font-space opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        DEMO
      </span>
    </div>
  );
});

// 4. STATIC BENTO ARCHITECTURE GRID (Optimized with React.memo to prevent layout updates)
const BentoArchitectureGrid = React.memo(function BentoArchitectureGrid() {
  return (
    <div className="z-10 w-full max-w-6xl px-6 mx-auto">
      <div className="text-center mb-16">
        <h2 className="text-xs font-black uppercase tracking-[0.25em] text-cyan-400 mb-3 font-space">System Architecture</h2>
        <p className="text-3xl md:text-4xl font-bold font-space text-white/90">Curated modules for high-frequency reasoning</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[240px] md:auto-rows-[280px]">
        
        {/* Main big box (AutoML) */}
        <div className="bento-item md:col-span-2 md:row-span-2 p-8 md:p-12 flex flex-col justify-between group">
          <div className="bento-glow-border" />
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
            <Zap className="w-56 h-56 text-cyan-400 animate-float-slow" />
          </div>
          <div>
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-6">
              <Zap className="w-6 h-6 text-cyan-400" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400 font-space">Next-Gen Engine</span>
            <h3 className="text-3xl font-bold mt-2 mb-4 font-space text-white group-hover:text-cyan-300 transition-colors">Real-Time AutoML</h3>
            <p className="text-gray-400 text-sm max-w-md leading-relaxed">
              Automatically train and benchmark Ridge, Lasso, Random Forests, and Gradient Boosting models directly against your custom CSV files. Deploy instantly.
            </p>
          </div>
          <Link href="/dashboard/automl" className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/70 group-hover:text-white transition-colors font-space relative z-10">
            Train Model <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Synthetic Gen box */}
        <div className="bento-item p-8 flex flex-col justify-between group">
          <div className="bento-glow-border" />
          <div>
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-4">
              <Binary className="w-5 h-5 text-violet-400" />
            </div>
            <h3 className="text-xl font-bold font-space text-white group-hover:text-violet-300 transition-colors">Synthetic Data</h3>
            <p className="text-gray-400 text-xs mt-2 leading-relaxed">
              Generate statistically aligned fake datasets preserving distributions and skewness.
            </p>
          </div>
          <Link href="/dashboard/synthetic" className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover:text-white transition-colors font-space relative z-10">
            Generate <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* AI Reports box */}
        <div className="bento-item p-8 flex flex-col justify-between group">
          <div className="bento-glow-border" />
          <div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4">
              <FileText className="w-5 h-5 text-amber-400" />
            </div>
            <h3 className="text-xl font-bold font-space text-white group-hover:text-amber-300 transition-colors">Executive Reports</h3>
            <p className="text-gray-400 text-xs mt-2 leading-relaxed">
              Render publication-quality analytical PDFs with dynamic narrative analysis summaries.
            </p>
          </div>
          <Link href="/dashboard/reports" className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover:text-white transition-colors font-space relative z-10">
            Compile <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Spatial visualizer card */}
        <div className="bento-item p-8 flex flex-col justify-between group">
          <div className="bento-glow-border" />
          <div>
            <div className="w-10 h-10 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mb-4">
              <BarChart3 className="w-5 h-5 text-green-400" />
            </div>
            <h3 className="text-xl font-bold font-space text-white group-hover:text-green-300 transition-colors">3D Particle Cloud</h3>
            <p className="text-gray-400 text-xs mt-2 leading-relaxed">
              Map complex dataset rows into spatial point clusters in interactive WebGL layout views.
            </p>
          </div>
          <Link href="/dashboard/visual-lab" className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover:text-white transition-colors font-space relative z-10">
            Explore 3D <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Diagnostics and pipeline card */}
        <div className="bento-item md:col-span-2 p-8 flex flex-col justify-between group">
          <div className="bento-glow-border" />
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
            <Database className="w-40 h-40 text-violet-400" />
          </div>
          <div>
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-4">
              <Shield className="w-5 h-5 text-violet-400" />
            </div>
            <h3 className="text-xl font-bold font-space text-white group-hover:text-violet-300 transition-colors">Diagnostics & Anomaly Audits</h3>
            <p className="text-gray-400 text-xs mt-2 max-w-md leading-relaxed">
              Trace dataset entropy, compute Pearson/Spearman correlation models, and isolate outlier vectors securely and dynamically in-browser.
            </p>
          </div>
          <Link href="/dashboard/diagnostics" className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover:text-white transition-colors font-space relative z-10">
            Audit Data <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

      </div>
    </div>
  );
});

// 5. COMMAND PALETTE MODAL (Optimized with isolated states for high-frequency updates)
interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CommandPaletteModal = React.memo(function CommandPaletteModal({ isOpen, onClose }: CommandPaletteModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSim, setActiveSim] = useState<string | null>(null);

  // 1. AutoML Simulation States
  const [automlEpoch, setAutomlEpoch] = useState(0);
  const [automlLoss, setAutomlLoss] = useState(0.95);
  const [automlR2, setAutomlR2] = useState(0.12);
  const [automlLogs, setAutomlLogs] = useState<string[]>([]);
  const [automlProgress, setAutomlProgress] = useState(0);
  const [isAutomlRunning, setIsAutomlRunning] = useState(false);

  // 2. PCA Clustering States
  const [isClustered, setIsClustered] = useState(false);

  // 3. ETL Simulation States
  const [etlStep, setEtlStep] = useState<"idle" | "scanning" | "cleaned">("idle");
  const [etlRows, setEtlRows] = useState<EtlRow[]>(initialEtlRows);

  // 4. AI Analyst States
  const [analystLogs, setAnalystLogs] = useState<string[]>([]);
  const [isAnalystDone, setIsAnalystDone] = useState(false);
  const [isReportDownloaded, setIsReportDownloaded] = useState(false);
  const [isAnalystRunning, setIsAnalystRunning] = useState(false);

  // Reset all simulation states
  const resetSimulations = () => {
    setSearchQuery("");
    setActiveSim(null);
    setAutomlEpoch(0);
    setAutomlLoss(0.95);
    setAutomlR2(0.12);
    setAutomlLogs([]);
    setAutomlProgress(0);
    setIsAutomlRunning(false);
    setIsClustered(false);
    setEtlStep("idle");
    setEtlRows(initialEtlRows);
    setAnalystLogs([]);
    setIsAnalystDone(false);
    setIsReportDownloaded(false);
    setIsAnalystRunning(false);
    onClose();
  };

  // Keyboard shortcut listener to close on ESC
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        resetSimulations();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Run AutoML simulation logic
  const startAutomlSim = () => {
    if (isAutomlRunning) return;
    setIsAutomlRunning(true);
    setAutomlEpoch(0);
    setAutomlLoss(0.95);
    setAutomlR2(0.12);
    setAutomlLogs(["[System] Starting Neural Network Optimizer...", "[System] Loading csv_dataset.csv into GPU tensor memory..."]);
    setAutomlProgress(0);

    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += 5;
      setAutomlProgress(currentProgress);
      
      const epoch = Math.min(5, Math.floor(currentProgress / 20) + 1);
      setAutomlEpoch(epoch);

      if (currentProgress === 20) {
        setAutomlLoss(0.64);
        setAutomlR2(0.48);
        setAutomlLogs(prev => [...prev, "[Epoch 1/5] Loss: 0.640 | R²: 0.482 | learning_rate: 0.01"]);
      } else if (currentProgress === 40) {
        setAutomlLoss(0.32);
        setAutomlR2(0.76);
        setAutomlLogs(prev => [...prev, "[Epoch 2/5] Loss: 0.320 | R²: 0.761 | Backpropagation complete"]);
      } else if (currentProgress === 60) {
        setAutomlLoss(0.18);
        setAutomlR2(0.89);
        setAutomlLogs(prev => [...prev, "[Epoch 3/5] Loss: 0.184 | R²: 0.890 | validation_accuracy: 91.2%"]);
      } else if (currentProgress === 80) {
        setAutomlLoss(0.08);
        setAutomlR2(0.95);
        setAutomlLogs(prev => [...prev, "[Epoch 4/5] Loss: 0.081 | R²: 0.954 | Early stopping checker: OK"]);
      } else if (currentProgress >= 100) {
        setAutomlLoss(0.038);
        setAutomlR2(0.984);
        setAutomlLogs(prev => [...prev, "[Epoch 5/5] Loss: 0.038 | R²: 0.984 - Optimization Finished!", "[System] Random Forest & Deep MLP model saved and deployed."]);
        setIsAutomlRunning(false);
        clearInterval(interval);
      }
    }, 200);
  };

  // Run ETL simulation logic
  const startEtlSim = () => {
    if (etlStep === "scanning") return;
    setEtlStep("scanning");
    setEtlRows(initialEtlRows);

    setTimeout(() => {
      setEtlRows(prev => prev.filter((r, idx) => idx !== 3));
      setEtlRows(prev => prev.map(r => {
        if (r.id === 2) return { ...r, status: "Cleaned", val: "$34,200", isNull: false };
        if (r.id === 5) return { ...r, status: "Cleaned", val: "+12.4%", isNull: false };
        return r;
      }));
      setEtlStep("cleaned");
    }, 2500);
  };

  // Run AI Analyst simulation logic
  const startAnalystSim = () => {
    if (isAnalystRunning) return;
    setIsAnalystRunning(true);
    setIsAnalystDone(false);
    setIsReportDownloaded(false);
    setAnalystLogs(["Initializing Semantic Analyst reasoning model...", "Reading uploaded datatable schema..."]);

    const textLines = [
      "Calculating Pearson correlation matrices...",
      "Isolating outlier vectors on principal component #2...",
      "Spearman score identifies strong positive shift in Growth vs. Spend.",
      "Writing executive narrative report...",
      "Formatting responsive tables and SVG charts...",
      "Rendering LaTeX elements to publication PDF layout...",
      "Analyst check: Complete. Document compiled."
    ];

    let lineIndex = 0;
    const interval = setInterval(() => {
      if (lineIndex < textLines.length) {
        setAnalystLogs(prev => [...prev, textLines[lineIndex]]);
        lineIndex++;
      } else {
        setIsAnalystDone(true);
        setIsAnalystRunning(false);
        clearInterval(interval);
      }
    }, 550);
  };

  // PCA Static points positions setup (memoized)
  const pcaParticles = useMemo(() => {
    const list = [];
    const groups = ["species-a", "species-b", "species-c"];
    for (let i = 0; i < 48; i++) {
      const group = groups[i % 3];
      const rx = Math.random() * 80 - 40;
      const ry = Math.random() * 80 - 40;
      
      let cx = 0;
      let cy = 0;
      if (group === "species-a") {
        cx = -26 + (Math.random() * 14 - 7);
        cy = -20 + (Math.random() * 14 - 7);
      } else if (group === "species-b") {
        cx = 24 + (Math.random() * 14 - 7);
        cy = -12 + (Math.random() * 14 - 7);
      } else {
        cx = 2 + (Math.random() * 16 - 8);
        cy = 22 + (Math.random() * 16 - 8);
      }
      
      list.push({ id: i, group, rx, ry, cx, cy });
    }
    return list;
  }, []);

  // Command Palette simulations list (memoized)
  const simulations = useMemo(() => [
    {
      id: "automl",
      name: "AutoML Neural Training",
      desc: "Simulate training a neural network model live, charting accuracy and loss curves.",
      icon: Cpu,
      color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
    },
    {
      id: "pca",
      name: "PCA Species Clustering",
      desc: "Watch 3D multi-dimensional spatial points migrate and cluster by variance ratios.",
      icon: BarChart3,
      color: "text-violet-400 bg-violet-500/10 border-violet-500/20",
    },
    {
      id: "etl",
      name: "Intelligent ETL Pipeline",
      desc: "Run active scan to eliminate nulls, clean duplicates, and align data schemas.",
      icon: Database,
      color: "text-green-400 bg-green-500/10 border-green-500/20",
    },
    {
      id: "analyst",
      name: "AI Executive Analyst",
      desc: "Stream live analytical thoughts and compile an automated PDF summary report.",
      icon: FileText,
      color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    }
  ], []);

  // Filter commands by search input (memoized)
  const filteredSimulations = useMemo(() => {
    return simulations.filter(sim =>
      sim.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sim.desc.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, simulations]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 pointer-events-auto">
      {/* Backdrop blur */}
      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={resetSimulations}
        className="absolute inset-0 bg-[#02040f]/85 backdrop-blur-md"
      />

      {/* Dialog Container */}
      <m.div
        initial={{ scale: 0.96, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 15 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="glass w-full max-w-2xl rounded-[2.5rem] border border-white/10 shadow-[0_30px_100px_rgba(0,0,0,0.85)] overflow-hidden relative z-10 flex flex-col bg-[#060814]/95 max-h-[85vh]"
      >
        
        {/* Search Header (Hide if a simulation is active) */}
        {!activeSim ? (
          <div className="flex items-center gap-3 px-6 py-5 border-b border-white/5 bg-white/[0.01]">
            <Command className="w-5 h-5 text-cyan-400 animate-pulse" />
            <input
              type="text"
              placeholder="Type to search modules..."
              className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none font-space text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
            <kbd className="hidden sm:inline-block bg-white/5 border border-white/10 px-2 py-0.5 rounded text-[10px] text-gray-400 font-mono">
              ESC
            </kbd>
            <button 
              onClick={resetSimulations}
              className="p-1.5 rounded-full hover:bg-white/5 transition-colors border border-transparent hover:border-white/5"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 bg-white/[0.01]">
            <button 
              onClick={resetSimulations}
              className="flex items-center gap-2 text-xs font-bold font-space uppercase tracking-widest text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Commands
            </button>
            <span className="text-[10px] font-mono bg-cyan-500/10 border border-cyan-400/20 text-cyan-400 px-3 py-1 rounded-full uppercase tracking-wider font-bold">
              Interactive Simulation
            </span>
          </div>
        )}

        {/* Modal Body / Command list */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
          
          {/* 1. LIST COMMANDS (Default State) */}
          {!activeSim && (
            <div className="flex flex-col gap-3">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 font-space mb-1 pl-1">
                Choose an Interactive Script
              </span>
              {filteredSimulations.length > 0 ? (
                filteredSimulations.map((sim) => {
                  const Icon = sim.icon;
                  return (
                    <div
                      key={sim.id}
                      onClick={() => {
                        setActiveSim(sim.id);
                        if (sim.id === "automl") startAutomlSim();
                        if (sim.id === "etl") startEtlSim();
                        if (sim.id === "analyst") startAnalystSim();
                      }}
                      className="flex items-start gap-4 p-4 rounded-2xl hover:bg-white/5 border border-transparent hover:border-white/5 cursor-pointer group transition-all duration-300"
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${sim.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold font-space text-white group-hover:text-cyan-300 transition-colors">
                          {sim.name}
                        </h4>
                        <p className="text-xs text-gray-400 mt-1 leading-normal">
                          {sim.desc}
                        </p>
                      </div>
                      <div className="self-center">
                        <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-sm text-gray-500 font-space">
                  No commands matching &apos;{searchQuery}&apos; found.
                </div>
              )}
            </div>
          )}

          {/* 2. AUTOML SIMULATION VIEW */}
          {activeSim === "automl" && (
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Cpu className="w-5 h-5 text-cyan-400" />
                  <h3 className="font-space font-bold text-white text-lg">Neural Network Benchmark</h3>
                </div>
                <button 
                  onClick={startAutomlSim}
                  disabled={isAutomlRunning}
                  className="flex items-center gap-1.5 text-[10px] font-bold font-space uppercase tracking-wider bg-cyan-400 text-black hover:bg-cyan-300 disabled:opacity-50 px-4 py-2 rounded-full transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isAutomlRunning ? "animate-spin" : ""}`} /> Restart
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Metric Dashboard */}
                <div className="glass rounded-2xl p-5 border border-white/5 bg-white/[0.01] flex flex-col justify-between min-h-[150px]">
                  <div>
                    <span className="text-[10px] font-mono tracking-widest text-cyan-400 font-bold uppercase">Training Output</span>
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div>
                        <p className="text-2xl font-mono text-white font-bold">{automlEpoch}/5</p>
                        <p className="text-[10px] font-space text-gray-400 tracking-wider uppercase mt-1">Current Epoch</p>
                      </div>
                      <div>
                        <p className="text-2xl font-mono text-rose-400 font-bold">{automlLoss.toFixed(3)}</p>
                        <p className="text-[10px] font-space text-gray-400 tracking-wider uppercase mt-1">Loss Rate</p>
                      </div>
                      <div className="col-span-2">
                        <div className="flex justify-between text-[10px] font-mono text-gray-400 mb-1">
                          <span>Optimization Accuracy (R²)</span>
                          <span className="text-white font-bold">{Math.round(automlR2 * 100)}%</span>
                        </div>
                        <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className="bg-cyan-400 h-full rounded-full transition-all duration-200"
                            style={{ width: `${automlR2 * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* SVG Line Chart View */}
                <div className="glass rounded-2xl p-5 border border-white/5 bg-white/[0.01] flex flex-col justify-center items-center">
                  <div className="flex justify-between w-full text-[9px] font-mono text-gray-500 mb-2">
                    <span className="text-rose-400 font-bold">• Loss Curve</span>
                    <span className="text-cyan-400 font-bold">• Model R²</span>
                  </div>
                  <div className="w-full h-28 relative">
                    <svg viewBox="0 0 300 120" className="w-full h-full overflow-visible">
                      {/* Grid Horizontal Guide Lines */}
                      <line x1="0" y1="100" x2="300" y2="100" stroke="rgba(255,255,255,0.04)" strokeDasharray="3" />
                      <line x1="0" y1="50" x2="300" y2="50" stroke="rgba(255,255,255,0.04)" strokeDasharray="3" />
                      <line x1="0" y1="10" x2="300" y2="10" stroke="rgba(255,255,255,0.04)" strokeDasharray="3" />
                      
                      {/* Loss Path (Descending) */}
                      <m.path
                        d="M10,15 L70,55 L130,85 L200,95 L290,105"
                        fill="none"
                        stroke="#f43f5e"
                        strokeWidth="2.5"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: automlProgress / 100 }}
                        transition={{ duration: 0.1 }}
                      />
                      
                      {/* Accuracy Path (Ascending) */}
                      <m.path
                        d="M10,105 L70,80 L130,45 L200,25 L290,15"
                        fill="none"
                        stroke="#22d3ee"
                        strokeWidth="2.5"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: automlProgress / 100 }}
                        transition={{ duration: 0.1 }}
                      />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Console Logs */}
              <div className="glass rounded-2xl border border-white/5 bg-[#03040f]/60 p-4 font-mono text-xs text-gray-400 h-40 overflow-y-auto flex flex-col gap-1.5">
                {automlLogs.map((log, i) => (
                  <div key={i} className={log.includes("finished") || log.includes("saved") ? "text-cyan-400 font-bold" : ""}>
                    {log}
                  </div>
                ))}
                {isAutomlRunning && (
                  <div className="flex items-center gap-1.5 text-cyan-400">
                    <span className="w-1.5 h-3.5 bg-cyan-400 animate-typewriter-cursor inline-block" />
                    <span>Computing parameters...</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 3. PCA CLUSTERING SIMULATION VIEW */}
          {activeSim === "pca" && (
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <BarChart3 className="w-5 h-5 text-violet-400" />
                  <h3 className="font-space font-bold text-white text-lg">Dimensionality Clustering (PCA)</h3>
                </div>
                <button 
                  onClick={() => setIsClustered(prev => !prev)}
                  className="flex items-center gap-1.5 text-[10px] font-bold font-space uppercase tracking-wider bg-violet-500 hover:bg-violet-400 text-white px-5 py-2 rounded-full transition-colors"
                >
                  <Activity className="w-3.5 h-3.5" /> 
                  {isClustered ? "Scatter Coordinates" : "Cluster Species"}
                </button>
              </div>

              {/* Interactive Sandbox Plot */}
              <div className="glass border border-white/5 rounded-2xl h-64 relative overflow-hidden bg-[#03040f]/60 flex items-center justify-center">
                {/* Grid background ticks */}
                <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.02)_1px,transparent_1px)] [background-size:20px_20px]" />
                
                {/* Axis indicators */}
                <div className="absolute left-4 bottom-4 font-mono text-[9px] text-gray-500 uppercase tracking-widest">
                  Principal Component #1
                </div>
                <div className="absolute left-4 top-4 font-mono text-[9px] text-gray-500 uppercase tracking-widest origin-left rotate-90 translate-x-3.5">
                  Principal Component #2
                </div>

                {/* Cluster boundaries (Framer animated) */}
                <AnimatePresence>
                  {isClustered && (
                    <>
                      {/* Group A boundary */}
                      <m.div 
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="absolute w-28 h-28 border border-cyan-400/20 bg-cyan-400/[0.02] rounded-full"
                        style={{ left: "15%", top: "20%" }}
                      />
                      {/* Group B boundary */}
                      <m.div 
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="absolute w-28 h-28 border border-violet-400/20 bg-violet-400/[0.02] rounded-full"
                        style={{ left: "65%", top: "25%" }}
                      />
                      {/* Group C boundary */}
                      <m.div 
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="absolute w-32 h-32 border border-green-400/20 bg-green-400/[0.02] rounded-full"
                        style={{ left: "37%", top: "45%" }}
                      />
                    </>
                  )}
                </AnimatePresence>

                {/* Morphing Particles */}
                {pcaParticles.map((p) => (
                  <m.div
                    key={p.id}
                    animate={{
                      x: isClustered ? `${p.cx}%` : `${p.rx}%`,
                      y: isClustered ? `${p.cy}%` : `${p.ry}%`,
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 85,
                      damping: 14,
                    }}
                    className={`absolute w-2.5 h-2.5 rounded-full blur-[0.4px] ${
                      p.group === "species-a"
                        ? "bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.7)]"
                        : p.group === "species-b"
                        ? "bg-violet-400 shadow-[0_0_8px_rgba(139,92,246,0.7)]"
                        : "bg-green-400 shadow-[0_0_8px_rgba(16,185,129,0.7)]"
                    }`}
                    style={{
                      left: "50%",
                      top: "50%",
                      transform: "translate3d(-50%, -50%, 0)",
                      willChange: "transform",
                    }}
                  />
                ))}
              </div>

              <div className="flex justify-between items-center gap-4 text-xs font-space text-gray-400 border-t border-white/5 pt-4">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block" />
                  <span>Species Alpha (33%)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-violet-400 inline-block" />
                  <span>Species Beta (33%)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-400 inline-block" />
                  <span>Species Gamma (33%)</span>
                </div>
              </div>
            </div>
          )}

          {/* 4. ETL SIMULATION VIEW */}
          {activeSim === "etl" && (
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Database className="w-5 h-5 text-green-400" />
                  <h3 className="font-space font-bold text-white text-lg">AI ETL Pipeline Cleaning</h3>
                </div>
                <button 
                  onClick={startEtlSim}
                  disabled={etlStep === "scanning"}
                  className="flex items-center gap-1.5 text-[10px] font-bold font-space uppercase tracking-wider bg-green-500 hover:bg-green-400 text-white disabled:opacity-50 px-5 py-2 rounded-full transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${etlStep === "scanning" ? "animate-spin" : ""}`} /> Restart Scan
                </button>
              </div>

              {/* Table Viewport */}
              <div className="glass border border-white/5 rounded-2xl overflow-hidden bg-[#03040f]/60 relative min-h-[220px]">
                
                {/* Scanning Line overlay */}
                <AnimatePresence>
                  {etlStep === "scanning" && (
                    <m.div 
                      initial={{ top: "0%" }}
                      animate={{ top: "100%" }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 2.3, ease: "easeInOut" }}
                      className="absolute left-0 right-0 h-1.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_rgba(34,211,238,1)] z-10 pointer-events-none"
                    />
                  )}
                </AnimatePresence>

                <table className="w-full text-left font-space text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/[0.02]">
                      <th className="p-3 text-[10px] uppercase tracking-wider text-gray-400">Filename</th>
                      <th className="p-3 text-[10px] uppercase tracking-wider text-gray-400">Size</th>
                      <th className="p-3 text-[10px] uppercase tracking-wider text-gray-400 text-center">Status</th>
                      <th className="p-3 text-[10px] uppercase tracking-wider text-gray-400 text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence initial={false}>
                      {etlRows.map((row) => (
                        <m.tr 
                          key={row.id}
                          layout
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.4 }}
                          className={`border-b border-white/5 hover:bg-white/[0.01] transition-colors ${
                            row.isDuplicate && etlStep === "idle" ? "bg-red-500/5" : ""
                          } ${row.isNull && etlStep === "idle" ? "bg-amber-500/5" : ""}`}
                        >
                          <td className="p-3 font-medium text-white">{row.name}</td>
                          <td className="p-3 text-gray-400 font-mono">{row.size}</td>
                          <td className="p-3 text-center">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase ${
                              row.status === "OK" 
                                ? "bg-green-500/10 text-green-400 border border-green-500/25"
                                : row.status === "Duplicate"
                                ? "bg-red-500/10 text-red-400 border border-red-500/25 animate-pulse"
                                : row.status === "NULL"
                                ? "bg-amber-500/10 text-amber-400 border border-amber-500/25"
                                : "bg-cyan-500/10 text-cyan-400 border border-cyan-500/25"
                            }`}>
                              {row.status}
                            </span>
                          </td>
                          <td className={`p-3 text-right font-mono font-bold ${
                            row.status === "Cleaned" ? "text-cyan-400 text-glow-cyan" : "text-gray-300"
                          }`}>
                            {row.val}
                          </td>
                        </m.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center text-xs font-space">
                <div className="text-gray-400">
                  {etlStep === "idle" && <span className="text-amber-400">⚠️ Dirty data detected: duplicate entries & null matrices found.</span>}
                  {etlStep === "scanning" && <span className="text-cyan-400">⚡ Scanning schemas & computing mean/median imputations...</span>}
                  {etlStep === "cleaned" && <span className="text-green-400">✓ Optimization successful. De-duplicated rows & computed NULL fields.</span>}
                </div>
              </div>
            </div>
          )}

          {/* 5. AI EXEC ANALYST SIMULATION VIEW */}
          {activeSim === "analyst" && (
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  <h3 className="font-space font-bold text-white text-lg">AI Executive Analyst Engine</h3>
                </div>
                <button 
                  onClick={startAnalystSim}
                  disabled={isAnalystRunning}
                  className="flex items-center gap-1.5 text-[10px] font-bold font-space uppercase tracking-wider bg-amber-500 hover:bg-amber-400 text-white disabled:opacity-50 px-5 py-2 rounded-full transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isAnalystRunning ? "animate-spin" : ""}`} /> Restart
                </button>
              </div>

              {/* Console & Results */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Log Console */}
                <div className="glass rounded-2xl border border-white/5 bg-[#03040f]/60 p-4 font-mono text-xs text-gray-400 h-48 overflow-y-auto flex flex-col gap-1.5 md:col-span-1">
                  {analystLogs.map((log, i) => (
                    <div key={i} className={log.includes("Complete") ? "text-green-400 font-bold" : ""}>
                      &gt; {log}
                    </div>
                  ))}
                  {isAnalystRunning && (
                    <div className="flex items-center gap-1 text-amber-400">
                      <span className="w-1.5 h-3.5 bg-amber-400 animate-typewriter-cursor inline-block" />
                      <span>Synthesizing report...</span>
                    </div>
                  )}
                </div>

                {/* PDF Report preview */}
                <div className="glass rounded-2xl p-5 border border-white/5 bg-white/[0.01] flex flex-col items-center justify-center text-center md:col-span-1 min-h-[190px]">
                  <AnimatePresence mode="wait">
                    {isAnalystDone ? (
                      <m.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="flex flex-col items-center"
                      >
                        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4">
                          <FileText className="w-7 h-7 text-amber-400" />
                        </div>
                        <h4 className="text-xs font-bold font-space text-white uppercase tracking-wider">
                          datamind_summary.pdf
                        </h4>
                        <p className="text-[10px] text-gray-500 font-mono mt-1 mb-4">
                          4 pages • LaTeX rendered • 142 KB
                        </p>

                        <button 
                          onClick={() => setIsReportDownloaded(true)}
                          className={`flex items-center gap-2 text-xs font-bold font-space uppercase tracking-widest px-6 py-2.5 rounded-full transition-all duration-300 ${
                            isReportDownloaded 
                              ? "bg-green-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                              : "bg-amber-400 text-black hover:bg-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                          }`}
                        >
                          {isReportDownloaded ? (
                            <>
                              <Check className="w-3.5 h-3.5" /> Downloaded
                            </>
                          ) : (
                            <>
                              <Download className="w-3.5 h-3.5" /> Download PDF
                            </>
                          )}
                        </button>
                      </m.div>
                    ) : (
                      <m.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.6 }}
                        exit={{ opacity: 0 }}
                        className="flex flex-col items-center"
                      >
                        <Terminal className="w-12 h-12 text-gray-600 animate-pulse mb-3" />
                        <p className="text-xs text-gray-500 font-space uppercase tracking-wider font-bold">
                          Waiting for compilation
                        </p>
                        <p className="text-[10px] text-gray-600 font-mono mt-1">
                          PDF compilation triggers after logs resolve.
                        </p>
                      </m.div>
                    )}
                  </AnimatePresence>
                </div>

              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-white/5 bg-white/[0.01] flex items-center justify-between text-[10px] font-mono text-gray-500">
          <span>Select command with click or press ESC to dismiss.</span>
          <span className="font-bold text-cyan-400">DataMind AI Simulations v2.0</span>
        </div>

      </m.div>
    </div>
  );
});

export default function Home() {
  const { user } = useAuth();
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);

  // Keyboard shortcut listener to open command palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <LazyMotion features={domMax}>
      <main className="relative min-h-screen flex flex-col items-center justify-center overflow-x-hidden pt-28 pb-32">
        <Hero3D />

        {/* Floating Absolute Header */}
        <FloatingHeader />
        
        {/* Hero Section */}
        <div className="z-10 w-full max-w-6xl px-6 mx-auto flex flex-col items-center text-center mb-16">
          <div className="badge-live mb-8 shadow-xl animate-float-subtle">
            <span className="pulse-dot"></span>
            <span className="font-space tracking-widest text-[10px]">DataMind v2.0 Platform Live</span>
          </div>

          <h1 className="text-5xl md:text-8xl font-bold tracking-tight mb-8 font-space bg-gradient-to-b from-white via-white to-white/40 bg-clip-text text-transparent leading-none flex flex-col items-center justify-center">
            <span>Data Intelligence,</span>
            <CyclingTagline />
          </h1>
          
          <p className="text-base md:text-xl text-gray-400 max-w-3xl mb-10 font-medium leading-relaxed">
            The world&apos;s first premium, glassmorphic SaaS workspace integrating real-time AutoML, 3D spatial projections, synthetic data engines, and AI analyst reasoning.
          </p>

          {/* Search Trigger Bar */}
          <SearchTrigger onOpen={() => setIsPaletteOpen(true)} />

          <div className="flex flex-col sm:flex-row gap-5 w-full justify-center items-center">
            {user ? (
              <Link 
                href="/dashboard" 
                className="glass hover:bg-white/10 transition-all duration-300 px-10 py-5 rounded-[2rem] flex items-center justify-center gap-3 text-white font-semibold font-space tracking-widest text-xs uppercase group cursor-pointer shadow-[0_0_30px_rgba(34,211,238,0.15)] border-t border-cyan-400/20"
              >
                <UploadCloud className="w-4 h-4 group-hover:-translate-y-1 transition-transform text-cyan-400" />
                Go to Dashboard
              </Link>
            ) : (
              <Link 
                href="/dashboard" 
                className="glass hover:bg-white/10 transition-all duration-300 px-10 py-5 rounded-[2rem] flex items-center justify-center gap-3 text-white font-semibold font-space tracking-widest text-xs uppercase group cursor-pointer shadow-[0_0_30px_rgba(34,211,238,0.15)] border-t border-cyan-400/20"
              >
                <UploadCloud className="w-4 h-4 group-hover:-translate-y-1 transition-transform text-cyan-400" />
                Launch Demo Studio
              </Link>
            )}
          </div>
        </div>

        {/* Premium Bento Grid */}
        <BentoArchitectureGrid />

        {/* Command Palette Fullscreen Modal Overlay */}
        <AnimatePresence>
          {isPaletteOpen && (
            <CommandPaletteModal 
              isOpen={isPaletteOpen} 
              onClose={() => setIsPaletteOpen(false)} 
            />
          )}
        </AnimatePresence>
      </main>
    </LazyMotion>
  );
}
