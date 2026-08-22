import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { PdfMaterial } from "@proxus/shared";
import { CreateExerciseModal } from "./CreateExerciseModal.tsx";

const material: PdfMaterial = {
  id: "material-1",
  title: "Constitución Española",
  fileName: "constitucion.pdf",
  pageCount: 25,
  uploadedAt: "2026-08-22T10:00:00.000Z"
};

describe("CreateExerciseModal", () => {
  it("construye un prompt con el tipo, cantidad y páginas elegidas", async () => {
    const user = userEvent.setup();
    const onGenerate = vi.fn();
    render(<CreateExerciseModal isOpen materials={[material]} onClose={vi.fn()} onGenerate={onGenerate} />);

    await user.click(screen.getByRole("button", { name: /Simulacro de examen/ }));
    await user.click(screen.getByRole("button", { name: "10" }));
    await user.click(screen.getByLabelText("Páginas concretas"));
    await user.type(screen.getByLabelText("Páginas, por ejemplo: 2, 4-6"), "3-7");
    await user.click(screen.getByRole("button", { name: "Generar con Proxo" }));

    expect(onGenerate).toHaveBeenCalledWith(expect.objectContaining({
      kind: "test",
      questionCount: 10,
      scope: "pages",
      pageSelection: "3-7",
      material
    }));
    expect(onGenerate.mock.calls[0]?.[0].displayPrompt).toContain("Genera un simulacro de examen de 10 preguntas");
    expect(onGenerate.mock.calls[0]?.[0].displayPrompt).toContain("páginas 3-7");
    expect(onGenerate.mock.calls[0]?.[0].displayPrompt).not.toContain("artifacts create");
    expect(onGenerate.mock.calls[0]?.[0].prompt).toContain("exactamente 10 preguntas");
    expect(onGenerate.mock.calls[0]?.[0].prompt).toContain("páginas 3-7");
    expect(onGenerate.mock.calls[0]?.[0].prompt).toContain(`sourceMaterialId "${material.id}"`);
  });
});
