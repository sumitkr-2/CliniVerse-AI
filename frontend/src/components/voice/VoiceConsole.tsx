import React from "react";
import { Mic, MicOff, Volume2, VolumeX, Square, RefreshCw } from "lucide-react";
import { useVoice } from "../../hooks/useVoice";

interface VoiceConsoleProps {
  onSendMessage: (text: string) => void;
  lastAiResponse?: string;
}

export const VoiceConsole: React.FC<VoiceConsoleProps> = ({ onSendMessage, lastAiResponse }) => {
  const [voiceEnabled, setVoiceEnabled] = React.useState(true);
  
  const handleTranscription = (text: string) => {
    if (text.trim()) {
      onSendMessage(text);
    }
  };

  const {
    isRecording,
    isPlaying,
    error,
    startRecording,
    stopRecording,
    speak,
    stopAudio,
    hasSupport,
  } = useVoice(handleTranscription);

  // Trigger speak when AI finishes a response
  React.useEffect(() => {
    if (voiceEnabled && lastAiResponse && !isRecording) {
      speak(lastAiResponse);
    }
  }, [lastAiResponse]);

  const handleToggleMic = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleToggleVoiceOutput = () => {
    if (voiceEnabled) {
      setVoiceEnabled(false);
      stopAudio();
    } else {
      setVoiceEnabled(true);
      if (lastAiResponse) {
        speak(lastAiResponse);
      }
    }
  };

  if (!hasSupport) {
    return (
      <div className="bg-slate-950/40 border border-slate-900 rounded-2xl p-4 text-center">
        <p className="text-[10px] text-slate-500 font-semibold uppercase">Voice Panel</p>
        <p className="text-[11px] text-slate-400 mt-1">Voice features not supported in this browser.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-950/40 border border-slate-900 rounded-2xl p-4 flex flex-col items-center justify-between">
      <div className="flex items-center justify-between w-full border-b border-slate-900 pb-3.5 mb-3.5">
        <div>
          <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Voice Console</h4>
          <p className="text-[9px] text-slate-600 font-semibold tracking-wider mt-0.5">Push-To-Talk Assistant</p>
        </div>
        <button
          onClick={handleToggleVoiceOutput}
          className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
            voiceEnabled
              ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400"
              : "bg-slate-900 border-slate-800 text-slate-600"
          }`}
          title={voiceEnabled ? "Mute voice output" : "Unmute voice output"}
        >
          {voiceEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
        </button>
      </div>

      <div className="flex flex-col items-center gap-3 py-3 w-full">
        {/* Pulsing Audio Circle Animation */}
        <div className="relative flex items-center justify-center">
          {isRecording && (
            <div className="absolute w-20 h-20 bg-cyan-500/10 rounded-full animate-ping border border-cyan-500/20" />
          )}
          {isPlaying && (
            <div className="absolute w-20 h-20 bg-indigo-500/10 rounded-full animate-pulse border border-indigo-500/20" />
          )}
          <button
            onClick={handleToggleMic}
            className={`w-14 h-14 rounded-full flex items-center justify-center border shadow-xl transition-all duration-300 cursor-pointer ${
              isRecording
                ? "bg-rose-500 border-rose-400 text-white scale-105"
                : isPlaying
                ? "bg-indigo-500 border-indigo-400 text-white"
                : "bg-slate-900 border-slate-800 text-cyan-400 hover:border-cyan-500/50"
            }`}
          >
            {isRecording ? <Square className="h-5 w-5 fill-white" /> : <Mic className="h-5 w-5" />}
          </button>
        </div>

        {/* Status indicator text */}
        <div className="text-center">
          <p className="text-[10px] font-bold text-slate-200 uppercase tracking-wide">
            {isRecording ? "Listening..." : isPlaying ? "Speaking..." : "Voice Assistant Idle"}
          </p>
          <p className="text-[9px] text-slate-500 mt-1">
            {isRecording
              ? "Speak clearly and release or click to submit"
              : isPlaying
              ? "AI is speaking. Click mic to interrupt."
              : "Click the microphone to speak."}
          </p>
        </div>

        {/* Error notification */}
        {error && (
          <div className="w-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[9px] py-1 px-2.5 rounded-lg text-center mt-2">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};
