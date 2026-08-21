import React, { useState, useEffect } from "react";
import type { UserProfile, UpdateUserProfileInput } from "@proxus/shared";
import { ONBOARDING_STEPS } from "../domain/user-profile/stepsConfig.ts";
import proxoAvatar from "../assets/proxo-avatar.jpg";

interface UserProfileModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly profile: UserProfile | null | undefined;
  readonly onSave: (updated: UpdateUserProfileInput) => Promise<void> | void;
  readonly onClearMemory: () => Promise<void> | void;
  readonly theme?: "dark" | "light" | undefined;
}

export function UserProfileModal({
  isOpen,
  onClose,
  profile,
  onSave,
  onClearMemory,
  theme = "dark"
}: UserProfileModalProps) {
  const isLight = theme === "light";
  const [educationLevel, setEducationLevel] = useState(profile?.educationLevel ?? "");
  const [study, setStudy] = useState(profile?.study ?? "");
  const [mainDifficulty, setMainDifficulty] = useState(profile?.mainDifficulty ?? "");
  const [mainBlocker, setMainBlocker] = useState(profile?.mainBlocker ?? "");
  const [goal, setGoal] = useState(profile?.goal ?? "");

  const [isSaving, setIsSaving] = useState(false);
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    if (profile) {
      setEducationLevel(profile.educationLevel ?? "");
      setStudy(profile.study ?? "");
      setMainDifficulty(profile.mainDifficulty ?? "");
      setMainBlocker(profile.mainBlocker ?? "");
      setGoal(profile.goal ?? "");
    }
  }, [profile, isOpen]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const educationStep = ONBOARDING_STEPS.find((s) => s.id === "step_education_level");
      const edLabel = educationStep?.options?.find((o) => o.id === educationLevel)?.label;

      const diffStep = ONBOARDING_STEPS.find((s) => s.id === "step_difficulty");
      const diffLabel = diffStep?.options?.find((o) => o.id === mainDifficulty)?.label;

      const goalStep = ONBOARDING_STEPS.find((s) => s.id === "step_goal");
      const gLabel = goalStep?.options?.find((o) => o.id === goal)?.label;

      await onSave({
        educationLevel: educationLevel || undefined,
        educationLevelLabel: edLabel || undefined,
        study: study || undefined,
        mainDifficulty: mainDifficulty || undefined,
        mainDifficultyLabel: diffLabel || undefined,
        mainBlocker: mainBlocker || undefined,
        goal: goal || undefined,
        goalLabel: gLabel || undefined,
        onboardingCompleted: true
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmReset = async () => {
    setIsClearing(true);
    try {
      await onClearMemory();
      setShowConfirmReset(false);
      onClose();
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className={`w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-all ${
          isLight ? "bg-white border-slate-200 text-slate-900" : "bg-[#0d121d] border-slate-800 text-slate-100"
        }`}
      >
        {/* Header */}
        <header
          className={`flex items-center justify-between px-5 py-4 border-b shrink-0 ${
            isLight ? "border-slate-200 bg-slate-50/80" : "border-slate-800/80 bg-slate-900/60"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <img
              src={proxoAvatar}
              alt="Proxo"
              className="size-8 rounded-xl object-cover shadow-xs border border-indigo-500/30"
            />
            <div>
              <h2 className="text-sm font-bold tracking-tight">Lo que Proxo sabe de ti</h2>
              <p className={`text-[11px] ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                Personalización y memoria activa del estudiante
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`size-8 grid place-items-center rounded-xl transition ${
              isLight ? "text-slate-500 hover:bg-slate-200" : "text-slate-400 hover:bg-slate-800"
            }`}
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </header>

        {/* Content Form */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs sm:text-sm">
          {/* Nivel de estudios */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              ¿Qué estás estudiando?
            </label>
            <select
              value={educationLevel}
              onChange={(e) => setEducationLevel(e.target.value)}
              className={`w-full min-h-10 rounded-xl px-3 text-xs border outline-none transition focus:ring-2 focus:ring-indigo-500/40 ${
                isLight ? "bg-white border-slate-300 text-slate-900" : "bg-slate-900 border-slate-700 text-slate-100"
              }`}
            >
              <option value="">(No especificado)</option>
              <option value="university">Universidad</option>
              <option value="high_school">Bachillerato</option>
              <option value="vocational">Formación Profesional (FP)</option>
              <option value="civil_service">Oposiciones</option>
              <option value="other">Otro</option>
            </select>
          </div>

          {/* Grado / Carrera / Oposición */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Carrera, ciclo o temario específico
            </label>
            <input
              type="text"
              value={study}
              onChange={(e) => setStudy(e.target.value)}
              placeholder="Ej: Grado en Ingeniería Informática, Derecho, 2º Bachillerato..."
              className={`w-full min-h-10 rounded-xl px-3.5 text-xs border outline-none transition focus:ring-2 focus:ring-indigo-500/40 ${
                isLight ? "bg-white border-slate-300 text-slate-900" : "bg-slate-900 border-slate-700 text-slate-100"
              }`}
            />
          </div>

          {/* Dificultad principal */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              ¿Qué es lo que más te cuesta cuando estudias?
            </label>
            <select
              value={mainDifficulty}
              onChange={(e) => setMainDifficulty(e.target.value)}
              className={`w-full min-h-10 rounded-xl px-3 text-xs border outline-none transition focus:ring-2 focus:ring-indigo-500/40 ${
                isLight ? "bg-white border-slate-300 text-slate-900" : "bg-slate-900 border-slate-700 text-slate-100"
              }`}
            >
              <option value="">(No especificado)</option>
              <option value="understanding_theory">Entender la teoría</option>
              <option value="solving_exercises">Resolver ejercicios</option>
              <option value="memorizing">Memorizar</option>
              <option value="concentrating">Concentrarme</option>
              <option value="organizing">Organizarme</option>
              <option value="consistency">Mantener la constancia</option>
              <option value="other">Otro</option>
            </select>
          </div>

          {/* Mayor obstáculo */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Mayor obstáculo o bloqueo actual
            </label>
            <input
              type="text"
              value={mainBlocker}
              onChange={(e) => setMainBlocker(e.target.value)}
              placeholder="Ej: Tengo poco tiempo, me distraigo fácilmente..."
              className={`w-full min-h-10 rounded-xl px-3.5 text-xs border outline-none transition focus:ring-2 focus:ring-indigo-500/40 ${
                isLight ? "bg-white border-slate-300 text-slate-900" : "bg-slate-900 border-slate-700 text-slate-100"
              }`}
            />
          </div>

          {/* Objetivo principal */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Objetivo principal
            </label>
            <select
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              className={`w-full min-h-10 rounded-xl px-3 text-xs border outline-none transition focus:ring-2 focus:ring-indigo-500/40 ${
                isLight ? "bg-white border-slate-300 text-slate-900" : "bg-slate-900 border-slate-700 text-slate-100"
              }`}
            >
              <option value="">(No especificado)</option>
              <option value="pass_next_exam">Aprobar mi próximo examen</option>
              <option value="improve_grades">Mejorar mis notas</option>
              <option value="understand_subject">Entender mejor una asignatura</option>
              <option value="prepare_civil_service">Preparar una oposición</option>
              <option value="build_study_habit">Crear un hábito de estudio</option>
              <option value="other">Otro</option>
            </select>
          </div>

          {/* Actions Footer */}
          <div className="pt-4 flex items-center justify-between border-t border-slate-200/80 dark:border-slate-800/80 gap-2">
            <button
              type="button"
              onClick={() => setShowConfirmReset(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
              title="Borrar todos los datos de memoria del tutor"
            >
              <span className="material-symbols-outlined text-[16px]">delete_forever</span>
              <span>Reiniciar memoria</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className={`px-3.5 py-2 rounded-xl border text-xs font-semibold transition ${
                  isLight ? "border-slate-200 text-slate-600 hover:bg-slate-100" : "border-slate-800 text-slate-400 hover:bg-slate-800"
                }`}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-xs transition active:scale-95 disabled:opacity-40"
              >
                {isSaving ? "Guardando…" : "Guardar cambios"}
              </button>
            </div>
          </div>
        </form>

        {/* Destructive Reset Confirmation Dialog */}
        {showConfirmReset && (
          <div className="absolute inset-0 z-20 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
            <div
              className={`w-full max-w-sm rounded-2xl border p-5 space-y-4 shadow-2xl ${
                isLight ? "bg-white border-slate-200 text-slate-900" : "bg-slate-900 border-slate-800 text-slate-100"
              }`}
            >
              <div className="flex items-center gap-3 text-red-500">
                <span className="material-symbols-outlined text-2xl">warning</span>
                <h3 className="font-bold text-sm">¿Quieres borrar lo que Proxo sabe sobre ti?</h3>
              </div>
              <p className={`text-xs leading-relaxed ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                Esto eliminará tu perfil de aprendizaje y tendrás que volver a responder las preguntas de personalización.
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmReset(false)}
                  disabled={isClearing}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition ${
                    isLight ? "border-slate-200 text-slate-600 hover:bg-slate-100" : "border-slate-800 text-slate-400 hover:bg-slate-800"
                  }`}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReset}
                  disabled={isClearing}
                  className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-xs transition"
                >
                  {isClearing ? "Borrando…" : "Reiniciar memoria"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
