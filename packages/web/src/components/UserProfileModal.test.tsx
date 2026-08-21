import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { UserProfileModal } from "./UserProfileModal.tsx";

describe("UserProfileModal", () => {
  const profile = {
    educationLevel: "university",
    educationLevelLabel: "Universidad",
    study: "Ingeniería Informática",
    mainDifficulty: "understanding_theory",
    mainDifficultyLabel: "Entender la teoría",
    mainBlocker: "Tengo poco tiempo",
    goal: "pass_next_exam",
    goalLabel: "Aprobar mi próximo examen",
    onboardingCompleted: true
  };

  it("renders profile details when open", () => {
    render(
      <UserProfileModal
        isOpen={true}
        onClose={vi.fn()}
        profile={profile}
        onSave={vi.fn()}
        onClearMemory={vi.fn()}
      />
    );

    expect(screen.getByText("Lo que Proxo sabe de ti")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Ingeniería Informática")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Tengo poco tiempo")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Reiniciar memoria/i })).toBeInTheDocument();
  });

  it("submits updated profile changes", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();

    render(
      <UserProfileModal
        isOpen={true}
        onClose={vi.fn()}
        profile={profile}
        onSave={onSave}
        onClearMemory={vi.fn()}
      />
    );

    const studyInput = screen.getByDisplayValue("Ingeniería Informática");
    await user.clear(studyInput);
    await user.type(studyInput, "Grado en Matemáticas");

    const saveButton = screen.getByRole("button", { name: "Guardar cambios" });
    await user.click(saveButton);

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        study: "Grado en Matemáticas",
        onboardingCompleted: true
      })
    );
  });

  it("shows confirmation dialog before resetting memory", async () => {
    const user = userEvent.setup();
    const onClearMemory = vi.fn();

    render(
      <UserProfileModal
        isOpen={true}
        onClose={vi.fn()}
        profile={profile}
        onSave={vi.fn()}
        onClearMemory={onClearMemory}
      />
    );

    const resetTrigger = screen.getByRole("button", { name: /Reiniciar memoria/i });
    await user.click(resetTrigger);

    expect(
      screen.getByText("¿Quieres reiniciar lo que Proxo sabe de ti?")
    ).toBeInTheDocument();

    const confirmButton = screen.getAllByRole("button", { name: /Reiniciar memoria/i })[1]!;
    await user.click(confirmButton);

    expect(onClearMemory).toHaveBeenCalledOnce();
  });

  it("shows confirmation dialog before deleting all study data", async () => {
    const user = userEvent.setup();
    const onClearAllData = vi.fn();

    render(
      <UserProfileModal
        isOpen={true}
        onClose={vi.fn()}
        profile={profile}
        onSave={vi.fn()}
        onClearMemory={vi.fn()}
        onClearAllData={onClearAllData}
      />
    );

    const clearDataTrigger = screen.getByRole("button", { name: /Eliminar datos/i });
    await user.click(clearDataTrigger);

    expect(
      screen.getByText("¿Eliminar todos los datos de estudio?")
    ).toBeInTheDocument();

    const confirmButton = screen.getByRole("button", { name: "Eliminar todos los datos" });
    await user.click(confirmButton);

    expect(onClearAllData).toHaveBeenCalledOnce();
  });
});
