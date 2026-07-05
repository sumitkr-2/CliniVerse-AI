import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { FileUploader } from "../components/FileUploader";
import { ChatPane, Message } from "../components/chat/ChatPane";
import { VoiceConsole } from "../components/voice/VoiceConsole";
import { Analytics } from "./Analytics";
import axiosInstance from "../lib/axios";
import {
  Activity,
  HeartPulse,
  TrendingUp,
  Brain,
  Users,
  LogOut,
  Sparkles,
  Database,
  Server,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

type PageMode = "dashboard" | "analytics";

export const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [pageMode, setPageMode] = useState<PageMode>("dashboard");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "# Medical Summary\nWelcome back! I am **MediMind AI**, your healthcare RAG agent. Upload medical documents to begin, or ask a question directly about previously indexed reports.",
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [typing, setTyping] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [health, setHealth] = useState<any>(null);
  const [healthLoading, setHealthLoading] = useState(true);

  // Keep track of the last assistant response for voice TTS
  const [lastAiResponse, setLastAiResponse] = useState<string | undefined>(undefined);

  // Load chat history from backend on mount
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const response = await axiosInstance.get<any[]>("/chat/history");
        if (response.data && response.data.length > 0) {
          const formatted = response.data.map((msg, idx) => ({
            id: `history-${idx}`,
            role: msg.role,
            content: msg.content,
          }));
          setMessages(formatted);
        }
      } catch (err) {
        console.warn("Failed to load chat history:", err);
      }
    };

    const fetchStats = async () => {
      try {
        const response = await axiosInstance.get("/reports/stats");
        setStats(response.data);
      } catch (err) {
        console.warn("Failed to fetch stats:", err);
      }
    };

    const checkHealth = async () => {
      try {
        const response = await axiosInstance.get("/health");
        setHealth(response.data);
      } catch (err) {
        setHealth({
          status: "offline",
          services: { api: "offline", database: "offline" },
        });
      } finally {
        setHealthLoading(false);
      }
    };

    loadHistory();
    fetchStats();
    checkHealth();

    const interval = setInterval(fetchStats, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleSendMessage = async (e: React.FormEvent | null, overrideText?: string, mode?: string) => {
    if (e) e.preventDefault();
    const queryText = overrideText || inputMessage;
    if (!queryText.trim()) return;

    if (!overrideText) {
      setInputMessage("");
    }

    const userMsgId = `user-${Date.now()}`;
    const botMsgId = `bot-${Date.now()}`;

    setMessages((prev) => [...prev, { id: userMsgId, role: "user", content: queryText }]);
    setTyping(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 180000); // 3 min timeout

    try {
      const token = localStorage.getItem("access_token");
      const API_URL = (import.meta.env.VITE_API_URL as string) || "http://localhost/api/v1";

      const response = await fetch(`${API_URL}/chat/ask`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ query: queryText, mode }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder("utf-8");
      if (!reader) throw new Error("Null stream reader");

      setTyping(false);
      setMessages((prev) => [...prev, { id: botMsgId, role: "assistant", content: "" }]);

      let accumulated = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;

        setMessages((prev) =>
          prev.map((msg) => (msg.id === botMsgId ? { ...msg, content: accumulated } : msg))
        );
      }

      // Save for TTS voice console
      setLastAiResponse(accumulated);

      // Trigger stats reload to update active indicators
      const statsRes = await axiosInstance.get("/reports/stats");
      setStats(statsRes.data);
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.error(err);
      setTyping(false);
      const isTimeout = err?.name === "AbortError";
      const errMsg = isTimeout
        ? "⏱️ **Timeout**: AI took too long. Try a shorter query."
        : "⚠️ **Error**: Chat failed. Please verify documents are indexed and try again.";

      setMessages((prev) => [
        ...prev,
        { id: `err-${Date.now()}`, role: "assistant", content: errMsg },
      ]);
    }
  };

  const handleClearHistory = async () => {
    if (!window.confirm("Are you sure you want to clear your conversation history?")) return;
    try {
      await axiosInstance.post("/chat/clear");
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content:
            "# Medical Summary\nChat history cleared. How can I assist you with your health records today?",
        },
      ]);
      setLastAiResponse(undefined);
    } catch (err) {
      console.error("Failed to clear history:", err);
    }
  };

  const suggestedQuestions = [
    {
      title: "📋 Medical Summary",
      desc: "Extract Chief Complaint and Findings",
      mode: "summary",
      query: "Generate a medical summary containing Chief Complaints and primary Diagnostics findings.",
    },
    {
      title: "🧪 Abnormal Lab Results",
      desc: "Flag values high/low reference ranges",
      mode: "labs",
      query: "Identify and analyze all lab report values, flagging abnormal reference indices.",
    },
    {
      title: "💊 Medication Interactions",
      desc: "Analyze dosage and contraindications",
      mode: "interaction",
      query: "Are there potential drug interactions or contraindications?",
    },
  ];

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-900 bg-slate-950 flex flex-col justify-between p-6 shrink-0 shadow-2xl">
        <div>
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-cyan-500/10 p-2.5 rounded-2xl border border-cyan-500/20 text-cyan-400">
              <Brain className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-black text-sm leading-tight tracking-widest bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent uppercase">
                MEDIMIND AI
              </h1>
              <span className="text-[9px] text-slate-500 font-extrabold tracking-widest uppercase block mt-0.5">
                Clinical Intelligence
              </span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="space-y-1">
            <button
              onClick={() => setPageMode("dashboard")}
              className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-bold uppercase tracking-wider rounded-xl transition-all border cursor-pointer ${
                pageMode === "dashboard"
                  ? "bg-slate-900 border-slate-800 text-cyan-400"
                  : "border-transparent text-slate-500 hover:text-slate-200 hover:bg-slate-900/35"
              }`}
            >
              <Activity className="h-4 w-4" />
              Clinical Dashboard
            </button>
            <button
              onClick={() => setPageMode("analytics")}
              className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-bold uppercase tracking-wider rounded-xl transition-all border cursor-pointer ${
                pageMode === "analytics"
                  ? "bg-slate-900 border-slate-800 text-cyan-400"
                  : "border-transparent text-slate-500 hover:text-slate-200 hover:bg-slate-900/35"
              }`}
            >
              <Users className="h-4 w-4" />
              Patient Analytics
            </button>
          </nav>

          {/* Voice controller widget */}
          {pageMode === "dashboard" && (
            <div className="mt-8">
              <VoiceConsole onSendMessage={handleTranscription => handleSendMessage(null, handleTranscription)} lastAiResponse={lastAiResponse} />
            </div>
          )}
        </div>

        {/* Status panel */}
        <div className="space-y-4">
          <div className="border border-slate-900 bg-slate-950/60 p-4 rounded-2xl shadow-inner">
            <h3 className="text-[9px] font-bold text-slate-500 tracking-widest uppercase mb-3 flex items-center gap-1.5">
              <Server className="h-3.5 w-3.5 text-slate-400" />
              Infrastructure Status
            </h3>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-[10px] font-semibold">
                <span className="text-slate-500">API Gateway</span>
                {healthLoading ? (
                  <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                ) : health?.services.api === "healthy" ? (
                  <span className="flex items-center gap-1 text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" /> Online
                  </span>
                ) : (
                  <span className="text-rose-400">Offline</span>
                )}
              </div>
              <div className="flex items-center justify-between text-[10px] font-semibold">
                <span className="text-slate-500">Database (PG)</span>
                {healthLoading ? (
                  <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                ) : health?.services.database === "healthy" ? (
                  <span className="flex items-center gap-1 text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" /> Online
                  </span>
                ) : (
                  <span className="text-rose-400">Offline</span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl transition-all cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            Sign Out Session
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-slate-900 flex items-center justify-between px-8 bg-slate-950/80 backdrop-blur-md shrink-0 z-10 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500 font-extrabold uppercase bg-slate-900 px-3 py-1.5 rounded-full border border-slate-800 tracking-wider">
              {pageMode === "dashboard" ? "Dashboard Session" : "Analytics Session"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 text-xs font-black">
              {user?.email[0].toUpperCase()}
            </div>
            <span className="text-xs font-bold text-slate-400">{user?.email}</span>
          </div>
        </header>

        {/* Panel Switcher */}
        {pageMode === "analytics" ? (
          <div className="flex-1 overflow-y-auto">
            <Analytics />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-8 space-y-6">
            {/* Hero Welcome banner */}
            <div className="relative overflow-hidden border border-slate-900 bg-slate-950 p-6 rounded-3xl glow-primary shadow-lg">
              <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-cyan-500/10 to-indigo-500/10 rounded-full blur-3xl -z-10" />
              <div className="max-w-2xl">
                <h2 className="text-2xl font-black tracking-wide text-white">
                  Welcome back, {user?.email.split("@")[0]}
                </h2>
                <p className="text-xs text-slate-400 leading-relaxed mb-4 mt-1 font-semibold">
                  Analyze clinical documents, run natural voice queries, and generate medical report summaries using advanced Gemini 2.5 Flash RAG architecture.
                </p>
                <div className="flex flex-wrap gap-2.5">
                  <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-cyan-400 bg-cyan-950/50 px-3 py-1.5 rounded-xl border border-cyan-800/30">
                    <Sparkles className="h-3.5 w-3.5 animate-pulse" /> Gemini 2.5 Flash
                  </span>
                  <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-indigo-400 bg-indigo-950/50 px-3 py-1.5 rounded-xl border border-indigo-800/30">
                    <Database className="h-3.5 w-3.5" /> Scoped Chroma Memory
                  </span>
                </div>
              </div>
            </div>

            {/* Metrics cards (live data) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="border border-slate-900 bg-slate-950 p-6 rounded-2xl flex items-center justify-between shadow-md">
                <div>
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    Uploaded Documents
                  </span>
                  <h4 className="text-2xl font-black mt-1 text-white">{stats?.total_reports ?? 0}</h4>
                </div>
                <div className="bg-cyan-500/10 p-3 rounded-xl text-cyan-400 border border-cyan-500/20">
                  <HeartPulse className="h-6 w-6" />
                </div>
              </div>

              <div className="border border-slate-900 bg-slate-950 p-6 rounded-2xl flex items-center justify-between shadow-md">
                <div>
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    Indexed Reports
                  </span>
                  <h4 className="text-2xl font-black mt-1 text-emerald-400">{stats?.processed_reports ?? 0}</h4>
                </div>
                <div className="bg-indigo-500/10 p-3 rounded-xl text-indigo-400 border border-indigo-500/20">
                  <TrendingUp className="h-6 w-6" />
                </div>
              </div>

              <div className="border border-slate-900 bg-slate-950 p-6 rounded-2xl flex items-center justify-between shadow-md">
                <div>
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    Total Text segments
                  </span>
                  <h4 className="text-2xl font-black mt-1 text-indigo-400">{stats?.total_chunks ?? 0}</h4>
                </div>
                <div className="bg-emerald-500/10 p-3 rounded-xl text-emerald-400 border border-emerald-500/20">
                  <Activity className="h-6 w-6" />
                </div>
              </div>
            </div>

            {/* Main view container */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              {/* Left Column: Repo & Uploads */}
              <div className="border border-slate-900 bg-slate-950 p-6 rounded-3xl min-h-[650px] shadow-2xl">
                <FileUploader />
              </div>

              {/* Right Column: Chat interface */}
              <ChatPane
                messages={messages}
                typing={typing}
                inputMessage={inputMessage}
                setInputMessage={setInputMessage}
                onSendMessage={handleSendMessage}
                onClearHistory={handleClearHistory}
                suggestedQuestions={suggestedQuestions}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
