import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { KnowledgeGapsPanel } from "./KnowledgeGapsPanel.tsx";

describe("KnowledgeGapsPanel", () => {
  it("renders header and metrics correctly", () => {
    render(<KnowledgeGapsPanel theme="dark" />);

    expect(screen.getByText("Dominio y Lagunas de Conocimiento")).toBeInTheDocument();
    expect(screen.getByText("Total Quizzes")).toBeInTheDocument();
    expect(screen.getAllByText("Activas").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("En Repaso").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Dominadas").length).toBeGreaterThanOrEqual(1);
  });

  it("renders filter tabs and allows switching", async () => {
    const user = userEvent.setup();
    render(<KnowledgeGapsPanel theme="light" />);

    const reviewingTab = screen.getByRole("button", { name: /En Repaso/i });
    expect(reviewingTab).toBeInTheDocument();

    await user.click(reviewingTab);
    expect(screen.getByText(/¡Aún no hay evaluaciones realizadas!|No hay conceptos en esta sección/i)).toBeInTheDocument();
  });
});
