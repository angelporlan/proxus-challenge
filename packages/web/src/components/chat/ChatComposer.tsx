import type { ChangeEvent, Dispatch, RefObject, SetStateAction } from "react";
import { useEffect } from "react";
import { findMentionRanges, splitMentionParts, type AttachedDoc } from "../../hooks/useMentions.ts";
import proxoAvatar from "../../assets/proxo-avatar.jpg";
import proxoSocraticAvatar from "../../assets/proxo-socratic-avatar.jpg";
import type { ChatMaterial, TutorMode } from "./types.ts";

export function ChatComposer({
  isLight,
  input,
  setInput,
  tutorMode,
  setTutorMode,
  attachedDocs,
  setAttachedDocs,
  availableMaterials,
  isSending,
  isTutorWriting,
  isUploading,
  isListening,
  audioLevels,
  isMentionOpen,
  setIsMentionOpen,
  mentionQuery,
  setMentionQuery,
  selectedMentionIndex,
  setSelectedMentionIndex,
  filteredMentionMaterials,
  handleSelectMentionDoc,
  handleRemoveAttachedDoc,
  magIaRef,
  mentionRef,
  backdropRef,
  textareaRef,
  fileInputRef,
  isMagIaOpen,
  setIsMagIaOpen,
  onSubmit,
  onFileChange,
  toggleListening,
  stopListening
}: {
  readonly isLight: boolean;
  readonly input: string;
  readonly setInput: (value: string | ((prev: string) => string)) => void;
  readonly tutorMode: TutorMode;
  readonly setTutorMode: (mode: TutorMode) => void;
  readonly attachedDocs: readonly AttachedDoc[];
  readonly setAttachedDocs: Dispatch<SetStateAction<AttachedDoc[]>>;
  readonly availableMaterials: readonly ChatMaterial[];
  readonly isSending: boolean;
  readonly isTutorWriting: boolean;
  readonly isUploading: boolean;
  readonly isListening: boolean;
  readonly audioLevels: readonly number[];
  readonly isMentionOpen: boolean;
  readonly setIsMentionOpen: (open: boolean) => void;
  readonly mentionQuery: string | null;
  readonly setMentionQuery: (query: string | null) => void;
  readonly selectedMentionIndex: number;
  readonly setSelectedMentionIndex: Dispatch<SetStateAction<number>>;
  readonly filteredMentionMaterials: readonly ChatMaterial[];
  readonly handleSelectMentionDoc: (mat: AttachedDoc) => void;
  readonly handleRemoveAttachedDoc: (id: string, title: string) => void;
  readonly magIaRef: RefObject<HTMLDivElement | null>;
  readonly mentionRef: RefObject<HTMLDivElement | null>;
  readonly backdropRef: RefObject<HTMLDivElement | null>;
  readonly textareaRef: RefObject<HTMLTextAreaElement | null>;
  readonly fileInputRef: RefObject<HTMLInputElement | null>;
  readonly isMagIaOpen: boolean;
  readonly setIsMagIaOpen: Dispatch<SetStateAction<boolean>>;
  readonly onSubmit: (prompt: string) => void;
  readonly onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  readonly toggleListening: () => void;
  readonly stopListening: () => void;
}) {
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    const minH = 40;
    const maxH = 104;
    const nextH = Math.min(Math.max(textarea.scrollHeight, minH), maxH);
    textarea.style.height = `${nextH}px`;
    textarea.style.overflowY = textarea.scrollHeight > maxH ? "auto" : "hidden";
  }, [input, textareaRef]);

  return (
    <footer
      className={`border-t p-3 sm:p-4 backdrop-blur transition-colors ${
        isLight ? "border-slate-200 bg-white/80" : "border-slate-800/80 bg-slate-950/80"
      }`}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (isListening) stopListening();
          void onSubmit(input);
        }}
        className={`relative rounded-[26px] border-2 border-[#8b5cf6] p-3 shadow-[0_0_20px_rgba(139,92,246,0.18)] focus-within:shadow-[0_0_28px_rgba(139,92,246,0.35)] transition-all ${
          isLight ? "bg-white text-slate-900" : "bg-[#0b101b] text-slate-100"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,image/*"
          onChange={onFileChange}
          className="hidden"
          aria-hidden="true"
        />

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
                <span className="truncate max-w-[180px] sm:max-w-[240px] font-bold">{doc.title}</span>
                {doc.pageCount && (
                  <span className="text-[10px] text-purple-600 dark:text-purple-400">
                    ({doc.pageCount} pág{doc.pageCount > 1 ? "s" : ""})
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => handleRemoveAttachedDoc(doc.id, doc.title)}
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

        {mentionQuery !== null && (
          <div
            className={`absolute bottom-full left-3 right-3 mb-2 max-h-56 overflow-y-auto rounded-2xl border p-2 shadow-2xl z-40 ui-scale-in ${
              isLight
                ? "bg-white border-purple-200 text-slate-800"
                : "bg-slate-900 border-purple-800/80 text-slate-100"
            }`}
          >
            <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">alternate_email</span>
              <span>Documentos coincidentes ({filteredMentionMaterials.length})</span>
            </div>
            <div className="flex flex-col gap-1 mt-1">
              {filteredMentionMaterials.length === 0 ? (
                <p className="p-3 text-xs text-slate-500 text-center">
                  No se encontraron documentos con "{mentionQuery}"
                </p>
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
                    <span
                      className={`material-symbols-outlined text-base ${
                        idx === selectedMentionIndex ? "text-white" : "text-red-500"
                      }`}
                    >
                      picture_as_pdf
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{mat.title}</p>
                      {mat.pageCount ? (
                        <p
                          className={`text-[10px] truncate ${
                            idx === selectedMentionIndex ? "text-purple-100" : "text-slate-400"
                          }`}
                        >
                          {mat.pageCount} páginas
                        </p>
                      ) : null}
                    </div>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                        idx === selectedMentionIndex
                          ? "bg-white/20 text-white"
                          : "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                      }`}
                    >
                      Adjuntar
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        <div className="relative w-full">
          <div
            ref={backdropRef}
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none whitespace-pre-wrap break-words px-2 py-1 text-sm font-sans font-normal leading-relaxed overflow-hidden select-none"
          >
            {input ? (
              <>
                {splitMentionParts(input, [...availableMaterials, ...attachedDocs]).map((part, idx) =>
                  part.kind === "mention" ? (
                    <span
                      key={idx}
                      className={`rounded-xs ${
                        isLight ? "bg-purple-100/90 text-purple-700" : "bg-purple-900/60 text-purple-300"
                      }`}
                    >
                      {part.value}
                    </span>
                  ) : (
                    <span key={idx} className={isLight ? "text-slate-900" : "text-slate-100"}>
                      {part.value}
                    </span>
                  )
                )}
                {input.endsWith("\n") && "\n"}
              </>
            ) : (
              <span className="text-slate-400 font-normal">
                {tutorMode === "socratic"
                  ? "Plantea una duda para deducirla paso a paso · @ para docs"
                  : "Pregunta lo que quieras · @ para mencionar docs"}
              </span>
            )}
          </div>

          <textarea
            ref={textareaRef}
            className="relative z-10 w-full resize-none bg-transparent px-2 py-1 text-sm outline-none text-transparent caret-purple-600 dark:caret-purple-400 selection:bg-purple-500/25 font-sans font-normal leading-relaxed"
            value={input}
            onScroll={(e) => {
              if (backdropRef.current) {
                backdropRef.current.scrollTop = e.currentTarget.scrollTop;
              }
            }}
            onChange={(event) => {
              const val = event.currentTarget.value;
              setInput(val);

              const docsList = [...availableMaterials, ...attachedDocs];
              const prevRanges = findMentionRanges(input, docsList);
              const nextRanges = findMentionRanges(val, docsList);

              setAttachedDocs((prev) =>
                prev.filter((doc) => {
                  const wasMentioned = prevRanges.some(
                    (r) =>
                      r.title.toLowerCase() === doc.title.toLowerCase() ||
                      (doc.id && r.materialId === doc.id)
                  );
                  if (!wasMentioned) {
                    return true;
                  }
                  return nextRanges.some(
                    (r) =>
                      r.title.toLowerCase() === doc.title.toLowerCase() ||
                      (doc.id && r.materialId === doc.id)
                  );
                })
              );

              const beforeCursor = val.slice(0, event.currentTarget.selectionStart ?? val.length);
              const mentionMatch = /(?:^|\s)@([a-zA-Z0-9_-]*)$/.exec(beforeCursor);
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

              const textarea = textareaRef.current;
              if (textarea) {
                const { selectionStart, selectionEnd } = textarea;
                const docsList = [...availableMaterials, ...attachedDocs];
                const ranges = findMentionRanges(input, docsList);

                if (e.key === "Backspace") {
                  if (selectionStart === selectionEnd) {
                    const pos = selectionStart;
                    const targetRange = ranges.find((r) => {
                      const hasTrailingSpace = input[r.end] === " ";
                      const isRightAfterSpace = hasTrailingSpace && pos === r.end + 1;
                      const isInsideOrEnd = pos > r.start && pos <= r.end;
                      return isInsideOrEnd || isRightAfterSpace;
                    });

                    if (targetRange) {
                      e.preventDefault();
                      const hasTrailingSpace = input[targetRange.end] === " ";
                      const deleteEnd = hasTrailingSpace ? targetRange.end + 1 : targetRange.end;
                      const nextInput = input.slice(0, targetRange.start) + input.slice(deleteEnd);
                      setInput(nextInput);

                      const remainingRanges = findMentionRanges(nextInput, docsList);
                      const stillReferenced = remainingRanges.some(
                        (r) =>
                          (targetRange.materialId && r.materialId === targetRange.materialId) ||
                          r.title.toLowerCase() === targetRange.title.toLowerCase()
                      );

                      if (!stillReferenced) {
                        setAttachedDocs((prev) =>
                          prev.filter(
                            (d) =>
                              (targetRange.materialId ? d.id !== targetRange.materialId : true) &&
                              d.title.toLowerCase() !== targetRange.title.toLowerCase()
                          )
                        );
                      }

                      const newPos = targetRange.start;
                      requestAnimationFrame(() => {
                        if (textareaRef.current) {
                          textareaRef.current.setSelectionRange(newPos, newPos);
                        }
                      });
                      return;
                    }
                  } else {
                    const overlapping = ranges.filter(
                      (r) => selectionStart < r.end && selectionEnd > r.start
                    );
                    if (overlapping.length > 0) {
                      const nextInput = input.slice(0, selectionStart) + input.slice(selectionEnd);
                      const remainingRanges = findMentionRanges(nextInput, docsList);
                      for (const targetRange of overlapping) {
                        const stillReferenced = remainingRanges.some(
                          (r) =>
                            (targetRange.materialId && r.materialId === targetRange.materialId) ||
                            r.title.toLowerCase() === targetRange.title.toLowerCase()
                        );
                        if (!stillReferenced) {
                          setAttachedDocs((prev) =>
                            prev.filter(
                              (d) =>
                                (targetRange.materialId ? d.id !== targetRange.materialId : true) &&
                                d.title.toLowerCase() !== targetRange.title.toLowerCase()
                            )
                          );
                        }
                      }
                    }
                  }
                }

                if (e.key === "Delete") {
                  if (selectionStart === selectionEnd) {
                    const pos = selectionStart;
                    const targetRange = ranges.find((r) => pos >= r.start && pos < r.end);
                    if (targetRange) {
                      e.preventDefault();
                      const hasTrailingSpace = input[targetRange.end] === " ";
                      const deleteEnd = hasTrailingSpace ? targetRange.end + 1 : targetRange.end;
                      const nextInput = input.slice(0, targetRange.start) + input.slice(deleteEnd);
                      setInput(nextInput);

                      const remainingRanges = findMentionRanges(nextInput, docsList);
                      const stillReferenced = remainingRanges.some(
                        (r) =>
                          (targetRange.materialId && r.materialId === targetRange.materialId) ||
                          r.title.toLowerCase() === targetRange.title.toLowerCase()
                      );

                      if (!stillReferenced) {
                        setAttachedDocs((prev) =>
                          prev.filter(
                            (d) =>
                              (targetRange.materialId ? d.id !== targetRange.materialId : true) &&
                              d.title.toLowerCase() !== targetRange.title.toLowerCase()
                          )
                        );
                      }

                      const newPos = targetRange.start;
                      requestAnimationFrame(() => {
                        if (textareaRef.current) {
                          textareaRef.current.setSelectionRange(newPos, newPos);
                        }
                      });
                      return;
                    }
                  } else {
                    const overlapping = ranges.filter(
                      (r) => selectionStart < r.end && selectionEnd > r.start
                    );
                    if (overlapping.length > 0) {
                      const nextInput = input.slice(0, selectionStart) + input.slice(selectionEnd);
                      const remainingRanges = findMentionRanges(nextInput, docsList);
                      for (const targetRange of overlapping) {
                        const stillReferenced = remainingRanges.some(
                          (r) =>
                            (targetRange.materialId && r.materialId === targetRange.materialId) ||
                            r.title.toLowerCase() === targetRange.title.toLowerCase()
                        );
                        if (!stillReferenced) {
                          setAttachedDocs((prev) =>
                            prev.filter(
                              (d) =>
                                (targetRange.materialId ? d.id !== targetRange.materialId : true) &&
                                d.title.toLowerCase() !== targetRange.title.toLowerCase()
                            )
                          );
                        }
                      }
                    }
                  }
                }
              }

              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (isListening) stopListening();
                void onSubmit(input);
              }
            }}
          />
        </div>

        <div className="mt-2 flex items-center justify-between gap-2 pt-1">
          <div className="relative" ref={magIaRef}>
            <button
              type="button"
              onClick={() => {
                setIsMagIaOpen(!isMagIaOpen);
                setIsMentionOpen(false);
              }}
              className={`group flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-semibold border transition-all duration-150 active:scale-95 ${
                tutorMode === "socratic"
                  ? isLight
                    ? "bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-700 shadow-2xs"
                    : "bg-purple-950/40 hover:bg-purple-900/50 border-purple-800/60 text-purple-300 shadow-2xs"
                  : isLight
                  ? "bg-indigo-50 hover:bg-indigo-100 border-indigo-200 text-indigo-700 shadow-2xs"
                  : "bg-indigo-950/40 hover:bg-indigo-900/50 border-indigo-800/60 text-indigo-300 shadow-2xs"
              }`}
              title={`Modo de tutoría actual: ${tutorMode === "socratic" ? "Socrático" : "Explicativo"} (clic para cambiar)`}
              aria-expanded={isMagIaOpen}
              aria-haspopup="true"
            >
              <span className="material-symbols-outlined text-[15px]" aria-hidden="true">
                {tutorMode === "socratic" ? "school" : "menu_book"}
              </span>
              <span>{tutorMode === "socratic" ? "Socrático" : "Explicativo"}</span>
              <span
                className={`material-symbols-outlined text-xs opacity-70 transition-transform duration-200 ${
                  isMagIaOpen ? "rotate-180" : ""
                }`}
                aria-hidden="true"
              >
                expand_more
              </span>
            </button>

            {isMagIaOpen && (
              <div
                className={`absolute bottom-full left-0 mb-2 w-72 max-w-[calc(100vw-2rem)] rounded-2xl border p-2 shadow-xl z-30 ui-popover-enter backdrop-blur-xl ${
                  isLight
                    ? "bg-white/95 border-slate-200 text-slate-800 shadow-slate-900/10"
                    : "bg-slate-900/95 border-slate-800 text-slate-100 shadow-black/50"
                }`}
              >
                <div className="px-2 pt-1 pb-1.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[13px]">tune</span>
                    <span>Modo de Tutoría</span>
                  </span>
                </div>

                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setTutorMode("explanatory");
                      setIsMagIaOpen(false);
                    }}
                    className={`flex items-start gap-2.5 rounded-xl p-2 text-xs text-left transition-all duration-150 border ${
                      tutorMode === "explanatory"
                        ? isLight
                          ? "bg-indigo-50/90 border-indigo-300 shadow-xs ring-1 ring-indigo-400/30"
                          : "bg-indigo-950/60 border-indigo-500/60 shadow-xs ring-1 ring-indigo-500/30"
                        : isLight
                        ? "border-transparent hover:bg-slate-100/80 text-slate-700"
                        : "border-transparent hover:bg-slate-800/60 text-slate-300"
                    }`}
                  >
                    <img
                      src={proxoAvatar}
                      alt="Modo Explicativo"
                      className="size-8 rounded-lg object-cover border border-indigo-500/30 shrink-0 shadow-2xs mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className="font-bold text-xs text-slate-900 dark:text-slate-100">Modo Explicativo</p>
                        {tutorMode === "explanatory" && (
                          <span className="material-symbols-outlined text-[15px] text-indigo-500 font-bold ui-scale-in">
                            check_circle
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                        Respuestas directas, definiciones y ejemplos paso a paso.
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTutorMode("socratic");
                      setIsMagIaOpen(false);
                    }}
                    className={`flex items-start gap-2.5 rounded-xl p-2 text-xs text-left transition-all duration-150 border ${
                      tutorMode === "socratic"
                        ? isLight
                          ? "bg-purple-50/90 border-purple-300 shadow-xs ring-1 ring-purple-400/30"
                          : "bg-purple-950/60 border-purple-500/60 shadow-xs ring-1 ring-purple-500/30"
                        : isLight
                        ? "border-transparent hover:bg-slate-100/80 text-slate-700"
                        : "border-transparent hover:bg-slate-800/60 text-slate-300"
                    }`}
                  >
                    <img
                      src={proxoSocraticAvatar}
                      alt="Modo Socrático"
                      className="size-8 rounded-lg object-cover border border-purple-500/30 shrink-0 shadow-2xs mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className="font-bold text-xs text-slate-900 dark:text-slate-100">Modo Socrático</p>
                        {tutorMode === "socratic" && (
                          <span className="material-symbols-outlined text-[15px] text-purple-500 font-bold ui-scale-in">
                            check_circle
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                        Preguntas reflexivas y pistas para deducir la solución.
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5">
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
                          {mat.pageCount && <span className="text-[10px] text-slate-400">{mat.pageCount} pág</span>}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

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
              <span className="material-symbols-outlined text-[19px]">mic</span>
            </button>

            <button
              type="submit"
              disabled={isSending || isTutorWriting || (input.trim().length === 0 && attachedDocs.length === 0)}
              className={`grid size-8 place-items-center rounded-xl transition ${
                (input.trim().length > 0 || attachedDocs.length > 0) && !isSending && !isTutorWriting
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
  );
}
