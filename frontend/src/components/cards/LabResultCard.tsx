import React from "react";
import { AlertCircle, CheckCircle, AlertTriangle } from "lucide-react";

export interface LabResult {
  name: string;
  value: string;
  unit: string;
  status: "Normal" | "High" | "Low" | "Critical";
  referenceRange?: string;
}

interface LabResultCardProps {
  result: LabResult;
}

export const LabResultCard: React.FC<LabResultCardProps> = ({ result }) => {
  const { name, value, unit, status, referenceRange } = result;

  const statusConfigs = {
    Normal: {
      color: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
      badge: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
      icon: CheckCircle,
    },
    High: {
      color: "bg-rose-500/10 border-rose-500/30 text-rose-400",
      badge: "bg-rose-500/20 text-rose-400 border-rose-500/30",
      icon: AlertCircle,
    },
    Low: {
      color: "bg-amber-500/10 border-amber-500/30 text-amber-400",
      badge: "bg-amber-500/20 text-amber-400 border-amber-500/30",
      icon: AlertTriangle,
    },
    Critical: {
      color: "bg-red-950/40 border-red-500/40 text-red-400",
      badge: "bg-red-500 text-white border-red-400",
      icon: AlertCircle,
      pulse: "animate-pulse",
    },
  };

  const config = statusConfigs[status] || statusConfigs.Normal;
  const StatusIcon = config.icon;

  return (
    <div
      className={`border rounded-xl p-4 flex items-center justify-between transition-all hover:scale-[1.01] hover:border-slate-800 bg-slate-950/40 ${config.color} ${
        "pulse" in config ? config.pulse : ""
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
          <StatusIcon className="h-4 w-4" />
        </div>
        <div>
          <h4 className="text-xs font-bold text-slate-200">{name}</h4>
          {referenceRange && (
            <p className="text-[10px] text-slate-500 mt-0.5">Ref: {referenceRange}</p>
          )}
        </div>
      </div>

      <div className="text-right">
        <div className="flex items-baseline justify-end gap-1">
          <span className="text-sm font-black text-white">{value}</span>
          <span className="text-[9px] text-slate-500 font-medium">{unit}</span>
        </div>
        <span
          className={`inline-block text-[8px] font-bold px-2 py-0.5 rounded-full border mt-1.5 uppercase tracking-wide ${config.badge}`}
        >
          {status}
        </span>
      </div>
    </div>
  );
};
