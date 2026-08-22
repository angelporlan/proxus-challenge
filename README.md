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
* **Flujo Eficiente**: El tutor busca primero por texto, identifica la página exacta y únicamente renderiza esa página con `materials view`. El ahorro de visión depende del documento; no hay un porcentaje fijo.

### 3. Modos Pedagógicos Formales (*Socrático vs. Explicativo*)
* Contratos ciudadanos de primer nivel en `packages/shared/src/api/tutor.ts` (`mode: "socratic" | "explanatory"`).
* **Modo Socrático**: Guía al estudiante mediante preguntas reflexivas, pistas incrementales y contraejemplos sin revelar la solución de golpe.
* **Modo Explicativo**: Explicaciones estructuradas con citas de página y definiciones claras.

### 4. Esquemas y Mapas Mentales 100% Dinámicos y Persistentes (`MindMapViewer` + `MindMapService`)
* **Relación 1:1 por Material**: Generación directa en backend con extracción de texto Poppler + Gemini, persistencia en `.data/materials/{id}.mindmap.json` y endpoints HTTP dedicados (`GET /api/materials/:id/mindmap` y `POST /api/materials/:id/mindmap/generate`).
* Lienzo infinito interactivo con navegación libre (*pan & drag*), zoom con rueda, recentrado y radar minimapa.
* Botón de interacción directa con el tutor sobre cualquier nodo del mapa conceptual.

### 5. Diferenciación Radical: Quizzes de Práctica vs. Simulacros de Examen Oficiales
* **Quizzes (`quiz`)**: Modo de práctica ágil con feedback y explicación inmediata por pregunta. El resultado y las lagunas se persisten **al completar** el quiz (un attempt por intento).
* **Simulacros de Examen (`test`)**: Entorno formal de prueba con cronómetro y auto-entrega al expirar, navegación por preguntas con banderas de revisión (icono `flag` en memoria del intento), diálogo de seguridad de entrega y **Acta oficial de calificación sobre 10 con mención académica**.
* **Modal `CreateExerciseModal`**: Configuración accesible con selector de tipo de ejercicio, número de preguntas (quiz 3–5, simulacro 5–20) y rango de páginas.
* **Borrado en Cascada**: Al eliminar un PDF se borran el mind map, los artefactos con `sourceMaterialId` de ese PDF y las lagunas asociadas. Al eliminar un artefacto, se limpian sus lagunas.

### 6. Orquestación Agéntica y Flujo de Habilidades (*Agent Skills*)
* Starter Prompts en el chat con 4 pilares: *Crear un quiz*, *Explicación con ejemplos*, *Rescate de lagunas* (quiz de refuerzo sobre fallos pasados) y *Plan de estudio inteligente* (análisis de biblioteca y Roadmap estructurado).
* Nuevas skills del agente: `adaptive-study-plan` y `review-knowledge-gaps`.

### 7. Visor de PDF con Lectura Activa e Interacción IA
* Renderizado a 144 DPI con extracción de líneas y palabras (`pdftotext -bbox-layout`).
* Subrayado continuo con menú contextual flotante en portal (`[ 🧠 Preguntar a la IA ]` y `[ 📋 Copiar ]`).

### 8. Onboarding Conversacional y Perfil de Aprendizaje Personalizado
* Asistente interactivo con Proxo para recopilar nivel, campo de estudio, dificultad y estilo pedagógico.
* Persistencia en `UserProfileRepository` (`.data/user-profile/profile.json`) con botón de reseteo total de datos.

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

5. **Crear Ejercicios (Quiz de práctica vs. Simulacro de examen)**:
   * Pulsa **«Crear ejercicio»** en la barra lateral.
   * Crea un **Quiz de práctica** → observa el feedback inmediato; el resultado se guarda al responder la última pregunta.
   * Crea un **Simulacro de examen** → observa el temporizador, marca preguntas con la bandera de revisión y revisa el acta oficial de calificación sobre 10.

6. **Verificar el Knowledge Gap System**:
   * Ve a la pestaña **«Lagunas»** y comprueba cómo las preguntas falladas se han registrado automáticamente.
   * Clic en **«Repasar con Tutor»** o usa la tarjeta **«Rescate de lagunas»** en el chat → el tutor prioriza proactivamente tus debilidades.

7. **Explorar el Esquema Conceptual Dinámico**:
   * Ve a la pestaña **«Esquema»** con un material seleccionado y pulsa **«Generar Esquema con IA»** para explorar el mapa conceptual interactivo.

8. **Plan de Estudio Inteligente**:
   * En el chat, pulsa **«Plan de estudio inteligente»** para que Proxo analice tus materiales y cree tu hoja de ruta.

---

## ✅ 4. Qué checks y tests ejecuté

```bash
# 1. Typecheck estricto de TypeScript (4/4 paquetes sin errores)
pnpm run typecheck

# 2. Tests unitarios frontend y backend (CI: typecheck + unitarios + build web)
pnpm --filter @proxus/server run test
pnpm --filter @proxus/web run test

# 3. Compilación y optimización de producción (Vite + Tailwind v4)
pnpm --filter @proxus/web run build

# 4. Suites de AI Evals (manuales; requieren Gemini y no forman parte de CI)
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
