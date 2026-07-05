import React, { useRef, useEffect } from "react";
import {
  Brain,
  CheckCircle2,
  Copy,
  RotateCcw,
  Loader2,
  Send,
  Trash2,
  Sparkles,
  Utensils,
  Pill,
  Info,
  Stethoscope,
} from "lucide-react";
import { ClinicalResponseCard } from "../cards/ClinicalResponseCard";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface ChatPaneProps {
  messages: Message[];
  typing: boolean;
  inputMessage: string;
  setInputMessage: (val: string) => void;
  onSendMessage: (e: React.FormEvent | null, overrideText?: string, mode?: string) => void;
  onClearHistory: () => void;
  suggestedQuestions: Array<{ title: string; desc: string; mode: string; query: string }>;
}

export const ChatPane: React.FC<ChatPaneProps> = ({
  messages,
  typing,
  inputMessage,
  setInputMessage,
  onSendMessage,
  onClearHistory,
  suggestedQuestions,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="border border-slate-900 bg-slate-950 rounded-3xl h-[650px] flex flex-col overflow-hidden relative shadow-2xl shadow-black/80">
      {/* Title Bar */}
      <div className="border-b border-slate-900 px-5 py-4 bg-slate-950/80 backdrop-blur-md flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="bg-cyan-500/10 border border-cyan-500/20 p-2 rounded-xl text-cyan-400">
            <Brain className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-xs text-white uppercase tracking-wider">Clinical AI Assistant</h3>
            <p className="text-[9px] text-slate-500 font-semibold tracking-widest uppercase mt-0.5">Gemini 2.5 Flash RAG</p>
          </div>
        </div>
        <button
          onClick={onClearHistory}
          className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-950/20 border border-transparent hover:border-rose-900/30 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider"
          title="Clear Conversation History"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Clear Chat
        </button>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-slate-800">
        {messages.map((msg, index) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"} w-full`}
          >
            {msg.role === "user" ? (
              /* User Message Bubble */
              <div className="max-w-[85%] rounded-3xl px-5 py-4 text-xs font-semibold leading-relaxed bg-cyan-500 text-slate-950 rounded-tr-none shadow-lg shadow-cyan-500/10">
                {msg.content}
              </div>
            ) : (
              /* Assistant Clinical Cards / Response */
              <div className="w-full relative group">
                <ClinicalResponseCard content={msg.content} />
                
                {/* Float Actions */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1.5 bg-slate-900 border border-slate-800 p-1 rounded-xl shadow-lg">
                  <button
                    onClick={() => handleCopyText(msg.content)}
                    className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-white transition-all cursor-pointer"
                    title="Copy Text"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => {
                      // Find last user query
                      for (let i = index - 1; i >= 0; i--) {
                        if (messages[i].role === "user") {
                          onSendMessage(null, messages[i].content);
                          break;
                        }
                      }
                    }}
                    className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-white transition-all cursor-pointer"
                    title="Regenerate"
                  >
                    <RotateCcw className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Suggested Questions Template Grid */}
        {messages.length <= 1 && !typing && (
          <div className="space-y-3 mt-6">
            <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider block">
              Quick Inquiry Templates
            </span>
            <div className="grid grid-cols-1 gap-3">
              {suggestedQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => onSendMessage(null, q.query, q.mode)}
                  className="w-full text-left border border-slate-900 bg-slate-950/50 hover:bg-slate-900/50 hover:border-slate-800 hover:scale-[1.005] p-4 rounded-2xl transition-all flex items-center justify-between cursor-pointer group shadow-sm"
                >
                  <div>
                    <h4 className="text-xs font-bold text-slate-300 group-hover:text-cyan-400 transition-colors">
                      {q.title}
                    </h4>
                    <p className="text-[10px] text-slate-500 mt-1">{q.desc}</p>
                  </div>
                  <Sparkles className="h-3.5 w-3.5 text-slate-700 group-hover:text-cyan-400 transition-all" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loading typing state */}
        {typing && (
          <div className="flex justify-start">
            <div className="bg-slate-900/60 border border-slate-800/80 text-slate-400 max-w-[85%] rounded-3xl rounded-tl-none px-5 py-4 text-xs flex items-center gap-2.5">
              <Loader2 className="h-4 w-4 text-cyan-400 animate-spin" />
              <span className="font-semibold text-[11px]">AI analyzing report contents & generating clinical insights...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input panel & Toolbar */}
      <div className="border-t border-slate-900 bg-slate-950/80 backdrop-blur-md shrink-0 flex flex-col">
        {/* Quick Toolbar Actions */}
        <div className="flex flex-wrap gap-2 px-4 pt-3 pb-1 border-b border-slate-900/50 bg-slate-950/30">
          <button
            onClick={() => onSendMessage(null, "Generate a detailed clinical summary.", "summary")}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/80 border border-slate-800 hover:border-cyan-500/40 text-[10px] font-bold text-slate-400 hover:text-cyan-400 rounded-xl transition-all cursor-pointer"
          >
            <Stethoscope className="h-3.5 w-3.5" /> Summary
          </button>
          <button
            onClick={() => onSendMessage(null, "Explain medical terms found in the report.", "term")}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/80 border border-slate-800 hover:border-cyan-500/40 text-[10px] font-bold text-slate-400 hover:text-cyan-400 rounded-xl transition-all cursor-pointer"
          >
            <Info className="h-3.5 w-3.5" /> Explain Terms
          </button>
          <button
            onClick={() => onSendMessage(null, "Check for drug parameters and interactions.", "interaction")}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/80 border border-slate-800 hover:border-cyan-500/40 text-[10px] font-bold text-slate-400 hover:text-cyan-400 rounded-xl transition-all cursor-pointer"
          >
            <Pill className="h-3.5 w-3.5" /> Drug Checks
          </button>
          <button
            onClick={() => onSendMessage(null, "Detail lifestyle, exercise, and dietary advice.", "lifestyle")}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/80 border border-slate-800 hover:border-cyan-500/40 text-[10px] font-bold text-slate-400 hover:text-cyan-400 rounded-xl transition-all cursor-pointer"
          >
            <Utensils className="h-3.5 w-3.5" /> Lifestyle Advice
          </button>
        </div>

        {/* Input Form */}
        <form onSubmit={(e) => onSendMessage(e)} className="p-4 flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Ask about labs, symptoms, lifestyle advice (e.g. 'What was my cholesterol?')..."
            className="flex-1 bg-slate-900/60 border border-slate-800/80 rounded-2xl px-4 py-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 transition-all font-semibold"
          />
          <button
            type="submit"
            className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-4 rounded-2xl flex items-center justify-center transition-all cursor-pointer shadow-lg shadow-cyan-500/10 shrink-0"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
