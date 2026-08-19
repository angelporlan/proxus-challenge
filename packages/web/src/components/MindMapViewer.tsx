import { useMemo, useState } from "react";

export interface MindMapNode {
  readonly id: string;
  readonly label: string;
  readonly notes?: string | undefined;
  readonly references?: readonly string[] | undefined;
  readonly color?: string | undefined;
  readonly children?: readonly MindMapNode[] | undefined;
}

interface MindMapViewerProps {
  readonly initialData?: MindMapNode | undefined;
  readonly onAskTutorAboutConcept?: ((concept: string, context?: string) => void) | undefined;
  readonly onGenerateQuizForBranch?: ((branchName: string) => void) | undefined;
  readonly theme?: "dark" | "light" | undefined;
}

// Sample structured default mind map based on LECrim and Academic topics
const defaultMindMapData: MindMapNode = {
  id: "root",
  label: "Tema 7: Derecho Procesal Penal y LECrim",
  notes: "Marco normativo fundamental del proceso penal español regulado por la Ley de Enjuiciamiento Criminal (LECrim) y la Constitución Española.",
  references: ["Art. 24 CE", "Arts. 1, 2 y 14 LECrim", "Ley Orgánica 6/1984"],
  color: "#6366f1",
  children: [
    {
      id: "branch-1",
      label: "1. Proceso Penal y Principios",
      color: "#f59e0b",
      notes: "Instrumento exclusivo del Estado para la aplicación del ius puniendi tras la comisión de un delito.",
      references: ["Pág. 1", "Arts. 1 y 2 LECrim", "Art. 24.2 CE"],
      children: [
        {
          id: "node-1-1",
          label: "Principio Acusatorio",
          notes: "Separación estricta de funciones: quien instruye no juzga. Congruencia y prohibición de reformatio in peius.",
          references: ["Art. 24.2 CE"]
        },
        {
          id: "node-1-2",
          label: "Juez Ordinario Predeterminado",
          notes: "Garantía de jurisdicción ordinaria establecida previamente por la ley.",
          references: ["Art. 24.2 CE"]
        },
        {
          id: "node-1-3",
          label: "Presunción de Inocencia",
          notes: "Regla de juicio y tratamiento. Exige prueba de cargo lícita para condenar.",
          references: ["Art. 24.2 CE"]
        }
      ]
    },
    {
      id: "branch-2",
      label: "2. Jurisdicción y Competencia",
      color: "#06b6d4",
      notes: "Criterios para determinar qué juzgado o tribunal conoce de una causa penal.",
      references: ["Págs. 1 y 2", "Art. 14 LECrim"],
      children: [
        {
          id: "node-2-1",
          label: "Competencia Objetiva",
          notes: "Determina el órgano por la gravedad del delito (pena abstracta) o por la persona aforada.",
          references: ["Art. 14 LECrim"]
        },
        {
          id: "node-2-2",
          label: "Competencia Territorial",
          notes: "Regla general: forum commissi delicti (lugar de comisión). Fueros subsidiarios cuando no conste el lugar.",
          references: ["Arts. 15-18 LECrim"]
        },
        {
          id: "node-2-3",
          label: "Competencia Funcional",
          notes: "Distribución según la fase procesal: instrucción, juicio oral y recursos.",
          references: ["Art. 14 LECrim"]
        }
      ]
    },
    {
      id: "branch-3",
      label: "3. Partes en el Proceso",
      color: "#10b981",
      notes: "Sujetos que intervienen en la relación procesal penal con intereses contrapuestos.",
      references: ["Pág. 2", "Arts. 100-110 LECrim"],
      children: [
        {
          id: "node-3-1",
          label: "Ministerio Fiscal",
          notes: "Defensa de la legalidad y los derechos ciudadanos de oficio en delitos públicos.",
          references: ["Art. 124 CE"]
        },
        {
          id: "node-3-2",
          label: "Acusación Particular y Popular",
          notes: "Particular: ofendido por el delito. Popular: cualquier ciudadano español (Art. 125 CE).",
          references: ["Arts. 109-110 LECrim"]
        },
        {
          id: "node-3-3",
          label: "Investigado y Defensa Letrada",
          notes: "Parte pasiva con derecho irrenunciable a la asistencia letrada desde la detención.",
          references: ["Art. 118 LECrim", "Art. 520 LECrim"]
        }
      ]
    },
    {
      id: "branch-4",
      label: "4. Policía Judicial y Medidas",
      color: "#ec4899",
      notes: "Auxilio a juzgados y tribunales en la averiguación del delito y aseguramiento del delincuente.",
      references: ["Págs. 2 y 3", "Arts. 490, 520, 589 LECrim"],
      children: [
        {
          id: "node-4-1",
          label: "Detención y Plazos (72h)",
          notes: "Medida cautelar personal. Plazo máximo ordinario de 72 horas para puesta a disposición judicial.",
          references: ["Art. 17.2 CE", "Art. 520 LECrim"]
        },
        {
          id: "node-4-2",
          label: "Procedimiento de Habeas Corpus",
          notes: "Control judicial inmediato ante detenciones ilegales o prolongadas indebidamente.",
          references: ["Ley Orgánica 6/1984"]
        },
        {
          id: "node-4-3",
          label: "Medidas Cautelares Reales",
          notes: "Fianzas y embargos para asegurar responsabilidades civiles derivadas del delito.",
          references: ["Arts. 589-614 LECrim"]
        }
      ]
    },
    {
      id: "branch-5",
      label: "5. Procedimientos Penales",
      color: "#8b5cf6",
      notes: "Especialidades procesales según el tipo y gravedad de la infracción penal.",
      references: ["Pág. 3", "Arts. 757, 795, 962 LECrim"],
      children: [
        {
          id: "node-5-1",
          label: "Procedimiento Abreviado",
          notes: "Delitos castigados con pena privativa de libertad no superior a 9 años.",
          references: ["Art. 757 LECrim"]
        },
        {
          id: "node-5-2",
          label: "Juicios Rápidos",
          notes: "Delitos flagrantes con pena no superior a 5 años o materias específicas (tráfico, violencia de género).",
          references: ["Art. 795 LECrim"]
        }
      ]
    }
  ]
};

