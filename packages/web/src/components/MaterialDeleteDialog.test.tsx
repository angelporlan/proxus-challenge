import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import type { PdfMaterial } from "@proxus/shared";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { MaterialDeleteDialog } from "./MaterialDeleteDialog.tsx";

const material: PdfMaterial = {
  id: "fundamentos-ia",
  title: "Fundamentos de IA",
  fileName: "fundamentos-ia.pdf",
  pageCount: 2,
  uploadedAt: "2026-08-19T10:00:00.000Z"
};

describe("MaterialDeleteDialog", () => {
  it("focuses Cancelar and delegates cancellation", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();

    render(
      <MaterialDeleteDialog
        material={material}
        isDeleting={false}
        error={null}
        onCancel={onCancel}
        onConfirm={vi.fn()}
      />
    );

    const cancel = screen.getByRole("button", { name: "Cancelar" });
    await waitFor(() => expect(cancel).toHaveFocus());
    expect(screen.getByText("fundamentos-ia.pdf")).toBeInTheDocument();
    expect(screen.getByText("2 páginas")).toBeInTheDocument();

    await user.click(cancel);
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("delegates one confirmation", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    render(
      <MaterialDeleteDialog
        material={material}
        isDeleting={false}
        error={null}
        onCancel={vi.fn()}
        onConfirm={onConfirm}
      />
    );

    await user.click(screen.getByRole("button", { name: "Eliminar PDF" }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("blocks dismissal and repeated confirmation while deletion is pending", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    const onConfirm = vi.fn();

    function PendingHarness() {
      const [isDeleting, setIsDeleting] = useState(false);

      return (
        <MaterialDeleteDialog
          material={material}
          isDeleting={isDeleting}
          error={null}
          onCancel={onCancel}
          onConfirm={() => {
            onConfirm();
            setIsDeleting(true);
          }}
        />
      );
    }

    render(<PendingHarness />);
    await user.click(screen.getByRole("button", { name: "Eliminar PDF" }));

    const pendingButton = screen.getByRole("button", { name: "Eliminando…" });
    expect(pendingButton).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Cerrar diálogo" })).not.toBeInTheDocument();

    await user.click(pendingButton);
    const dialog = screen.getByRole("dialog", { name: "Eliminar «Fundamentos de IA»" });
    fireEvent(dialog, new Event("cancel", { bubbles: false, cancelable: true }));
    fireEvent.pointerDown(dialog);

    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onCancel).not.toHaveBeenCalled();
    expect(dialog).toHaveAttribute("open");
  });

  it("shows a recoverable deletion error", () => {
    render(
      <MaterialDeleteDialog
        material={{ ...material, pageCount: 1 }}
        isDeleting={false}
        error="No se pudo conectar con el servidor."
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />
    );

    expect(screen.getByText("1 página")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("No se pudo eliminar el PDF");
    expect(screen.getByRole("alert")).toHaveTextContent("No se pudo conectar con el servidor.");
  });
});
