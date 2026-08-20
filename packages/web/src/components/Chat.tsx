import { useAtomRefresh, useAtomSet, useAtomValue } from "@effect/atom-react";
import type { AgentMessage } from "@proxus/shared";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Streamdown } from "streamdown";
import "streamdown/styles.css";
import { artifactsQuery } from "../domain/artifacts/atoms.ts";
import { materialsQuery, uploadMaterialAction } from "../domain/materials/atoms.ts";
import { applyInvalidations, invalidationsForToolCall } from "../domain/tutor/invalidation.ts";
import { streamTutorMessage } from "../domain/tutor/stream.ts";

const starterPrompts = [
  {
    icon: "quiz",
    label: "Crear un quiz",
    prompt: "Crea un quiz de 3 preguntas de opción múltiple basado en mis materiales subidos."
  },
  {
    icon: "psychology",
    label: "Repasar un tema",
    prompt: "Explícame el concepto más difícil de mis materiales de forma socrática, haciéndome preguntas para que lo deduzca."
  }
] as const;

type TutorMode = "socratic" | "explanatory";

interface ChatProps {
  readonly prefillPrompt?: string | null | undefined;
  readonly onClearPrefill?: (() => void) | undefined;
  readonly onSelectArtifact?: ((id: string) => void) | undefined;
  readonly onOpenMindMap?: (() => void) | undefined;
  readonly theme?: "dark" | "light" | undefined;
  readonly isMaximized?: boolean | undefined;
  readonly onToggleMaximize?: (() => void) | undefined;
}

type ChatItem =
  | { readonly kind: "user"; readonly message: AgentMessage & { readonly role: "user" } }
  | { readonly kind: "tools"; readonly items: readonly AgentMessage[] }
  | { readonly kind: "assistant"; readonly message: AgentMessage & { readonly role: "assistant" } };

interface ParsedUserDoc {
  readonly id?: string | undefined;
  readonly title: string;
  readonly pageCount?: number | undefined;
}

function parseUserContent(
  rawContent: string,
  materials: readonly { readonly id: string; readonly title: string; readonly pageCount?: number }[]
): { readonly docs: readonly ParsedUserDoc[]; readonly text: string } {
  const foundDocs: ParsedUserDoc[] = [];
  const socraticPattern = /\[Enfoque pedagógico:\s*[^\]]+\]/g;
  let cleanText = rawContent.replace(socraticPattern, "").trim();

  // 1. Match [Documentos de referencia: ...]
  const refPattern = /\[Documentos de referencia:\s*([^\]]+)\]/g;
  let match: RegExpExecArray | null;
  while ((match = refPattern.exec(cleanText)) !== null) {
    const listStr = match[1]!;
    const items = listStr.split(",").map((s) => s.trim());
    for (const itm of items) {
      const matched = materials.find(
        (m) =>
          m.id.toLowerCase() === itm.toLowerCase() ||
          m.title.toLowerCase() === itm.toLowerCase() ||
          m.title.toLowerCase().includes(itm.toLowerCase())
      );
      if (matched) {
        if (!foundDocs.some((d) => d.id === matched.id)) {
          foundDocs.push({ id: matched.id, title: matched.title, pageCount: matched.pageCount });
        }
      } else if (!foundDocs.some((d) => d.title === itm)) {
        foundDocs.push({ title: itm });
      }
    }
  }
  cleanText = cleanText.replace(refPattern, "").trim();

  // 2. Match @["..."] (explicit quoted syntax)
  const quotedMentionPattern = /@\["([^"]+)"\]/g;
  while ((match = quotedMentionPattern.exec(cleanText)) !== null) {
    const term = match[1]!;
    const matched = materials.find(
      (m) =>
        m.id.toLowerCase() === term.toLowerCase() ||
        m.title.toLowerCase() === term.toLowerCase() ||
        m.title.toLowerCase().includes(term.toLowerCase())
    );
    if (matched) {
      if (!foundDocs.some((d) => d.id === matched.id)) {
        foundDocs.push({ id: matched.id, title: matched.title, pageCount: matched.pageCount });
      }
    } else {
      foundDocs.push({ title: term.replace(/[-_]/g, " ") });
    }
  }
  cleanText = cleanText.replace(quotedMentionPattern, "").trim();

  // 3. Match @slug or @tema-X or @word (e.g. @tema-4, @tema-4-organizacion-territorial, @constitucion)
  const inlineMentionPattern = /@([a-zA-Z0-9_\-\.]+)/g;
  while ((match = inlineMentionPattern.exec(cleanText)) !== null) {
    const term = match[1]!;
    const norm = term.toLowerCase().replace(/[-_]/g, " ").trim();
    const slug = term.toLowerCase().replace(/\s+/g, "-").trim();

    const matched = materials.find((m) => {
      const mId = m.id.toLowerCase();
      const mTitle = m.title.toLowerCase().replace(/[-_]/g, " ");
      return (
        mId === slug ||
        mId.startsWith(slug) ||
        mId.includes(slug) ||
        mTitle.includes(norm) ||
        norm.includes(mTitle)
      );
    });

    if (matched) {
      if (!foundDocs.some((d) => d.id === matched.id)) {
        foundDocs.push({ id: matched.id, title: matched.title, pageCount: matched.pageCount });
      }
    } else {
      foundDocs.push({ title: term.replace(/[-_]/g, " ") });
    }
  }
  cleanText = cleanText.replace(inlineMentionPattern, "").trim();

  return {
    docs: foundDocs,
    text: cleanText
  };
}

