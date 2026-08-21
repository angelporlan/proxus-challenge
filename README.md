# Proxus Product Engineer Challenge — Proxo: Tutor Académico Adaptativo

> Solución completa del desafío técnico para Product Engineer en Proxus. Esta entrega transforma el MVP base en una plataforma integral de **aprendizaje activo adaptativo**, integrando memoria de debilidades del alumno (*Knowledge Gap System*), búsqueda léxica rápida en PDFs (*Search-then-View*), modos pedagógicos formales (*Socrático vs. Explicativo*), esquemas conceptuales dinámicos y visor de PDF con lectura activa.

---

## 📑 Índice

* [🎯 1. Qué problema elegí](#-1-qué-problema-elegí)
* [💡 2. Cómo lo resolví](#-2-cómo-lo-resolví)
* [🧪 3. Cómo probarlo manualmente](#-3-cómo-probarlo-manualmente)
* [✅ 4. Qué checks y tests ejecuté](#-4-qué-checks-y-tests-ejecuté)
* [🔮 5. Qué haría después con más tiempo](#-5-qué-haría-después-con-más-tiempo)
* [🏗️ Stack y Arquitectura](#️-stack-y-arquitectura)
* [🚀 Quickstart](#-quickstart)
* [📚 Documentación Adicional](#-documentación-adicional)

---

## 🎯 1. Qué problema elegí

El MVP inicial presentaba dos limitaciones críticas de producto y arquitectura:

1. **El "Tutor Amnésico y Desconectado"**: El estudiante resolvía un quiz en el workspace, fallaba varias preguntas, pero al volver al chat el tutor no tenía constancia de esos errores. El chat y la resolución de ejercicios eran dos islas aisladas sin retroalimentación pedagógica continua.
2. **Infección y coste en inspección de PDFs**: Para responder dudas sobre documentos extensos (temarios de 100+ páginas), el agente renderizaba páginas a ciegas (`materials view 1-10`), consumiendo tokens innecesarios y sufriendo alta latencia de procesamiento OCR/visión.

**Objetivo de Producto**: Construir un **ciclo de estudio activo adaptativo de bucle cerrado**:
$$\text{Subir PDF} \longrightarrow \text{Estudio/Lectura} \longrightarrow \text{Resolver Quizzes} \longrightarrow \text{Detección Automática de Lagunas} \longrightarrow \text{Tutoría Proactiva} \longrightarrow \text{Dominio}$$

---

## 💡 2. Cómo lo resolví

### 1. Sistema de Detección de Lagunas y Tutoría Adaptativa (*Knowledge Gap System*)
* **Auto-registro al calificar (`gradeAttempt`)**: Cuando el estudiante envía un examen o quiz, las preguntas falladas se extraen automáticamente junto con su respuesta, la solución correcta y la justificación pedagógica, persistiéndose en `KnowledgeRepository` (`.data/knowledge/profile.json`).
* **Inyección de Memoria en el Agente**: Al iniciar cualquier turno en el chat, `TutorChatService` inyecta las lagunas activas del alumno en el contexto del tutor para que oriente proactivamente sus explicaciones hacia los puntos débiles.
* **Herramientas de Conocimiento**: Comandos CLI `knowledge gaps`, `knowledge summary`, `knowledge review <id>` y `knowledge master <id>` para que el tutor inspeccione y marque conceptos como dominados tras comprobar que el alumno los ha comprendido.
* **Panel de Progreso y Dominio (`KnowledgeGapsPanel`)**: Vista dedicada con filtros (*Activas / En Repaso / Dominadas*), métricas de dominio y botón de `[ 💬 Repasar con Tutor ]`.

### 2. Búsqueda Textual Rápida antes de Inspección Visual (*Search-then-View*)
* **Extracción e Indexación**: Métodos `extractDocumentText` en `PopplerPdfService` y `searchText` en `MaterialRepository` usando `pdftotext`.
* **Comando `materials search <materialId> <query>`**: Permite localizar en milisegundos las páginas exactas y snippets relevantes.
* **Flujo Eficiente**: El tutor busca primero por texto, identifica la página exacta (ej. pág. 18) y únicamente renderiza la imagen de esa página con `materials view`, ahorrando hasta un 85% de tokens de visión.

### 3. Modos Pedagógicos Formales (*Socrático vs. Explicativo*)
* Contratos ciudadanos de primer nivel en `packages/shared/src/api/tutor.ts` (`mode: "socratic" | "explanatory"`).
* **Modo Socrático**: Guía al estudiante mediante preguntas reflexivas, pistas incrementales y contraejemplos sin revelar la solución de golpe.
* **Modo Explicativo**: Explicaciones estructuradas con citas de página y definiciones claras.

### 4. Esquemas y Mapas Mentales 100% Dinámicos (`MindMapViewer`)
* Lienzo infinito interactivo con navegación libre (*pan & drag*), zoom con rueda y recentrado.
* Parser recursivo (`parseMarkdownToMindMap`) que transforma cualquier nota markdown o PDF subido en un grafo conceptual interactivo sin datos hardcodeados.
* Botón de interacción directa con el tutor sobre cualquier nodo del mapa.

### 5. Visor de PDF con Lectura Activa e Interacción IA
* Renderizado a 144 DPI con extracción de líneas y palabras (`pdftotext -bbox-layout`).
* Subrayado continuo con menú contextual flotante en portal (`[ 🧠 Preguntar a la IA ]` y `[ 📋 Copiar ]`).

### 6. Onboarding Conversacional y Adaptación Implícita
* Asistente paso a paso para configurar nivel educativo, campo de estudio, principal dificultad y estilo de ayuda preferido.
* Adaptación silenciosa del formato y analogías del tutor sin frases robóticas tipo *"como dijiste en tu perfil..."*.

---

## 🧪 3. Cómo probarlo manualmente

1. **Arrancar el entorno**:
   ```bash
   pnpm install
   cp .env.example .env # Configurar GOOGLE_GENERATIVE_AI_API_KEY
   pnpm run dev
   ```
   Abrir en el navegador: <http://localhost:5173>

2. **Onboarding inicial**:
   * Si es la primera visita, responde a las preguntas del onboarding (Nivel educativo, campo de estudio, dificultad).
   * Al finalizar, el tutor adapta su estilo de explicación.

3. **Subir un PDF y Lectura Activa**:
   * Clic en **«Subir PDF»** y selecciona un documento (ej. apuntes, constitución, temario).
   * En la pestaña **«PDF»**, selecciona cualquier fragmento con el ratón → pulsa **«Preguntar a la IA»** en el menú flotante.

4. **Interacción con el Tutor y Búsqueda en PDF**:
   * Abre el panel **«Tutor»**.
   * Pregunta sobre un concepto del documento (ej. *"Explícame el artículo 17 de la Constitución"*).
   * Observa en el acordeón de razonamiento cómo el agente ejecuta `materials search`, localiza la página exacta y responde citando la fuente.
   * Prueba el botón de micrófono para dictar por voz y las menciones `@documento`.

5. **Resolver Quizzes y Generar Lagunas de Conocimiento**:
   * Pide al tutor: *"Crea un quiz de 3 preguntas sobre el tema subido"*.
   * Abre el quiz en la pestaña **«Estudio»**, responde fallando deliberadamente 1 o 2 preguntas y pulsa **«Finalizar y Corregir»**.
   * Ve a la pestaña **«Lagunas»** y comprueba cómo las preguntas falladas se han registrado automáticamente.
   * Clic en **«Repasar con Tutor»** sobre una laguna o pregúntale en el chat *"¿Qué debería repasar hoy?"* → el tutor prioriza proactivamente tus debilidades.

6. **Explorar el Esquema Conceptual Dinámico**:
   * Ve a la pestaña **«Esquema»** con un material seleccionado para explorar el mapa conceptual generado dinámicamente.

---

## ✅ 4. Qué checks y tests ejecuté

```bash
# 1. Typecheck estricto de TypeScript (4/4 paquetes sin errores)
pnpm run typecheck

# 2. Tests unitarios frontend y backend (53+ tests pasando)
pnpm --filter @proxus/server run test
pnpm --filter @proxus/web run test

# 3. Compilación y optimización de producción (Vite + Tailwind v4)
pnpm --filter @proxus/web run build

# 4. Suites de AI Evals reproducibles con Effect
pnpm --filter @proxus/server run eval:tutor:artifact-authoring
pnpm --filter @proxus/server run eval:tutor:knowledge-gap
pnpm --filter @proxus/server run eval:tutor:socratic
pnpm --filter @proxus/server run eval:tutor:search
```

---

## 🔮 5. Qué haría después con más tiempo

1. **Sistema de Repetición Espaciada (SRS / FSRS)**: Conectar el Knowledge Gap System con un algoritmo tipo SuperMemo-2 o FSRS para calendarizar repasos óptimos según las curvas de retención del estudiante.
2. **Streaming Token a Token con Server-Sent Events (SSE)**: Implementar transmisión token a token con renderizado incremental markdown vía `streamdown` para una experiencia de escritura aún más fluida.
3. **Persistencia Transaccional Embebida (SQLite / Turso)**: Migrar los archivos JSON en `.data/` a SQLite embebido (vía `@effect/sql-sqlite-node`) para garantizar consistencia transaccional y soportar múltiples usuarios concurrentes en producción.
4. **Pipeline de Evals en CI**: Integrar las suites de AI Evals como paso obligatorio en GitHub Actions con un presupuesto fijo de tokens por Pull Request.
5. **Estudio Colaborativo en Tiempo Real**: Soporte multi-usuario con CRDT (Yjs) para resolver cuestionarios en grupo y compartir pizarras de estudio sincronizadas.

---

## 🏗️ Stack y Arquitectura

* **Monorepo**: `pnpm` workspaces (`packages/shared`, `packages/server`, `packages/web`, `packages/ai-google`).
* **Backend**: Node.js + TypeScript + Effect v4 beta + Effect HTTP API + Gemini REST adapter.
* **Frontend**: React 19 + Vite + Tailwind CSS v4 + `@effect/atom-react`.
* **Procesamiento PDF**: Poppler (`pdfinfo`, `pdftoppm`, `pdftotext`).
* **Persistencia local simple**: Filesystem en `packages/server/.data/` (ignorado por git).

---

## 🚀 Quickstart

Requisitos:
* Node.js 20+ y pnpm.
* Poppler instalado (`brew install poppler` en macOS o `apt-get install poppler-utils` en Linux).
* Clave API de Google Gemini en `.env` (`GOOGLE_GENERATIVE_AI_API_KEY=...`).

```bash
pnpm install
cp .env.example .env
pnpm run dev
```

URLs por defecto:
* **Web**: <http://localhost:5173>
* **API**: <http://localhost:3000>
* **OpenAPI Scalar Docs**: <http://localhost:3000/docs>
* **OpenAPI JSON**: <http://localhost:3000/openapi.json>

---

## 📚 Documentación Adicional

* 📖 [`MEJORAS_IMPLEMENTADAS.md`](./MEJORAS_IMPLEMENTADAS.md): Registro exhaustivo de todas las mejoras, arquitectura y capacidades.
* 🏛️ [`docs/architecture.md`](./docs/architecture.md): Mapa de arquitectura y capas de Effect.
* 🤖 [`docs/ai-agent.md`](./docs/ai-agent.md): Especificación del agente tutor, skills y comandos.
* 🔌 [`docs/api.md`](./docs/api.md): Endpoints HTTP y contratos de API.
* 🧪 [`docs/testing.md`](./docs/testing.md): Estrategia de testing, QA y AI evals.
