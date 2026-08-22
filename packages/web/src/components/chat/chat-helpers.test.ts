import { describe, expect, it } from "vitest";
import type { AgentMessage } from "@proxus/shared";
import { extractArtifactIds, groupChatItems } from "./group-chat-items.ts";
import { cleanAssistantContent, parseUserContent } from "./parse-user-content.ts";

const materials = [
  { id: "tema-4", title: "Tema 4 Organización territorial", pageCount: 12 }
];

describe("groupChatItems", () => {
  it("folds tool-call/tool-result pairs into the following assistant turn", () => {
    const messages: AgentMessage[] = [
      { role: "user", content: "Crea un quiz" },
      { role: "tool-call", name: "cli", input: { input: "artifacts create {}" } },
      { role: "tool-result", name: "cli", result: { kind: "quiz", id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee" }, isFailure: false },
      { role: "assistant", content: "Listo, aquí tienes el quiz aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee" }
    ];

    const grouped = groupChatItems(messages);
    expect(grouped.map((item) => item.kind)).toEqual(["user", "tools", "assistant"]);
    expect(grouped[0]?.kind).toBe("user");
    expect(grouped[2]?.kind).toBe("assistant");
    if (grouped[2]?.kind === "assistant") {
      expect(grouped[2].associatedTools).toHaveLength(2);
    }
  });

  it("keeps trailing tool activity as a tools group while the tutor is still working", () => {
    const messages: AgentMessage[] = [
      { role: "user", content: "Explica el tema" },
      { role: "tool-call", name: "cli", input: { input: "materials list" } }
    ];

    const grouped = groupChatItems(messages);
    expect(grouped.map((item) => item.kind)).toEqual(["user", "tools"]);
  });

  it("marks mistake follow-ups so their artifact widgets stay hidden", () => {
    const id = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
    const messages: AgentMessage[] = [
      { role: "user", content: "He fallado esta pregunta y necesito entender el error:\n\nPregunta: ¿Qué opción es correcta?" },
      { role: "tool-result", name: "cli", result: { kind: "quiz", id }, isFailure: false },
      { role: "assistant", content: `Te explico el fallo. ${id}` }
    ];

    const grouped = groupChatItems(messages);
    const assistant = grouped.find((item) => item.kind === "assistant");
    expect(assistant?.kind).toBe("assistant");
    if (assistant?.kind === "assistant") {
      expect(assistant.hideArtifactWidgets).toBe(true);
    }
  });
});

describe("extractArtifactIds", () => {
  const createdId = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
  const previousQuizId = "bbbbbbbb-cccc-dddd-eeee-ffffffffffff";

  it("collects only artifacts created in this turn", () => {
    const ids = extractArtifactIds(`Revisa ${createdId}`, [
      { role: "tool-call", name: "cli", input: { input: "artifacts create '{}'" } },
      { role: "tool-result", name: "cli", result: { kind: "quiz", id: createdId }, isFailure: false }
    ]);
    expect(ids).toEqual([createdId]);
  });

  it("does not turn knowledge-gap ids into widgets for previous quizzes", () => {
    const ids = extractArtifactIds("He preparado un quiz de refuerzo.", [
      { role: "tool-call", name: "cli", input: { input: "knowledge gaps" } },
      {
        role: "tool-result",
        name: "cli",
        result: `1. [gap-${previousQuizId}-q1] Topic: CV\n   Question: "¿Cuál es el correo?"`,
        isFailure: false
      },
      { role: "tool-call", name: "cli", input: { input: `artifacts create '{"kind":"quiz"}'` } },
      { role: "tool-result", name: "cli", result: { kind: "quiz", id: createdId, title: "Refuerzo" }, isFailure: false }
    ]);
    expect(ids).toEqual([createdId]);
  });

  it("ignores artifacts list, show, and UUIDs quoted in assistant text", () => {
    const listed = extractArtifactIds(`Abre ${previousQuizId}`, [
      { role: "tool-call", name: "cli", input: { input: "artifacts list" } },
      {
        role: "tool-result",
        name: "cli",
        result: `- ${previousQuizId}: Quiz CV (quiz)\n- ${createdId}: Plan (note)`,
        isFailure: false
      }
    ]);
    expect(listed).toEqual([]);

    const shown = extractArtifactIds("Aquí tienes el quiz anterior.", [
      { role: "tool-call", name: "cli", input: { input: `artifacts show ${previousQuizId}` } },
      { role: "tool-result", name: "cli", result: { kind: "quiz", id: previousQuizId, title: "Quiz CV" }, isFailure: false }
    ]);
    expect(shown).toEqual([]);
  });

  it("pairs batched tool calls with results in order", () => {
    const ids = extractArtifactIds("He preparado el refuerzo.", [
      { role: "tool-call", name: "cli", input: { input: "knowledge gaps" } },
      { role: "tool-call", name: "cli", input: { input: "artifacts create '{}'" } },
      {
        role: "tool-result",
        name: "cli",
        result: `1. [gap-${previousQuizId}-q1] Topic: Relatividad`,
        isFailure: false
      },
      { role: "tool-result", name: "cli", result: { kind: "quiz", id: createdId }, isFailure: false }
    ]);
    expect(ids).toEqual([createdId]);
  });

  it("detects create calls that pass the artifact body as CLI params", () => {
    const ids = extractArtifactIds("He guardado el plan.", [
      { role: "tool-call", name: "cli", input: { kind: "note", title: "Plan", markdown: "# Plan" } },
      { role: "tool-result", name: "cli", result: { kind: "note", id: createdId, title: "Plan" }, isFailure: false }
    ]);
    expect(ids).toEqual([createdId]);
  });
});

describe("parseUserContent", () => {
  it("strips reference tags and resolves mentioned materials", () => {
    const parsed = parseUserContent(
      "[Documentos de referencia: Tema 4 Organización territorial]\nExplícame el artículo 2",
      materials
    );
    expect(parsed.docs).toEqual([
      { id: "tema-4", title: "Tema 4 Organización territorial", pageCount: 12 }
    ]);
    expect(parsed.text).toBe("Explícame el artículo 2");
  });
});

describe("cleanAssistantContent", () => {
  it("hides raw tool-call JSON dumps from the student-facing bubble", () => {
    expect(cleanAssistantContent('cli: json={"kind":"quiz"}')).toBe(
      "He preparado el recurso solicitado. Puedes revisarlo a continuación:"
    );
  });

  it("keeps only a short presentation when the interactive artifact is present", () => {
    expect(cleanAssistantContent(
      "He creado tu quiz.\n\nPregunta 1: ¿Qué opción es correcta?\nA) Una\nB) Dos\nRespuesta correcta: B\nResponde con Q1: B.",
      { hasArtifactWidget: true }
    )).toBe("He creado tu quiz.");
  });
});
