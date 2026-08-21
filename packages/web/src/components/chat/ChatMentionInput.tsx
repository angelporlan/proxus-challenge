import type { ChangeEvent, Dispatch, KeyboardEvent, RefObject, SetStateAction } from "react";
import {
  applyAtomicMentionDeletion,
  attachedDocsAfterTextChange,
  dropDocsMatchingRanges,
  findMentionRanges,
  mentionQueryAtCursor,
  splitMentionParts,
  type AttachedDoc
} from "../../hooks/useMentions.ts";
import type { ChatMaterial, TutorMode } from "./types.ts";

export function ChatMentionInput({
  isLight,
  input,
  setInput,
  tutorMode,
  attachedDocs,
  setAttachedDocs,
  availableMaterials,
  mentionQuery,
  setMentionQuery,
  selectedMentionIndex,
  setSelectedMentionIndex,
  filteredMentionMaterials,
  handleSelectMentionDoc,
  backdropRef,
  textareaRef,
  isListening,
  stopListening,
  onSubmit
}: {
  readonly isLight: boolean;
  readonly input: string;
  readonly setInput: (value: string | ((prev: string) => string)) => void;
  readonly tutorMode: TutorMode;
  readonly attachedDocs: readonly AttachedDoc[];
  readonly setAttachedDocs: Dispatch<SetStateAction<AttachedDoc[]>>;
  readonly availableMaterials: readonly ChatMaterial[];
  readonly mentionQuery: string | null;
  readonly setMentionQuery: (query: string | null) => void;
  readonly selectedMentionIndex: number;
  readonly setSelectedMentionIndex: Dispatch<SetStateAction<number>>;
  readonly filteredMentionMaterials: readonly ChatMaterial[];
  readonly handleSelectMentionDoc: (mat: AttachedDoc) => void;
  readonly backdropRef: RefObject<HTMLDivElement | null>;
  readonly textareaRef: RefObject<HTMLTextAreaElement | null>;
  readonly isListening: boolean;
  readonly stopListening: () => void;
  readonly onSubmit: (prompt: string) => void;
}) {
  const docsList = [...availableMaterials, ...attachedDocs];

  const onChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const val = event.currentTarget.value;
    setInput(val);
    setAttachedDocs((prev) => attachedDocsAfterTextChange(input, val, prev, availableMaterials));
    const query = mentionQueryAtCursor(val, event.currentTarget.selectionStart ?? val.length);
    if (query !== null) {
      setMentionQuery(query);
      setSelectedMentionIndex(0);
    } else {
      setMentionQuery(null);
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionQuery !== null && filteredMentionMaterials.length > 0) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelectedMentionIndex((idx) => (idx + 1) % filteredMentionMaterials.length);
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedMentionIndex(
          (idx) => (idx - 1 + filteredMentionMaterials.length) % filteredMentionMaterials.length
        );
        return;
      }
      if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault();
        const selected = filteredMentionMaterials[selectedMentionIndex] ?? filteredMentionMaterials[0];
        if (selected) handleSelectMentionDoc(selected);
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        setMentionQuery(null);
        return;
      }
    }

    const textarea = textareaRef.current;
    if (textarea && (event.key === "Backspace" || event.key === "Delete")) {
      const { selectionStart, selectionEnd } = textarea;
      const deleted = applyAtomicMentionDeletion(
        event.key,
        input,
        selectionStart,
        selectionEnd,
        docsList
      );
      if (deleted) {
        event.preventDefault();
        setInput(deleted.nextInput);
        if (deleted.removed.length > 0) {
          setAttachedDocs((prev) => dropDocsMatchingRanges(prev, deleted.removed));
        }
        requestAnimationFrame(() => {
          textareaRef.current?.setSelectionRange(deleted.cursor, deleted.cursor);
        });
        return;
      }

      if (selectionStart !== selectionEnd) {
        const overlapping = findMentionRanges(input, docsList).filter(
          (range) => selectionStart < range.end && selectionEnd > range.start
        );
        if (overlapping.length > 0) {
          const nextInput = input.slice(0, selectionStart) + input.slice(selectionEnd);
          const remaining = findMentionRanges(nextInput, docsList);
          const removed = overlapping.filter(
            (target) =>
              !remaining.some(
                (range) =>
                  (target.materialId && range.materialId === target.materialId) ||
                  range.title.toLowerCase() === target.title.toLowerCase()
              )
          );
          if (removed.length > 0) {
            setAttachedDocs((prev) => dropDocsMatchingRanges(prev, removed));
          }
        }
      }
    }

    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (isListening) stopListening();
      void onSubmit(input);
    }
  };

  return (
    <div className="relative w-full">
      {mentionQuery !== null && (
        <div
          className={`absolute bottom-full left-0 right-0 mb-2 max-h-56 overflow-y-auto rounded-2xl border p-2 shadow-2xl z-40 ui-scale-in ${
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

      <div
        ref={backdropRef}
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none whitespace-pre-wrap break-words px-2 py-1 text-sm font-sans font-normal leading-relaxed overflow-hidden select-none"
      >
        {input ? (
          <>
            {splitMentionParts(input, docsList).map((part, idx) =>
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
        onChange={onChange}
        onKeyDown={onKeyDown}
      />
    </div>
  );
}
