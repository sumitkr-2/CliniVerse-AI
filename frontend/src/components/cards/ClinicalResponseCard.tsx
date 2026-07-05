import React from "react";
import {
  FileText,
  Activity,
  AlertTriangle,
  Pill,
  Heart,
  Utensils,
  HelpCircle,
  Stethoscope,
  AlertCircle,
  Shield,
} from "lucide-react";
import { LabResultCard, LabResult } from "./LabResultCard";

interface Section {
  title: string;
  type: "summary" | "diagnosis" | "evidence" | "abnormal" | "treatments" | "lifestyle" | "tests" | "urgency" | "disclaimer" | "general";
  content: string;
}

interface ClinicalResponseCardProps {
  content: string;
}

export const ClinicalResponseCard: React.FC<ClinicalResponseCardProps> = ({ content }) => {
  // Parse sections based on header keywords
  const parseSections = (text: string): Section[] => {
    const lines = text.split("\n");
    const sections: Section[] = [];
    let currentSection: Section | null = null;

    const headerRegex = /^(?:#|##|###)\s+(.+)$/;

    for (const line of lines) {
      const match = line.match(headerRegex);
      if (match) {
        if (currentSection) {
          sections.push(currentSection);
        }
        const title = match[1].trim();
        let type: Section["type"] = "general";

        const lowerTitle = title.toLowerCase();
        if (lowerTitle.includes("clinical summary")) type = "summary";
        else if (lowerTitle.includes("most likely")) type = "diagnosis";
        else if (lowerTitle.includes("evidence")) type = "evidence";
        else if (lowerTitle.includes("abnormal")) type = "abnormal";
        else if (lowerTitle.includes("treatment")) type = "treatments";
        else if (lowerTitle.includes("diet") || lowerTitle.includes("lifestyle")) type = "lifestyle";
        else if (lowerTitle.includes("follow-up") || lowerTitle.includes("test")) type = "tests";
        else if (lowerTitle.includes("urgency")) type = "urgency";
        else if (lowerTitle.includes("disclaimer")) type = "disclaimer";

        currentSection = { title, type, content: "" };
      } else {
        if (currentSection) {
          currentSection.content += line + "\n";
        } else if (line.trim()) {
          currentSection = { title: "Doctor AI Summary", type: "summary", content: line + "\n" };
        }
      }
    }

    if (currentSection) {
      sections.push(currentSection);
    }

    return sections;
  };

  // Extract structured lab results from raw text lines
  const parseLabResults = (sectionText: string): LabResult[] => {
    const results: LabResult[] = [];
    const lines = sectionText.split("\n");
    
    // Pattern: "Hemoglobin: 13.2 g/dL (Normal)" or "- Platelets: 90000 /uL - Low" or similar
    const labPattern = /(?:[-*+]\s*)?([A-Za-z0-9\s]+)[:|-]\s*([0-9\.]+)\s*([A-Za-z\/%\d\.\-_]+)?(?:\s*[\(\[-]\s*(Normal|High|Low|Critical)[\)\]-])?/i;

    for (const line of lines) {
      const match = line.match(labPattern);
      if (match) {
        const name = match[1].trim();
        const value = match[2].trim();
        const unit = match[3] ? match[3].trim() : "";
        let status: LabResult["status"] = "Normal";

        if (match[4]) {
          const matchedStatus = match[4].toLowerCase();
          if (matchedStatus.includes("high")) status = "High";
          else if (matchedStatus.includes("low")) status = "Low";
          else if (matchedStatus.includes("critical")) status = "Critical";
        } else {
          // Attempt implicit status check
          const lowerLine = line.toLowerCase();
          if (lowerLine.includes("high") || lowerLine.includes("elevated")) status = "High";
          else if (lowerLine.includes("low") || lowerLine.includes("decreased")) status = "Low";
          else if (lowerLine.includes("critical") || lowerLine.includes("danger")) status = "Critical";
        }

        results.push({ name, value, unit, status });
      }
    }

    return results;
  };

  const sections = parseSections(content);

  const sectionConfigs = {
    summary: { icon: Stethoscope, color: "border-cyan-500/30 bg-cyan-950/5 text-cyan-400" },
    diagnosis: { icon: Heart, color: "border-red-500/30 bg-red-950/5 text-red-400" },
    evidence: { icon: FileText, color: "border-indigo-500/30 bg-indigo-950/5 text-indigo-400" },
    abnormal: { icon: AlertTriangle, color: "border-amber-500/30 bg-amber-950/5 text-amber-400" },
    treatments: { icon: Pill, color: "border-purple-500/30 bg-purple-950/5 text-purple-400" },
    lifestyle: { icon: Utensils, color: "border-yellow-500/30 bg-yellow-950/5 text-yellow-400" },
    tests: { icon: HelpCircle, color: "border-teal-500/30 bg-teal-950/5 text-teal-400" },
    urgency: { icon: AlertCircle, color: "border-rose-500 bg-rose-950/20 text-rose-400 animate-pulse-once" },
    disclaimer: { icon: Shield, color: "border-slate-800 bg-slate-950 text-slate-500" },
    general: { icon: Activity, color: "border-slate-800 bg-slate-900/30 text-slate-400" },
  };

  // Simple custom formatter to render clean markdown within a section
  const formatSectionText = (text: string) => {
    return text.split("\n").map((line, idx) => {
      // Bold text formatting **text**
      const boldPattern = /\*\*(.*?)\*\"/g;
      const parts = line.split(boldPattern);
      
      const renderedLine = parts.map((part, index) => {
        if (index % 2 === 1) {
          return <strong key={index} className="font-extrabold text-white">{part}</strong>;
        }
        return part;
      });

      if (line.trim().startsWith("-") || line.trim().startsWith("*")) {
        return (
          <li key={idx} className="ml-4 list-disc text-slate-300 text-xs leading-relaxed mt-1">
            {renderedLine}
          </li>
        );
      }

      if (!line.trim()) return <div key={idx} className="h-2" />;

      return (
        <p key={idx} className="text-slate-300 text-xs leading-relaxed mt-1">
          {renderedLine}
        </p>
      );
    });
  };

  return (
    <div className="space-y-6 w-full">
      {sections.map((section, idx) => {
        const config = sectionConfigs[section.type] || sectionConfigs.general;
        const Icon = config.icon;
        
        // Render custom LabResultCards for the abnormal findings section
        const labResults = section.type === "abnormal"
          ? parseLabResults(section.content) 
          : [];

        return (
          <div
            key={idx}
            className={`border rounded-2xl p-5 shadow-lg ${config.color}`}
          >
            <div className="flex items-center gap-2.5 border-b border-slate-900 pb-3 mb-3">
              <Icon className="h-5 w-5" />
              <h3 className="text-sm font-black tracking-wide uppercase">{section.title}</h3>
            </div>

            {labResults.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                {labResults.map((result, rIdx) => (
                  <LabResultCard key={rIdx} result={result} />
                ))}
              </div>
            ) : (
              <div className="space-y-1.5 mt-2">
                {formatSectionText(section.content)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
