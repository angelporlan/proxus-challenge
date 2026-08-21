import { useCallback, useEffect, useRef, useState } from "react";

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message?: string;
}

interface SpeechRecognitionEventInit extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventInit) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type SpeechRecognitionConstructor = new () => ISpeechRecognition;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
    webkitAudioContext?: typeof AudioContext;
  }
}

export function useVoiceDictation(onTranscript: (accumulatedText: string) => void) {
  const [isListening, setIsListening] = useState(false);
  const [audioLevels, setAudioLevels] = useState<readonly number[]>([20, 35, 60, 80, 60, 35, 20, 28]);

  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const simIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const baseInputRef = useRef<string>("");

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.debug("Speech recognition stop ignored:", error);
      }
      recognitionRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch (error) {
        console.debug("AudioContext close ignored:", error);
      }
      audioContextRef.current = null;
    }
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (simIntervalRef.current !== null) {
      clearInterval(simIntervalRef.current);
      simIntervalRef.current = null;
    }
    setIsListening(false);
  }, []);

  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

  const toggleListening = useCallback(async (currentText?: string | unknown) => {
    if (isListening) {
      stopListening();
      return;
    }

    baseInputRef.current = typeof currentText === "string" ? currentText : "";

    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognitionClass) {
      try {
        const recognition = new SpeechRecognitionClass();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "es-ES";

        recognition.onresult = (event: SpeechRecognitionEventInit) => {
          let interimTranscript = "";
          let finalTranscript = "";

          for (let i = 0; i < event.results.length; ++i) {
            const res = event.results[i];
            if (res && res[0]) {
              if (res.isFinal) {
                finalTranscript += res[0].transcript + " ";
              } else {
                interimTranscript += res[0].transcript;
              }
            }
          }

          const base = baseInputRef.current ? baseInputRef.current.trim() + " " : "";
          const newText = base + finalTranscript + interimTranscript;
          onTranscript(newText);
        };

        recognition.onerror = (err: SpeechRecognitionErrorEvent) => {
          console.warn("Speech recognition error:", err.error, err.message);
        };

        recognition.onend = () => {
          // Finished recognition cycle
        };

        recognition.start();
        recognitionRef.current = recognition;
      } catch (e) {
        console.warn("Speech recognition start failed:", e);
      }
    }

    try {
      if (typeof navigator !== "undefined" && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;

        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
          const audioCtx = new AudioContextClass();
          audioContextRef.current = audioCtx;

          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 64;
          source.connect(analyser);
          analyserRef.current = analyser;

          const bufferLength = analyser.frequencyBinCount;
          const dataArray = new Uint8Array(bufferLength);

          const updateWaveform = () => {
            if (!analyserRef.current) return;
            analyserRef.current.getByteFrequencyData(dataArray);

            const bars: number[] = [];
            const numBars = 8;
            const step = Math.max(1, Math.floor(bufferLength / numBars));
            for (let i = 0; i < numBars; i++) {
              const val = dataArray[i * step] || 0;
              const percent = Math.max(16, Math.min(100, Math.round((val / 255) * 100 * 1.5)));
              bars.push(percent);
            }
            setAudioLevels(bars);
            animationFrameRef.current = requestAnimationFrame(updateWaveform);
          };

          updateWaveform();
          setIsListening(true);
          return;
        }
      }
    } catch (err) {
      console.warn("Audio Context setup fallback:", err);
    }

    setIsListening(true);
    simIntervalRef.current = setInterval(() => {
      setAudioLevels(Array.from({ length: 8 }, () => Math.floor(Math.random() * 65) + 25));
    }, 75);
  }, [isListening, onTranscript, stopListening]);

  return {
    isListening,
    audioLevels,
    toggleListening,
    stopListening
  };
}
