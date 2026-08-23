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

Los tests de la máquina de estados de lagunas no requieren LLM:

- `packages/server/src/domain/knowledge/gap-progress.test.ts`
- `packages/server/src/domain/knowledge/gap-context.test.ts`
- `packages/server/src/infra/knowledge/file-knowledge-repository.test.ts`

## 2. Suites de AI Evals Automatizadas

Requieren `.env` con `GOOGLE_GENERATIVE_AI_API_KEY`:

```bash
# 1. Creación estructurada de artefactos (note, quiz, test)
pnpm --filter @proxus/server run eval:tutor:artifact-authoring

# 2. A/B con y sin contexto de lagunas, anclas de rescate y rechazo de knowledge master
pnpm --filter @proxus/server run eval:tutor:knowledge-gap

# 3. Adherencia al modo socrático (preguntas guía, sin revelar respuestas directas)
pnpm --filter @proxus/server run eval:tutor:socratic

# 4. Flujo Search-then-View (búsqueda léxica antes de renderizado visual)
pnpm --filter @proxus/server run eval:tutor:search
```

Las evals no corren en CI. El rechazo de `knowledge master` también está cubierto por un test unitario.

## 3. QA Manual Paso a Paso

1. **Arranque del entorno**:
   ```bash
   pnpm run dev
   ```
   Abre `http://localhost:5173`.

2. **Onboarding conversacional**:
   * Configura nivel educativo, campo de estudio y estilo de ayuda.
   * Verifica que las preferencias se guardan en `.data/user_profile.json` y se reflejan en el modal de perfil.

3. **Ingesta y visor de PDF**:
   * Sube un documento PDF de prueba.
   * Navega por páginas y prueba los modos de ajuste (página / ancho / zoom).
   * Selecciona texto con el cursor → el menú contextual permite **Preguntar a la IA** y **Copiar**.

4. **Interacción con el tutor y búsqueda en PDF**:
   * Abre el panel del tutor.
   * Pregunta sobre un artículo o concepto del PDF.
   * Abre el acordeón de razonamiento y comprueba `materials search` antes de `materials view`.
   * Prueba el dictado por voz y las menciones `@`.

5. **Ciclo de lagunas**:
   * Crea un quiz de 3 preguntas, fállalo y abre **Lagunas**. Cada fallo aparece como activa, con `Fallada 1 vez` y progreso `0/2`.
   * Pulsa **Reintentar quiz**, vuelve a fallar lo mismo: el contador sube a 2 y no se duplica la laguna.
   * En un chat vacío, pulsa **Rescate de lagunas** (no uses **Repasar con Tutor**: eso pide una explicación, no crea el quiz).
   * El artefacto nuevo debe incluir `reinforcesGapId` (visible en `.data/artifacts/artifacts/`).
   * Un acierto ligado pasa la laguna a **En repaso** (`1/2`). El segundo la marca **Dominada** con *Verificada por quiz*.
   * Un fallo ligado posterior la reabre. `knowledge master` desde el agente debe rechazarse.

6. **Esquemas**:
   * En la pestaña **Esquema**, genera el mapa del material seleccionado y explóralo con pan y zoom.
