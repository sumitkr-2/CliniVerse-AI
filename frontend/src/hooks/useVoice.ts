import { useState, useEffect, useRef } from "react";
import axiosInstance from "../lib/axios";

export const useVoice = (onTranscription: (text: string) => void) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = "en-US";

      rec.onstart = () => {
        setIsRecording(true);
        setError(null);
        // Interrupt any playing TTS audio
        stopAudio();
      };

      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          onTranscription(transcript);
        }
      };

      rec.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        if (event.error !== "no-speech") {
          setError(`Speech Error: ${event.error}`);
        }
        setIsRecording(false);
      };

      rec.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = rec;
    } else {
      console.warn("Speech recognition is not supported in this browser.");
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      stopAudio();
    };
  }, [onTranscription]);

  // Start recording
  const startRecording = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error(e);
      }
    } else {
      setError("Speech recognition not supported in this browser.");
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  // Play text using backend TTS API
  const speak = async (text: string) => {
    stopAudio();
    setIsPlaying(true);
    
    try {
      const cleanText = text.replace(/[*#`_\[\]]/g, "").trim();
      const response = await axiosInstance.post(
        "/voice/tts",
        { text: cleanText },
        { responseType: "blob" }
      );
      
      const audioUrl = URL.createObjectURL(response.data);
      const audio = new Audio(audioUrl);
      
      audio.onended = () => {
        setIsPlaying(false);
      };
      
      audio.onerror = () => {
        setIsPlaying(false);
        setError("Failed to play audio.");
      };

      audioRef.current = audio;
      audio.play();
    } catch (e) {
      console.error(e);
      setIsPlaying(false);
      setError("TTS generation failed.");
    }
  };

  // Stop any playing TTS audio
  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
      setIsPlaying(false);
    }
  };

  return {
    isRecording,
    isPlaying,
    error,
    startRecording,
    stopRecording,
    speak,
    stopAudio,
    hasSupport: !!recognitionRef.current,
  };
};
