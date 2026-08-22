import type { PdfMaterial } from "@proxus/shared";
import { useEffect, useMemo, useState } from "react";
import { Button, Dialog } from "./ui/index.ts";

export type ExerciseKind = "quiz" | "test";
export type ExerciseScope = "all" | "pages";

export interface ExerciseRequest {
  readonly kind: ExerciseKind;
  readonly questionCount: number;
  readonly material: PdfMaterial;
  readonly scope: ExerciseScope;
  readonly pageSelection?: string | undefined;
  readonly prompt: string;
}

interface CreateExerciseModalProps {
  readonly isOpen: boolean;
  readonly materials: readonly PdfMaterial[];
  readonly initialMaterialId?: string | null | undefined;
  readonly onClose: () => void;
  readonly onGenerate: (request: ExerciseRequest) => void;
}

export function buildExercisePrompt({ kind, questionCount, material, scope, pageSelection }: Omit<ExerciseRequest, "prompt">): string {
  const exerciseName = kind === "quiz" ? "quiz de práctica" : "simulacro de examen";
  const format = kind === "quiz"
    ? "Usa preguntas de opción múltiple o verdadero/falso y añade una explicación pedagógica a cada una."
    : "Usa preguntas de opción múltiple, verdadero/falso y, cuando aporte valor, alguna pregunta de desarrollo con criterios claros.";
  const source = scope === "pages" && pageSelection
    ? `centrado exclusivamente en las páginas ${pageSelection}`
    : "basado en todo el documento";

  return [
    `Crea exactamente ${questionCount} preguntas para un ${exerciseName} ${source} del PDF «${material.title}».`,
    format,
    "Respeta exactamente el número solicitado y usa el comando artifacts create para guardar el recurso.",
    "Después presenta únicamente el widget generado con una introducción breve de una o dos frases: no enumeres preguntas, opciones, soluciones, JSON ni IDs en el texto del chat y no pidas responder con Q1: A."
  ].join(" ");
}

const quickCounts = (kind: ExerciseKind) => kind === "quiz" ? [3, 5] : [5, 10, 15, 20];
const pagesPattern = /^\d+(?:\s*-\s*\d+)?(?:\s*,\s*\d+(?:\s*-\s*\d+)?)*$/;

