import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PdfUploadDropzone } from "./PdfUploadDropzone.tsx";

describe("PdfUploadDropzone", () => {
  it("permite seleccionar un PDF con teclado o selector de archivos", () => {
    const onFileSelect = vi.fn();
    const { container } = render(
      <PdfUploadDropzone
        file={null}
        phase="idle"
        onFileSelect={onFileSelect}
      />
    );
    const file = new File(["pdf"], "tema-uno.pdf", { type: "application/pdf" });
    const input = container.querySelector<HTMLInputElement>("input[type='file']");

    expect(screen.getByRole("button", { name: /arrastra un pdf aquí/i })).toBeInTheDocument();
    expect(input).not.toBeNull();
    fireEvent.change(input!, { target: { files: [file] } });
    expect(onFileSelect).toHaveBeenCalledWith(file);
  });

  it("expone reemplazar y quitar cuando hay un archivo seleccionado", () => {
    const onRemove = vi.fn();
    const file = new File(["pdf"], "derecho-penal.pdf", { type: "application/pdf" });

    render(
      <PdfUploadDropzone
        file={file}
        phase="idle"
        onFileSelect={vi.fn()}
        onRemove={onRemove}
      />
    );

    expect(screen.getByText("derecho-penal.pdf")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reemplazar" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Quitar" }));
    expect(onRemove).toHaveBeenCalledOnce();
  });

  it("bloquea cambios y anuncia el estado mientras procesa", () => {
    const file = new File(["pdf"], "constitucional.pdf", { type: "application/pdf" });

    render(
      <PdfUploadDropzone
        file={file}
        phase="processing"
        disabled
        onFileSelect={vi.fn()}
        onRemove={vi.fn()}
      />
    );

    expect(screen.getByRole("status")).toHaveTextContent("Procesando PDF");
    expect(screen.queryByRole("button", { name: "Reemplazar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Quitar" })).not.toBeInTheDocument();
  });

  it("muestra los errores como avisos accesibles", () => {
    render(
      <PdfUploadDropzone
        file={null}
        phase="error"
        error="Selecciona un archivo PDF válido (.pdf)."
        onFileSelect={vi.fn()}
      />
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Selecciona un archivo PDF válido");
  });
});
