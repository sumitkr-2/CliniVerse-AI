import React, { useEffect, useState } from "react";
import {
  BarChart3,
  FileText,
  CheckCircle2,
  Clock,
  Layers,
  HardDrive,
  Scan,
  Zap,
  Shield,
  RefreshCw,
} from "lucide-react";
import axiosInstance from "../lib/axios";

export interface ReportStats {
  total_reports: number;
  processed_reports: number;
  pending_reports: number;
  total_chunks: number;
  total_size_bytes: number;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export const Analytics: React.FC = () => {
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const response = await axiosInstance.get<ReportStats>("/reports/stats");
      setStats(response.data);
    } catch (err) {
      console.warn("Failed to fetch stats", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 15000); // Refresh stats every 15s
    return () => clearInterval(interval);
  }, []);

  const processingRate = stats && stats.total_reports > 0
    ? Math.round((stats.processed_reports / stats.total_reports) * 100)
    : 0;

  const analyticsCards = [
    {
      title: "Total Reports",
      value: stats?.total_reports ?? "0",
      subtitle: "All uploaded documents",
      icon: FileText,
      color: "text-cyan-400",
      bg: "bg-cyan-500/10",
      border: "border-cyan-500/20",
    },
    {
      title: "Indexed Documents",
      value: stats?.processed_reports ?? "0",
      subtitle: "AI-ready for queries",
      icon: CheckCircle2,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
    },
    {
      title: "Pending Analysis",
      value: stats?.pending_reports ?? "0",
      subtitle: "Awaiting processing",
      icon: Clock,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
    },
    {
      title: "Total Chunks",
      value: stats?.total_chunks ?? "0",
      subtitle: "Indexed text segments",
      icon: Layers,
      color: "text-indigo-400",
      bg: "bg-indigo-500/10",
      border: "border-indigo-500/20",
    },
    {
      title: "Storage Used",
      value: stats ? formatBytes(stats.total_size_bytes) : "0 B",
      subtitle: "Total upload size",
      icon: HardDrive,
      color: "text-purple-400",
      bg: "bg-purple-500/10",
      border: "border-purple-500/20",
    },
    {
      title: "Index Coverage",
      value: `${processingRate}%`,
      subtitle: "Reports indexed for AI",
      icon: Scan,
      color: "text-rose-400",
      bg: "bg-rose-500/10",
      border: "border-rose-500/20",
    },
  ];

  return (
    <div className="p-8 space-y-8">
      {/* Title Bar */}
      <div className="relative overflow-hidden border border-slate-900 bg-slate-950 p-6 rounded-3xl">
        <div className="absolute top-0 right-0 w-96 h-64 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-full blur-3xl -z-10" />
        <div className="flex items-center gap-3">
          <div className="bg-indigo-500/10 border border-indigo-500/20 p-2.5 rounded-xl text-indigo-400">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white uppercase tracking-wider">Patient Analytics</h2>
            <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold mt-0.5">Real-time document intelligence overview</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-8 w-8 text-cyan-400 animate-spin" />
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {analyticsCards.map((card, i) => (
              <div
                key={i}
                className="border border-slate-900 bg-slate-950 p-5 rounded-2xl hover:border-slate-800 transition-all group shadow-md"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`${card.bg} border ${card.border} p-2.5 rounded-xl ${card.color} group-hover:scale-105 transition-transform`}>
                    <card.icon className="h-4 w-4" />
                  </div>
                </div>
                <div className="space-y-0.5">
                  <div className={`text-2xl font-black ${card.color}`}>{card.value}</div>
                  <div className="text-xs font-bold text-slate-300">{card.title}</div>
                  <div className="text-[10px] text-slate-500 font-semibold">{card.subtitle}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Progress bar */}
          {stats && stats.total_reports > 0 && (
            <div className="border border-slate-900 bg-slate-950 p-6 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Index Coverage Rate</h3>
                <span className="text-xs font-black text-cyan-400">{processingRate}%</span>
              </div>
              <div className="h-2.5 bg-slate-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-full transition-all duration-1000"
                  style={{ width: `${processingRate}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold">
                <span>{stats.processed_reports} reports fully indexed</span>
                <span>{stats.pending_reports} pending processing</span>
              </div>
            </div>
          )}

          {/* Cards Guide */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                icon: Scan,
                title: "OCR DOCUMENT SCANNING",
                desc: "Re-scan any image-only or fuzzy PDF documents to re-run optical character extraction and update vector databases.",
                color: "text-purple-400",
                bg: "bg-purple-500/10",
                border: "border-purple-500/20",
              },
              {
                icon: Zap,
                title: "AUTO-ANALYZE PIPELINE",
                desc: "Uploaded files automatically trigger parallel cleaning, chunking, and embedding. No manual CPU steps needed.",
                color: "text-cyan-400",
                bg: "bg-cyan-500/10",
                border: "border-cyan-500/20",
              },
              {
                icon: Shield,
                title: "SECURE SCOPED CONTEXT",
                desc: "Each query runs RAG checks scoped isolated strictly to your database credential user. Zero risk of cross-patient leak.",
                color: "text-emerald-400",
                bg: "bg-emerald-500/10",
                border: "border-emerald-500/20",
              },
            ].map((card, i) => (
              <div key={i} className="border border-slate-900 bg-slate-950 p-5 rounded-2xl space-y-3">
                <div className={`${card.bg} border ${card.border} p-2.5 rounded-xl ${card.color} w-fit`}>
                  <card.icon className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white tracking-wide">{card.title}</h4>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{card.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
