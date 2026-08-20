import { RegistryProvider } from "@effect/atom-react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import { ToastProvider } from "./components/ui/Toast.tsx";
import "./styles.generated.css";

const root = document.getElementById("root");

if (root === null) {
  throw new Error("Missing root element");
}

createRoot(root).render(
  <StrictMode>
    <RegistryProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </RegistryProvider>
  </StrictMode>
);
