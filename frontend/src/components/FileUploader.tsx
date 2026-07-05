import React, { useCallback, useEffect, useState } from "react";
import axiosInstance from "../lib/axios";
import {
  AlertCircle,
  CheckCircle2,
  Cpu,
  Download,
  Eye,
  FileText,
  Loader2,
  Scan,
  Trash2,
  UploadCloud,
  X,
  Clock,
  BarChart3,
} from "lucide-react";

interface Report {
  id: number;
  filename: string;
  file_size: number;
  content_type: string;
  uploaded_at: string;
  user_id: number;
  is_processed: boolean;
  chunk_count: number;
}

interface ReportChunk {
  id: number;
  report_id: number;
  page_number: number;
  chunk_index: number;
  content: string;
}

export const FileUploader: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [autoProcess, setAutoProcess] = useState(true);

  // Processing & Chunk Inspector State
  const [processingReportId, setProcessingReportId] = useState<number | null>(null);
  const [scanningReportId, setScanningReportId] = useState<number | null>(null);
  const [processingStage, setProcessingStage] = useState<string | null>(null);
  const [inspectingReport, setInspectingReport] = useState<Report | null>(null);
  const [chunks, setChunks] = useState<ReportChunk[]>([]);
  const [chunksLoading, setChunksLoading] = useState(false);

  const fetchReports = useCallback(async () => {
    try {
      const response = await axiosInstance.get<Report[]>("/reports");
      setReports(response.data);
    } catch (err) {
      console.error("Failed to load reports", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Auto-dismiss notifications
  useEffect(() => {
    if (error || success) {
      const t = setTimeout(() => { setError(""); setSuccess(""); }, 6000);
      return () => clearTimeout(t);
    }
  }, [error, success]);

  // Handle Drag Events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // Process File Upload
  const uploadFile = async (file: File) => {
    if (file.type !== "application/pdf") {
      setError("Invalid file type. Only PDF clinical reports are accepted.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("File is too large. Maximum size is 10MB.");
      return;
    }

    setError("");
    setSuccess("");
    setUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const uploadResponse = await axiosInstance.post<Report>("/reports/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percent);
          }
        },
      });

      setSuccess(`"${file.name}" uploaded successfully.`);
      await fetchReports();

      // Auto-process if toggle is on
      if (autoProcess && uploadResponse.data?.id) {
        setUploading(false);
        handleProcessPdf(uploadResponse.data.id, file.name, true);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to upload file.");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // Handle Drop Event
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadFile(e.dataTransfer.files[0]);
    }
  };

  // Handle Input Select Event
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      uploadFile(e.target.files[0]);
      e.target.value = "";
    }
  };

  // Helper to start stage transitions
  const startStageAnimation = () => {
    const stages = [
      "Reading report...",
      "Extracting text...",
      "Finding important information...",
      "Generating AI summary..."
    ];
    let currentIdx = 0;
    setProcessingStage(stages[0]);
    
    const interval = setInterval(() => {
      currentIdx = Math.min(currentIdx + 1, stages.length - 1);
      setProcessingStage(stages[currentIdx]);
    }, 2000); // cycle stages every 2 seconds
    
    return interval;
  };

  // Process PDF Text Extraction & Chunking
  const handleProcessPdf = async (reportId: number, filename: string, silent = false) => {
    if (!silent) { setError(""); setSuccess(""); }
    setProcessingReportId(reportId);
    const interval = startStageAnimation();

    try {
      await axiosInstance.post<ReportChunk[]>(`/reports/${reportId}/process`);
      if (!silent) setSuccess(`✅ Successfully analyzed "${filename}". Ready for AI queries.`);
      await fetchReports();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to parse text from PDF.");
    } finally {
      clearInterval(interval);
      setProcessingReportId(null);
      setProcessingStage(null);
    }
  };

  // OCR Scan: Re-process with scan mode
  const handleScanPdf = async (reportId: number, filename: string) => {
    setError(""); setSuccess("");
    setScanningReportId(reportId);
    const interval = startStageAnimation();

    try {
      await axiosInstance.post<ReportChunk[]>(`/reports/${reportId}/process`);
      setSuccess(`✅ Scan complete for "${filename}". Content re-indexed.`);
      await fetchReports();
      const updatedReport = reports.find((r) => r.id === reportId) || null;
      if (updatedReport) handleInspectChunks(reportId, filename);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Scan failed. Please try again.");
    } finally {
      clearInterval(interval);
      setScanningReportId(null);
      setProcessingStage(null);
    }
  };

  // Inspect Chunks
  const handleInspectChunks = async (reportId: number, filename: string) => {
    setError("");
    setInspectingReport(reports.find((r) => r.id === reportId) || null);
    setChunksLoading(true);
    setChunks([]);

    try {
      const response = await axiosInstance.get<ReportChunk[]>(`/reports/${reportId}/chunks`);
      setChunks(response.data);
    } catch (err) {
      setError("No chunks found. Please run PDF analysis first.");
      setInspectingReport(null);
    } finally {
      setChunksLoading(false);
    }
  };

  // Download Report
  const handleDownload = async (reportId: number, filename: string) => {
    try {
      const response = await axiosInstance.get(`/reports/${reportId}/download`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (err) {
      setError("Failed to download file.");
    }
  };

  // Delete Report
  const handleDelete = async (reportId: number) => {
    if (!window.confirm("Are you sure you want to delete this clinical report?")) return;

    try {
      await axiosInstance.delete(`/reports/${reportId}`);
      setSuccess("Report deleted successfully.");
      if (inspectingReport?.id === reportId) {
        setInspectingReport(null);
        setChunks([]);
      }
      fetchReports();
    } catch (err) {
      setError("Failed to delete file.");
    }
  };

  // Format File Size
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const processedCount = reports.filter((r) => r.is_processed).length;

  return (
    <div className="space-y-6">
      {/* Header with Auto-Process Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Document Repository</h3>
          <p className="text-[10px] text-slate-500 mt-0.5 font-bold">
            {reports.length} Reports · {processedCount} Indexed
          </p>
        </div>
        <label className="flex items-center gap-2 cursor-pointer select-none group">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider group-hover:text-slate-300 transition-colors">
            Auto-Analyze
          </span>
          <div
            onClick={() => setAutoProcess(!autoProcess)}
            className={`relative w-9 h-5 rounded-full transition-all duration-300 ${
              autoProcess ? "bg-cyan-500" : "bg-slate-700"
            }`}
          >
            <div
              className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-300 ${
                autoProcess ? "left-4" : "left-0.5"
              }`}
            />
          </div>
        </label>
      </div>

      {/* Drag & Drop Upload Zone */}
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all relative overflow-hidden flex flex-col items-center justify-center min-h-[160px] ${
          dragActive
            ? "border-cyan-400 bg-cyan-500/5 shadow-lg shadow-cyan-500/10"
            : "border-slate-800 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-900/20"
        }`}
      >
        <input
          type="file"
          id="file-upload-input"
          accept=".pdf"
          onChange={handleFileInput}
          className="hidden"
        />
        <label
          htmlFor="file-upload-input"
          className="cursor-pointer flex flex-col items-center gap-2.5 w-full"
        >
          <div className={`p-3 rounded-xl border transition-all ${
            dragActive
              ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300"
              : "bg-slate-900 border-slate-800 text-cyan-400"
          }`}>
            <UploadCloud className="h-7 w-7" />
          </div>
          <div>
            <p className="text-xs text-slate-200 font-bold">
              Drop PDF here or{" "}
              <span className="text-cyan-400 font-extrabold hover:text-cyan-300 transition-colors underline underline-offset-2">
                browse files
              </span>
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5 font-semibold">
              PDF only · Max 10MB
              {autoProcess && (
                <span className="ml-1.5 text-cyan-500/70 font-extrabold">· AUTO-ANALYZE ENABLED</span>
              )}
            </p>
          </div>
        </label>

        {/* Upload & Processing Progress Overlay */}
        {(uploading || processingStage) && (
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 space-y-3.5 rounded-2xl">
            <Loader2 className="h-7 w-7 text-cyan-400 animate-spin" />
            <span className="text-xs text-slate-200 font-bold uppercase tracking-wider animate-pulse">
              {uploading ? `Uploading Document: ${uploadProgress}%` : processingStage}
            </span>
            <div className="w-full max-w-[200px] h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 transition-all duration-300 rounded-full"
                style={{ width: uploading ? `${uploadProgress}%` : "100%" }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Notifications */}
      {error && (
        <div className="flex items-start gap-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs px-4 py-3 rounded-xl">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span className="font-semibold">{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs px-4 py-3 rounded-xl">
          <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
          <span className="font-semibold">{success}</span>
        </div>
      )}

      {/* Reports List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between mb-1">
          <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Document Registry</h4>
          {reports.length > 0 && (
            <span className="text-[9px] text-slate-500 font-black uppercase tracking-wider">{processedCount}/{reports.length} Indexed</span>
          )}
        </div>

        <div className="border border-slate-900 bg-slate-950/30 rounded-2xl overflow-hidden shadow-sm">
          <div className="max-h-[280px] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-[150px]">
                <Loader2 className="h-5 w-5 text-slate-600 animate-spin" />
              </div>
            ) : reports.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[150px] text-slate-600 gap-2">
                <FileText className="h-7 w-7 text-slate-800" />
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Empty Repository</span>
              </div>
            ) : (
              <div className="divide-y divide-slate-900/50">
                {reports.map((report) => (
                  <div
                    key={report.id}
                    className={`px-4 py-3 flex items-center justify-between transition-all hover:bg-slate-900/30 ${
                      inspectingReport?.id === report.id ? "bg-cyan-950/10" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3 overflow-hidden min-w-0">
                      <div className={`p-2 rounded-lg border shrink-0 ${
                        report.is_processed
                          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                          : "bg-slate-800/50 border-slate-700/50 text-slate-500"
                      }`}>
                        <FileText className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-bold text-white truncate max-w-[130px]">
                            {report.filename}
                          </h4>
                          {report.is_processed ? (
                            <span className="shrink-0 text-[8px] font-black text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                              INDEXED
                            </span>
                          ) : (
                            <span className="shrink-0 text-[8px] font-black text-amber-400 bg-amber-950/30 border border-amber-800/30 px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                              PENDING
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5 font-bold">
                          {formatBytes(report.file_size)}
                          {report.chunk_count > 0 && (
                            <span className="ml-1.5 text-cyan-600">· {report.chunk_count} Chunks</span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-0.5 shrink-0">
                      {/* Scan */}
                      <button
                        onClick={() => handleScanPdf(report.id, report.filename)}
                        disabled={processingReportId !== null || scanningReportId !== null}
                        className="p-1.5 text-slate-500 hover:text-purple-400 hover:bg-purple-950/30 rounded-lg transition-all cursor-pointer disabled:opacity-30"
                        title="Re-run OCR Scanning"
                      >
                        {scanningReportId === report.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-400" />
                        ) : (
                          <Scan className="h-3.5 w-3.5" />
                        )}
                      </button>

                      {/* Analyze */}
                      <button
                        onClick={() => handleProcessPdf(report.id, report.filename)}
                        disabled={processingReportId !== null || scanningReportId !== null}
                        className="p-1.5 text-slate-500 hover:text-cyan-400 hover:bg-cyan-950/30 rounded-lg transition-all cursor-pointer disabled:opacity-30"
                        title="Analyze Document"
                      >
                        {processingReportId === report.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-400" />
                        ) : (
                          <Cpu className="h-3.5 w-3.5" />
                        )}
                      </button>

                      {/* View Chunks */}
                      <button
                        onClick={() => handleInspectChunks(report.id, report.filename)}
                        className="p-1.5 text-slate-500 hover:text-indigo-400 hover:bg-indigo-950/30 rounded-lg transition-all cursor-pointer"
                        title="View Extracted Chunks"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>

                      {/* Download */}
                      <button
                        onClick={() => handleDownload(report.id, report.filename)}
                        className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
                        title="Download Document"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => handleDelete(report.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-all cursor-pointer"
                        title="Delete Document"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chunk Inspector */}
      {inspectingReport && (
        <div className="border border-slate-800 bg-slate-950/60 rounded-2xl overflow-hidden shadow-inner">
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800/60 bg-slate-900/40">
            <div className="flex items-center gap-2.5">
              <BarChart3 className="h-4 w-4 text-indigo-400" />
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Chunk Inspector</h3>
                <p className="text-[9px] text-slate-500 mt-0.5 truncate max-w-[200px] font-bold">
                  {inspectingReport.filename} · {chunks.length} chunks
                </p>
              </div>
            </div>
            <button
              onClick={() => { setInspectingReport(null); setChunks([]); }}
              className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="max-h-[260px] overflow-y-auto p-4 space-y-3">
            {chunksLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-5 w-5 text-cyan-400 animate-spin" />
              </div>
            ) : chunks.length === 0 ? (
              <div className="text-center py-10 text-slate-600 text-xs flex flex-col items-center gap-2">
                <AlertCircle className="h-5 w-5 text-slate-700" />
                <span>No chunks yet. Run PDF analysis first.</span>
              </div>
            ) : (
              chunks.map((chunk, idx) => (
                <div key={chunk.id} className="border border-slate-850 bg-slate-900/40 p-3.5 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] text-cyan-400 bg-cyan-950/50 px-2 py-0.5 rounded-full border border-cyan-800/30 font-bold">
                      Page {chunk.page_number}
                    </span>
                    <span className="text-[9px] text-slate-500 font-bold">Chunk #{idx + 1}</span>
                  </div>
                  <p className="text-[10px] text-slate-300 leading-relaxed bg-slate-950/40 p-2.5 rounded-lg border border-slate-850 select-all font-mono max-h-[90px] overflow-y-auto">
                    {chunk.content}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
