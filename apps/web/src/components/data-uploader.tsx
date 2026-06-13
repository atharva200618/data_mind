"use client";

import { useState } from "react";
import { Upload, X, FileText, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface DataUploaderProps {
  onUploadSuccess: (data: any, file: File) => void;
}

export function DataUploader({ onUploadSuccess }: DataUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (fileToUpload: File) => {
    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append("file", fileToUpload);

    try {
      console.log("Starting upload to FastAPI...");
      const response = await fetch("http://localhost:8000/api/v1/analytics/profile", {
        method: "POST",
        body: formData,
        // Add a timeout signal to prevent infinite hanging
        signal: AbortSignal.timeout(30000), // 30 seconds
      });

      if (!response.ok) {
        const errorDetail = await response.text();
        console.error("Backend Error:", errorDetail);
        throw new Error(`Engine Error: ${response.status} - ${errorDetail || 'Check backend logs'}`);
      }

      const result = await response.json();
      console.log("Analysis Complete:", result);
      onUploadSuccess(result, fileToUpload);
      setFile(fileToUpload);
    } catch (err: any) {
      console.error("Upload Catch:", err);
      if (err.name === 'AbortError') {
        setError("Request timed out. The dataset might be too large for a local engine.");
      } else {
        setError(err.message || "Connection failed. Is the FastAPI server running on port 8000?");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const droppedFile = e.dataTransfer.files[0];
          if (droppedFile) handleUpload(droppedFile);
        }}
        className={cn(
          "relative group transition-all duration-500 rounded-[2rem] border-2 border-dashed p-12 text-center",
          isDragging ? "border-cyan-400 bg-cyan-500/5" : "border-white/10 bg-white/[0.02] hover:bg-white/[0.04]",
          loading && "opacity-50 pointer-events-none"
        )}
      >
        {!loading && (
          <input
            type="file"
            accept=".csv,.xlsx"
            className="absolute inset-0 opacity-0 cursor-pointer"
            onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
          />
        )}
        
        <div className="flex flex-col items-center">
          {loading ? (
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-12 h-12 text-cyan-400 animate-spin" />
              <div className="space-y-1">
                <h3 className="text-xl font-semibold text-white">Processing Engine...</h3>
                <p className="text-gray-500 text-xs animate-pulse">Running statistical models on your data</p>
              </div>
            </div>
          ) : (
            <>
              <div className={cn(
                "w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-all duration-300",
                file ? "bg-green-500/20 text-green-400 border border-green-500/20" : "bg-white/5 text-gray-400 group-hover:bg-cyan-500/10 group-hover:text-cyan-400 border border-white/10"
              )}>
                {file ? <CheckCircle2 className="w-8 h-8" /> : <Upload className="w-8 h-8" />}
              </div>
              <h3 className="text-xl font-bold mb-2 text-white">
                {file ? file.name : "Drop your dataset here"}
              </h3>
              <p className="text-gray-500 text-sm max-w-xs mx-auto">
                {file ? `Ready for further analysis` : "Support for CSV and Excel files. Our engine will auto-profile your schema."}
              </p>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-6 p-5 rounded-[1.5rem] bg-red-500/5 border border-red-500/20 flex items-start gap-4 text-red-400 animate-in fade-in slide-in-from-top-4 duration-500">
          <AlertCircle className="w-6 h-6 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-sm mb-1">Engine Failure</h4>
            <p className="text-xs leading-relaxed opacity-80">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}