export function MindMapViewer({
  initialData = defaultMindMapData,
  onAskTutorAboutConcept,
  onGenerateQuizForBranch,
  theme = "dark"
}: MindMapViewerProps) {
  const [data] = useState<MindMapNode>(initialData);
  const [selectedNode, setSelectedNode] = useState<MindMapNode | null>(initialData);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [zoom, setZoom] = useState<number>(1);

  const isLight = theme === "light";

  const toggleCollapse = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Layout calculations: Left and Right branches for balanced tree layout
  const branches = data.children ?? [];
  const rightBranches = useMemo(() => branches.filter((_, i) => i % 2 === 0), [branches]);
  const leftBranches = useMemo(() => branches.filter((_, i) => i % 2 === 1), [branches]);

  return (
    <div
      className={`flex h-full w-full overflow-hidden relative transition-colors ${
        isLight ? "bg-slate-50 text-slate-900" : "bg-[#090d16] text-slate-100"
      }`}
    >
      {/* 1. Main Canvas Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Canvas Toolbar Header */}
        <header
          className={`flex items-center justify-between px-5 py-3 border-b backdrop-blur z-10 transition-colors ${
            isLight ? "border-slate-200 bg-white/80" : "border-slate-800 bg-slate-950/70"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <span
              className={`grid size-8 place-items-center rounded-lg border ${
                isLight
                  ? "bg-indigo-50 text-indigo-600 border-indigo-200"
                  : "bg-indigo-600/20 text-indigo-400 border-indigo-500/30"
              }`}
            >
              <span className="material-symbols-outlined text-lg">schema</span>
            </span>
            <div>
              <h2
                className={`font-display font-bold text-sm leading-none ${
                  isLight ? "text-slate-900" : "text-slate-100"
                }`}
              >
                Esquema & Mapa Mental Interactivo
              </h2>
              <p className={`text-[11px] mt-0.5 ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                Estructura jerárquica con notas contextuales y enlaces al temario
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Zoom Controls */}
            <div
              className={`flex items-center rounded-xl p-0.5 text-xs border ${
                isLight ? "bg-slate-100 border-slate-200" : "bg-slate-900 border-slate-800"
              }`}
            >
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.6, Number((z - 0.1).toFixed(1))))}
                className={`size-7 grid place-items-center rounded-lg transition ${
                  isLight
                    ? "text-slate-600 hover:text-slate-900 hover:bg-slate-200"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                }`}
                title="Reducir zoom"
              >
                <span className="material-symbols-outlined text-sm">remove</span>
              </button>
              <span
                className={`px-2 font-mono text-[11px] select-none ${
                  isLight ? "text-slate-700" : "text-slate-300"
                }`}
              >
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(1.5, Number((z + 0.1).toFixed(1))))}
                className={`size-7 grid place-items-center rounded-lg transition ${
                  isLight
                    ? "text-slate-600 hover:text-slate-900 hover:bg-slate-200"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                }`}
                title="Aumentar zoom"
              >
                <span className="material-symbols-outlined text-sm">add</span>
              </button>
              <button
                type="button"
                onClick={() => setZoom(1)}
                className={`px-2 py-1 text-[11px] font-mono rounded-lg transition ${
                  isLight
                    ? "text-slate-600 hover:text-slate-900 hover:bg-slate-200"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                }`}
                title="Restablecer vista"
              >
                Reset
              </button>
            </div>
          </div>
        </header>

        {/* Interactive Mind Map Canvas */}
        <div className="flex-1 overflow-auto p-8 flex items-center justify-center relative select-none">
          <div
            className="flex items-center justify-center gap-12 transition-transform duration-200 ease-out origin-center"
            style={{ transform: `scale(${zoom})` }}
          >
            {/* Left Branches Column */}
            <div className="flex flex-col gap-8 items-end">
              {leftBranches.map((branch) => (
                <BranchTree
                  key={branch.id}
                  node={branch}
                  direction="left"
                  selectedId={selectedNode?.id}
                  collapsedIds={collapsedIds}
                  onSelect={(node) => setSelectedNode(node)}
                  onToggleCollapse={toggleCollapse}
                  isLight={isLight}
                />
              ))}
            </div>

            {/* Central Root Node */}
            <div
              onClick={() => setSelectedNode(data)}
              className={`cursor-pointer rounded-2xl p-5 border-2 shadow-2xl transition-all duration-300 max-w-[220px] text-center ${
                selectedNode?.id === data.id
                  ? isLight
                    ? "border-indigo-600 bg-indigo-50/90 shadow-indigo-200 ring-4 ring-indigo-500/20 scale-105"
                    : "border-indigo-400 bg-indigo-950/80 shadow-indigo-600/30 ring-4 ring-indigo-500/20 scale-105"
                  : isLight
                  ? "border-indigo-400 bg-white hover:border-indigo-600 hover:bg-indigo-50/30 shadow-slate-200"
                  : "border-indigo-600 bg-slate-900/90 hover:border-indigo-400 hover:bg-slate-900 shadow-black/60"
              }`}
            >
              <div className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-md mx-auto mb-2">
                <span className="material-symbols-outlined text-lg">account_tree</span>
              </div>
              <h1
                className={`font-display font-bold text-sm leading-tight ${
                  isLight ? "text-slate-900" : "text-white"
                }`}
              >
                {data.label}
              </h1>
              <span
                className={`mt-2 inline-block text-[10px] font-mono font-medium px-2 py-0.5 rounded-full border ${
                  isLight
                    ? "bg-indigo-100 text-indigo-700 border-indigo-200"
                    : "bg-indigo-900/60 text-indigo-300 border-indigo-700/40"
                }`}
              >
                {branches.length} Ramas
              </span>
            </div>

            {/* Right Branches Column */}
            <div className="flex flex-col gap-8 items-start">
              {rightBranches.map((branch) => (
                <BranchTree
                  key={branch.id}
                  node={branch}
                  direction="right"
                  selectedId={selectedNode?.id}
                  collapsedIds={collapsedIds}
                  onSelect={(node) => setSelectedNode(node)}
                  onToggleCollapse={toggleCollapse}
                  isLight={isLight}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Right Detail & Definition Drawer (Inspired by Mind-Map-Wizard) */}
      {selectedNode && (
        <aside
          className={`w-80 border-l backdrop-blur p-5 flex flex-col h-full overflow-y-auto shrink-0 animate-in slide-in-from-right duration-200 transition-colors ${
            isLight
              ? "border-slate-200 bg-white/95 text-slate-900 shadow-xl"
              : "border-slate-800 bg-slate-950/90 text-slate-100"
          }`}
        >
          <div
            className={`flex items-center justify-between pb-3 border-b ${
              isLight ? "border-slate-200" : "border-slate-800"
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className="size-3 rounded-full"
                style={{ backgroundColor: selectedNode.color || "#6366f1" }}
              />
              <span
                className={`text-[11px] font-mono font-semibold uppercase tracking-wider ${
                  isLight ? "text-slate-500" : "text-slate-400"
                }`}
              >
                Detalle del Concepto
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedNode(null)}
              className={`p-1 rounded-lg transition ${
                isLight
                  ? "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              }`}
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>

          <div className="mt-4 space-y-4 flex-1">
            <div>
              <h3
                className={`font-display font-bold text-lg leading-snug ${
                  isLight ? "text-slate-900" : "text-slate-100"
                }`}
              >
                {selectedNode.label}
              </h3>
            </div>

            {selectedNode.notes && (
              <div
                className={`p-3.5 rounded-2xl border text-xs leading-relaxed ${
                  isLight
                    ? "bg-slate-50 border-slate-200 text-slate-700"
                    : "bg-slate-900/70 border-slate-800/80 text-slate-300"
                }`}
              >
                <span
                  className={`block font-semibold text-[10px] uppercase font-mono mb-1.5 ${
                    isLight ? "text-slate-500" : "text-slate-400"
                  }`}
                >
                  Definición & Contenido
                </span>
                <p>{selectedNode.notes}</p>
              </div>
            )}

            {selectedNode.references && selectedNode.references.length > 0 && (
              <div>
                <span
                  className={`block font-semibold text-[10px] uppercase font-mono mb-2 ${
                    isLight ? "text-slate-500" : "text-slate-400"
                  }`}
                >
                  Referencias & Artículos
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedNode.references.map((ref, idx) => (
                    <span
                      key={idx}
                      className={`px-2 py-1 rounded-lg border text-[11px] font-mono ${
                        isLight
                          ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                          : "bg-indigo-950/60 border-indigo-800/40 text-indigo-300"
                      }`}
                    >
                      {ref}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Subnodes count if any */}
            {selectedNode.children && selectedNode.children.length > 0 && (
              <div>
                <span
                  className={`block font-semibold text-[10px] uppercase font-mono mb-2 ${
                    isLight ? "text-slate-500" : "text-slate-400"
                  }`}
                >
                  Subconceptos ({selectedNode.children.length})
                </span>
                <div className="space-y-1.5">
                  {selectedNode.children.map((child) => (
                    <button
                      key={child.id}
                      type="button"
                      onClick={() => setSelectedNode(child)}
                      className={`w-full text-left p-2 rounded-xl border text-xs transition flex items-center justify-between ${
                        isLight
                          ? "bg-white hover:bg-slate-50 border-slate-200 text-slate-800"
                          : "bg-slate-900/50 hover:bg-slate-800/60 border-slate-800 text-slate-200"
                      }`}
                    >
                      <span>{child.label}</span>
                      <span className="material-symbols-outlined text-xs text-slate-400">
                        arrow_forward
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions Panel at Bottom */}
          <div
            className={`pt-4 border-t space-y-2 ${
              isLight ? "border-slate-200" : "border-slate-800"
            }`}
          >
            <button
              type="button"
              onClick={() =>
                onAskTutorAboutConcept?.(selectedNode.label, selectedNode.notes)
              }
              className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition"
            >
              <span className="material-symbols-outlined text-sm">psychology</span>
              <span>Preguntar al tutor sobre esto</span>
            </button>

            <button
              type="button"
              onClick={() => onGenerateQuizForBranch?.(selectedNode.label)}
              className={`w-full flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition ${
                isLight
                  ? "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-800"
                  : "bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-200"
              }`}
            >
              <span className="material-symbols-outlined text-sm">quiz</span>
              <span>Crear quiz de este apartado</span>
            </button>
          </div>
        </aside>
      )}
    </div>
  );
}

/**
 * Branch Tree Component rendering branch nodes and sub-nodes with Bezier connector lines
 */
function BranchTree({
  node,
  direction,
  selectedId,
  collapsedIds,
  onSelect,
  onToggleCollapse,
  isLight
}: {
  readonly node: MindMapNode;
  readonly direction: "left" | "right";
  readonly selectedId?: string | undefined;
  readonly collapsedIds: Set<string>;
  readonly onSelect: (node: MindMapNode) => void;
  readonly onToggleCollapse: (id: string, e: React.MouseEvent) => void;
  readonly isLight?: boolean | undefined;
}) {
  const isSelected = selectedId === node.id;
  const isCollapsed = collapsedIds.has(node.id);
  const hasChildren = node.children && node.children.length > 0;
  const branchColor = node.color || "#6366f1";

  return (
    <div
      className={`flex items-center gap-4 ${
        direction === "left" ? "flex-row-reverse" : "flex-row"
      }`}
    >
      {/* Main Branch Card */}
      <div
        onClick={() => onSelect(node)}
        className={`group relative cursor-pointer rounded-2xl p-3.5 border transition-all duration-200 min-w-[180px] max-w-[240px] ${
          isSelected
            ? isLight
              ? "border-indigo-600 bg-white shadow-lg ring-2 ring-indigo-400"
              : "border-indigo-400 bg-slate-900 shadow-lg shadow-indigo-950/60 ring-2 ring-indigo-500/30"
            : isLight
            ? "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80 shadow-sm"
            : "border-slate-800 bg-slate-900/80 hover:border-slate-700 hover:bg-slate-900"
        }`}
        style={{
          borderLeftColor: direction === "right" ? branchColor : undefined,
          borderRightColor: direction === "left" ? branchColor : undefined,
          borderLeftWidth: direction === "right" ? "4px" : "1px",
          borderRightWidth: direction === "left" ? "4px" : "1px"
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <span
            className={`font-display font-semibold text-xs leading-tight ${
              isLight ? "text-slate-900" : "text-slate-100"
            }`}
          >
            {node.label}
          </span>
          {hasChildren && (
            <button
              type="button"
              onClick={(e) => onToggleCollapse(node.id, e)}
              className={`size-5 grid place-items-center rounded-md transition text-[10px] ${
                isLight
                  ? "bg-slate-100 hover:bg-slate-200 text-slate-600"
                  : "bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200"
              }`}
              title={isCollapsed ? "Expandir" : "Colapsar"}
            >
              {isCollapsed ? "+" : "−"}
            </button>
          )}
        </div>

        {node.references && node.references[0] && (
          <span
            className={`mt-1.5 block text-[10px] font-mono ${
              isLight ? "text-slate-500" : "text-slate-400"
            }`}
          >
            {node.references[0]}
          </span>
        )}
      </div>

      {/* Subnodes Column */}
      {hasChildren && !isCollapsed && (
        <div
          className={`flex flex-col gap-3 relative ${
            direction === "left" ? "items-end" : "items-start"
          }`}
        >
          {node.children?.map((child) => (
            <div
              key={child.id}
              onClick={() => onSelect(child)}
              className={`cursor-pointer rounded-xl p-2.5 border text-left transition-all duration-200 min-w-[160px] max-w-[210px] ${
                selectedId === child.id
                  ? isLight
                    ? "border-indigo-500 bg-indigo-50 text-indigo-950 ring-1 ring-indigo-400 shadow-sm"
                    : "border-indigo-400 bg-indigo-950/50 shadow-md ring-1 ring-indigo-400 text-slate-100"
                  : isLight
                  ? "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 text-slate-800 shadow-sm"
                  : "border-slate-800/80 bg-slate-950/80 hover:border-slate-700 hover:bg-slate-900 text-slate-300"
              }`}
            >
              <span className="block font-medium text-[11px] leading-snug">
                {child.label}
              </span>
              {child.references && child.references[0] && (
                <span
                  className={`mt-1 block text-[9px] font-mono ${
                    isLight ? "text-slate-400" : "text-slate-500"
                  }`}
                >
                  {child.references[0]}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
