import { act, fireEvent, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { useRef, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Button } from "./Button.tsx";
import { Dialog } from "./Dialog.tsx";
import { InlineError } from "./InlineError.tsx";
import { Skeleton } from "./Skeleton.tsx";
import { Tab, TabPanel, Tabs, TabsList } from "./Tabs.tsx";
import { ToastProvider, useToast } from "./Toast.tsx";

afterEach(() => vi.useRealTimers());

describe("Button", () => {
  it("defaults to a safe button type and exposes its loading state", () => {
    render(<Button loading>Guardar</Button>);
    const button = screen.getByRole("button", { name: "Guardar" });

    expect(button).toHaveAttribute("type", "button");
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
  });
});

function DialogHarness({ dismissible = true }: { readonly dismissible?: boolean }) {
  const [open, setOpen] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>Eliminar fundamentos</button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Eliminar PDF"
        description="Esta acción no se puede deshacer."
        dismissible={dismissible}
        initialFocusRef={cancelRef}
        footer={<button ref={cancelRef} type="button" onClick={() => setOpen(false)}>Cancelar</button>}
      >
        <p>Se eliminará fundamentos-ia.pdf</p>
      </Dialog>
    </>
  );
}

describe("Dialog", () => {
  it("labels the native modal, focuses the requested control and restores focus", async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);
    const trigger = screen.getByRole("button", { name: "Eliminar fundamentos" });

    await user.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "Eliminar PDF" });
    const cancel = screen.getByRole("button", { name: "Cancelar" });
    expect(dialog).toHaveAccessibleDescription("Esta acción no se puede deshacer.");
    expect(cancel).toHaveFocus();

    await user.click(cancel);
    expect(dialog).not.toHaveAttribute("open");
    expect(trigger).toHaveFocus();
  });

  it("handles Escape, native cancel and backdrop dismissal", async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);
    const trigger = screen.getByRole("button", { name: "Eliminar fundamentos" });
    await user.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "Eliminar PDF" });

    await user.keyboard("{Escape}");
    expect(dialog).not.toHaveAttribute("open");

    await user.click(trigger);

    fireEvent(dialog, new Event("cancel", { bubbles: false, cancelable: true }));
    expect(dialog).not.toHaveAttribute("open");

    await user.click(trigger);
    fireEvent.pointerDown(screen.getByRole("dialog", { name: "Eliminar PDF" }));
    expect(dialog).not.toHaveAttribute("open");
  });

  it("ignores dismiss attempts while marked non-dismissible", async () => {
    const user = userEvent.setup();
    render(<DialogHarness dismissible={false} />);
    await user.click(screen.getByRole("button", { name: "Eliminar fundamentos" }));
    const dialog = screen.getByRole("dialog", { name: "Eliminar PDF" });

    fireEvent(dialog, new Event("cancel", { bubbles: false, cancelable: true }));
    fireEvent.pointerDown(dialog);
    expect(dialog).toHaveAttribute("open");
    expect(screen.queryByRole("button", { name: "Cerrar diálogo" })).not.toBeInTheDocument();
  });
});

function ToastTrigger({ duration = 0 }: { readonly duration?: number }) {
  const { notify } = useToast();
  return (
    <button
      type="button"
      onClick={() => notify({
        title: "No se pudo eliminar",
        description: "Comprueba la conexión y vuelve a intentarlo.",
        tone: "error",
        duration
      })}
    >
      Mostrar aviso
    </button>
  );
}

describe("ToastProvider", () => {
  it("announces and lets the user dismiss an error", async () => {
    const user = userEvent.setup();
    render(<ToastProvider><ToastTrigger /></ToastProvider>);

    await user.click(screen.getByRole("button", { name: "Mostrar aviso" }));
    expect(screen.getByRole("alert")).toHaveTextContent("No se pudo eliminar");
    await user.click(screen.getByRole("button", { name: "Cerrar notificación: No se pudo eliminar" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("removes notifications after their duration", () => {
    vi.useFakeTimers();
    render(<ToastProvider><ToastTrigger duration={1000} /></ToastProvider>);
    fireEvent.click(screen.getByRole("button", { name: "Mostrar aviso" }));
    expect(screen.getByRole("alert")).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(1000));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

function TabsHarness() {
  const [value, setValue] = useState("notes");
  return (
    <Tabs value={value} onValueChange={setValue}>
      <TabsList aria-label="Recursos de estudio">
        <Tab value="notes">Notas</Tab>
        <Tab value="quiz">Quiz</Tab>
      </TabsList>
      <TabPanel value="notes">Contenido de notas</TabPanel>
      <TabPanel value="quiz">Contenido del quiz</TabPanel>
    </Tabs>
  );
}

describe("Tabs", () => {
  it("connects tabs to panels and supports arrow-key navigation", async () => {
    const user = userEvent.setup();
    render(<TabsHarness />);
    const notes = screen.getByRole("tab", { name: "Notas" });
    const quiz = screen.getByRole("tab", { name: "Quiz" });
    notes.focus();

    await user.keyboard("{ArrowRight}");
    expect(quiz).toHaveFocus();
    expect(quiz).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Contenido del quiz");
  });
});

describe("feedback primitives", () => {
  it("exposes inline errors and keeps skeletons decorative", async () => {
    const user = userEvent.setup();
    const retry = vi.fn();
    const { container } = render(
      <>
        <InlineError message="La petición ha fallado" onRetry={retry} />
        <Skeleton data-testid="loading-shape" />
      </>
    );

    expect(screen.getByRole("alert")).toHaveTextContent("La petición ha fallado");
    expect(screen.getByTestId("loading-shape")).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelector(".ui-skeleton--animated")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(retry).toHaveBeenCalledOnce();
  });
});
