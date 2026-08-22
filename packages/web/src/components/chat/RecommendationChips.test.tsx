import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RecommendationChips } from "./RecommendationChips.tsx";

describe("RecommendationChips", () => {
  it("sends the internal prompt while displaying the natural label", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <RecommendationChips
        isLight={true}
        recommendations={[{
          kind: "quiz",
          label: "Comprobar lo aprendido con un quiz de 3 preguntas",
          prompt: "Genera un quiz de 3 preguntas basado en esta explicación."
        }]}
        onSubmit={onSubmit}
      />
    );

    const button = screen.getByRole("button", { name: "Comprobar lo aprendido con un quiz de 3 preguntas" });
    expect(button).toHaveTextContent("Comprobar lo aprendido con un quiz de 3 preguntas");

    await user.click(button);

    expect(onSubmit).toHaveBeenCalledWith(
      "Genera un quiz de 3 preguntas basado en esta explicación.",
      "Comprobar lo aprendido con un quiz de 3 preguntas"
    );
    expect(button).toBeDisabled();
  });
});
