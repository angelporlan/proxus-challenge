# Testing, QA y AI Evals

## 1. Checks Automáticos y Compilación

Ejecución desde la raíz del monorepo:

```bash
# Verificación de tipos en los 4 paquetes
pnpm run typecheck

# Suite de tests unitarios (Frontend + Backend)
pnpm --filter @proxus/server run test
pnpm --filter @proxus/web run test

# Build de producción optimizado (Vite + Tailwind v4)
pnpm --filter @proxus/web run build
```

## 2. Suites de AI Evals Automatizadas

Requieren `.env` con `GOOGLE_GENERATIVE_AI_API_KEY`:

```bash
# 1. Creación estructurada de artefactos (note, quiz, test)
pnpm --filter @proxus/server run eval:tutor:artifact-authoring

# 2. Detección e integración proactiva de lagunas de conocimiento
pnpm --filter @proxus/server run eval:tutor:knowledge-gap

# 3. Adherencia al modo socrático (preguntas guía, sin revelar respuestas directas)
pnpm --filter @proxus/server run eval:tutor:socratic

# 4. Flujo Search-then-View (búsqueda léxica antes de renderizado visual)
pnpm --filter @proxus/server run eval:tutor:search
```

## 3. QA Manual Paso a Paso

1. **Arranque del entorno**:
   ```bash
   pnpm run dev
   ```
   Abre `http://localhost:5173`.

2. **Onboarding conversacional**:
   * Configura nivel educativo, campo de estudio y estilo de ayuda.
   * Verifica que las preferencias se guardan en `.data/user_profile.json` y se reflejan en el modal de perfil (`🧠`).

3. **Ingesta y Visor de PDF**:
   * Sube un documento PDF de prueba.
   * Navega por páginas y prueba los modos de ajuste (página / ancho / zoom).
   * Selecciona texto con el cursor → comprueba que el menú contextual flotante permite **«Preguntar a la IA»** y **«Copiar»**.

4. **Interacción con el Tutor y Búsqueda en PDF**:
   * Abre el panel del tutor (`forum`).
   * Pregunta sobre un artículo o concepto del PDF (ej: *"¿Qué dice el artículo 17 del temario?"*).
   * Abre el acordeón de razonamiento para verificar que ejecutó `materials search` y citó la página correcta.
   * Prueba el dictado por voz y las menciones `@`.

5. **Resolución de Ejercicios y Knowledge Gap Loop**:
   * Pide al tutor crear un quiz: *"Crea un quiz de 3 preguntas"*.
   * Abre el quiz en la pestaña **«Estudio»**, falla una pregunta deliberadamente y pulsa **«Finalizar y Corregir»**.
   * Ve a la pestaña **«Lagunas»** → comprueba que la pregunta fallada aparece listada como activa.
   * Clic en **«Repasar con Tutor»** o pregunta en el chat *"¿Qué debería repasar?"* → el tutor aborda proactivamente la laguna.
   * Tras comprenderla, el concepto se actualiza a dominado.

6. **Esquemas y Mapas Conceptuales Dinámicos**:
   * En la pestaña **«Esquema»**, explora el árbol de conceptos interactivo generado a partir de tus notas o PDFs con pan y zoom.