export function CreateExerciseModal({ isOpen, materials, initialMaterialId, onClose, onGenerate }: CreateExerciseModalProps) {
  const [kind, setKind] = useState<ExerciseKind>("quiz");
  const [questionCount, setQuestionCount] = useState(3);
  const [materialId, setMaterialId] = useState("");
  const [scope, setScope] = useState<ExerciseScope>("all");
  const [pageSelection, setPageSelection] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    const preferred = initialMaterialId && materials.some((material) => material.id === initialMaterialId)
      ? initialMaterialId
      : materials[0]?.id ?? "";
    setMaterialId(preferred);
    setKind("quiz");
    setQuestionCount(3);
    setScope("all");
    setPageSelection("");
  }, [initialMaterialId, isOpen, materials]);

  const selectedMaterial = useMemo(() => materials.find((material) => material.id === materialId), [materialId, materials]);
  const maxQuestions = kind === "quiz" ? 5 : 20;
  const minQuestions = kind === "quiz" ? 3 : 5;
  const validCount = Number.isInteger(questionCount) && questionCount >= minQuestions && questionCount <= maxQuestions;
  const validPages = scope === "all" || (pageSelection.trim().length > 0 && pagesPattern.test(pageSelection.trim()));

  const handleKindChange = (nextKind: ExerciseKind) => {
    setKind(nextKind);
    setQuestionCount(nextKind === "quiz" ? 3 : 5);
  };

  const handleGenerate = () => {
    if (!selectedMaterial || !validCount || !validPages) return;
    const normalizedPages = scope === "pages" ? pageSelection.trim() : undefined;
    onGenerate({
      kind,
      questionCount,
      material: selectedMaterial,
      scope,
      pageSelection: normalizedPages,
      prompt: buildExercisePrompt({ kind, questionCount, material: selectedMaterial, scope, pageSelection: normalizedPages })
    });
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      title="Preparar ejercicio"
      description="Configura el material y la dificultad antes de pedirle al tutor que genere el recurso."
      size="lg"
      footer={(
        <div className="flex w-full items-center justify-between gap-3">
          <span className="text-xs text-slate-500 dark:text-slate-400">El recurso aparecerá automáticamente en el chat.</span>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleGenerate} disabled={!selectedMaterial || !validCount || !validPages} leadingIcon={<span className="material-symbols-outlined text-sm">auto_awesome</span>}>Generar con Proxo</Button>
          </div>
        </div>
      )}
    >
      {materials.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-300">
          Sube primero un PDF para poder generar un ejercicio basado en tus materiales.
        </div>
      ) : (
        <div className="grid gap-5">
          <div>
            <label htmlFor="exercise-material" className="mb-1.5 block text-sm font-semibold text-slate-800 dark:text-slate-100">Material o PDF de origen</label>
            <select id="exercise-material" value={materialId} onChange={(event) => setMaterialId(event.currentTarget.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
              {materials.map((material) => <option key={material.id} value={material.id}>{material.title} · {material.pageCount} pág.</option>)}
            </select>
          </div>

          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-100">Tipo de ejercicio</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <ExerciseTypeCard selected={kind === "quiz"} icon="quiz" title="Quiz de práctica" description="Rápido, ágil y con feedback inmediato." onClick={() => handleKindChange("quiz")} />
              <ExerciseTypeCard selected={kind === "test"} icon="timer" title="Simulacro de examen" description="Evaluación formal con tiempo y navegación." onClick={() => handleKindChange("test")} />
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-100">Número de preguntas</legend>
            <div className="flex flex-wrap gap-2">
              {quickCounts(kind).map((count) => <button key={count} type="button" onClick={() => setQuestionCount(count)} className={`min-w-14 rounded-lg border px-3 py-2 text-sm font-semibold transition ${questionCount === count ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-300 bg-white text-slate-700 hover:border-indigo-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"}`}>{count}</button>)}
              <label className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700"><span className="text-slate-500">Otro</span><input type="number" min={minQuestions} max={maxQuestions} value={questionCount} onChange={(event) => setQuestionCount(Number(event.currentTarget.value))} className="w-16 bg-transparent text-center font-semibold text-slate-900 outline-none dark:text-slate-100" /></label>
            </div>
            {!validCount && <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">Elige entre {minQuestions} y {maxQuestions} preguntas para este tipo.</p>}
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-100">Alcance del material</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm ${scope === "all" ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40" : "border-slate-200 dark:border-slate-800"}`}><input type="radio" name="exercise-scope" checked={scope === "all"} onChange={() => setScope("all")} />Todo el documento</label>
              <label className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm ${scope === "pages" ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40" : "border-slate-200 dark:border-slate-800"}`}><input type="radio" name="exercise-scope" checked={scope === "pages"} onChange={() => setScope("pages")} />Páginas concretas</label>
            </div>
            {scope === "pages" && <div className="mt-3"><label htmlFor="exercise-pages" className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Páginas, por ejemplo: 2, 4-6</label><input id="exercise-pages" value={pageSelection} onChange={(event) => setPageSelection(event.currentTarget.value)} placeholder={`1-${Math.min(materials.find((material) => material.id === materialId)?.pageCount ?? 10, 10)}`} className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />{!validPages && <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">Usa un formato como 2, 4-6.</p>}</div>}
          </fieldset>
        </div>
      )}
    </Dialog>
  );
}

function ExerciseTypeCard({ selected, icon, title, description, onClick }: { readonly selected: boolean; readonly icon: string; readonly title: string; readonly description: string; readonly onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`rounded-xl border p-4 text-left transition ${selected ? "border-indigo-500 bg-indigo-50 shadow-sm dark:bg-indigo-950/40" : "border-slate-200 bg-white hover:border-indigo-300 dark:border-slate-800 dark:bg-slate-950"}`} aria-pressed={selected}><span className="material-symbols-outlined text-xl text-indigo-500">{icon}</span><strong className="mt-2 block text-sm text-slate-900 dark:text-slate-100">{title}</strong><span className="mt-1 block text-xs leading-relaxed text-slate-500 dark:text-slate-400">{description}</span></button>;
}
