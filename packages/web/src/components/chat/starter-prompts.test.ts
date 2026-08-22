import { describe, expect, it } from "vitest";
import { starterPrompts } from "./types.ts";

describe("starterPrompts", () => {
  it("exposes four high-impact chat launchers", () => {
    expect(starterPrompts.map((item) => item.label)).toEqual([
      "Crear un quiz",
      "Explicación con ejemplos",
      "Rescate de lagunas",
      "Plan de estudio inteligente"
    ]);
  });

  it("wires gap rescue and the study plan to agentic prompts", () => {
    const rescue = starterPrompts.find((item) => item.label === "Rescate de lagunas");
    const plan = starterPrompts.find((item) => item.label === "Plan de estudio inteligente");

    expect(rescue).toMatchObject({
      icon: "psychology_alt",
      description: "Genera un ejercicio focalizado en tus fallos pasados para dominarlos",
      setup: "gap-rescue-count"
    });
    expect(rescue?.prompt).toContain("lagunas de conocimiento");
    expect(rescue?.prompt).toContain("quiz de refuerzo");

    expect(plan).toMatchObject({
      icon: "route",
      description: "Diagnostica tu temario y crea una ruta de aprendizaje por hitos"
    });
    expect(plan?.prompt).toContain("nota de estudio estructurada");
    expect(plan?.prompt).toContain("plan de aprendizaje");
  });

  it("does not keep the redundant socratic and outline cards", () => {
    const labels = starterPrompts.map((item) => item.label);
    expect(labels).not.toContain("Tutor Socrático");
    expect(labels).not.toContain("Esquema conceptual");
  });
});
