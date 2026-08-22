import { Context, Data, Effect, Layer, Schema } from "effect";
import { LanguageModel } from "effect/unstable/ai";
import { MindMapNode as MindMapNodeSchema, type MindMapNode } from "@proxus/shared";
import {
  MaterialRepository,
  type MaterialRepositoryError,
  type MaterialNotFound
} from "./material.ts";
import { PdfService, type PdfServiceError } from "./pdf-service.ts";

export class MindMapGenerationError extends Data.TaggedError("MindMapGenerationError")<{
  readonly reason: unknown;
}> {}

export interface MindMapService {
  readonly generate: (
    materialId: string
  ) => Effect.Effect<
    MindMapNode,
    MaterialNotFound | MaterialRepositoryError | PdfServiceError | MindMapGenerationError,
    LanguageModel.LanguageModel
  >;
}

export const MindMapService = Context.Service<MindMapService>(
  "@proxus/server/materials/MindMapService"
);

const palette = ["#f59e0b", "#06b6d4", "#ec4899", "#8b5cf6", "#10b981", "#3b82f6", "#ef4444", "#14b8a6"] as const;

const stripJsonFence = (value: string): string => {
  const trimmed = value.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
  return (fenced?.[1] ?? trimmed).trim();
};

const parseJson = (value: string): unknown => {
  const cleaned = stripJsonFence(value);
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start < 0 || end <= start) return undefined;
    try {
      return JSON.parse(cleaned.slice(start, end + 1));
    } catch {
      return undefined;
    }
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const normalizeMindMap = (value: Record<string, unknown>, fallbackLabel: string): MindMapNode => {
  const children = Array.isArray(value.children)
    ? value.children.map((child, index) =>
        isRecord(child) ? normalizeMindMap(child, `Concepto ${index + 1}`) : {
          id: "",
          label: `Concepto ${index + 1}`,
          children: []
        }
      )
    : [];

  return {
    id: typeof value.id === "string" ? value.id : "",
    label: typeof value.label === "string"
      ? value.label
      : typeof value.title === "string"
      ? value.title
      : fallbackLabel,
    ...(typeof value.notes === "string" ? { notes: value.notes } : {}),
    ...(typeof value.page === "number" ? { page: value.page } : {}),
    ...(typeof value.color === "string" ? { color: value.color } : {}),
    ...(typeof value.icon === "string" ? { icon: value.icon } : {}),
    children
  };
};

const sanitizeMindMap = (root: MindMapNode): MindMapNode => {
  const usedIds = new Set<string>();

  const sanitizeNode = (node: MindMapNode, path: string, depth: number, branchIndex: number): MindMapNode => {
    const rawId = node.id.trim();
    const baseId = rawId.length > 0 ? rawId : `node-${path}`;
    let id = baseId;
    let suffix = 2;
    while (usedIds.has(id)) {
      id = `${baseId}-${suffix}`;
      suffix += 1;
    }
    usedIds.add(id);

    const label = node.label.trim().replace(/\s+/g, " ").slice(0, 180) || `Concepto ${path}`;
    const notes = node.notes?.trim().replace(/\s+/g, " ").slice(0, 1200) || undefined;
    const page = node.page !== undefined && Number.isInteger(node.page) && node.page > 0 ? node.page : undefined;
    const color = typeof node.color === "string" && /^#[0-9a-f]{6}$/i.test(node.color)
      ? node.color
      : depth === 0
      ? "#6366f1"
      : palette[branchIndex % palette.length];
    const icon = node.icon?.trim().replace(/[^a-zA-Z0-9_]/g, "").slice(0, 32) || undefined;
    const children = (node.children ?? [])
      .slice(0, 32)
      .map((child, index) => sanitizeNode(child, `${path}-${index + 1}`, depth + 1, depth === 0 ? index : branchIndex));

    return {
      id,
      label,
      ...(notes ? { notes } : {}),
      ...(page !== undefined ? { page } : {}),
      color,
      ...(icon ? { icon } : {}),
      ...(children.length > 0 ? { children } : {})
    };
  };

  return sanitizeNode(root, "root", 0, 0);
};

