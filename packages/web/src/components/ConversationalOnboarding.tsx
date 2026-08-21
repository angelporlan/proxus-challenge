import React, { useState, useEffect, useRef } from "react";
import type { UserProfile, UpdateUserProfileInput } from "@proxus/shared";
import { ONBOARDING_STEPS, type OnboardingStep, type StepOption } from "../domain/user-profile/stepsConfig.ts";

interface ConversationalOnboardingProps {
  readonly currentProfile?: UserProfile | null | undefined;
  readonly onComplete: (profile: UpdateUserProfileInput) => Promise<void> | void;
  readonly onSkip: () => void;
  readonly theme?: "dark" | "light" | undefined;
}

interface CompletedAnswer {
  readonly stepId: string;
  readonly question: string;
  readonly displayAnswer: string;
}

export function ConversationalOnboarding({
  currentProfile,
  onComplete,
  onSkip,
  theme = "dark"
}: ConversationalOnboardingProps) {
  const isLight = theme === "light";
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [history, setHistory] = useState<readonly CompletedAnswer[]>([]);
  const [customText, setCustomText] = useState("");
  const [selectedOther, setSelectedOther] = useState(false);
  const [isQuestionThinking, setIsQuestionThinking] = useState(true);
  const [isQuestionWriting, setIsQuestionWriting] = useState(false);
  const [displayedQuestion, setDisplayedQuestion] = useState("");
  const [displayedSubtitle, setDisplayedSubtitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const animationTimersRef = useRef<number[]>([]);

  const step: OnboardingStep | undefined = ONBOARDING_STEPS[currentStepIndex];

  useEffect(() => {
    const activeStep = step;
    if (!activeStep || isFinished) return;

    animationTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    animationTimersRef.current = [];
    setIsQuestionThinking(true);
    setIsQuestionWriting(false);
    setDisplayedQuestion("");
    setDisplayedSubtitle("");

    const thinkingTimer = window.setTimeout(() => {
      setIsQuestionThinking(false);
      setIsQuestionWriting(true);

      let visibleLength = 0;
      const questionStep = Math.max(2, Math.min(5, Math.ceil(activeStep.question.length / 32)));
      const writingTimer = window.setInterval(() => {
        visibleLength = Math.min(activeStep.question.length, visibleLength + questionStep);
        setDisplayedQuestion(activeStep.question.slice(0, visibleLength));

        if (visibleLength >= activeStep.question.length) {
          window.clearInterval(writingTimer);
          const subtitleTimer = window.setTimeout(() => {
            setDisplayedSubtitle(activeStep.subtitle ?? "");
            setIsQuestionWriting(false);
          }, activeStep.subtitle ? 180 : 0);
          animationTimersRef.current.push(subtitleTimer);
        }
      }, 24);

      animationTimersRef.current.push(writingTimer);
    }, 260);

    animationTimersRef.current.push(thinkingTimer);

    return () => {
      animationTimersRef.current.forEach((timer) => {
        window.clearTimeout(timer);
        window.clearInterval(timer);
      });
      animationTimersRef.current = [];
    };
  }, [currentStepIndex, isFinished]);

  useEffect(() => {
    return () => {
      animationTimersRef.current.forEach((timer) => {
        window.clearTimeout(timer);
        window.clearInterval(timer);
      });
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      if (typeof scrollRef.current.scrollTo === "function") {
        scrollRef.current.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: "smooth"
        });
      } else {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }
  }, [currentStepIndex, history, isFinished, isQuestionThinking, isQuestionWriting, selectedOther]);

  useEffect(() => {
    if ((step?.type === "text" || step?.type === "text_with_suggestions" || selectedOther) && inputRef.current) {
      inputRef.current.focus();
    }
  }, [currentStepIndex, step?.type, selectedOther]);

  const advanceStep = (field: string, value: string, displayLabel?: string) => {
    animationTimersRef.current.forEach((timer) => {
      window.clearTimeout(timer);
      window.clearInterval(timer);
    });
    animationTimersRef.current = [];

    const newAnswers = { ...answers, [field]: value };
    const newLabels = displayLabel && step?.labelField ? { ...labels, [step.labelField]: displayLabel } : labels;
    setAnswers(newAnswers);
    if (displayLabel && step?.labelField) setLabels(newLabels);

    if (step) {
      setHistory((prev) => [
        ...prev,
        {
          stepId: step.id,
          question: step.question,
          displayAnswer: displayLabel ?? value
        }
      ]);
    }

    setCustomText("");
    setSelectedOther(false);

    if (currentStepIndex + 1 < ONBOARDING_STEPS.length) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      setIsQuestionThinking(true);
      setIsQuestionWriting(false);
      setDisplayedQuestion("");
      setDisplayedSubtitle("");
      const summaryTimer = window.setTimeout(() => {
        setIsQuestionThinking(false);
        setIsFinished(true);
      }, 520);
      animationTimersRef.current.push(summaryTimer);
    }
  };

  const handleSelectOption = (option: StepOption) => {
    if (option.id === "other") {
      setSelectedOther(true);
      setCustomText("");
      return;
    }
    if (!step) return;
    advanceStep(step.profileField, option.id, option.label);
  };

  const handleSubmitText = (textValue?: string) => {
    const val = (textValue ?? customText).trim();
    if (!step) return;
    if (!val && step.required) return;
    advanceStep(step.profileField, val || "No especificado", val || "Omitido");
  };

  const handleFinish = async () => {
    setIsSubmitting(true);
    try {
      const payload: UpdateUserProfileInput = {
        educationLevel: answers.educationLevel,
        educationLevelLabel: labels.educationLevelLabel,
        study: answers.study,
        mainDifficulty: answers.mainDifficulty,
        mainDifficultyLabel: labels.mainDifficultyLabel,
        mainBlocker: answers.mainBlocker,
        goal: answers.goal,
        goalLabel: labels.goalLabel,
        onboardingCompleted: true
      };
      await onComplete(payload);
    } finally {
      setIsSubmitting(false);
    }
  };

  const buildSummary = () => {
    const studyPart = answers.study
      ? answers.study
      : labels.educationLevelLabel ?? answers.educationLevel ?? "tus estudios";
    const difficultyPart = (labels.mainDifficultyLabel ?? answers.mainDifficulty ?? "los conceptos clave").toLowerCase();
    const blockerPart = answers.mainBlocker ? ` (obstáculo principal: ${answers.mainBlocker.toLowerCase()})` : "";
    const goalPart = labels.goalLabel ?? answers.goal;

    return `¡Genial! Ya te conozco un poco mejor. He tomado nota de que preparas ${studyPart}, que tu mayor reto es ${difficultyPart}${blockerPart}${goalPart ? ` y que tu objetivo es ${goalPart.toLowerCase()}` : ""}.\n\nA partir de ahora adaptaré mi tono, nivel técnico y ritmo de estudio para ayudarte a conseguirlo. ¡Vamos a por ello!`;
  };

  return (
    <main
      className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-hidden ${
        isLight ? "bg-slate-900/40 backdrop-blur-md" : "bg-black/70 backdrop-blur-md"
      }`}
    >
      <div
        className={`flex flex-col w-full max-w-2xl h-[92vh] max-h-[720px] rounded-3xl border shadow-2xl overflow-hidden transition-all duration-200 ${
          isLight
            ? "bg-white border-slate-200 text-slate-900 shadow-indigo-950/15"
            : "bg-[#0d121d] border-slate-800 text-slate-100 shadow-black/80"
        }`}
      >
        {/* Header */}
        <header
          className={`flex items-center justify-between border-b px-5 py-3.5 shrink-0 ${
            isLight ? "border-slate-200 bg-slate-50/80" : "border-slate-800/80 bg-slate-900/60"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-xs">
              <span className="material-symbols-outlined text-[18px]">psychology</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <strong className="text-xs sm:text-sm font-bold tracking-tight">Tutor de estudio IA</strong>
                <span className="rounded-full bg-indigo-500/15 text-indigo-500 px-1.5 py-0.2 text-[9.5px] font-semibold border border-indigo-500/20">
                  Personalización
                </span>
              </div>
              <p className={`text-[11px] ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                {isFinished
                  ? "Perfil configurado"
                  : `Paso ${Math.min(currentStepIndex + 1, ONBOARDING_STEPS.length)} de ${ONBOARDING_STEPS.length}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isFinished && (
              <button
                type="button"
                onClick={onSkip}
                className={`px-3 py-1 text-xs font-semibold rounded-xl transition ${
                  isLight
                    ? "text-slate-500 hover:text-slate-800 hover:bg-slate-200/60"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                }`}
                title="Acceder directamente al tutor sin completar el onboarding ahora"
              >
                Ahora no
              </button>
            )}
          </div>
        </header>

        {/* Progress Bar */}
        <div className={`w-full h-1 shrink-0 ${isLight ? "bg-slate-100" : "bg-slate-800/60"}`}>
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300 ease-out"
            style={{
              width: `${isFinished ? 100 : ((currentStepIndex) / ONBOARDING_STEPS.length) * 100}%`
            }}
          />
        </div>

        {/* Chat Stream History Area */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs sm:text-sm leading-relaxed"
        >
          {/* Welcome Message */}
          <div className="flex items-start gap-3 max-w-[85%] animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="size-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
              <span className="material-symbols-outlined text-[15px]">school</span>
            </div>
            <div
              className={`rounded-2xl rounded-tl-xs p-3.5 border ${
                isLight
                  ? "bg-slate-50 border-slate-200 text-slate-800 shadow-2xs"
                  : "bg-slate-900/80 border-slate-800 text-slate-200 shadow-2xs"
              }`}
            >
              <p className="font-semibold text-xs text-indigo-500 dark:text-indigo-400 mb-1">Tutor</p>
              <p>
                ¡Hola! Soy tu tutor. Antes de empezar, quiero conocerte un poco para poder adaptar cómo te ayudo.
                Serán solo unas preguntas rápidas.
              </p>
            </div>
          </div>

          {/* History of completed questions & user answers */}
          {history.map((item, idx) => (
            <React.Fragment key={idx}>
              {/* Question bubble */}
              <div className="flex items-start gap-3 max-w-[85%] animate-in fade-in duration-200">
                <div className="size-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <span className="material-symbols-outlined text-[15px]">school</span>
                </div>
                <div
                  className={`rounded-2xl rounded-tl-xs p-3.5 border ${
                    isLight
                      ? "bg-slate-50 border-slate-200 text-slate-800"
                      : "bg-slate-900/80 border-slate-800 text-slate-200"
                  }`}
                >
                  <p>{item.question}</p>
                </div>
              </div>

              {/* User Answer bubble */}
              <div className="flex items-end justify-end gap-2 max-w-[85%] self-end ml-auto animate-in fade-in duration-200">
                <div className="rounded-2xl rounded-tr-xs p-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-xs font-medium">
                  <p>{item.displayAnswer}</p>
                </div>
              </div>
            </React.Fragment>
          ))}

          {/* Current Question Bubble */}
          {!isFinished && step && !isQuestionThinking && (
            <div className="flex items-start gap-3 max-w-[85%] animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="size-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                <span className="material-symbols-outlined text-[15px]">school</span>
              </div>
              <div
                className={`rounded-2xl rounded-tl-xs p-3.5 border ${
                  isLight
                    ? "bg-slate-50 border-slate-200 text-slate-800"
                    : "bg-slate-900/80 border-slate-800 text-slate-200"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <p className="font-semibold">{displayedQuestion}</p>
                  {isQuestionWriting && (
                    <span
                      aria-label="El tutor está escribiendo"
                      className="ui-typing-caret inline-block h-[1.05em] w-[2px] translate-y-[0.12em] rounded-full bg-indigo-500 align-baseline"
                    />
                  )}
                </div>
                {displayedSubtitle && (
                  <p className={`text-[11px] mt-1 ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                    {displayedSubtitle}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Thinking indicator between turns */}
          {isQuestionThinking && (
            <OnboardingThinkingBubble isLight={isLight} />
          )}

          {/* Final Summary Card when Finished */}
          {isFinished && (
            <div className="flex items-start gap-3 max-w-[90%] animate-in fade-in zoom-in-95 duration-300">
              <div className="size-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                <span className="material-symbols-outlined text-[15px]">school</span>
              </div>
              <div
                className={`rounded-2xl rounded-tl-xs p-4 border space-y-3 ${
                  isLight
                    ? "bg-slate-50 border-slate-200 text-slate-800 shadow-2xs"
                    : "bg-slate-900/80 border-slate-800 text-slate-200 shadow-2xs"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-xs text-indigo-500 dark:text-indigo-400">Tutor</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-300 px-2 py-0.5 text-[10px] font-semibold border border-purple-500/20">
                    <span className="material-symbols-outlined text-[12px]">auto_awesome</span>
                    <span>Perfil adaptado</span>
                  </span>
                </div>
                <p className="whitespace-pre-line text-xs sm:text-sm leading-relaxed">
                  {buildSummary()}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Interactive Answer Box Footer */}
        <footer
          className={`p-3.5 sm:p-5 border-t shrink-0 ${
            isLight ? "border-slate-200 bg-slate-50/50" : "border-slate-800/80 bg-slate-900/40"
          }`}
        >
          {isFinished ? (
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={handleFinish}
                disabled={isSubmitting}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-xs sm:text-sm shadow-md hover:shadow-lg hover:from-indigo-500 hover:to-purple-500 active:scale-98 transition-all flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <span className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Guardando perfil…</span>
                  </>
                ) : (
                  <>
                    <span>Empezar a estudiar</span>
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </>
                )}
              </button>
            </div>
          ) : step ? (
            <div className="space-y-2.5">
              {/* Option Chips for chips / chips_with_other */}
              {(step.type === "chips" || (step.type === "chips_with_other" && !selectedOther)) && step.options && (
                <div className="flex flex-wrap gap-2">
                  {step.options.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleSelectOption(opt)}
                      className={`group flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-semibold transition-all duration-150 active:scale-95 ${
                        isLight
                          ? "border-slate-200 bg-white hover:border-indigo-400 hover:bg-indigo-50/50 text-slate-800 shadow-2xs hover:shadow-xs"
                          : "border-slate-800 bg-slate-900/80 hover:border-indigo-500/50 hover:bg-slate-800 text-slate-200"
                      }`}
                    >
                      {opt.icon && (
                        <span className="material-symbols-outlined text-[16px] text-indigo-500 group-hover:scale-110 transition-transform">
                          {opt.icon}
                        </span>
                      )}
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Suggestions pills for text_with_suggestions */}
              {step.type === "text_with_suggestions" && step.suggestions && (
                <div className="space-y-1.5">
                  <p className={`text-[10.5px] font-bold uppercase tracking-wider ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                    Sugerencias frecuentes:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {step.suggestions.map((sug, sIdx) => (
                      <button
                        key={sIdx}
                        type="button"
                        onClick={() => handleSubmitText(sug)}
                        className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition active:scale-95 ${
                          isLight
                            ? "border-purple-200 bg-purple-50/70 hover:bg-purple-100 text-purple-800"
                            : "border-purple-800/50 bg-purple-950/40 hover:bg-purple-900/60 text-purple-300"
                        }`}
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Text Input Row (for free text, text_with_suggestions, or when 'Otro' selected) */}
              {(step.type === "text" || step.type === "text_with_suggestions" || selectedOther) && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSubmitText();
                  }}
                  className="flex items-center gap-2 pt-1"
                >
                  <input
                    ref={inputRef}
                    type="text"
                    value={customText}
                    onChange={(e) => setCustomText(e.target.value)}
                    placeholder={
                      selectedOther
                        ? "Escribe tu respuesta personalizada..."
                        : step.placeholder ?? "Escribe tu respuesta..."
                    }
                    className={`flex-1 min-h-10 rounded-xl px-3.5 text-xs sm:text-sm border outline-none transition focus:ring-2 focus:ring-indigo-500/40 ${
                      isLight
                        ? "bg-white border-slate-300 text-slate-900 placeholder:text-slate-400"
                        : "bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-500"
                    }`}
                  />
                  <button
                    type="submit"
                    disabled={!customText.trim() && step.required}
                    className="px-4 min-h-10 rounded-xl bg-indigo-600 text-white text-xs font-semibold shadow-xs hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    Continuar
                  </button>
                  {!step.required && (
                    <button
                      type="button"
                      onClick={() => handleSubmitText("No especificado")}
                      className={`px-3 min-h-10 rounded-xl border text-xs font-medium transition ${
                        isLight ? "border-slate-200 text-slate-600 hover:bg-slate-100" : "border-slate-800 text-slate-400 hover:bg-slate-800"
                      }`}
                    >
                      Omitir
                    </button>
                  )}
                </form>
              )}
            </div>
          ) : null}
        </footer>
      </div>
    </main>
  );
}

function OnboardingThinkingBubble({ isLight }: { readonly isLight: boolean }) {
  return (
    <div className="ui-enter flex items-start gap-3 max-w-[85%]" role="status" aria-label="El tutor está pensando">
      <div className="size-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs" aria-hidden="true">
        <span className="material-symbols-outlined text-[15px]">school</span>
      </div>
      <div
        className={`rounded-2xl rounded-tl-xs p-3.5 border text-xs ${
          isLight
            ? "bg-slate-50 border-slate-200 text-slate-500 shadow-2xs"
            : "bg-slate-900/80 border-slate-800 text-slate-400 shadow-2xs"
        }`}
      >
        <div className="flex items-center gap-2">
          <span>El tutor está pensando</span>
          <span className="flex items-center gap-1" aria-hidden="true">
            <span className="ui-thinking-dot" />
            <span className="ui-thinking-dot ui-thinking-dot--2" />
            <span className="ui-thinking-dot ui-thinking-dot--3" />
          </span>
        </div>
      </div>
    </div>
  );
}
