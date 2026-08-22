import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { AsyncResult } from "effect/unstable/reactivity";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { KnowledgeProfile } from "@proxus/shared";

const mocks = vi.hoisted(() => ({
  profile: null as unknown
}));

vi.mock("@effect/atom-react", () => ({
  useAtomRefresh: () => vi.fn(),
  useAtomSet: () => vi.fn(),
  useAtomValue: () => mocks.profile
}));

vi.mock("../domain/knowledge/atoms.ts", () => ({
  knowledgeProfileQuery: {},
  updateGapStatusAction: {},
  clearKnowledgeProfileAction: {}
}));

import { KnowledgeGapsPanel } from "./KnowledgeGapsPanel.tsx";

const emptyProfile: KnowledgeProfile = { gaps: [], totalAttempts: 0 };

describe("KnowledgeGapsPanel", () => {
  beforeEach(() => {
    mocks.profile = AsyncResult.success(emptyProfile);
  });

  it("renders header and metrics correctly", () => {
    render(<KnowledgeGapsPanel theme="dark" />);

    expect(screen.getByText("Dominio y Lagunas de Conocimiento")).toBeInTheDocument();
    expect(screen.getByText("Total Quizzes")).toBeInTheDocument();
    expect(screen.getByText("¡Aún no hay evaluaciones realizadas!")).toBeInTheDocument();
  });

  it("shows the reviewing empty state after switching tabs", async () => {
    const user = userEvent.setup();
    mocks.profile = AsyncResult.success({ gaps: [], totalAttempts: 2 });
    render(<KnowledgeGapsPanel theme="light" />);

    const reviewingTab = screen.getByRole("button", { name: /En Repaso/i });
    await user.click(reviewingTab);
    expect(screen.getByText("No hay conceptos en esta sección")).toBeInTheDocument();
  });
});
