import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => cleanup());

if (typeof window !== "undefined") {
  const storage = new Map<string, string>();
  const mockLocalStorage = {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => { storage.set(key, String(value)); },
    removeItem: (key: string) => { storage.delete(key); },
    clear: () => { storage.clear(); },
    get length() { return storage.size; },
    key: (index: number) => Array.from(storage.keys())[index] ?? null
  };
  Object.defineProperty(window, "localStorage", { value: mockLocalStorage, writable: true, configurable: true });
  Object.defineProperty(globalThis, "localStorage", { value: mockLocalStorage, writable: true, configurable: true });
}

if (typeof HTMLDialogElement !== "undefined") {
  if (HTMLDialogElement.prototype.showModal === undefined) {
    Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
      configurable: true,
      value(this: HTMLDialogElement) {
        this.setAttribute("open", "");
      }
    });
  }

  if (HTMLDialogElement.prototype.close === undefined) {
    Object.defineProperty(HTMLDialogElement.prototype, "close", {
      configurable: true,
      value(this: HTMLDialogElement) {
        this.removeAttribute("open");
      }
    });
  }
}