export const normalizeMindMapResponse = (value: unknown, fallbackLabel: string): MindMapNode => {
  if (!isRecord(value)) {
    throw new Error("Gemini returned a mind map with an invalid root node.");
  }
  return Schema.decodeUnknownSync(MindMapNodeSchema)(sanitizeMindMap(normalizeMindMap(value, fallbackLabel)));
};

export const MINDMAP_MAX_PAGES = 12;
export const MINDMAP_MAX_CHARS_PER_PAGE = 1800;

export const selectMindMapPages = (
  pages: readonly { readonly page: number; readonly text: string }[]
): readonly { readonly page: number; readonly text: string }[] => {
  const clip = (page: { readonly page: number; readonly text: string }) => ({
    page: page.page,
    text: page.text.slice(0, MINDMAP_MAX_CHARS_PER_PAGE)
  });

  if (pages.length <= MINDMAP_MAX_PAGES) {
    return pages.map(clip);
  }

  const headCount = Math.min(8, MINDMAP_MAX_PAGES);
  const selected = new Map<number, { readonly page: number; readonly text: string }>();
  for (const page of pages.slice(0, headCount)) {
    selected.set(page.page, clip(page));
  }

  const rest = pages.slice(headCount);
  const extraNeeded = MINDMAP_MAX_PAGES - selected.size;
  if (extraNeeded > 0 && rest.length > 0) {
    for (let index = 0; index < extraNeeded; index++) {
      const restIndex = Math.min(
        rest.length - 1,
        Math.floor(((index + 1) * rest.length) / (extraNeeded + 1))
      );
      const page = rest[restIndex];
      if (page !== undefined) {
        selected.set(page.page, clip(page));
      }
    }
  }

  return [...selected.values()].sort((left, right) => left.page - right.page);
};

const buildPrompt = (title: string, pages: readonly { readonly page: number; readonly text: string }[], totalPages: number): string => {
  const documentText = pages
    .map((page) => `\n=== PÁGINA ${page.page} ===\n${page.text.trim()}`)
    .join("\n");
  const extractNote = totalPages > pages.length
    ? `Este extracto cubre ${pages.length} de ${totalPages} páginas (inicio del documento más una muestra). No inventes apartados de páginas que no aparecen.`
    : `El extracto cubre las ${totalPages} páginas del documento.`;

  return [
    "Eres un experto en transformar documentos de estudio en mapas conceptuales visuales.",
    `Analiza el PDF «${title}» a partir de este extracto y construye su jerarquía conceptual.`,
    extractNote,
    "Devuelve únicamente un objeto JSON válido, sin Markdown ni bloques de código.",
    "La raíz debe representar el documento y cada children debe contener conceptos, apartados y subapartados relacionados.",
    "Cada nodo debe tener id único, label breve y claro, notes con una explicación útil, page con la primera página donde aparece, color hexadecimal e icono Material Symbols.",
    "Cita siempre la página en el campo page cuando el contenido permita identificarla. No inventes páginas.",
    "Usa esta forma exacta: {\"id\":\"root\",\"label\":\"...\",\"notes\":\"...\",\"page\":1,\"color\":\"#6366f1\",\"icon\":\"menu_book\",\"children\":[...]}",
    documentText
  ].join("\n");
};

export const MindMapServiceLive = Layer.effect(
  MindMapService,
  Effect.gen(function* () {
    const materials = yield* MaterialRepository;
    const pdf = yield* PdfService;

    const generate = (materialId: string) => Effect.gen(function* () {
      const material = yield* materials.get(materialId);
      const filePath = yield* materials.getFilePath(materialId);
      const pages = yield* pdf.extractDocumentText(filePath);
      const extract = selectMindMapPages(pages);
      const response = yield* LanguageModel.generateText({
        prompt: buildPrompt(material.title, extract, pages.length)
      }).pipe(
        Effect.mapError((reason) => new MindMapGenerationError({ reason }))
      );

      const parsed = parseJson(response.text);
      if (parsed === undefined) {
        return yield* new MindMapGenerationError({ reason: "Gemini did not return valid JSON for the mind map." });
      }

      const mindMap = yield* Effect.try({
        try: () => normalizeMindMapResponse(parsed, material.title),
        catch: (reason) => new MindMapGenerationError({ reason })
      });
      yield* materials.saveMindMap(materialId, mindMap);
      return mindMap;
    });

    return { generate };
  })
);
