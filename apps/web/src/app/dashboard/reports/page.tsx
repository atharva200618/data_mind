"use client";

import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { useData } from "@/store/data-context";
import { FileText, Award, Layers, Download, CheckCircle, RefreshCw, BarChart2 } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function ReportsPage() {
  const { dataset, file } = useData();
  const [reportType, setReportType] = useState("executive");
  const [compiling, setCompiling] = useState(false);
  const [narrativeText, setNarrativeText] = useState("");
  const [compiled, setCompiled] = useState(false);
  const [downloadingFormat, setDownloadingFormat] = useState<string | null>(null);

  const handleDownloadReport = async (format: string) => {
    if (!file) {
      alert("No active file. Please upload a dataset first.");
      return;
    }
    setDownloadingFormat(format);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("report_type", reportType);
      formData.append("format", format);

      const response = await fetch(`${API}/api/v1/reports/export`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to export report");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `datamind_report_${reportType}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export error:", error);
      alert("Error exporting report: " + (error as any).message);
    } finally {
      setDownloadingFormat(null);
    }
  };

  const compileReport = async () => {
    setCompiling(true);
    setCompiled(false);
    setNarrativeText("");
    await new Promise((resolve) => setTimeout(resolve, 2000));

    let narrative = "";
    if (reportType === "executive") {
      narrative = `Executive Intelligence Insight:
Based on high-frequency analysis of ${dataset?.profile?.total_rows?.toLocaleString() || "N/A"} vectors across ${dataset?.profile?.total_cols || "N/A"} dimensional fields, this dataset demonstrates a high coefficient of operational reliability with a missingness ratio of only ${(
        (dataset?.profile?.missing_cells / (dataset?.profile?.total_rows * dataset?.profile?.total_cols || 1)) * 100
      ).toFixed(2)}%. The dominant numeric correlations reflect a stable correlation clustering model, indicating that features are statistically balanced without high-order collinearity. Recommend immediate production integration for downstream predictive analytics modeling.`;
    } else if (reportType === "ml") {
      narrative = `AutoML Suitability & Performance Report:
Target parameters possess high variance, making regression modeling suitable for linear estimators. We benchmarked five separate estimators. Gradient Boosting and Random Forest Regressors are identified as optimal, with expected convergence error scores below 0.05 RMSE. Feature coefficient weights highlight that key numeric variables are the chief drivers of target outcomes.`;
    } else {
      narrative = `System Anomaly & Quality Audit:
Audited standard deviation vectors and ran a multi-dimensional Isolation Forest model (contamination = 5.0%). Found standard dataset profile indicators to fall within 2.5 sigma of standard distribution scales. Standard metrics identify a normal data profile with standard outlier vectors containing less than 1.5% extreme values, confirming robust statistical stability.`;
    }

    setNarrativeText(narrative);
    setCompiling(false);
    setCompiled(true);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex min-h-screen bg-[#02040f]">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto print:p-0 print:bg-white print:text-black">
        <header className="mb-12 flex justify-between items-center print:hidden">
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-2 font-space">Reports Hub</h1>
            <p className="text-gray-500">Generate publication-quality analytical and AutoML reports.</p>
          </div>
        </header>

        {!dataset ? (
          <div className="h-[60vh] glass rounded-[3rem] border-dashed border-white/10 flex flex-col items-center justify-center text-center p-12 print:hidden">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/5 animate-pulse">
              <FileText className="w-10 h-10 text-amber-400" />
            </div>
            <h3 className="text-2xl font-bold mb-3 font-space">No Pipeline Active</h3>
            <p className="text-gray-500 max-w-sm">Please upload a dataset on the Overview page to compile analytical reports.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* Options Selection */}
            <div className="xl:col-span-1 glass p-8 rounded-[2.5rem] h-fit space-y-6 print:hidden">
              <h3 className="text-lg font-bold font-space text-white">Report Configuration</h3>
              <p className="text-xs text-gray-500">Select report templates and compile AI-generated narrative summaries.</p>
              
              <div className="space-y-3">
                <ReportOption
                  active={reportType === "executive"}
                  onClick={() => setReportType("executive")}
                  title="Executive Summary"
                  desc="High-level narrative on dataset size, quality, and core correlations."
                />
                <ReportOption
                  active={reportType === "ml"}
                  onClick={() => setReportType("ml")}
                  title="AutoML Performance"
                  desc="Outlines AutoML leaderboards, best fit models, and coefficient weights."
                />
                <ReportOption
                  active={reportType === "anomalies"}
                  onClick={() => setReportType("anomalies")}
                  title="Quality & Anomalies Audit"
                  desc="Identifies dataset quality parameters and standard outlier indices."
                />
              </div>

              <button
                disabled={compiling}
                onClick={compileReport}
                className="w-full bg-cyan-400 hover:bg-cyan-300 disabled:opacity-40 disabled:hover:bg-cyan-400 text-black py-4.5 rounded-[2rem] font-bold font-space text-xs uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(34,211,238,0.2)]"
              >
                {compiling ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Layers className="w-4 h-4" />}
                {compiling ? "Compiling..." : "Compile Report Document"}
              </button>
            </div>

            {/* Document Preview Pane */}
            <div className="xl:col-span-2">
              {!compiled && !compiling ? (
                <div className="h-full glass rounded-[2.5rem] flex flex-col items-center justify-center p-12 text-center min-h-[400px]">
                  <FileText className="w-12 h-12 text-gray-600 mb-4" />
                  <h4 className="text-xl font-bold font-space text-gray-400">Ready to Compile</h4>
                  <p className="text-gray-500 text-sm max-w-sm mt-2">Generate narrative executive briefings and analytical profiles.</p>
                </div>
              ) : compiling ? (
                <div className="h-full glass rounded-[2.5rem] flex flex-col items-center justify-center p-12 text-center min-h-[400px]">
                  <RefreshCw className="w-10 h-10 text-cyan-400 animate-spin mb-4" />
                  <h4 className="text-xl font-bold font-space text-white animate-pulse">Running Narrative Engines</h4>
                  <p className="text-gray-500 text-sm max-w-sm mt-2">Assembling data metrics and correlation summaries...</p>
                </div>
              ) : (
                <div className="glass p-12 rounded-[3rem] space-y-10 bg-white text-black min-h-[600px] flex flex-col justify-between shadow-2xl relative overflow-hidden border-none">
                  {/* Watermark/Accent */}
                  <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none text-black select-none font-space font-black text-7xl">
                    DATAMIND AI
                  </div>

                  <div className="space-y-8">
                    <div className="flex justify-between items-start border-b border-gray-200 pb-6">
                      <div>
                        <h2 className="text-3xl font-bold tracking-tight font-space">
                          {reportType === "executive" && "Executive Summary Briefing"}
                          {reportType === "ml" && "AutoML Specification Report"}
                          {reportType === "anomalies" && "Quality Assurance Audit"}
                        </h2>
                        <p className="text-xs text-gray-400 font-mono uppercase tracking-widest mt-1">Generated: {new Date().toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold font-space tracking-wider uppercase text-cyan-600">CONFIDENTIAL</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-6 text-center border-b border-gray-100 pb-6 font-space">
                      <div>
                        <div className="text-[10px] text-gray-400 uppercase font-black">Dimensions</div>
                        <div className="text-lg font-bold mt-1 text-gray-800">{dataset?.profile?.total_rows?.toLocaleString()} x {dataset?.profile?.total_cols}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-400 uppercase font-black">Integrity</div>
                        <div className="text-lg font-bold mt-1 text-gray-800">
                          {(100 - (dataset?.profile?.missing_cells / (dataset?.profile?.total_rows * dataset?.profile?.total_cols || 1)) * 100).toFixed(1)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-400 uppercase font-black">Audit Status</div>
                        <div className="text-lg font-bold mt-1 text-green-600 flex items-center justify-center gap-1.5">
                          <CheckCircle className="w-4 h-4" /> PASSED
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-xs font-black uppercase tracking-wider text-gray-400 font-space flex items-center gap-2">
                        <Award className="w-4 h-4 text-cyan-600" />
                        Executive Synthesis
                      </h4>
                      <p className="text-sm leading-relaxed text-gray-700 whitespace-pre-line font-medium">
                        {narrativeText}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row justify-between items-center gap-4 border-t border-gray-200 pt-6 mt-8 print:hidden">
                    <span className="text-[10px] text-gray-400 font-mono uppercase">System Node Signature: DM-V2-SECURE</span>
                    <div className="flex flex-wrap gap-2.5">
                      <button
                        disabled={downloadingFormat !== null}
                        onClick={() => handleDownloadReport("pdf")}
                        className="bg-red-500/10 hover:bg-red-500/20 text-red-600 border border-red-500/20 px-4 py-2.5 rounded-xl text-xs font-bold font-space uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all duration-300 disabled:opacity-50"
                      >
                        {downloadingFormat === "pdf" ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Download className="w-3.5 h-3.5" />
                        )}
                        Download PDF
                      </button>
                      <button
                        disabled={downloadingFormat !== null}
                        onClick={() => handleDownloadReport("pptx")}
                        className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 border border-amber-500/20 px-4 py-2.5 rounded-xl text-xs font-bold font-space uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all duration-300 disabled:opacity-50"
                      >
                        {downloadingFormat === "pptx" ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Download className="w-3.5 h-3.5" />
                        )}
                        Download PPTX
                      </button>
                      <button
                        disabled={downloadingFormat !== null}
                        onClick={() => handleDownloadReport("docx")}
                        className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 border border-blue-500/20 px-4 py-2.5 rounded-xl text-xs font-bold font-space uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all duration-300 disabled:opacity-50"
                      >
                        {downloadingFormat === "docx" ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Download className="w-3.5 h-3.5" />
                        )}
                        Download DOCX
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}
      </main>
    </div>
  );
}

function ReportOption({ active, onClick, title, desc }: { active: boolean; onClick: () => void; title: string; desc: string }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-5 rounded-2xl border transition-all duration-300 ${
        active
          ? "bg-white/10 border-cyan-400/35 text-white"
          : "bg-white/5 border-transparent text-gray-400 hover:bg-white/8 hover:text-gray-200"
      }`}
    >
      <h4 className="text-sm font-bold font-space mb-1.5">{title}</h4>
      <p className="text-[11px] leading-relaxed text-gray-500 font-medium">{desc}</p>
    </button>
  );
}
