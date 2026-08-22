import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ChatMessageList } from "./ChatMessageList.tsx";
import { buildGapRescueDisplay, buildGapRescuePrompt } from "./gap-rescue.ts";

const emptyListProps = {
  groupedItems: [] as const,
  availableMaterials: [] as const,
  isSending: false,
  isTutorWriting: false,
  assistantReveal: null,
  tutorMode: "explanatory" as const,
  recommendations: [] as const,
  isLight: true,
  messagesEndRef: { current: null }
};

describe("gap rescue starter setup", () => {
  it("asks for a question count before sending the rescue prompt", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <ChatMessageList
        {...emptyListProps}
        onSubmit={onSubmit}
        onSetTutorMode={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: /Rescate de lagunas/i }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText("¿Cuántas preguntas quieres que tenga el ejercicio?")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Todas/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^10/ }));

    expect(onSubmit).toHaveBeenCalledWith(
      buildGapRescuePrompt(10),
      buildGapRescueDisplay(10)
    );
  });

  it("returns to the starter cards without sending", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <ChatMessageList
        {...emptyListProps}
        onSubmit={onSubmit}
        onSetTutorMode={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: /Rescate de lagunas/i }));
    await user.click(screen.getByRole("button", { name: /Volver/i }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /Crear un quiz/i })).toBeInTheDocument();
  });
});
