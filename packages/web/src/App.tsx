import { useAtomValue } from "@effect/atom-react";
import type { PdfMaterial } from "@proxus/shared";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import { useEffect, useState } from "react";
import { ArtifactWorkspace } from "./components/ArtifactWorkspace.tsx";
import { Chat } from "./components/Chat.tsx";
import { MindMapViewer } from "./components/MindMapViewer.tsx";
import { OnboardingUpload } from "./components/OnboardingUpload.tsx";
import { PdfSplitViewer } from "./components/PdfSplitViewer.tsx";
import { Sidebar } from "./components/Sidebar.tsx";
import { materialQuery, materialsQuery } from "./domain/materials/atoms.ts";

type ActiveTab = "workspace" | "mindmap" | "pdf" | "upload";

export function App() {
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    const saved = localStorage.getItem("proxus_theme");
    return saved === "light" ? "light" : "dark";
  });

  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    const saved = localStorage.getItem("proxus_sidebar_width");
    return saved ? Math.max(220, Math.min(480, Number(saved))) : 300;
  });

  const [chatWidth, setChatWidth] = useState<number>(() => {
    const saved = localStorage.getItem("proxus_chat_width");
    return saved ? Math.max(320, Math.min(680, Number(saved))) : 420;
  });

  const [isResizingLeft, setIsResizingLeft] = useState(false);
  const [isResizingRight, setIsResizingRight] = useState(false);

  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null);
  const [pdfPage, setPdfPage] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<ActiveTab>("workspace");
  const [chatPrompt, setChatPrompt] = useState<string | null>(null);

  const materialsResult = useAtomValue(materialsQuery);
  const isLight = theme === "light";

  // Sync theme with document class & localStorage
  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light");
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("proxus_theme", theme);
  }, [theme]);

  // Sync splitter drag handlers
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingLeft) {
        const newWidth = Math.max(220, Math.min(480, e.clientX));
        setSidebarWidth(newWidth);
        localStorage.setItem("proxus_sidebar_width", String(newWidth));
      } else if (isResizingRight) {
        const newWidth = Math.max(320, Math.min(680, window.innerWidth - e.clientX));
        setChatWidth(newWidth);
        localStorage.setItem("proxus_chat_width", String(newWidth));
      }
    };

    const handleMouseUp = () => {
      if (isResizingLeft || isResizingRight) {
        setIsResizingLeft(false);
        setIsResizingRight(false);
        document.body.classList.remove("is-resizing");
      }
    };

    if (isResizingLeft || isResizingRight) {
      document.body.classList.add("is-resizing");
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      document.body.classList.remove("is-resizing");
    };
  }, [isResizingLeft, isResizingRight]);

  const toggleTheme = () => {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  };

  const handleSelectArtifact = (artifactId: string) => {
    setSelectedArtifactId(artifactId);
    setActiveTab("workspace");
  };

  const handleSelectMaterial = (materialId: string, page = 1) => {
    setSelectedMaterialId(materialId);
    setPdfPage(page);
    setActiveTab("pdf");
  };

  const handleAskAboutMistake = (context: {
    question: string;
    studentAnswer: string;
    correctAnswer?: string | undefined;
    explanation?: string | undefined;
  }) => {
    const prompt = `He fallado esta pregunta en mi examen y necesito que me expliques el error:\n\n` +
      `📌 Pregunta: "${context.question}"\n` +
      `❌ Mi respuesta: "${context.studentAnswer}"\n` +
      (context.correctAnswer ? `✅ Respuesta correcta: "${context.correctAnswer}"\n` : "") +
      (context.explanation ? `💡 Explicación del test: "${context.explanation}"\n\n` : "\n") +
      `¿Por qué mi razonamiento fue incorrecto y cómo debería enfocar este concepto?`;

    setChatPrompt(prompt);
  };

  const handleAskAboutPage = (materialTitle: string, page: number) => {
    const prompt = `Explica los conceptos clave de la página ${page} del material "${materialTitle}". Si hay fórmulas o ejemplos, desglósalos paso a paso.`;
    setChatPrompt(prompt);
  };

  // Determine center view content
  const hasMaterials = AsyncResult.match(materialsResult, {
    onInitial: () => false,
    onFailure: () => false,
    onSuccess: ({ value }) => value.materials.length > 0
  });

  return (
    <div
      className={`flex h-screen min-h-screen overflow-hidden transition-colors ${
        isLight ? "bg-slate-50 text-slate-900" : "bg-[#090d16] text-slate-100"
      }`}
    >
      {/* 1. Left Sidebar with custom width */}
      <div
        style={{ width: `${sidebarWidth}px` }}
        className="shrink-0 h-full overflow-hidden"
      >
        <Sidebar
          selectedArtifactId={selectedArtifactId}
          onSelectArtifact={handleSelectArtifact}
          selectedMaterialId={selectedMaterialId}
          onSelectMaterial={handleSelectMaterial}
          onAskTutor={(prompt) => setChatPrompt(prompt)}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      </div>

      {/* Left Resizer Splitter Gutter */}
      <div
        onMouseDown={() => setIsResizingLeft(true)}
        onDoubleClick={() => {
          setSidebarWidth(300);
          localStorage.setItem("proxus_sidebar_width", "300");
        }}
        className={`resizer-handle ${isResizingLeft ? "is-active" : ""} ${
          isLight ? "bg-slate-200 hover:bg-indigo-500" : "bg-slate-800/80 hover:bg-indigo-500"
        }`}
        title="Arrastra para ajustar ancho de la barra lateral (Doble clic para restablecer 300px)"
      />

      {/* 2. Center Content Workspace / MindMap / PDF Viewer / Onboarding */}
      <div
        className={`flex flex-col flex-1 min-w-0 h-screen overflow-hidden border-r transition-colors ${
          isLight
            ? "border-slate-200 bg-slate-50/50"
            : "border-slate-800/80 bg-slate-950/70"
        }`}
      >
        {/* Navigation Tab Bar */}
        <header
          className={`flex items-center justify-between px-4 py-2.5 border-b shrink-0 transition-colors ${
            isLight
              ? "border-slate-200 bg-white/80 backdrop-blur"
              : "border-slate-800 bg-slate-900/60"
          }`}
        >
          <div
            className={`flex items-center gap-1 p-1 rounded-xl border text-xs flex-wrap ${
              isLight ? "bg-slate-100 border-slate-200" : "bg-slate-950 border-slate-800"
            }`}
          >
            <button
              type="button"
              onClick={() => setActiveTab("workspace")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
                activeTab === "workspace"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : isLight
                  ? "text-slate-600 hover:text-slate-900"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <span className="material-symbols-outlined text-sm">school</span>
              <span>Ejercicios & Notas</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("mindmap")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
                activeTab === "mindmap"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : isLight
                  ? "text-slate-600 hover:text-slate-900"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <span className="material-symbols-outlined text-sm">schema</span>
              <span>🗺️ Esquema Mental</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("pdf")}
              disabled={!selectedMaterialId && !hasMaterials}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition disabled:opacity-40 disabled:cursor-not-allowed ${
                activeTab === "pdf"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : isLight
                  ? "text-slate-600 hover:text-slate-900"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <span className="material-symbols-outlined text-sm">picture_as_pdf</span>
              <span>Visor PDF</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("upload")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
                activeTab === "upload"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : isLight
                  ? "text-slate-600 hover:text-slate-900"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <span className="material-symbols-outlined text-sm">upload_file</span>
              <span>Subir PDF</span>
            </button>
          </div>

          {selectedArtifactId && activeTab === "workspace" && (
            <button
              type="button"
              onClick={() => setSelectedArtifactId(null)}
              className={`text-xs font-mono transition ${
                isLight
                  ? "text-slate-500 hover:text-slate-800"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Cerrar recurso ✕
            </button>
          )}
        </header>

        {/* Tab Views */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {activeTab === "mindmap" ? (
            <MindMapViewer
              theme={theme}
              onAskTutorAboutConcept={(concept, notes) => {
                setChatPrompt(`Explica detalladamente el concepto "${concept}" en el contexto de mis apuntes: ${notes || ""}`);
              }}
              onGenerateQuizForBranch={(branch) => {
                setChatPrompt(`Crea un quiz de 3 preguntas de opción múltiple enfocado exclusivamente en el apartado: "${branch}"`);
              }}
            />
          ) : activeTab === "upload" ? (
            <div className="h-full overflow-y-auto">
              <OnboardingUpload
                onUploaded={(mat) => {
                  setSelectedMaterialId(mat.id);
                  setActiveTab("pdf");
                }}
                onSelectPrompt={(p) => setChatPrompt(p)}
              />
            </div>
          ) : activeTab === "pdf" && selectedMaterialId ? (
            <SelectedMaterialPdfViewer
              materialId={selectedMaterialId}
              initialPage={pdfPage}
              onClose={() => setActiveTab("workspace")}
              onAskAboutPage={handleAskAboutPage}
            />
          ) : activeTab === "pdf" ? (
            <div className="h-full flex items-center justify-center p-8 text-center">
              <div className="max-w-sm">
                <span className="material-symbols-outlined text-4xl text-slate-400 mb-2">picture_as_pdf</span>
                <p
                  className={`font-semibold text-sm mb-1 ${
                    isLight ? "text-slate-800" : "text-slate-200"
                  }`}
                >
                  Ningún PDF seleccionado
                </p>
                <p
                  className={`text-xs mb-4 ${
                    isLight ? "text-slate-500" : "text-slate-400"
                  }`}
                >
                  Selecciona un archivo PDF de la barra lateral para ver sus páginas en split-view.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab("upload")}
                  className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-500 transition shadow-sm shadow-indigo-600/20"
                >
                  Subir nuevo PDF
                </button>
              </div>
            </div>
          ) : (
            <div className="h-full overflow-hidden">
              {selectedArtifactId ? (
                <ArtifactWorkspace
                  artifactId={selectedArtifactId}
                  onAskTutorAboutQuestion={handleAskAboutMistake}
                  onOpenPdf={(id) => handleSelectMaterial(id)}
                />
              ) : !hasMaterials ? (
                <div className="h-full overflow-y-auto">
                  <OnboardingUpload
                    onUploaded={(mat) => {
                      setSelectedMaterialId(mat.id);
                      setActiveTab("pdf");
                    }}
                    onSelectPrompt={(p) => setChatPrompt(p)}
                  />
                </div>
              ) : (
                <ArtifactWorkspace
                  artifactId={null}
                  onAskTutorAboutQuestion={handleAskAboutMistake}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Resizer Splitter Gutter */}
      <div
        onMouseDown={() => setIsResizingRight(true)}
        onDoubleClick={() => {
          setChatWidth(420);
          localStorage.setItem("proxus_chat_width", "420");
        }}
        className={`resizer-handle ${isResizingRight ? "is-active" : ""} ${
          isLight ? "bg-slate-200 hover:bg-indigo-500" : "bg-slate-800/80 hover:bg-indigo-500"
        }`}
        title="Arrastra para ajustar ancho del Chat (Doble clic para restablecer 420px)"
      />

      {/* 3. Right Chat Workspace with custom width */}
      <div
        style={{ width: `${chatWidth}px` }}
        className="shrink-0 h-full overflow-hidden"
      >
        <Chat
          prefillPrompt={chatPrompt}
          onClearPrefill={() => setChatPrompt(null)}
          onSelectArtifact={handleSelectArtifact}
          onOpenMindMap={() => setActiveTab("mindmap")}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      </div>
    </div>
  );
}

function SelectedMaterialPdfViewer({
  materialId,
  initialPage,
  onClose,
  onAskAboutPage
}: {
  readonly materialId: string;
  readonly initialPage?: number | undefined;
  readonly onClose?: (() => void) | undefined;
  readonly onAskAboutPage?: ((materialTitle: string, page: number) => void) | undefined;
}) {
  const result = useAtomValue(materialQuery(materialId));

  return AsyncResult.matchWithError(result, {
    onInitial: () => (
      <div className="flex items-center justify-center h-full text-slate-400 gap-3">
        <div className="size-5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"></div>
        <p className="text-sm">Cargando datos del PDF…</p>
      </div>
    ),
    onError: (err) => (
      <div className="p-6 text-red-400 text-sm">Error cargando material: {String(err)}</div>
    ),
    onDefect: (def) => (
      <div className="p-6 text-red-400 text-sm">Error: {String(def)}</div>
    ),
    onSuccess: ({ value }: { value: PdfMaterial }) => (
      <PdfSplitViewer
        material={value}
        initialPage={initialPage}
        onClose={onClose}
        onAskAboutPage={onAskAboutPage}
      />
    )
  });
}