export function Chat({
  prefillPrompt,
  onClearPrefill,
  onSelectArtifact,
  onOpenMindMap,
  theme = "dark",
  isMaximized = false,
  onToggleMaximize
}: ChatProps = {}) {
  const isLight = theme === "light";
  const [messages, setMessages] = useState<readonly AgentMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [tutorMode, setTutorMode] = useState<TutorMode>("explanatory");

  // Attached & Mentioned documents state
  const [attachedDocs, setAttachedDocs] = useState<
    Array<{ readonly id: string; readonly title: string; readonly pageCount?: number | undefined }>
  >([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const refreshArtifacts = useAtomRefresh(artifactsQuery);
  const refreshMaterials = useAtomRefresh(materialsQuery);
  const uploadMaterial = useAtomSet(uploadMaterialAction, { mode: "promise" });
  const pendingInvalidations = useRef<Array<ReturnType<typeof invalidationsForToolCall>>>([]);

  // Speech Recognition & Web Audio Waveform state
  const [isListening, setIsListening] = useState(false);
  const [audioLevels, setAudioLevels] = useState<number[]>([20, 35, 60, 80, 60, 35, 20, 28]);
  const [isMagIaOpen, setIsMagIaOpen] = useState(false);
  const [isMentionOpen, setIsMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);

  const materialsResult = useAtomValue(materialsQuery);
  const availableMaterials = AsyncResult.match(materialsResult, {
    onInitial: () => [],
    onFailure: () => [],
    onSuccess: ({ value }) => value.materials
  });

  const filteredMentionMaterials = useMemo(() => {
    if (mentionQuery === null) return [];
    if (!mentionQuery) return availableMaterials;
    const q = mentionQuery.toLowerCase().replace(/[-_]/g, " ").trim();
    const qSlug = mentionQuery.toLowerCase().replace(/\s+/g, "-").trim();
    return availableMaterials.filter((m) => {
      const mId = m.id.toLowerCase();
      const mTitle = m.title.toLowerCase().replace(/[-_]/g, " ");
      return mId.includes(qSlug) || mTitle.includes(q);
    });
  }, [mentionQuery, availableMaterials]);

  const handleSelectMentionDoc = (mat: { readonly id: string; readonly title: string; readonly pageCount?: number | undefined }) => {
    setAttachedDocs((prev) =>
      prev.some((d) => d.id === mat.id)
        ? prev
        : [...prev, { id: mat.id, title: mat.title, pageCount: mat.pageCount }]
    );
    setInput((prev) => prev.replace(/(?:^|\s)@[a-zA-Z0-9_-]*$/, "").trim());
    setMentionQuery(null);
    setIsMentionOpen(false);
  };

  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const baseInputRef = useRef<string>("");
  const simIntervalRef = useRef<any>(null);
  const magIaRef = useRef<HTMLDivElement>(null);
  const mentionRef = useRef<HTMLDivElement>(null);

  // Close menus on click outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (magIaRef.current && !magIaRef.current.contains(e.target as Node)) {
        setIsMagIaOpen(false);
      }
      if (mentionRef.current && !mentionRef.current.contains(e.target as Node)) {
        setIsMentionOpen(false);
      }
    };
    window.addEventListener("mousedown", handleOutsideClick);
    return () => window.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch {}
      audioContextRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (simIntervalRef.current) {
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

  const toggleListening = async () => {
    if (isListening) {
      stopListening();
      return;
    }

    baseInputRef.current = input;

    // Start Web Speech Recognition
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "es-ES";

        recognition.onresult = (event: any) => {
          let interimTranscript = "";
          let finalTranscript = "";

          for (let i = 0; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript + " ";
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }

          const base = baseInputRef.current ? baseInputRef.current.trim() + " " : "";
          const newText = base + finalTranscript + interimTranscript;
          setInput(newText);
        };

        recognition.onerror = (err: any) => {
          console.warn("Speech recognition error:", err);
        };

        recognition.onend = () => {
          // Keep alive or clean
        };

        recognition.start();
        recognitionRef.current = recognition;
      } catch (e) {
        console.warn("Speech recognition start failed:", e);
      }
    }

    // Start Web Audio API Analyser for real-time waveform sync
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;

        const AudioContextClass =
          window.AudioContext || (window as any).webkitAudioContext;
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
    } catch (err) {
      console.warn("Audio Context setup fallback:", err);
    }

    // Fallback animated waveform if browser restricts getUserMedia in some contexts
    setIsListening(true);
    simIntervalRef.current = setInterval(() => {
      setAudioLevels(Array.from({ length: 8 }, () => Math.floor(Math.random() * 65) + 25));
    }, 75);
  };

  const handleDirectFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
      setIsUploading(true);
      try {
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const base64 = (reader.result as string).split(",")[1];
            if (!base64) return;
            const cleanTitle = file.name.replace(/\.pdf$/i, "").replace(/[-_]/g, " ");
            const res = await uploadMaterial({
              title: cleanTitle,
              fileName: file.name,
              contentBase64: base64
            });
            refreshMaterials();
            if (res && res.id) {
              setAttachedDocs((prev) => [
                ...prev.filter((d) => d.id !== res.id),
                { id: res.id, title: res.title, pageCount: res.pageCount }
              ]);
            }
          } catch (e) {
            console.error("Direct upload failed", e);
          } finally {
            setIsUploading(false);
          }
        };
        reader.readAsDataURL(file);
      } catch (err) {
        console.error("Reader error", err);
        setIsUploading(false);
      }
    } else {
      setAttachedDocs((prev) => [
        ...prev,
        { id: `file-${Date.now()}`, title: file.name }
      ]);
    }
    event.target.value = "";
  };

  useEffect(() => {
    if (prefillPrompt && !isSending) {
      setInput(prefillPrompt);
      onClearPrefill?.();
    }
  }, [prefillPrompt, isSending, onClearPrefill]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSending]);

  const submit = async (nextInput: string) => {
    const trimmed = nextInput.trim();
    if ((trimmed.length === 0 && attachedDocs.length === 0) || isSending) {
      return;
    }

    let finalPrompt = trimmed || "Explícame los conceptos clave de este documento.";
    if (attachedDocs.length > 0) {
      const docHeader = `[Documentos de referencia: ${attachedDocs.map((d) => d.title).join(", ")}]`;
      finalPrompt = `${docHeader}\n\n${finalPrompt}`;
    }

    if (tutorMode === "socratic" && !trimmed.toLowerCase().includes("socrátic")) {
      finalPrompt = `[Enfoque pedagógico: Tutor Socrático. Guíame con preguntas paso a paso para que razone por mí mismo sin darme la respuesta de inmediato]\n\n${finalPrompt}`;
    }

    setAttachedDocs([]);
    setIsSending(true);
    setError(undefined);
    pendingInvalidations.current = [];

    try {
      for await (const event of streamTutorMessage({
        input: finalPrompt,
        messages,
        maxSteps: 8
      })) {
        if (event.type === "done") {
          continue;
        }

        const message = event.message;
        setMessages((current) => [...current, message]);

        if (message.role === "tool-call") {
          pendingInvalidations.current.push(invalidationsForToolCall(message));
        }

        if (message.role === "tool-result") {
          const keys = pendingInvalidations.current.shift() ?? [];
          if (!message.isFailure) {
            applyInvalidations(keys, {
              refreshArtifacts,
              refreshMaterials
            });
          }
        }
      }

      setInput("");
    } catch {
      setError("No se pudo completar la respuesta. Comprueba la conexión e inténtalo de nuevo.");
    } finally {
      setIsSending(false);
    }
  };

  // Group messages for friendly rendering (folding tool calls into an elegant reasoning box)
  const groupedItems = useMemo(() => {
    const items: ChatItem[] = [];
    let currentTools: AgentMessage[] = [];

    const flushTools = () => {
      if (currentTools.length > 0) {
        items.push({
          kind: "tools",
          items: [...currentTools]
        });
        currentTools = [];
      }
    };

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      if (!msg) continue;

      if (msg.role === "user") {
        flushTools();
        items.push({ kind: "user", message: msg as AgentMessage & { role: "user" } });
      } else if (msg.role === "tool-call" || msg.role === "tool-result") {
        currentTools.push(msg);
      } else if (msg.role === "assistant") {
        flushTools();
        items.push({
          kind: "assistant",
          message: msg as AgentMessage & { role: "assistant" }
        });
      }
    }
    flushTools();

    return items;
  }, [messages, isSending]);

  return (
    <section
      aria-label="Tutor de estudio"
      className={`grid h-full min-h-0 max-h-full min-w-0 grid-rows-[auto_1fr_auto] flex-1 transition-colors ${
        isLight ? "bg-slate-50 text-slate-900" : "bg-[#090d16] text-slate-100"
      }`}
    >
      {/* Header */}
      <header
        className={`flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4 pr-14 backdrop-blur z-10 transition-colors min-[1440px]:pr-5 ${
          isLight ? "border-slate-200 bg-white/90" : "border-slate-800 bg-slate-950/80"
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`grid size-9 place-items-center rounded-xl border ${
              isLight
                ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                : "border-indigo-500/20 bg-indigo-500/10 text-indigo-300"
            }`}
          >
            <span className="material-symbols-outlined text-lg" aria-hidden="true">
              local_library
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1
                className={`font-display font-bold text-base sm:text-lg leading-none ${
                  isLight ? "text-slate-900" : "text-slate-100"
                }`}
              >
                Tutor de estudio
              </h1>
              <span className="rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2 py-0.5 text-[10px] font-medium text-indigo-500">
                con IA
              </span>
            </div>
            <p className={`text-[11px] mt-0.5 ${isLight ? "text-slate-500" : "text-slate-400"}`}>
              Pregunta, repasa y practica con tus materiales
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Tutor Mode Selector */}
          <div
            className={`flex items-center rounded-xl p-0.5 text-xs border ${
              isLight ? "bg-slate-100 border-slate-200" : "bg-slate-900 border-slate-800"
            }`}
            role="group"
            aria-label="Modo de tutoría"
          >
            <button
              type="button"
              onClick={() => setTutorMode("explanatory")}
              aria-pressed={tutorMode === "explanatory"}
              className={`min-h-9 px-2.5 py-1 rounded-lg font-medium transition ${
                tutorMode === "explanatory"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : isLight
                  ? "text-slate-600 hover:text-slate-900"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="Explicaciones claras y directas con ejemplos"
            >
              Explicativo
            </button>
            <button
              type="button"
              onClick={() => setTutorMode("socratic")}
              aria-pressed={tutorMode === "socratic"}
              className={`min-h-9 px-2.5 py-1 rounded-lg font-medium transition ${
                tutorMode === "socratic"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : isLight
                  ? "text-slate-600 hover:text-slate-900"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="Guía socrática para que deduzcas los conceptos"
            >
              Socrático
            </button>
          </div>

          {onToggleMaximize && (
            <button
              type="button"
              onClick={onToggleMaximize}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition ${
                isMaximized
                  ? "bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/20"
                  : isLight
                  ? "border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-100 shadow-sm"
                  : "border-slate-800 text-slate-300 hover:text-slate-100 hover:bg-slate-800"
              }`}
              title={
                isMaximized
                  ? "Salir de Modo Chat Completo (Restaurar espacio de estudio)"
                  : "Modo Chat Completo (Pantalla Completa)"
              }
              aria-label={
                isMaximized
                  ? "Salir de Modo Chat Completo"
                  : "Modo Chat Completo"
              }
            >
              <span className="material-symbols-outlined text-[17px]" aria-hidden="true">
                {isMaximized ? "close_fullscreen" : "open_in_full"}
              </span>
              <span className="hidden sm:inline">
                {isMaximized ? "Restaurar" : "Modo Chat"}
              </span>
            </button>
          )}

          <button
            className={`p-1.5 rounded-xl border transition ${
              isLight
                ? "border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                : "border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900"
            } disabled:opacity-30 disabled:cursor-not-allowed`}
            type="button"
            onClick={() => setMessages([])}
            disabled={messages.length === 0}
            title="Limpiar conversación"
            aria-label="Limpiar conversación"
          >
            <span className="material-symbols-outlined text-base" aria-hidden="true">
              restart_alt
            </span>
          </button>
        </div>
      </header>

      {/* Messages Scroll Area */}
      <section className="flex flex-col gap-4 overflow-y-auto p-4 sm:p-6" aria-live="polite">
        {messages.length === 0 ? (
          <div className="m-auto w-full max-w-2xl text-center py-6">
            <div className="mx-auto mb-4 grid size-12 place-items-center rounded-xl border border-indigo-500/20 bg-indigo-600/10 text-indigo-500">
              <span className="material-symbols-outlined text-2xl" aria-hidden="true">
                menu_book
              </span>
            </div>
            <h2
              className={`font-display font-bold text-2xl sm:text-3xl mb-2 ${
                isLight ? "text-slate-900" : "text-slate-100"
              }`}
            >
              ¿Qué quieres estudiar?
            </h2>
            <p className={`text-xs sm:text-sm max-w-md mx-auto mb-8 leading-relaxed ${
              isLight ? "text-slate-600" : "text-slate-400"
            }`}>
              Pregunta sobre tus materiales o elige una forma de empezar.
            </p>

            {/* Quick Starters Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
              {starterPrompts.map((item, idx) => (
                <button
                  key={idx}
                  className={`group flex items-start gap-3 rounded-xl border p-3.5 transition ${
                    isLight
                      ? "border-slate-200 bg-white hover:border-indigo-400 hover:bg-indigo-50/40 text-slate-800 shadow-sm"
                      : "border-slate-800/80 bg-slate-900/60 hover:border-indigo-500/50 hover:bg-slate-900 text-slate-200"
                  }`}
                  type="button"
                  onClick={() => void submit(item.prompt)}
                >
                  <span className="material-symbols-outlined text-indigo-500 text-lg" aria-hidden="true">
                    {item.icon}
                  </span>
                  <div>
                    <strong
                      className={`block text-xs font-semibold group-hover:text-indigo-600 ${
                        isLight ? "text-slate-900" : "text-slate-200"
                      }`}
                    >
                      {item.label}
                    </strong>
                    <span className={`text-[11px] line-clamp-1 mt-0.5 ${
                      isLight ? "text-slate-500" : "text-slate-400"
                    }`}>
                      {item.prompt}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          groupedItems.map((item, index) => {
            if (item.kind === "user") {
              const { docs, text } = parseUserContent(item.message.content, availableMaterials);
              return (
                <article key={index} className="ui-enter flex flex-col gap-1 max-w-2xl self-end items-end">
                  <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-indigo-500 px-1">
                    Tú
                  </span>
                  <div className="rounded-2xl rounded-br-sm bg-indigo-600 p-3.5 sm:p-4 text-sm leading-relaxed text-white shadow-md shadow-indigo-600/20">
                    {docs.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2.5">
                        {docs.map((doc, dIdx) => (
                          <div
                            key={dIdx}
                            className="inline-flex items-center gap-2 rounded-xl bg-white/20 hover:bg-white/25 backdrop-blur-md px-2.5 py-1.5 text-xs text-white border border-white/30 shadow-sm transition"
                          >
                            <span className="material-symbols-outlined text-[16px] text-red-300">picture_as_pdf</span>
                            <span className="font-semibold truncate max-w-[200px] sm:max-w-[280px]">{doc.title}</span>
                            {doc.pageCount && (
                              <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-semibold text-white/90">
                                {doc.pageCount} pág{doc.pageCount > 1 ? "s" : ""}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {text ? (
                      <div className="whitespace-pre-wrap">{text}</div>
                    ) : (
                      <div className="text-xs text-white/80 italic">Consultando documento adjunto…</div>
                    )}
                  </div>
                </article>
              );
            }

            if (item.kind === "tools") {
              return (
                <ReasoningFlowBox
                  key={index}
                  items={item.items}
                  isThinking={isSending && index === groupedItems.length - 1}
                  isLight={isLight}
                />
              );
            }

            return (
              <article key={index} className="ui-enter flex flex-col gap-1.5 max-w-3xl self-start items-start w-full">
                <div className="flex items-center gap-2 px-1">
                  <span className={`text-[11px] font-mono font-semibold uppercase tracking-wider ${
                    isLight ? "text-slate-500" : "text-slate-400"
                  }`}>
                    Tutor
                  </span>
                </div>

                <div
                  className={`w-full rounded-xl rounded-bl-sm border p-5 transition-colors sm:p-6 ${
                    isLight
                      ? "bg-white border-slate-200 text-slate-800"
                      : "bg-slate-900/90 border-slate-800 text-slate-100"
                  }`}
                >
                  <div className="prose dark:prose-invert max-w-none text-sm space-y-2">
                    <Streamdown>{item.message.content}</Streamdown>
                  </div>

                  {/* Quick Action Buttons */}
                  {index === groupedItems.length - 1 && (
                    <div
                      className={`mt-4 flex flex-wrap items-center gap-2 border-t pt-3 ${
                        isLight ? "border-slate-100" : "border-slate-800/80"
                      }`}
                    >
                      <span className="mr-1 text-[11px] font-medium text-slate-400">Continuar con</span>
                      {onOpenMindMap && (
                        <button
                          type="button"
                          onClick={() => onOpenMindMap()}
                          className={`flex min-h-9 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold shadow-sm transition ${
                            isLight
                              ? "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                              : "border-indigo-800/50 bg-indigo-950/60 text-indigo-300 hover:bg-indigo-900/60"
                          }`}
                        >
                          <span className="material-symbols-outlined text-xs" aria-hidden="true">schema</span>
                          <span>Ver esquema</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => void submit("Genera un quiz de 5 preguntas basado en esta explicación.")}
                        className={`flex min-h-9 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                          isLight
                            ? "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200"
                            : "border-slate-700/60 bg-slate-800/80 text-slate-200 hover:bg-slate-800"
                        }`}
                      >
                        <span className="material-symbols-outlined text-xs" aria-hidden="true">quiz</span>
                        <span>Crear quiz</span>
                      </button>
                    </div>
                  )}
                </div>
              </article>
            );
          })
        )}

        {isSending && groupedItems.length > 0 && groupedItems.at(-1)?.kind !== "tools" && (
          <div className={`ui-enter flex max-w-xs items-center gap-2.5 rounded-xl border p-3.5 text-xs ${
            isLight
              ? "bg-indigo-50 border-indigo-200 text-indigo-700"
              : "bg-indigo-950/40 border-indigo-800/40 text-indigo-300"
          }`}>
            <div className="size-3.5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"></div>
            <span>El tutor está preparando tu respuesta…</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </section>

      {error !== undefined && (
        <div
          role="alert"
          aria-live="assertive"
          className={`mx-4 mb-2 rounded-lg border p-3 text-xs ${
            isLight
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-red-900 bg-red-950/40 text-red-200"
          }`}
        >
          {error}
        </div>
      )}

      {/* Input Prompt Form matching image design with MagIA & Voice Waveform */}
      <footer
        className={`border-t p-3 sm:p-4 backdrop-blur transition-colors ${
          isLight ? "border-slate-200 bg-white/80" : "border-slate-800/80 bg-slate-950/80"
        }`}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (isListening) stopListening();
            void submit(input);
          }}
          className={`relative rounded-[26px] border-2 border-[#8b5cf6] p-3 shadow-[0_0_20px_rgba(139,92,246,0.18)] focus-within:shadow-[0_0_28px_rgba(139,92,246,0.35)] transition-all ${
            isLight ? "bg-white text-slate-900" : "bg-[#0b101b] text-slate-100"
          }`}
        >
          {/* Hidden File Input for Paperclip Attach Button */}
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,image/*"
            onChange={handleDirectFileUpload}
            className="hidden"
            aria-hidden="true"
          />

          {/* Attached / Mentioned Documents Bar */}
          {(attachedDocs.length > 0 || isUploading) && (
            <div className="flex flex-wrap items-center gap-1.5 pb-2.5 mb-2 border-b border-purple-500/20">
              <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">attachment</span>
                <span>Referencia:</span>
              </span>
              {attachedDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="inline-flex items-center gap-1.5 bg-purple-500/15 dark:bg-purple-500/25 border border-purple-500/30 rounded-xl px-2.5 py-1 text-xs text-purple-800 dark:text-purple-200 font-medium animate-in fade-in zoom-in-95 duration-100"
                >
                  <span className="material-symbols-outlined text-[15px] text-red-500">picture_as_pdf</span>
                  <span className="truncate max-w-[180px] sm:max-w-[240px] font-semibold">{doc.title}</span>
                  {doc.pageCount && (
                    <span className="text-[10px] text-purple-600 dark:text-purple-400">({doc.pageCount} pág{doc.pageCount > 1 ? "s" : ""})</span>
                  )}
                  <button
                    type="button"
                    onClick={() => setAttachedDocs((prev) => prev.filter((d) => d.id !== doc.id))}
                    className="grid size-4 place-items-center rounded-full hover:bg-purple-500/30 text-purple-600 dark:text-purple-400 transition ml-0.5"
                    title="Quitar referencia"
                  >
                    <span className="material-symbols-outlined text-[13px]">close</span>
                  </button>
                </div>
              ))}
              {isUploading && (
                <div className="inline-flex items-center gap-1.5 bg-indigo-500/15 border border-indigo-500/30 rounded-xl px-2.5 py-1 text-xs text-indigo-400 font-medium animate-pulse">
                  <span className="size-2 rounded-full bg-indigo-500 animate-ping" />
                  <span>Subiendo documento…</span>
                </div>
              )}
            </div>
          )}

          {/* Real-time Inline Mention Autocomplete Floating Card */}
          {mentionQuery !== null && (
            <div
              className={`absolute bottom-full left-3 right-3 mb-2 max-h-56 overflow-y-auto rounded-2xl border p-2 shadow-2xl z-40 ui-scale-in ${
                isLight
                  ? "bg-white border-purple-200 text-slate-800"
                  : "bg-slate-900 border-purple-800/80 text-slate-100"
              }`}
            >
              <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">alternate_email</span>
                  <span>Documentos coincidentes ({filteredMentionMaterials.length})</span>
                </span>
                <span className="text-[10px] text-slate-400 font-normal">Pulsa Enter o Tab para adjuntar</span>
              </div>
              <div className="flex flex-col gap-1 mt-1">
                {filteredMentionMaterials.length === 0 ? (
                  <p className="p-3 text-xs text-slate-500 text-center">No se encontraron documentos con "{mentionQuery}"</p>
                ) : (
                  filteredMentionMaterials.map((mat, idx) => (
                    <button
                      key={mat.id}
                      type="button"
                      onClick={() => handleSelectMentionDoc(mat)}
                      className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs text-left transition ${
                        idx === selectedMentionIndex
                          ? "bg-purple-600 text-white shadow-sm"
                          : isLight
                          ? "hover:bg-purple-50 text-slate-700"
                          : "hover:bg-purple-950/40 text-slate-200"
                      }`}
                    >
                      <span className={`material-symbols-outlined text-base ${idx === selectedMentionIndex ? "text-white" : "text-red-500"}`}>
                        picture_as_pdf
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{mat.title}</p>
                        <p className={`text-[10px] truncate ${idx === selectedMentionIndex ? "text-purple-100" : "text-slate-400"}`}>
                          ID: {mat.id} {mat.pageCount ? `· ${mat.pageCount} páginas` : ""}
                        </p>
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${idx === selectedMentionIndex ? "bg-white/20 text-white" : "bg-purple-500/10 text-purple-600 dark:text-purple-400"}`}>
                        Adjuntar
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          <textarea
            className={`w-full resize-none bg-transparent px-2 py-1 text-sm outline-none placeholder:text-slate-400 dark:placeholder:text-slate-400 font-normal leading-relaxed ${
              isLight ? "text-slate-900" : "text-slate-100"
            }`}
            value={input}
            onChange={(event) => {
              const val = event.currentTarget.value;
              setInput(val);
              const mentionMatch = /(?:^|\s)@([a-zA-Z0-9_-]*)$/.exec(val);
              if (mentionMatch) {
                setMentionQuery(mentionMatch[1] ?? "");
                setSelectedMentionIndex(0);
              } else {
                setMentionQuery(null);
              }
            }}
            onKeyDown={(e) => {
              if (mentionQuery !== null && filteredMentionMaterials.length > 0) {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setSelectedMentionIndex((idx) => (idx + 1) % filteredMentionMaterials.length);
                  return;
                }
                if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setSelectedMentionIndex(
                    (idx) => (idx - 1 + filteredMentionMaterials.length) % filteredMentionMaterials.length
                  );
                  return;
                }
                if (e.key === "Enter" || e.key === "Tab") {
                  e.preventDefault();
                  const selected =
                    filteredMentionMaterials[selectedMentionIndex] ?? filteredMentionMaterials[0];
                  if (selected) {
                    handleSelectMentionDoc(selected);
                    return;
                  }
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  setMentionQuery(null);
                  return;
                }
              }

              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (isListening) stopListening();
                void submit(input);
              }
            }}
            placeholder="Pregunta lo que quieras · @ para mencionar docs"
            rows={2}
          />

          <div className="mt-2 flex items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/50">
            {/* Left: MagIA Dropdown */}
            <div className="relative" ref={magIaRef}>
              <button
                type="button"
                onClick={() => {
                  setIsMagIaOpen(!isMagIaOpen);
                  setIsMentionOpen(false);
                }}
                className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold text-[#8b5cf6] hover:bg-[#8b5cf6]/10 transition active:scale-95"
              >
                <span className="material-symbols-outlined text-[17px] text-[#8b5cf6]" aria-hidden="true">
                  auto_awesome
                </span>
                <span className="font-semibold text-sm tracking-tight">MagIA</span>
                <span className="material-symbols-outlined text-xs text-[#8b5cf6]" aria-hidden="true">
                  expand_more
                </span>
              </button>

              {/* MagIA Quick Presets Menu */}
              {isMagIaOpen && (
                <div
                  className={`absolute bottom-full left-0 mb-2 w-72 rounded-2xl border p-2 shadow-2xl z-30 ui-scale-in ${
                    isLight ? "bg-white border-slate-200 text-slate-800" : "bg-slate-900 border-slate-800 text-slate-100"
                  }`}
                >
                  <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                    <span>Acciones Rápidas MagIA</span>
                  </div>
                  <div className="flex flex-col gap-1 mt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setInput("Explícame los conceptos más difíciles de mis apuntes de forma clara y con ejemplos prácticos.");
                        setIsMagIaOpen(false);
                      }}
                      className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs text-left transition ${
                        isLight ? "hover:bg-purple-50 text-slate-700" : "hover:bg-purple-950/40 text-slate-300"
                      }`}
                    >
                      <span className="material-symbols-outlined text-purple-500 text-base">psychology</span>
                      <div>
                        <p className="font-semibold">Explicación con ejemplos</p>
                        <p className="text-[10px] text-slate-500">Desglosa los puntos difíciles</p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTutorMode("socratic");
                        setInput("Guíame con preguntas socráticas paso a paso para que razone por mí mismo.");
                        setIsMagIaOpen(false);
                      }}
                      className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs text-left transition ${
                        isLight ? "hover:bg-purple-50 text-slate-700" : "hover:bg-purple-950/40 text-slate-300"
                      }`}
                    >
                      <span className="material-symbols-outlined text-purple-500 text-base">school</span>
                      <div>
                        <p className="font-semibold">Tutor Socrático</p>
                        <p className="text-[10px] text-slate-500">Aprende deduciendo conceptos</p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setInput("Crea un quiz de 3 preguntas tipo test de mis materiales subidos con retroalimentación.");
                        setIsMagIaOpen(false);
                      }}
                      className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs text-left transition ${
                        isLight ? "hover:bg-purple-50 text-slate-700" : "hover:bg-purple-950/40 text-slate-300"
                      }`}
                    >
                      <span className="material-symbols-outlined text-purple-500 text-base">quiz</span>
                      <div>
                        <p className="font-semibold">Crear quiz de 3 preguntas</p>
                        <p className="text-[10px] text-slate-500">Ponte a prueba de inmediato</p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setInput("Genera un esquema estructurado con las ideas principales y secundarias de este tema.");
                        setIsMagIaOpen(false);
                      }}
                      className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs text-left transition ${
                        isLight ? "hover:bg-purple-50 text-slate-700" : "hover:bg-purple-950/40 text-slate-300"
                      }`}
                    >
                      <span className="material-symbols-outlined text-purple-500 text-base">schema</span>
                      <div>
                        <p className="font-semibold">Esquema conceptual</p>
                        <p className="text-[10px] text-slate-500">Estructura jerárquica clave</p>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Right: Attach File/Img (📎), Mention Docs (@), Voice Mic with Waveform & Send button */}
            <div className="flex items-center gap-1.5">
              {/* Dynamic Live Audio Waveform when listening */}
              {isListening && (
                <div className="flex items-center gap-1 bg-purple-500/15 border border-purple-500/30 rounded-full px-2.5 py-1">
                  <span className="size-2 rounded-full bg-red-500 animate-ping" />
                  <div className="flex items-center gap-0.5 h-4 w-14 justify-center" aria-hidden="true">
                    {audioLevels.map((lvl, idx) => (
                      <span
                        key={idx}
                        className="w-1 bg-gradient-to-t from-indigo-500 to-purple-400 rounded-full transition-all duration-75"
                        style={{ height: `${lvl}%` }}
                      />
                    ))}
                  </div>
                  <span className="text-[11px] font-medium text-purple-400 hidden sm:inline">Dictando…</span>
                </div>
              )}

              {/* Attach File or Image Button (📎) */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`grid size-8 place-items-center rounded-xl transition ${
                  isLight
                    ? "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
                title="Adjuntar archivo o imagen (PDF, JPG, PNG)"
                aria-label="Adjuntar archivo o imagen"
              >
                <span className="material-symbols-outlined text-[19px]">attach_file</span>
              </button>

              {/* Mention Documents Button (@) */}
              <div className="relative" ref={mentionRef}>
                <button
                  type="button"
                  onClick={() => {
                    setIsMentionOpen(!isMentionOpen);
                    setIsMagIaOpen(false);
                  }}
                  className={`grid size-8 place-items-center rounded-xl transition ${
                    isMentionOpen
                      ? "bg-purple-600/20 text-[#8b5cf6]"
                      : isLight
                      ? "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                      : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                  }`}
                  title="Mencionar documentos de la biblioteca (@)"
                  aria-label="Mencionar documento"
                >
                  <span className="material-symbols-outlined text-[19px]">alternate_email</span>
                </button>

                {/* Mention Picker Dropdown */}
                {isMentionOpen && (
                  <div
                    className={`absolute bottom-full right-0 mb-2 w-72 rounded-2xl border p-2 shadow-2xl z-30 ui-scale-in ${
                      isLight ? "bg-white border-slate-200 text-slate-800" : "bg-slate-900 border-slate-800 text-slate-100"
                    }`}
                  >
                    <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">alternate_email</span>
                      <span>Mencionar documento</span>
                    </div>
                    <div className="max-h-48 overflow-y-auto flex flex-col gap-1 mt-1">
                      {availableMaterials.length === 0 ? (
                        <p className="p-3 text-xs text-slate-500 text-center">No hay documentos subidos aún.</p>
                      ) : (
                        availableMaterials.map((mat) => (
                          <button
                            key={mat.id}
                            type="button"
                            onClick={() => handleSelectMentionDoc(mat)}
                            className={`flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs text-left transition ${
                              isLight ? "hover:bg-purple-50 text-slate-700" : "hover:bg-purple-950/40 text-slate-200"
                            }`}
                          >
                            <span className="material-symbols-outlined text-red-500 text-base">picture_as_pdf</span>
                            <span className="truncate flex-1 font-medium">{mat.title}</span>
                            {mat.pageCount && (
                              <span className="text-[10px] text-slate-400">{mat.pageCount} pág</span>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Microphone Button with Real-time Speech Transcription */}
              <button
                type="button"
                onClick={toggleListening}
                className={`grid size-8 place-items-center rounded-xl transition ${
                  isListening
                    ? "bg-red-500 text-white shadow-lg shadow-red-500/40 animate-pulse"
                    : isLight
                    ? "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
                title={isListening ? "Detener grabación de voz" : "Dictar por voz con transcripción a tiempo real"}
                aria-label="Dictado por voz"
              >
                <span className="material-symbols-outlined text-[19px]">
                  {isListening ? "mic" : "mic"}
                </span>
              </button>

              {/* Send Button */}
              <button
                type="submit"
                disabled={isSending || (input.trim().length === 0 && attachedDocs.length === 0)}
                className={`grid size-8 place-items-center rounded-xl transition ${
                  (input.trim().length > 0 || attachedDocs.length > 0) && !isSending
                    ? "bg-indigo-600 text-white hover:bg-indigo-500 shadow-md shadow-indigo-600/30"
                    : isLight
                    ? "bg-slate-100 text-slate-400 hover:bg-slate-200"
                    : "bg-slate-800 text-slate-500 hover:bg-slate-700"
                } disabled:opacity-40 disabled:cursor-not-allowed`}
                title="Enviar mensaje (Enter)"
                aria-label="Enviar mensaje"
              >
                <span className="material-symbols-outlined text-[17px]">send</span>
              </button>
            </div>
          </div>
        </form>
      </footer>
    </section>
  );
}

/** Groups tool activity into a concise, user-facing progress summary. */
function ReasoningFlowBox({
  items,
  isThinking,
  isLight
}: {
  readonly items: readonly AgentMessage[];
  readonly isThinking?: boolean | undefined;
  readonly isLight?: boolean | undefined;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const steps = useMemo(() => {
    const result: Array<{
      id: string;
      icon: string;
      title: string;
      subtitle?: string | undefined;
      isDone: boolean;
      isFailure?: boolean | undefined;
    }> = [];

    for (const msg of items) {
      if (msg.role === "tool-call") {
        const friendly = getFriendlyToolCallLabel(msg);
        result.push({
          id: `${msg.name}-${result.length}`,
          icon: friendly.icon,
          title: friendly.title,
          subtitle: friendly.subtitle,
          isDone: false
        });
      } else if (msg.role === "tool-result") {
        const lastStep = result.at(-1);
        if (lastStep) {
          lastStep.isDone = true;
          lastStep.isFailure = msg.isFailure;
        }
      }
    }

    return result;
  }, [items]);

  const activeStep = steps.find((s) => !s.isDone) ?? steps.at(-1);

  return (
    <div className="ui-enter w-full max-w-3xl my-1">
      <div
        className={`rounded-xl border p-3 text-xs shadow-sm backdrop-blur transition ${
          isLight
            ? "border-indigo-200 bg-white/90 text-slate-700 shadow-slate-100"
            : "border-indigo-950/80 bg-slate-950/60 text-slate-300"
        }`}
      >
        <button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          className="group flex w-full items-center justify-between gap-3 text-left"
          aria-expanded={isOpen}
        >
          <div className="flex items-center gap-2.5">
            <span
              className={`grid size-6 place-items-center rounded-lg ${
                isLight
                  ? "bg-indigo-100 text-indigo-700"
                  : "bg-indigo-600/20 text-indigo-400"
              }`}
            >
              <span className="material-symbols-outlined text-sm" aria-hidden="true">
                {isThinking ? "progress_activity" : "check_circle"}
              </span>
            </span>
            <div>
              <span
                className={`font-semibold ${
                  isLight ? "text-slate-800" : "text-slate-200"
                }`}
              >
                {isThinking
                  ? activeStep?.title ?? "Consultando tus materiales…"
                  : `Actividad del tutor · ${steps.length} ${steps.length === 1 ? "paso" : "pasos"}`}
              </span>
              {activeStep?.subtitle && (
                <p
                  className={`text-[11px] line-clamp-1 ${
                    isLight ? "text-slate-500" : "text-slate-400"
                  }`}
                >
                  {activeStep.subtitle}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`text-[11px] transition ${
                isLight
                  ? "text-slate-500 group-hover:text-indigo-600"
                  : "text-slate-400 group-hover:text-indigo-300"
              }`}
            >
              {isOpen ? "Ocultar detalles" : "Ver pasos"}
            </span>
            <span
              className={`material-symbols-outlined text-xs transition-transform ${
                isLight ? "text-slate-400" : "text-slate-400"
              } ${isOpen ? "rotate-180" : ""}`}
              aria-hidden="true"
            >
              expand_more
            </span>
          </div>
        </button>

        {isOpen && (
          <ol
            className={`mt-3 pt-3 border-t space-y-2 ${
              isLight ? "border-slate-200" : "border-slate-800/70"
            }`}
          >
            {steps.map((step) => (
              <li
                key={step.id}
                className={`flex items-start gap-2.5 p-2 rounded-xl border text-xs ${
                  isLight
                    ? "bg-slate-50 border-slate-200 text-slate-700"
                    : "bg-slate-900/50 border-slate-800/50 text-slate-300"
                }`}
              >
                <span className="material-symbols-outlined text-sm text-indigo-500 mt-0.5" aria-hidden="true">
                  {step.icon}
                </span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span
                      className={`font-semibold ${
                        isLight ? "text-slate-900" : "text-slate-200"
                      }`}
                    >
                      {step.title}
                    </span>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                        step.isDone
                          ? step.isFailure
                            ? isLight
                              ? "bg-red-100 text-red-700"
                              : "bg-red-950 text-red-300"
                            : isLight
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-emerald-950 text-emerald-300"
                          : isLight
                          ? "bg-indigo-100 text-indigo-700"
                          : "bg-indigo-950 text-indigo-300"
                      }`}
                      aria-live="polite"
                    >
                      {step.isDone
                        ? step.isFailure
                          ? "Aviso"
                          : "Completado"
                        : "En curso..."}
                    </span>
                  </div>
                  {step.subtitle && (
                    <p
                      className={`text-[11px] mt-0.5 ${
                        isLight ? "text-slate-500" : "text-slate-400"
                      }`}
                    >
                      {step.subtitle}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

/**
 * Converts raw internal tool calls into human-friendly academic study phrasing
 */
function getFriendlyToolCallLabel(message: AgentMessage): {
  icon: string;
  title: string;
  subtitle?: string;
} {
  if (message.role === "tool-call") {
    if (message.name === "load_skill") {
      const skillName =
        typeof message.input === "object" && message.input && "name" in message.input
          ? String((message.input as { name: unknown }).name)
          : "";
      if (skillName.includes("material")) {
        return {
          icon: "menu_book",
          title: "Preparando tus materiales",
          subtitle: "Organizando los documentos que necesita la respuesta"
        };
      }
      if (skillName.includes("artifact")) {
        return {
          icon: "edit_note",
          title: "Preparando un recurso de estudio",
          subtitle: "Organizando el contenido solicitado"
        };
      }
      return {
        icon: "psychology",
        title: "Preparando el enfoque de estudio"
      };
    }

    if (message.name === "cli") {
      const input =
        typeof message.input === "object" && message.input && "input" in message.input
          ? String((message.input as { input: unknown }).input)
          : "";

      if (input.startsWith("materials view")) {
        const parts = input.split(" ");
        const pages = parts[3];
        return {
          icon: "visibility",
          title: pages ? `Revisando las páginas ${pages}` : "Leyendo el documento seleccionado",
          subtitle: "Buscando la información relevante"
        };
      }

      if (input.startsWith("materials list")) {
        return {
          icon: "folder_open",
          title: "Consultando índice de materiales subidos",
          subtitle: "Comprobando documentos disponibles en la sesión"
        };
      }

      if (input.startsWith("artifacts create")) {
        return {
          icon: "draw",
          title: "Generando recurso interactivo de estudio",
          subtitle: "Construyendo preguntas, respuestas y explicaciones"
        };
      }

      if (input.startsWith("artifacts grade")) {
        return {
          icon: "fact_check",
          title: "Evaluando y corrigiendo respuestas del examen",
          subtitle: "Calculando puntuación y retroalimentación pedagógica"
        };
      }

      return {
        icon: "memory",
        title: "Preparando información de estudio"
      };
    }
  }

  return {
    icon: "progress_activity",
    title: "Preparando la respuesta"
  };
}
