# 🚀 Registro Completo de Mejoras Implementadas — Proxus Challenge

Este documento recopila y categoriza en detalle todas las funcionalidades, optimizaciones arquitectónicas, refinamientos de experiencia de usuario (UX), capacidades de Inteligencia Artificial (IA), sistema de **Knowledge Gap** (estudio activo adaptativo) y accesibilidad implementadas en la plataforma de estudio inteligente **Proxus**, destacando de forma especial las **innovaciones exclusivas frente al estado base de la prueba**.

---

## 📑 Índice de Contenidos

* [🌟 Innovaciones Exclusivas de Producto y Fullstack](#-innovaciones-exclusivas-de-producto-y-fullstack)
  1. [Sistema de Detección de Lagunas y Tutoría Adaptativa (Knowledge Gap System)](#1-sistema-de-detección-de-lagunas-y-tutoría-adaptativa-knowledge-gap-system)
  2. [Búsqueda Textual Rápida en PDFs antes de Inspección Visual (`materials search`)](#2-búsqueda-textual-rápida-en-pdfs-antes-de-inspección-visual-materials-search)
  3. [Esquemas y Mapas Mentales 100% Dinámicos (Mind-Map-Wizard)](#3-esquemas-y-mapas-mentales-100-dinámicos-dendríticos)
  4. [Interacción con la IA por Audio y Voz en Tiempo Real](#4-interacción-con-la-ia-por-audio-y-voz-en-tiempo-real)
  5. [Menciones «@» Contextuales con Token Atómico y Desvinculación Inteligente](#5-menciones--contextuales-con-token-atómico-y-desvinculación-inteligente)
  6. [Visor de PDF Interactivo con Menú IA Flotante y Subrayado Continuo](#6-visor-de-pdf-interactivo-con-menú-ia-flotante-y-subrayado-continuo)
* [🧠 1. Inteligencia Artificial y Agente Tutor Adaptativo](#1--inteligencia-artificial-y-agente-tutor-adaptativo)
* [📊 2. AI Evals y Capacidad de Evaluación Automatizada](#2--ai-evals-y-capacidad-de-evaluación-automatizada)
* [🎨 3. Experiencia de Usuario, Animaciones y Diseño (UX / UI)](#3--experiencia-de-usuario-animaciones-y-diseño-ux--ui)
* [📚 4. Espacio de Estudio y Artefactos Interactivos (Study Workspace)](#4--espacio-de-estudio-y-artefactos-interactivos-study-workspace)
* [📄 5. Visor de Documentos PDF y Lectura Activa (PDF Engine & Reader)](#5--visor-de-documentos-pdf-y-lectura-activa-pdf-engine--reader)
* [🏗️ 6. Arquitectura Backend, API y Tipado Effect (Backend & Fullstack)](#6--arquitectura-backend-api-y-tipado-effect-backend--fullstack)
* [♿ 7. Accesibilidad (a11y), Testing y Rendimiento](#7--accesibilidad-a11y-testing-y-rendimiento)

---

## 🌟 Innovaciones Exclusivas de Producto y Fullstack

### 1. Sistema de Detección de Lagunas y Tutoría Adaptativa (Knowledge Gap System)
* **El Problema en el MVP Base**: El agente tutor era puramente reactivo y desmemoriado. El alumno resolvía un quiz en el workspace, fallaba varias preguntas, pero al regresar al chat el tutor no tenía constancia de esos errores.
* **Nuestra Solución Integral**:
  - **Auto-registro al corregir (`gradeAttempt`)**: Cuando el estudiante envía un examen/quiz, las preguntas falladas se extraen automáticamente junto con su respuesta incorrecta, la solución oficial y la justificación pedagógica, registrándose en el `KnowledgeRepository`.
  - **Memoria Dinámica del Agente**: Al iniciar cualquier turno en el chat, el `TutorChatService` inyecta las lagunas activas del alumno en el contexto del agente para que oriente proactivamente sus explicaciones hacia los puntos débiles detectados.
  - **Tool y Comandos de Knowledge**: Nuevas tools `knowledge gaps`, `knowledge summary`, `knowledge review <gapId>` y `knowledge master <gapId>` que permiten al tutor inspeccionar y marcar conceptos como dominados conforme el alumno avanza.
  - **Panel de Progreso y Dominio (`KnowledgeGapsPanel`)**: Vista dedicada en el frontend con métricas globales, tasa de dominio, filtros (*Activas / En Repaso / Dominadas*), botón directo de `[ 💬 Repasar con Tutor ]` y cambio de estado manual.

---

### 2. Búsqueda Textual Rápida en PDFs antes de Inspección Visual (`materials search`)
* **El Problema en el MVP Base**: Para responder cualquier duda sobre un PDF, el agente tenía que renderizar páginas a ciegas (`materials view 1-10`) gastando tokens y tiempo en procesamiento OCR/visión.
* **Nuestra Solución**:
  - **Indexación y Búsqueda Léxica (`pdftotext` stream)**: Nuevo método `extractDocumentText` en `PopplerPdfService` y `searchText` en `MaterialRepository`.
  - **Comando `materials search <materialId> <query>`**: Permite al agente buscar artículos legales, conceptos o fórmulas en segundos sobre documentos de cientos de páginas.
  - **Flujo Search-then-View**: El agente busca primero los fragmentos más relevantes, obtiene las páginas exactas y solo después ejecuta `materials view` sobre las 1-2 páginas críticas.

---

### 3. Esquemas y Mapas Mentales 100% Dinámicos (Dendríticos)
* **Lienzo Infinito Interactivo (`MindMapViewer`)**: Motor de renderizado espacial con navegación libre (*pan & drag*), zoom con rueda y recentrado automático.
* **100% Dinámico sin datos hardcodeados**: Se eliminaron más de 900 líneas de datos estáticos de prueba. Ahora cualquier PDF subido o cualquier apunte (`note`) generado por la IA se transforma automáticamente en un mapa conceptual interactivo mediante el parser `parseMarkdownToMindMap` y el generador de árbol de conceptos.
* **Vínculo Bidireccional con el Tutor**: Botón directo `[ 💬 Preguntar al tutor sobre este concepto ]` que abre el chat con el nodo seleccionado precargado para profundizar al instante.

---

### 4. Interacción con la IA por Audio y Voz en Tiempo Real
* **Dictado por Voz Continuo en Vivo (`Web Speech API`)**: Transcripción inmediata de voz a texto en español directamente en la caja de entrada «MagIA».
* **Ecualizador y Ondas de Audio Reactivas (`Web Audio API Analyser`)**: Visualización dinámica de barras de sonido que reaccionan en tiempo real al volumen y frecuencia de la voz del usuario mientras habla.

---

### 5. Menciones «@» Contextuales con Token Atómico y Desvinculación Inteligente
* **Preservación Total del Texto y Flujo Gramatical**: Al elegir un archivo del menú flotante `@`, el título del documento se inserta exactamente en la posición del cursor formateado en negrita (`@Nombre-Del-Documento`).
* **Borrado Atómico Inteligente (*Atomic Chip Deletion*)**: Al pulsar `Backspace` o `Delete` sobre cualquier parte de la mención, se elimina de golpe el bloque completo (`@documento`) y se desvincula automáticamente el archivo de la cabecera de referencias sin dejar residuos.
* **Sincronización Bidireccional**: Al hacer clic en la `✕` de la pastilla superior de referencia, la mención en el texto también se retira automáticamente.

---

### 6. Visor de PDF Interactivo con Menú IA Flotante y Subrayado Continuo
* **Lectura Activa sin Fricción (*Zero-Friction In-Document AI*)**: Al resaltar cualquier frase o artículo con el ratón sobre el PDF, aparece al instante una cápsula flotante contextual (`[ 🧠 Preguntar a la IA ]` y `[ 📋 Copiar ]`).
* **Capa Vectorial de Selección Continua (`pdftotext -bbox-layout` + `PdfLine`)**: Extracción de coordenadas vectoriales a nivel de línea para ofrecer un subrayado suave, uniforme y continuo idéntico al de procesadores de texto.
* **Menú Flotante con Portal Aislado (`createPortal`)**: El menú contextual flota sobre `document.body` y calcula dinámicamente sus límites para no cortarse jamás con los paneles laterales.

---

## 1. 🧠 Inteligencia Artificial y Agente Tutor Adaptativo

* **Contrato Formal de Modo Pedagógico (`mode: "socratic" | "explanatory"`)**:
  - En lugar de ensuciar el prompt del usuario con cadenas mágicas concatenadas, el modo pedagógico y las referencias a materiales son ciudadanos de primer nivel en `TutorChatRequest` (`packages/shared/src/api/tutor.ts`).
  - **Modo Socrático**: Inyecta directivas estrictas en el system prompt para que el modelo nunca dé la solución de golpe, sino que formule preguntas guía y pistas incrementales.
  - **Modo Explicativo**: Genera explicaciones estructuradas con definiciones y citas de página precisas.
* **Flujo de Razonamiento Transparente (`ReasoningFlowBox`)**:
  - Agrupación visual en acordeón de las llamadas a herramientas y pasos internos del modelo (`thinking`, búsqueda en PDFs, generación de artefactos).
* **Skills Especializadas del Agente**:
  1. `use-uploaded-materials`: Inspección visual de páginas PDF.
  2. `search-materials`: Búsqueda textual y filtrado de fragmentos.
  3. `create-study-artifacts`: Creación de notas, quizzes y tests autocorregibles.
  4. `review-knowledge-gaps`: Detección, repaso y dominio de debilidades del estudiante.

---

## 2. 📊 AI Evals y Capacidad de Evaluación Automatizada

Se implementaron 4 suites de evaluación reproducibles con Effect:

1. **`eval:tutor:artifact-authoring`**: Verifica la creación estructural de notas y quizzes (opciones estructuradas `{ id, text }`, explicaciones completas).
2. **`eval:tutor:knowledge-gap`**: Evalúa que el tutor consulte el perfil de lagunas del alumno y priorice activamente los conceptos fallados al ser preguntado sobre qué estudiar.
3. **`eval:tutor:socratic`**: Evalúa que en modo socrático el agente formule preguntas reflexivas y no emita respuestas directas sin razonamiento.
4. **`eval:tutor:search`**: Evalúa que ante preguntas sobre documentos extensos, el agente ejecute búsqueda textual para localizar la página exacta antes de renderizarla.

Comandos para ejecutarlas:
```sh
pnpm --filter @proxus/server run eval:tutor:artifact-authoring
pnpm --filter @proxus/server run eval:tutor:knowledge-gap
pnpm --filter @proxus/server run eval:tutor:socratic
pnpm --filter @proxus/server run eval:tutor:search
```

---

## 3. 🎨 Experiencia de Usuario, Animaciones y Diseño (UX / UI)

* **Caja de Entrada Inteligente «MagIA»**: Dictado por voz, ecualizador reactivo, selector de adjuntos y autocomplete de menciones `@`.
* **Modo Tutor en Pantalla Completa / Enfoque (`Fullscreen Focus Chat`)**: Maximizado con transiciones fluidas de resorte elástico (*spring-curve*) y desenfoque de fondo.
* **Tema Claro / Oscuro Global**: Paletas calibradas en `slate-950` / `white` con contraste accesible en componentes, fórmulas e insignias.
* **Paneles Divididos Ajustables (`Split-Pane Resizer`)**: Divisores arrastrables con el ratón y accesibles por teclado (flechas `←` y `→`).

---

## 4. 📚 Espacio de Estudio y Artefactos Interactivos (Study Workspace)

* **Simulador de Examen con Cronómetro y Navegación por Preguntas**: Vista de test con contador de tiempo regresivo, tracker de progreso circular y corrección instantánea.
* **Feedback de Lagunas tras Corrección**: Al finalizar un quiz, la interfaz alerta inmediatamente al alumno sobre los conceptos que se han añadido a su perfil de repaso.
* **Visor de Notas con Renderizado Markdown y Copia al Portapapeles**.

---

## 5. 📄 Visor de Documentos PDF y Lectura Activa (PDF Engine & Reader)

* **Renderizado Rápido a 144 DPI con Poppler**: Visualización nítida y extracción de coordenadas de palabras y líneas para subrayado vectorial interactivo.
* **Navegación por Páginas con Zoom / Ajuste a Pantalla**.

---

## 6. 🏗️ Arquitectura Backend, API y Tipado Effect (Backend & Fullstack)

* **Monorepo `pnpm` con TypeScript Estricto**:
  - `packages/shared`: Esquemas Effect `Schema` y endpoints `HttpApiGroup` compartidos (cero duplicación de tipos).
  - `packages/server`: Arquitectura por capas (Transporte HTTP, Dominio con Effect Services e Infraestructura con Filesystem y Poppler).
  - `packages/web`: React 19 + `@effect/atom-react` para estado reactivo e invalidaciones automáticas.
  - `packages/ai-google`: Integración de cliente Gemini para Effect AI.
* **Persistencia Local Desacoplada**:
  - `.data/materials/pdfs/` para documentos.
  - `.data/artifacts/` para notas, quizzes y tests.
  - `.data/knowledge/profile.json` para el perfil de lagunas y progreso del estudiante.

---

## 7. ♿ Accesibilidad (a11y), Testing y Rendimiento

* **Verificación de Tipos Completa**:
  ```sh
  pnpm run typecheck # 4/4 paquetes pasando con 0 errores
  ```
* **Suite de Tests Vitest**:
  ```sh
  pnpm --filter @proxus/web run test # 5 test files, 22 tests unitarios pasando
  ```
* **Build de Producción**:
  ```sh
  pnpm --filter @proxus/web run build # Bundle optimizado con Tailwind v4 y Vite
  ```
* **Soporte de Navegación por Teclado y Atributos ARIA** en diálogos, pestañas, acordeones y divisores de panel.

---

## 🧪 Cómo Probar Manualmente

### Flujo completo paso a paso

1. **Arrancar la aplicación**:
   ```sh
   pnpm install
   cp .env.example .env   # y configurar GOOGLE_GENERATIVE_AI_API_KEY
   pnpm run dev
   ```
   Abrir http://localhost:5173

2. **Subir un PDF**: Clic en «Subir PDF» → arrastrar un documento (apuntes, temario, etc.) → confirmar. Se abre automáticamente el visor.

3. **Explorar el visor de PDF**:
   - Navegar por páginas con flechas o thumbnails laterales.
   - Seleccionar texto con el ratón → aparece el menú flotante «Preguntar a la IA» y «Copiar».
   - Probar los modos de visualización (ajustar a página / ancho / zoom).

4. **Interactuar con el tutor**:
   - Abrir el panel «Tutor» desde la barra superior.
   - Escribir una pregunta sobre el PDF (ej: "Explícame el artículo 17 del tema que he subido").
   - Observar el flujo de razonamiento: el tutor busca (`materials search`), localiza la página y cita con referencias.
   - Probar el dictado por voz con el botón de micrófono.
   - Probar las menciones `@` escribiendo `@` seguido del nombre del documento.

5. **Crear artefactos de estudio**:
   - Pedir al tutor: "Crea un quiz de 3 preguntas sobre [tema del PDF]".
   - El quiz aparece en la pestaña «Estudio» → resolverlo y enviar.
   - Observar la corrección automática con feedback por pregunta.

6. **Verificar el Knowledge Gap System**:
   - Tras fallar preguntas en un quiz, ir a la pestaña «Lagunas».
   - Comprobar que aparecen las preguntas falladas con estado «Activa».
   - Clic en «Repasar con Tutor» → el tutor recibe el contexto del error.
   - Volver al chat y preguntar "¿Qué debería repasar?" → el tutor menciona proactivamente las lagunas.

7. **Mapa mental dinámico**:
   - Ir a la pestaña «Esquema» con un material seleccionado.
   - Explorar el mapa con pan/zoom, clic en nodos para detalles.
   - Probar «Preguntar al tutor sobre este concepto» desde un nodo.

8. **Modo pedagógico**: En el chat, activar modo «Socrático» → el tutor guía con preguntas sin dar respuestas directas.

---

## ✅ Checks Ejecutados

```sh
# Typecheck — 4/4 paquetes con 0 errores
pnpm run typecheck

# Tests frontend — 5 archivos, 22 tests pasando
pnpm --filter @proxus/web run test

# Tests backend — tests unitarios de lógica de dominio
pnpm --filter @proxus/server run test

# Build de producción — compilación exitosa con code-splitting
pnpm --filter @proxus/web run build

# AI Evals (requieren API key y PDFs en .data/)
pnpm --filter @proxus/server run eval:tutor:artifact-authoring
pnpm --filter @proxus/server run eval:tutor:knowledge-gap
pnpm --filter @proxus/server run eval:tutor:socratic
pnpm --filter @proxus/server run eval:tutor:search
```

---

## 🔮 Próximos Pasos (con más tiempo)

1. **Spaced Repetition System (SRS)**: Integrar un algoritmo SM-2 o FSRS en el Knowledge Gap System para programar repasos espaciados automáticos. Las lagunas se presentarían al alumno en intervalos óptimos según su historial de aciertos/fallos, convirtiendo la plataforma en un sistema de memorización activa.

2. **Streaming real del tutor con partial UI updates**: Actualmente la respuesta del tutor llega completa o vía NDJSON básico. Implementar Server-Sent Events con renderizado incremental del markdown (ya tenemos `streamdown`) para que el alumno vea la respuesta construyéndose en tiempo real, incluyendo los artefactos generados.

3. **Persistencia con SQLite / Turso**: Migrar de archivos JSON en `.data/` a una base embebida (SQLite vía better-sqlite3 o Turso para edge). Esto habilitaría búsquedas más eficientes, consistencia transaccional en grading, y soporte multi-usuario sin conflictos de escritura.

4. **Evaluaciones automáticas en CI**: Integrar los AI evals como parte del pipeline de CI con un presupuesto de tokens fijo por PR. Esto detectaría regresiones en el comportamiento del agente antes de merge (ej: si el tutor deja de usar `materials search` o empieza a dar respuestas directas en modo socrático).

5. **Colaboración en tiempo real**: WebSocket con CRDT (Yjs) para sesiones de estudio colaborativas donde varios alumnos comparten el mismo tutor, ven los mismos artefactos y pueden resolver quizzes en grupo con ranking en vivo.
