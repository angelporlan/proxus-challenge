import { useAtomValue } from "@effect/atom-react";
import type { PdfMaterial } from "@proxus/shared";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import { useState } from "react";
import { ArtifactWorkspace } from "./components/ArtifactWorkspace.tsx";
import { Chat } from "./components/Chat.tsx";
import { OnboardingUpload } from "./components/OnboardingUpload.tsx";
import { PdfSplitViewer } from "./components/PdfSplitViewer.tsx";
import { Sidebar } from "./components/Sidebar.tsx";
import { materialQuery, materialsQuery } from "./domain/materials/atoms.ts";

type ActiveTab = "workspace" | "pdf" | "upload";

export function App() {
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null);
  const [pdfPage, setPdfPage] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<ActiveTab>("workspace");
  const [chatPrompt, setChatPrompt] = useState<string | null>(null);

  const materialsResult = useAtomValue(materialsQuery);

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
    <div className="grid h-screen min-h-screen overflow-hidden bg-[#090d16] text-slate-100 grid-cols-[300px_minmax(0,1.2fr)_minmax(380px,1fr)] max-lg:grid-cols-1">
      {/* 1. Left Sidebar */}
      <Sidebar
        selectedArtifactId={selectedArtifactId}
        onSelectArtifact={handleSelectArtifact}
        selectedMaterialId={selectedMaterialId}
        onSelectMaterial={handleSelectMaterial}
        onAskTutor={(prompt) => setChatPrompt(prompt)}
      />

      {/* 2. Center Content Workspace / PDF Viewer / Onboarding */}
      <div className="flex flex-col h-screen overflow-hidden border-r border-slate-800 bg-slate-950/70">
        {/* Navigation Tab Bar */}
        <header className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800 bg-slate-900/60 shrink-0">
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab("workspace")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
                activeTab === "workspace"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <span className="material-symbols-outlined text-sm">school</span>
              <span>Ejercicios & Notas</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("pdf")}
              disabled={!selectedMaterialId && !hasMaterials}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition disabled:opacity-40 disabled:cursor-not-allowed ${
                activeTab === "pdf"
                  ? "bg-indigo-600 text-white shadow-sm"
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
              className="text-xs text-slate-400 hover:text-slate-200 font-mono"
            >
              Cerrar recurso ✕
            </button>
          )}
        </header>

        {/* Tab Views */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {activeTab === "upload" ? (
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
                <span className="material-symbols-outlined text-4xl text-slate-600 mb-2">picture_as_pdf</span>
                <p className="font-semibold text-slate-200 text-sm mb-1">Ningún PDF seleccionado</p>
                <p className="text-xs text-slate-400 mb-4">
                  Selecciona un archivo PDF de la barra lateral para ver sus páginas en split-view.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab("upload")}
                  className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-500 transition"
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

      {/* 3. Right Chat Workspace */}
      <Chat
        prefillPrompt={chatPrompt}
        onClearPrefill={() => setChatPrompt(null)}
        onSelectArtifact={handleSelectArtifact}
      />
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
        <div className="size-5 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent"></div>
        <p className="text-sm">Cargando datos del PDF…</p>
      </div>
    ),
    onError: (err) => (
      <div className="p-6 text-red-300 text-sm">Error cargando material: {String(err)}</div>
    ),
    onDefect: (def) => (
      <div className="p-6 text-red-300 text-sm">Error: {String(def)}</div>
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
