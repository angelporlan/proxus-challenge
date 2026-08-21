import type { ChangeEvent, Dispatch, RefObject, SetStateAction } from "react";
import { useEffect } from "react";
import type { AttachedDoc } from "../../hooks/useMentions.ts";
import { ChatMentionInput } from "./ChatMentionInput.tsx";
import { ChatModeSwitcher } from "./ChatModeSwitcher.tsx";
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

        <ChatMentionInput
          isLight={isLight}
          input={input}
          setInput={setInput}
          tutorMode={tutorMode}
          attachedDocs={attachedDocs}
          setAttachedDocs={setAttachedDocs}
          availableMaterials={availableMaterials}
          mentionQuery={mentionQuery}
          setMentionQuery={setMentionQuery}
          selectedMentionIndex={selectedMentionIndex}
          setSelectedMentionIndex={setSelectedMentionIndex}
          filteredMentionMaterials={filteredMentionMaterials}
          handleSelectMentionDoc={handleSelectMentionDoc}
          backdropRef={backdropRef}
          textareaRef={textareaRef}
          isListening={isListening}
          stopListening={stopListening}
          onSubmit={onSubmit}
        />

        <div className="mt-2 flex items-center justify-between gap-2 pt-1">
          <ChatModeSwitcher
            isLight={isLight}
            tutorMode={tutorMode}
            setTutorMode={setTutorMode}
            magIaRef={magIaRef}
            isMagIaOpen={isMagIaOpen}
            setIsMagIaOpen={setIsMagIaOpen}
            onOpen={() => setIsMentionOpen(false)}
          />

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
