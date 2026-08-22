import { useAtomSet, useAtomValue } from "@effect/atom-react";
import type { PdfMaterial } from "@proxus/shared";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import {
  type KeyboardEvent as ReactKeyboardEvent,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { Chat } from "./components/Chat.tsx";
import { DocumentUploadModal } from "./components/DocumentUploadModal.tsx";
import { MaterialDeleteDialog } from "./components/MaterialDeleteDialog.tsx";
import { ArtifactDeleteDialog } from "./components/ArtifactDeleteDialog.tsx";
import { OnboardingUpload } from "./components/OnboardingUpload.tsx";
import { Sidebar } from "./components/Sidebar.tsx";
import { useResizablePanels, clamp } from "./hooks/useResizablePanels.ts";
import { IconButton } from "./components/ui/IconButton.tsx";
import { useToast } from "./components/ui/Toast.tsx";
import {
  deleteMaterialAction,
  materialsQuery
} from "./domain/materials/atoms.ts";
import {
  artifactsQuery,
  deleteArtifactAction
} from "./domain/artifacts/atoms.ts";
import {
  clearKnowledgeProfileAction,
  knowledgeProfileQuery
} from "./domain/knowledge/atoms.ts";
import { setArtifactSaved } from "./domain/artifacts/saved-artifacts.ts";
import {
  clearUserProfileAction,
  saveUserProfileAction,
  userProfileQuery
} from "./domain/user-profile/atoms.ts";
import { clearAllStoredSessions } from "./domain/sessions/storage.ts";
import { ConversationalOnboarding } from "./components/ConversationalOnboarding.tsx";
import { UserProfileModal } from "./components/UserProfileModal.tsx";
import { CreateExerciseModal, type ExerciseRequest } from "./components/CreateExerciseModal.tsx";
import { MISTAKE_TUTOR_PROMPT_PREFIX } from "./components/chat/types.ts";
import { type ActiveTab, getDeletedMaterialNavigation } from "./components/workspace/navigation.ts";
import { NoPdfSelected, StudyHome } from "./components/workspace/StudyHome.tsx";
import { ResponsivePanel } from "./components/workspace/ResponsivePanel.tsx";
import { SelectedMaterialPdfViewer } from "./components/workspace/SelectedMaterialPdfViewer.tsx";
import { WorkspaceTab } from "./components/workspace/WorkspaceTab.tsx";

const ArtifactWorkspace = lazy(() => import("./components/ArtifactWorkspace.tsx").then(m => ({ default: m.ArtifactWorkspace })));
const KnowledgeGapsPanel = lazy(() => import("./components/KnowledgeGapsPanel.tsx").then(m => ({ default: m.KnowledgeGapsPanel })));
const MindMapViewer = lazy(() => import("./components/MindMapViewer.tsx").then(m => ({ default: m.MindMapViewer })));

function LazyFallback() {
  return (
    <div className="flex h-full items-center justify-center gap-3 text-slate-400">
      <span className="ui-spinner" />
      <p className="text-sm">Cargando…</p>
    </div>
  );
}

type Theme = "dark" | "light";

const TAB_ORDER: readonly ActiveTab[] = ["workspace", "mindmap", "pdf", "gaps"];

export function App() {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem("proxus_theme");
    return saved === "light" ? "light" : "dark";
  });

  const {
    setSidebarWidth,
    setChatWidth,
    viewportWidth,
    layoutWidths,
    isWideLayout,
    isResizingLeft,
    isResizingRight,
    beginSidebarResize,
    updateSidebarResize,
    beginTutorResize,
    updateTutorResize,
    finishResize
  } = useResizablePanels();

  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null);
  const [pdfPage, setPdfPage] = useState(1);
  const [activeTab, setActiveTab] = useState<ActiveTab>("workspace");
  const [chatPrompt, setChatPrompt] = useState<string | null>(null);
  const [chatAutoSubmitPrompt, setChatAutoSubmitPrompt] = useState<string | null>(null);
  const [chatAttachments, setChatAttachments] = useState<
    readonly { readonly id: string; readonly title: string; readonly pageCount?: number }[] | undefined
  >(undefined);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isTutorOpen, setIsTutorOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    const isWide = window.matchMedia("(min-width: 1440px)").matches;
    if (!isWide) return false;
    return localStorage.getItem("proxus_tutor_open") !== "false";
  });
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [recentlyUploadedId, setRecentlyUploadedId] = useState<string | null>(null);
  const [isCreateExerciseOpen, setIsCreateExerciseOpen] = useState(false);
  const [exerciseMaterialId, setExerciseMaterialId] = useState<string | null>(null);

  const [pendingDeletion, setPendingDeletion] = useState<PdfMaterial | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const deleteMaterial = useAtomSet(deleteMaterialAction, { mode: "promise" });
  const materialsResult = useAtomValue(materialsQuery);
  const artifactsResult = useAtomValue(artifactsQuery);
  const clearKnowledgeProfile = useAtomSet(clearKnowledgeProfileAction, { mode: "promise" });
  const userProfileResult = useAtomValue(userProfileQuery);
  const saveUserProfile = useAtomSet(saveUserProfileAction, { mode: "promise" });
  const clearUserProfile = useAtomSet(clearUserProfileAction, { mode: "promise" });
  const [isUserProfileModalOpen, setIsUserProfileModalOpen] = useState(false);
  const [hasSkippedOnboarding, setHasSkippedOnboarding] = useState(
    () => typeof window !== "undefined" && sessionStorage.getItem("proxus_skipped_onboarding") === "true"
  );
  const { notify } = useToast();
  const deleteTriggerRef = useRef<HTMLButtonElement>(null);
  const deleteSuccessFocusRef = useRef<HTMLElement | null>(null);
  const libraryTriggerRef = useRef<HTMLElement | null>(null);
  const tutorTriggerRef = useRef<HTMLElement | null>(null);
  const libraryFallbackRef = useRef<HTMLButtonElement>(null);
  const tutorFallbackRef = useRef<HTMLButtonElement>(null);

  const profileResult = useAtomValue(knowledgeProfileQuery);
  const activeGapsCount = AsyncResult.match(profileResult, {
    onInitial: () => 0,
    onFailure: () => 0,
    onSuccess: ({ value }) => value.gaps.filter((g) => g.status === "active").length
  });
  const isLight = theme === "light";
  const hasMaterials = AsyncResult.match(materialsResult, {
    onInitial: () => false,
    onFailure: () => false,
    onSuccess: ({ value }) => value.materials.length > 0
  });
  const recentMaterial = useMemo(
    () =>
      AsyncResult.match(materialsResult, {
        onInitial: () => null,
        onFailure: () => null,
        onSuccess: ({ value }) =>
          [...value.materials].sort(
            (left, right) =>
              new Date(right.uploadedAt).getTime() - new Date(left.uploadedAt).getTime()
          )[0] ?? null
      }),
    [materialsResult]
  );

  const materialsList = useMemo(
    () =>
      AsyncResult.match(materialsResult, {
        onInitial: () => [],
        onFailure: () => [],
        onSuccess: ({ value }) => value.materials
      }),
    [materialsResult]
  );

  const userProfile = useMemo(
    () =>
      AsyncResult.match(userProfileResult, {
        onInitial: () => null,
        onFailure: () => null,
        onSuccess: ({ value }) => value
      }),
    [userProfileResult]
  );

  const shouldShowOnboarding =
    userProfile !== null &&
    !userProfile.onboardingCompleted &&
    !hasSkippedOnboarding;


  useEffect(() => {
    document.documentElement.classList.toggle("light", isLight);
    document.documentElement.classList.toggle("dark", !isLight);
    localStorage.setItem("proxus_theme", theme);
  }, [isLight, theme]);

  useEffect(() => () => document.body.classList.remove("is-resizing"), []);

  const toggleTheme = () => setTheme((current) => (current === "dark" ? "light" : "dark"));

  const closeLibrary = useCallback(() => setIsLibraryOpen(false), []);
  const closeTutor = useCallback(() => {
    setIsTutorOpen(false);
    if (typeof window !== "undefined" && window.matchMedia("(min-width: 1440px)").matches) {
      localStorage.setItem("proxus_tutor_open", "false");
    }
  }, []);

  const openLibrary = () => {
    libraryTriggerRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    setIsTutorOpen(false);
    setIsLibraryOpen(true);
  };

  const openTutor = (
    prompt?: string,
    attachments?: readonly { readonly id: string; readonly title: string; readonly pageCount?: number }[],
    options?: { readonly autoSubmitPrompt?: string | undefined }
  ) => {
    tutorTriggerRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    setChatPrompt(prompt ?? null);
    setChatAutoSubmitPrompt(options?.autoSubmitPrompt ?? null);
    if (attachments) setChatAttachments(attachments);
    setIsLibraryOpen(false);
    setIsTutorOpen(true);
    if (typeof window !== "undefined" && window.matchMedia("(min-width: 1440px)").matches) {
      localStorage.setItem("proxus_tutor_open", "true");
    }
  };

  const openCreateExercise = (materialId?: string) => {
    setExerciseMaterialId(materialId ?? null);
    setIsCreateExerciseOpen(true);
  };

  const handleSelectArtifact = (artifactId: string) => {
    setSelectedArtifactId(artifactId);
    setActiveTab("workspace");
    setIsLibraryOpen(false);
  };

  const handleSelectMaterial = (materialId: string, page = 1) => {
    setSelectedMaterialId(materialId);
    setSelectedArtifactId(null);
    setPdfPage(page);
    setActiveTab("pdf");
    setIsLibraryOpen(false);
  };

  const handleGenerateExercise = (request: ExerciseRequest) => {
    setIsCreateExerciseOpen(false);
    setExerciseMaterialId(null);
    openTutor(
      request.displayPrompt,
      [{
        id: request.material.id,
        title: request.material.title,
        pageCount: request.material.pageCount
      }],
      { autoSubmitPrompt: request.prompt }
    );
  };

  const handleUploaded = (material: PdfMaterial) => {
    setSelectedMaterialId(material.id);
    setSelectedArtifactId(null);
    setPdfPage(1);
    setActiveTab("pdf");
    setIsUploadOpen(false);
    setIsLibraryOpen(false);
    setIsTutorOpen(false);
    setRecentlyUploadedId(material.id);
    notify({ tone: "success", title: `«${material.title}» está listo para estudiar` });
    window.setTimeout(() => {
      setRecentlyUploadedId((current) => (current === material.id ? null : current));
    }, 2400);
  };

  const requestDelete = (material: PdfMaterial, trigger?: HTMLButtonElement) => {
    deleteTriggerRef.current = trigger ?? null;
    const row = trigger?.closest("li");
    deleteSuccessFocusRef.current =
      (row?.nextElementSibling ?? row?.previousElementSibling)?.querySelector<HTMLElement>(
        "button:not(:disabled)"
      ) ?? null;
    setDeleteError(null);
    setPendingDeletion(material);
  };

  const cancelDelete = () => {
    if (isDeleting) return;
    const trigger = deleteTriggerRef.current;
    setPendingDeletion(null);
    setDeleteError(null);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (trigger?.isConnected) trigger.focus();
      });
    });
  };

  const confirmDelete = async () => {
    if (!pendingDeletion || isDeleting) return;
    const material = pendingDeletion;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      await deleteMaterial(material.id);
      const navigationReset = getDeletedMaterialNavigation(selectedMaterialId, material.id);
      if (navigationReset !== null) {
        setSelectedMaterialId(navigationReset.selectedMaterialId);
        setPdfPage(navigationReset.pdfPage);
        setActiveTab(navigationReset.activeTab);
        setIsLibraryOpen(false);
        setIsTutorOpen(false);
      }
      setPendingDeletion(null);
      notify({ tone: "success", title: "PDF eliminado" });
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const heading = document.getElementById("materials-heading");
          const headingAvailable = heading
            && heading.closest("[inert], [aria-hidden='true']") === null;
          const fallback = headingAvailable
            ? heading
            : libraryFallbackRef.current?.isConnected
              ? libraryFallbackRef.current
              : (deleteSuccessFocusRef.current?.isConnected ? deleteSuccessFocusRef.current : null);
          fallback?.focus();
          deleteSuccessFocusRef.current = null;
        });
      });
    } catch {
      setDeleteError("No se pudo eliminar el PDF. Comprueba la conexión e inténtalo de nuevo.");
    } finally {
      setIsDeleting(false);
    }
  };

  const deleteArtifact = useAtomSet(deleteArtifactAction, { mode: "promise" });

  const [pendingArtifactDeletion, setPendingArtifactDeletion] = useState<{
    readonly id: string;
    readonly title: string;
    readonly kind: "note" | "quiz" | "test";
  } | null>(null);
  const [isDeletingArtifact, setIsDeletingArtifact] = useState(false);
  const [artifactDeleteError, setArtifactDeleteError] = useState<string | null>(null);
  const artifactDeleteTriggerRef = useRef<HTMLButtonElement | null>(null);

  const requestDeleteArtifact = (
    artifact: { readonly id: string; readonly title: string; readonly kind: "note" | "quiz" | "test" },
    trigger?: HTMLButtonElement
  ) => {
    artifactDeleteTriggerRef.current = trigger ?? null;
    setArtifactDeleteError(null);
    setPendingArtifactDeletion(artifact);
  };

  const cancelDeleteArtifact = () => {
    if (isDeletingArtifact) return;
    const trigger = artifactDeleteTriggerRef.current;
    setPendingArtifactDeletion(null);
    setArtifactDeleteError(null);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (trigger?.isConnected) trigger.focus();
      });
    });
  };

  const confirmDeleteArtifact = async () => {
    if (!pendingArtifactDeletion || isDeletingArtifact) return;
    const artifact = pendingArtifactDeletion;
    setIsDeletingArtifact(true);
    setArtifactDeleteError(null);

    try {
      await deleteArtifact(artifact.id);
      setArtifactSaved(artifact.id, false);
      if (selectedArtifactId === artifact.id) {
        setSelectedArtifactId(null);
        setActiveTab("workspace");
      }
      setPendingArtifactDeletion(null);
      notify({ tone: "success", title: "Recurso de estudio eliminado" });
    } catch {
      setArtifactDeleteError("No se pudo eliminar el recurso. Comprueba la conexión e inténtalo de nuevo.");
    } finally {
      setIsDeletingArtifact(false);
    }
  };

  const handleClearAllStudyData = async () => {
    // 1. Delete all materials
    const materials = AsyncResult.match(materialsResult, {
      onInitial: () => [],
      onFailure: () => [],
      onSuccess: ({ value }) => value.materials
    });
    for (const mat of materials) {
      try {
        await deleteMaterial(mat.id);
      } catch (err) {
        console.error("Error deleting material", mat.id, err);
      }
    }

    // 2. Delete all artifacts
    const artifacts = AsyncResult.match(artifactsResult, {
      onInitial: () => [],
      onFailure: () => [],
      onSuccess: ({ value }) => value.artifacts
    });
    for (const art of artifacts) {
      try {
        await deleteArtifact(art.id);
        setArtifactSaved(art.id, false);
      } catch (err) {
        console.error("Error deleting artifact", art.id, err);
      }
    }

    // 3. Clear knowledge profile / gaps
    try {
      await clearKnowledgeProfile();
    } catch (err) {
      console.error("Error clearing knowledge profile", err);
    }

    // 4. Clear all stored chat conversations
    clearAllStoredSessions();

    // 5. Reset workspace selection
    setSelectedMaterialId(null);
    setSelectedArtifactId(null);
    setActiveTab("workspace");
    notify({ tone: "neutral", title: "Todos los materiales, exámenes, lagunas y chats han sido eliminados" });
  };

  const handleAskAboutMistake = (context: {
    question: string;
    studentAnswer: string;
    correctAnswer?: string | undefined;
    explanation?: string | undefined;
  }) => {
    const prompt =
      `${MISTAKE_TUTOR_PROMPT_PREFIX}\n\n` +
      `Pregunta: "${context.question}"\n` +
      `Mi respuesta: "${context.studentAnswer}"\n` +
      (context.correctAnswer ? `Respuesta correcta: "${context.correctAnswer}"\n` : "") +
      (context.explanation ? `Explicación: "${context.explanation}"\n\n` : "\n") +
      "¿Por qué mi razonamiento fue incorrecto y cómo debería enfocar este concepto? No generes un quiz ni un simulacro para esta consulta; responde únicamente con la explicación del fallo.";
    openTutor(prompt);
  };

  const handleAskAboutPage = (materialTitle: string, page: number) => {
    const list = AsyncResult.match(materialsResult, {
      onInitial: () => [],
      onFailure: () => [],
      onSuccess: ({ value }) => value.materials
    });
    const mat = list.find((m) => m.title === materialTitle || m.id === selectedMaterialId);
    const mention = `@${mat?.title ?? materialTitle}`;
    const prompt = `${mention} Explica los conceptos clave de la página ${page} de «${mat?.title ?? materialTitle}». Si hay fórmulas o ejemplos, desglósalos paso a paso.`;
    openTutor(prompt, mat ? [{ id: mat.id, title: mat.title, pageCount: mat.pageCount }] : undefined);
  };

  const handleAskAboutSelection = (
    text: string,
    page: number,
    material: PdfMaterial
  ) => {
    const mention = `@${material.title}`;
    const prompt = `${mention} Explícame el siguiente fragmento de la página ${page} de «${material.title}»:\n\n«${text}»\n\nAclara conceptos clave y pon un ejemplo práctico si aplica.`;

    openTutor(prompt, [{ id: material.id, title: material.title, pageCount: material.pageCount }]);
  };

  const changeTab = (tab: ActiveTab) => {
    if (tab === "pdf" && !hasMaterials) return;
    setActiveTab(tab);
  };

  const handleTabKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const enabledTabs = TAB_ORDER.filter((tab) => tab !== "pdf" || hasMaterials);
    const currentIndex = enabledTabs.indexOf(activeTab);
    const direction = event.key === "ArrowRight" ? 1 : -1;
    const nextTab = enabledTabs[(currentIndex + direction + enabledTabs.length) % enabledTabs.length];
    if (!nextTab) return;
    setActiveTab(nextTab);
    requestAnimationFrame(() => document.getElementById(`workspace-tab-${nextTab}`)?.focus());
  };

  const adjustSidebarWithKeyboard = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Home") {
      event.preventDefault();
      setSidebarWidth(240);
      localStorage.setItem("proxus_sidebar_width", "240");
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      const maximum = Math.min(360, window.innerWidth - layoutWidths.chat - 640 - 12);
      setSidebarWidth(maximum);
      localStorage.setItem("proxus_sidebar_width", String(maximum));
      return;
    }
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const maximum = Math.min(360, window.innerWidth - layoutWidths.chat - 640 - 12);
    const next = clamp(
      layoutWidths.sidebar + (event.key === "ArrowRight" ? 8 : -8),
      240,
      maximum
    );
    setSidebarWidth(next);
    localStorage.setItem("proxus_sidebar_width", String(next));
  };

  const adjustTutorWithKeyboard = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Home") {
      event.preventDefault();
      setChatWidth(360);
      localStorage.setItem("proxus_chat_width", "360");
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      const maximum = Math.min(520, window.innerWidth - layoutWidths.sidebar - 640 - 12);
      setChatWidth(maximum);
      localStorage.setItem("proxus_chat_width", String(maximum));
      return;
    }
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const maximum = Math.min(520, window.innerWidth - layoutWidths.sidebar - 640 - 12);
    const next = clamp(
      layoutWidths.chat + (event.key === "ArrowLeft" ? 8 : -8),
      360,
      maximum
    );
    setChatWidth(next);
    localStorage.setItem("proxus_chat_width", String(next));
  };

  return (
    <div
      className={`flex h-screen min-h-screen overflow-hidden transition-colors ${
        isLight ? "bg-slate-50 text-slate-900" : "bg-[#0b0f17] text-slate-100"
      }`}
    >
      <ResponsivePanel side="left" label="Biblioteca" open={isLibraryOpen} onClose={closeLibrary} width={layoutWidths.sidebar} laptopWidth={360} isWide={isWideLayout} returnFocusRef={libraryTriggerRef} fallbackFocusRef={libraryFallbackRef}>
        <Sidebar
          selectedArtifactId={selectedArtifactId}
          onSelectArtifact={handleSelectArtifact}
          selectedMaterialId={selectedMaterialId}
          onSelectMaterial={handleSelectMaterial}
          onOpenMindMap={(id) => {
            setSelectedMaterialId(id);
            setSelectedArtifactId(null);
            setActiveTab("mindmap");
            setIsLibraryOpen(false);
          }}
          onAskTutor={(prompt) => openTutor(prompt)}
          onCreateExercise={openCreateExercise}
          onRequestUpload={() => setIsUploadOpen(true)}
          onRequestDelete={requestDelete}
          onRequestDeleteArtifact={requestDeleteArtifact}
          deletingMaterialId={isDeleting ? pendingDeletion?.id ?? null : null}
          recentlyUploadedId={recentlyUploadedId}
          onOpenProfile={() => setIsUserProfileModalOpen(true)}
          theme={theme}
        />
      </ResponsivePanel>

      <div
        role="separator"
        aria-label="Ajustar ancho de la biblioteca"
        aria-orientation="vertical"
        aria-valuemin={240}
        aria-valuemax={Math.max(240, Math.min(360, viewportWidth - layoutWidths.chat - 640 - 12))}
        aria-valuenow={layoutWidths.sidebar}
        tabIndex={0}
        onKeyDown={adjustSidebarWithKeyboard}
        onPointerDown={beginSidebarResize}
        onPointerMove={updateSidebarResize}
        onPointerUp={finishResize}
        onPointerCancel={finishResize}
        onDoubleClick={() => {
          setSidebarWidth(280);
          localStorage.setItem("proxus_sidebar_width", "280");
        }}
        className={`resizer-handle hidden min-[1440px]:block ${isResizingLeft ? "is-active" : ""}`}
        title="Arrastra para ajustar; usa las flechas con teclado; doble clic para restablecer"
      />

      <section
        inert={!isWideLayout && (isLibraryOpen || isTutorOpen) ? true : undefined}
        aria-hidden={!isWideLayout && (isLibraryOpen || isTutorOpen) ? true : undefined}
        className={`flex h-screen min-w-0 flex-1 flex-col overflow-hidden transition-colors ${
          isTutorOpen ? "border-r" : "border-r-0"
        } min-[1440px]:min-w-[640px] ${isLight ? "border-slate-200 bg-slate-50/70" : "border-slate-800 bg-slate-950/70"}`}
      >
        <header className={`flex shrink-0 items-center justify-between gap-2 border-b px-3 py-2 sm:px-4 ${isLight ? "border-slate-200 bg-white/95" : "border-slate-800 bg-slate-900/90"}`}>
          <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
            <IconButton ref={libraryFallbackRef} label="Abrir biblioteca" variant="ghost" className="min-[1440px]:hidden shrink-0" onClick={openLibrary} aria-expanded={isLibraryOpen}>
              <span className="material-symbols-outlined text-[18px]">menu</span>
            </IconButton>
            <div role="tablist" aria-label="Vistas del espacio de estudio" className={`flex items-center gap-0.5 rounded-xl border p-1 text-xs shrink-0 overflow-x-auto ${isLight ? "border-slate-200 bg-slate-100" : "border-slate-800 bg-slate-950"}`}>
              <WorkspaceTab id="workspace" label="Estudio" icon="school" active={activeTab === "workspace"} onClick={() => changeTab("workspace")} onKeyDown={handleTabKeyDown} isLight={isLight} />
              <WorkspaceTab id="gaps" label="Lagunas" badge={activeGapsCount} icon="psychology_alt" active={activeTab === "gaps"} onClick={() => changeTab("gaps")} onKeyDown={handleTabKeyDown} isLight={isLight} />
              <WorkspaceTab id="mindmap" label="Esquema" icon="schema" active={activeTab === "mindmap"} onClick={() => changeTab("mindmap")} onKeyDown={handleTabKeyDown} isLight={isLight} />
              <WorkspaceTab id="pdf" label="PDF" icon="picture_as_pdf" active={activeTab === "pdf"} disabled={!hasMaterials} onClick={() => changeTab("pdf")} onKeyDown={handleTabKeyDown} isLight={isLight} />
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
            {selectedArtifactId && activeTab === "workspace" && (
              <IconButton label="Cerrar recurso" variant="ghost" onClick={() => setSelectedArtifactId(null)} className="shrink-0">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </IconButton>
            )}
            <IconButton label={isLight ? "Cambiar a modo oscuro" : "Cambiar a modo claro"} variant="ghost" onClick={toggleTheme} className="shrink-0">
              <span className="material-symbols-outlined text-[18px]">{isLight ? "dark_mode" : "light_mode"}</span>
            </IconButton>
            <button
              ref={tutorFallbackRef}
              type="button"
              onClick={() => (isTutorOpen ? closeTutor() : openTutor())}
              className={`flex min-h-8 items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all duration-150 active:scale-95 shrink-0 ${
                isTutorOpen
                  ? isLight
                    ? "border-purple-200 bg-purple-50 text-purple-700 shadow-2xs"
                    : "border-purple-800/80 bg-purple-950/50 text-purple-300 shadow-2xs"
                  : isLight
                  ? "border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-100 shadow-2xs"
                  : "border-slate-800 text-slate-300 hover:text-slate-100 hover:bg-slate-800/80 shadow-2xs"
              }`}
              title={isTutorOpen ? "Ocultar Tutor de estudio" : "Mostrar Tutor de estudio"}
              aria-expanded={isTutorOpen}
            >
              <span className="material-symbols-outlined text-[17px] text-purple-500">forum</span>
              <span className="hidden xl:inline">{isTutorOpen ? "Ocultar Tutor" : "Tutor"}</span>
            </button>
          </div>
        </header>

        <div
          id="workspace-panel"
          role="tabpanel"
          aria-labelledby={`workspace-tab-${activeTab}`}
          className="min-h-0 min-w-0 flex-1 overflow-hidden ui-view-enter"
          key={activeTab}
        >
          {activeTab === "gaps" ? (
            <Suspense fallback={<LazyFallback />}>
              <KnowledgeGapsPanel
                theme={theme}
                onAskTutorAboutGap={(gap) =>
                  openTutor(
                    `Tengo dudas con esta pregunta de "${gap.topic}": "${gap.question}". ¿Por qué mi respuesta "${gap.studentAnswer}" no es correcta y la correcta es "${gap.correctAnswer}"? Explícamelo paso a paso.`
                  )
                }
              />
            </Suspense>
          ) : activeTab === "mindmap" ? (
            <Suspense fallback={<LazyFallback />}>
              <MindMapViewer
                theme={theme}
                selectedMaterialId={selectedMaterialId}
                onSelectMaterialId={setSelectedMaterialId}
                onAskTutorAboutConcept={(concept, notes) => openTutor(`Explica detalladamente el concepto "${concept}" en el contexto de mis apuntes: ${notes || ""}`)}
                onGenerateQuizForBranch={(branch) => openTutor(`Crea un quiz de 3 preguntas de opción múltiple centrado en el apartado "${branch}".`)}
                onOpenPdfPage={(materialId, page) => handleSelectMaterial(materialId, page)}
              />
            </Suspense>
          ) : activeTab === "pdf" && selectedMaterialId ? (
            <SelectedMaterialPdfViewer
              materialId={selectedMaterialId}
              initialPage={pdfPage}
              onClose={() => setActiveTab("workspace")}
              onAskAboutPage={handleAskAboutPage}
              onAskAboutSelection={handleAskAboutSelection}
            />
          ) : activeTab === "pdf" ? (
            <NoPdfSelected recentMaterial={recentMaterial} onOpenRecent={() => recentMaterial && handleSelectMaterial(recentMaterial.id)} onUpload={() => setIsUploadOpen(true)} />
          ) : selectedArtifactId ? (
            <Suspense fallback={<LazyFallback />}>
              <ArtifactWorkspace artifactId={selectedArtifactId} onAskTutorAboutQuestion={handleAskAboutMistake} onOpenPdf={(id) => handleSelectMaterial(id)} />
            </Suspense>
          ) : !hasMaterials ? (
            <div className="h-full overflow-y-auto"><OnboardingUpload onUploaded={handleUploaded} onSelectPrompt={(prompt) => openTutor(prompt)} /></div>
          ) : (
            <StudyHome recentMaterial={recentMaterial} onOpenMaterial={(id) => handleSelectMaterial(id)} onOpenTutor={() => openTutor()} onUpload={() => setIsUploadOpen(true)} />
          )}
        </div>
      </section>

      {isTutorOpen && (
        <div
          role="separator"
          aria-label="Ajustar ancho del tutor"
          aria-orientation="vertical"
          aria-valuemin={360}
          aria-valuemax={Math.max(360, Math.min(520, viewportWidth - layoutWidths.sidebar - 640 - 12))}
          aria-valuenow={layoutWidths.chat}
          tabIndex={0}
          onKeyDown={adjustTutorWithKeyboard}
          onPointerDown={beginTutorResize}
          onPointerMove={updateTutorResize}
          onPointerUp={finishResize}
          onPointerCancel={finishResize}
          onDoubleClick={() => {
            setChatWidth(400);
            localStorage.setItem("proxus_chat_width", "400");
          }}
          className={`resizer-handle hidden min-[1440px]:block ${isResizingRight ? "is-active" : ""}`}
          title="Arrastra para ajustar; usa las flechas con teclado; doble clic para restablecer"
        />
      )}

      <ResponsivePanel
        side="right"
        label="Tutor de estudio"
        open={isTutorOpen}
        onClose={closeTutor}
        width={layoutWidths.chat}
        laptopWidth={480}
        isWide={isWideLayout}
        returnFocusRef={tutorTriggerRef}
        fallbackFocusRef={tutorFallbackRef}
      >
        <Chat
          prefillPrompt={chatPrompt}
          autoSubmitPrompt={chatAutoSubmitPrompt}
          prefillAttachments={chatAttachments}
          onClearPrefill={() => {
            setChatPrompt(null);
            setChatAutoSubmitPrompt(null);
            setChatAttachments(undefined);
          }}
          onSelectArtifact={(id) => {
            handleSelectArtifact(id);
            if (!isWideLayout) setIsTutorOpen(false);
          }}
          onClose={closeTutor}
          theme={theme}
          onOpenProfile={() => setIsUserProfileModalOpen(true)}
        />
      </ResponsivePanel>

      {/* Conversational Onboarding for New Students */}
      {shouldShowOnboarding && (
        <ConversationalOnboarding
          currentProfile={userProfile}
          onComplete={async (updated) => {
            await saveUserProfile(updated);
            setHasSkippedOnboarding(false);
            sessionStorage.removeItem("proxus_skipped_onboarding");
            notify({ title: "¡Perfil configurado! El tutor ha adaptado su memoria.", tone: "success" });
          }}
          onSkip={() => {
            setHasSkippedOnboarding(true);
            sessionStorage.setItem("proxus_skipped_onboarding", "true");
          }}
          theme={theme}
        />
      )}

      {/* User Profile & Memory Settings Modal */}
      <UserProfileModal
        isOpen={isUserProfileModalOpen}
        onClose={() => setIsUserProfileModalOpen(false)}
        profile={userProfile}
        onSave={async (updated) => {
          await saveUserProfile(updated);
          notify({ title: "Perfil de aprendizaje actualizado", tone: "success" });
        }}
        onClearMemory={async () => {
          await clearUserProfile();
          setHasSkippedOnboarding(false);
          sessionStorage.removeItem("proxus_skipped_onboarding");
          notify({ title: "Memoria del tutor reiniciada correctamente", tone: "success" });
        }}
        onClearAllData={handleClearAllStudyData}
        theme={theme}
      />

      <DocumentUploadModal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} onUploaded={handleUploaded} />

      <CreateExerciseModal
        isOpen={isCreateExerciseOpen}
        materials={materialsList}
        initialMaterialId={exerciseMaterialId}
        onClose={() => {
          setIsCreateExerciseOpen(false);
          setExerciseMaterialId(null);
        }}
        onGenerate={handleGenerateExercise}
      />

      <MaterialDeleteDialog
        material={pendingDeletion}
        isDeleting={isDeleting}
        error={deleteError}
        onCancel={cancelDelete}
        onConfirm={() => void confirmDelete()}
      />

      <ArtifactDeleteDialog
        artifact={pendingArtifactDeletion}
        isDeleting={isDeletingArtifact}
        error={artifactDeleteError}
        onCancel={cancelDeleteArtifact}
        onConfirm={() => void confirmDeleteArtifact()}
      />
    </div>
  );
}

export { getDeletedMaterialNavigation } from "./components/workspace/navigation.ts";

