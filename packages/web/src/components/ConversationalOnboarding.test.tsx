import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ConversationalOnboarding } from "./ConversationalOnboarding.tsx";

describe("ConversationalOnboarding", () => {
  it("renders welcome message and first question with chips", async () => {
    const onComplete = vi.fn();
    const onSkip = vi.fn();

    render(
      <ConversationalOnboarding
        onComplete={onComplete}
        onSkip={onSkip}
      />
    );

    expect(screen.getByText(/¡Hola! Soy tu tutor/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("¿Qué estás estudiando?")).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /Universidad/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Bachillerato/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Ahora no/i })).toBeInTheDocument();
  });

  it("calls onSkip when clicking 'Ahora no'", async () => {
    const user = userEvent.setup();
    const onSkip = vi.fn();

    render(
      <ConversationalOnboarding
        onComplete={vi.fn()}
        onSkip={onSkip}
      />
    );

    const skipButton = screen.getByRole("button", { name: /Ahora no/i });
    await user.click(skipButton);
    expect(onSkip).toHaveBeenCalledOnce();
  });

  it("progresses to next question when selecting a chip option", async () => {
    const user = userEvent.setup();

    render(
      <ConversationalOnboarding
        onComplete={vi.fn()}
        onSkip={vi.fn()}
      />
    );

    const univButton = screen.getByRole("button", { name: /Universidad/i });
    await user.click(univButton);

    // After brief typing transition, step 2 should appear
    await waitFor(() => {
      expect(screen.getByText("¿Qué estás estudiando exactamente?")).toBeInTheDocument();
    });
  });
});
