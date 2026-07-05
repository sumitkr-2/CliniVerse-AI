import React, { useState } from "react";
import { Brain, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export const AuthScreen: React.FC = () => {
  const { login, signup } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      setLoading(false);
      return;
    }

    try {
      if (isRegistering) {
        await signup(email, password);
        setSuccess('Practitioner account created! Click "Authorize Access Session" below to sign in.');
        setIsRegistering(false);
      } else {
        await login(email, password);
      }
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      const errors = err.response?.data?.errors;
      const firstErrMsg = errors?.[0]?.msg;
      setError(detail || firstErrMsg || "Authentication failed. Please verify credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-slate-950 px-4 overflow-hidden relative">
      {/* Dynamic glow design */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -z-10" />

      <div className="w-full max-w-md border border-slate-900 bg-slate-950/80 backdrop-blur-xl p-8 rounded-3xl shadow-2xl space-y-6">
        {/* Logo and header */}
        <div className="flex flex-col items-center text-center">
          <div className="bg-cyan-500/10 p-3 rounded-2xl border border-cyan-500/20 text-cyan-400 mb-4">
            <Brain className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-black tracking-widest bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent">
            MEDIMIND AI
          </h2>
          <p className="text-[9px] text-slate-500 font-extrabold tracking-widest uppercase mt-1">
            Clinical intelligence platform
          </p>
        </div>

        {/* Alerts */}
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs px-4 py-3 rounded-xl flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs px-4 py-3 rounded-xl flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 tracking-wider uppercase block">
              Professional Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. physician@clinic.org"
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 transition-all font-semibold"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 tracking-wider uppercase block">
              Practitioner Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 8 characters"
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 transition-all font-semibold"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:bg-cyan-800 text-slate-950 font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center transition-all cursor-pointer shadow-lg shadow-cyan-500/10"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin text-slate-950" />
            ) : isRegistering ? (
              "Initialize Administrator Account"
            ) : (
              "Authorize Access Session"
            )}
          </button>
        </form>

        {/* Switch mode */}
        <div className="text-center">
          <button
            onClick={() => {
              setIsRegistering(!isRegistering);
              setError("");
              setSuccess("");
            }}
            className="text-xs text-slate-400 hover:text-cyan-400 transition-colors bg-transparent border-0 cursor-pointer"
          >
            {isRegistering
              ? "Already authorized? Verify credential session"
              : "Register professional practitioner account"}
          </button>
        </div>
      </div>
    </div>
  );
};
