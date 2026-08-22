# 🚀 Registro Completo de Mejoras Implementadas — Proxus Challenge

Este documento recopila y categoriza en detalle todas las funcionalidades, optimizaciones arquitectónicas, refinamientos de experiencia de usuario (UX), capacidades de Inteligencia Artificial (IA), sistema de **Knowledge Gap** (estudio activo adaptativo) y accesibilidad implementadas en la plataforma de estudio inteligente **Proxus**, destacando de forma especial las **innovaciones exclusivas frente al estado base de la prueba**.

---

## 📑 Índice de Contenidos

* [🌟 Innovaciones Exclusivas de Producto y Fullstack](#-innovaciones-exclusivas-de-producto-y-fullstack)
  1. [Sistema de Detección de Lagunas y Tutoría Adaptativa (Knowledge Gap System)](#1-sistema-de-detección-de-lagunas-y-tutoría-adaptativa-knowledge-gap-system)
  2. [Búsqueda Textual Rápida en PDFs antes de Inspección Visual (`materials search`)](#2-búsqueda-textual-rápida-en-pdfs-antes-de-inspección-visual-materials-search)
  3. [Esquemas y Mapas Mentales 100% Dinámicos y Persistentes (`MindMapService`)](#3-esquemas-y-mapas-mentales-100-dinámicos-y-persistentes-mindmapservice)
  4. [Diferenciación Radical: Quizzes de Práctica vs. Simulacros de Examen Oficiales](#4-diferenciación-radical-quizzes-de-práctica-vs-simulacros-de-examen-oficiales)
  5. [Modal Inteligente de Configuración de Ejercicios y Borrado en Cascada](#5-modal-inteligente-de-configuración-de-ejercicios-y-borrado-en-cascada)
  6. [Orquestación Agéntica: Skills de Rescate de Lagunas y Plan de Estudio Adaptativo](#6-orquestación-agéntica-skills-de-rescate-de-lagunas-y-plan-de-estudio-adaptativo)
  7. [Interacción con la IA por Audio y Voz en Tiempo Real](#7-interacción-con-la-ia-por-audio-y-voz-en-tiempo-real)
  8. [Menciones «@» Contextuales con Token Atómico y Desvinculación Inteligente](#8-menciones--contextuales-con-token-atómico-y-desvinculación-inteligente)
  9. [Visor de PDF Interactivo con Menú IA Flotante y Subrayado Continuo](#9-visor-de-pdf-interactivo-con-menú-ia-flotante-y-subrayado-continuo)
  10. [Onboarding Conversacional y Perfil de Aprendizaje Personalizado](#10-onboarding-conversacional-y-perfil-de-aprendizaje-personalizado)
* [🧠 1. Inteligencia Artificial y Agente Tutor Adaptativo](#1--inteligencia-artificial-y-agente-tutor-adaptativo)
* [📊 2. AI Evals y Capacidad de Evaluación Automatizada](#2--ai-evals-y-capacidad-de-evaluación-automatizada)
* [🎨 3. Experiencia de Usuario, Animaciones e Identidad Visual (UX / UI)](#3--experiencia-de-usuario-animaciones-e-identidad-visual-ux--ui)
* [📚 4. Espacio de Estudio y Artefactos Interactivos (Study Workspace)](#4--espacio-de-estudio-y-artefactos-interactivos-study-workspace)
* [📄 5. Visor de Documentos PDF y Lectura Activa (PDF Engine & Reader)](#5--visor-de-documentos-pdf-y-lectura-activa-pdf-engine--reader)
* [🏗️ 6. Arquitectura Backend, API y Tipado Effect (Backend & Fullstack)](#6--arquitectura-backend-api-y-tipado-effect-backend--fullstack)
* [♿ 7. Accesibilidad (a11y), Testing y Rendimiento](#7--accesibilidad-a11y-testing-y-rendimiento)

---

## 🌟 Innovaciones Exclusivas de Producto y Fullstack

### 1. Sistema de Detección de Lagunas y Tutoría Adaptativa (Knowledge Gap System)
* **El Problema en el MVP Base**: El agente tutor era puramente reactivo y desmemoriado. El alumno resolvía un quiz en el workspace, fallaba varias preguntas, pero al regresar al chat el tutor no tenía constancia de esos errores.
* **Nuestra Solución Integral**:
  - **Auto-registro al corregir (`gradeAttempt`)**: Cuando el estudiante envía un examen/quiz (tanto en pantalla completa como en el widget del chat), las preguntas falladas se extraen automáticamente junto con su respuesta incorrecta, la solución oficial y la justificación pedagógica, registrándose en el `KnowledgeRepository`.
  - **Filtrado estricto de preguntas respondidas**: Se omiten preguntas ausentes o pendientes para no registrar falsas lagunas mientras el alumno sigue resolviendo.
  - **Memoria Dinámica del Agente**: Al iniciar cualquier turno en el chat, el `TutorChatService` inyecta las lagunas activas del alumno en el contexto del agente para que oriente proactivamente sus explicaciones hacia los puntos débiles detectados.
  - **Tool y Comandos de Knowledge**: Nuevas tools `knowledge gaps`, `knowledge summary`, `knowledge review <gapId>` y `knowledge master <gapId>` que permiten al tutor inspeccionar y marcar conceptos como dominados conforme el alumno avanza.
  - **Panel de Progreso y Dominio (`KnowledgeGapsPanel`)**: Vista dedicada en el frontend con métricas globales, tasa de dominio, filtros (*Activas / En Repaso / Dominadas*), botón directo de `[ 💬 Repasar con Tutor ]` y cambio de estado manual.

---

### 2. Búsqueda Textual Rápida en PDFs antes de Inspección Visual (`materials search`)
* **El Problema en el MVP Base**: Para responder cualquier duda sobre un PDF extenso (temarios de 100+ páginas), el agente renderizaba páginas a ciegas (`materials view 1-10`) gastando tokens innecesarios y sufriendo alta latencia.
* **Nuestra Solución**:
  - **Indexación y Búsqueda Léxica (`pdftotext` stream)**: Nuevo método `extractDocumentText` en `PopplerPdfService` y `searchText` en `MaterialRepository`.
  - **Comando `materials search <materialId> <query>`**: Permite al agente buscar artículos legales, conceptos o fórmulas en segundos sobre documentos de cientos de páginas.
  - **Flujo Search-then-View**: El agente busca primero los fragmentos más relevantes, obtiene las páginas exactas y solo después ejecuta `materials view` sobre las 1-2 páginas críticas. El coste de visión depende del tamaño del PDF; no hay un porcentaje fijo medido.

---

### 3. Esquemas y Mapas Mentales 100% Dinámicos y Persistentes (`MindMapService`)
* **Relación 1:1 con cada Material**: Cada documento PDF de la biblioteca cuenta con su propio mapa conceptual visual independiente.
* **Generación Directa con IA en Backend**: Servicio dedicado `MindMapService` que extrae un **extracto** del PDF (hasta 12 páginas, texto recortado) vía Poppler, sintetiza la jerarquía temática con Gemini y persiste el grafo en `.data/materials/{id}.mindmap.json`.
* **Endpoints HTTP Dedicados**: `GET /api/materials/:id/mindmap` y `POST /api/materials/:id/mindmap/generate`.
* **Lienzo Infinito Interactivo (`MindMapViewer`)**: Motor de renderizado espacial con navegación libre (*pan & drag*), zoom con rueda, recentrado automático, minimapa/radar interactivo y panel lateral de concepto con enlaces directos a las páginas del PDF.
* **Separación de Notas vs. Esquemas**: Las notas de estudio (`note`) son textos en Markdown (relación 1:N), mientras que los esquemas son mapas espaciales visuales interactivos (relación 1:1).

---

### 4. Diferenciación Radical: Quizzes de Práctica vs. Simulacros de Examen Oficiales
* **El Problema en el MVP Base**: Los quizzes y los exámenes tenían exactamente la misma apariencia y comportamiento, sin transmitir la tensión ni el rigor de una prueba real.
* **Nuestra Solución**:
  - **Quizzes de Práctica (`quiz`)**:
    - Modo ágil con feedback inmediato por tarjeta (verde / ámbar con explicación).
    - Feedback inmediato por tarjeta (verde / ámbar con explicación) en el cliente.
    - Un único `submit` + `gradeAttempt` al completar el quiz. Las lagunas y `totalAttempts` se registran entonces, incluido un 10/10.
    - Auto-finalización al contestar la última pregunta, desplegando `PracticeResult`.
  - **Simulacros de Examen (`test`)**:
    - Formato de examen formal con cabecera académica y tipografía de imprenta.
    - Temporizador dinámico con colores de urgencia (urgente < 60s, alerta < 180s) y auto-entrega al agotarse el tiempo.
    - Cuadrícula superior de navegación por preguntas con soporte para marcar dudas (icono `flag`, estado en memoria del intento).
    - Diálogo de confirmación antes de entregar si quedan preguntas sin contestar o marcadas con bandera.
    - **Acta oficial de calificación sobre 10**: Desglose con nota numérica, tiempo invertido, recuento de lagunas y mención académica (*No apto, Aprobado, Notable, Sobresaliente*).

---

### 5. Modal Inteligente de Configuración de Ejercicios y Borrado en Cascada
* **`CreateExerciseModal`**:
  - Modal accesible con selección de material base, tipo de ejercicio (Quiz vs Simulacro), número de preguntas (quiz 3–5, simulacro 5–20) y selector de rango de páginas (ej. `1-5, 8`).
  - Separación entre `displayPrompt` limpio en el chat y `prompt` funcional con directivas estrictas para el agente.
* **Borrado en Cascada de Lagunas (`Cascade Deletion`)**:
  - Al eliminar un artefacto, `FileArtifactRepository` limpia las lagunas con ese `sourceArtifactId`.
  - Al eliminar un PDF, `deleteMaterialCascade` borra artefactos con `sourceMaterialId` coincidente, las lagunas de ese material y el mind map.
* **Aislamiento de Estado por ID (`key={artifact.id}`)**:
  - Corrección de bugs de renderizado mediante claves de instancia de React, evitando contaminación de intentos corregidos al cambiar de recurso.

---

### 6. Orquestación Agéntica: Skills de Rescate de Lagunas y Plan de Estudio Adaptativo
* **Starter Prompts Agénticos en el Chat**:
  1. 🧩 **Crear un quiz**: Generación de ejercicio interactivo con feedback.
  2. 💡 **Explicación con ejemplos**: Explicación clara con analogías y casos reales.
  3. 🧠 **Rescate de lagunas**: Dispara la skill `review-knowledge-gaps` para inspeccionar el historial de fallos del alumno, localizar las páginas del PDF y formular un quiz específico de refuerzo.
  4. 🗺️ **Plan de estudio inteligente**: Dispara la nueva skill `adaptive-study-plan` para analizar todos los PDFs de la biblioteca, calcular tiempos y generar un Roadmap estructurado por fases con checklist de hitos.
* **Servicio de Recomendaciones Contextuales (`TutorRecommendationService`)**:
  - Sugerencias automáticas de preguntas y quizzes de seguimiento basadas en el contexto vivo de la conversación.

---

### 7. Interacción con la IA por Audio y Voz en Tiempo Real
* **Dictado por Voz Continuo en Vivo (`Web Speech API`)**: Transcripción inmediata de voz a texto en español directamente en la caja de entrada «MagIA».
* **Ecualizador y Ondas de Audio Reactivas (`Web Audio API Analyser`)**: Visualización dinámica de barras de sonido que reaccionan en tiempo real al volumen y frecuencia de la voz del usuario mientras habla.

---

### 8. Menciones «@» Contextuales con Token Atómico y Desvinculación Inteligente
* **Preservación Total del Texto y Flujo Gramatical**: Al elegir un archivo del menú flotante `@`, el título del documento se inserta exactamente en la posición del cursor formateado en negrita (`@Nombre-Del-Documento`).
* **Borrado Atómico Inteligente (*Atomic Chip Deletion*)**: Al pulsar `Backspace` o `Delete` sobre cualquier parte de la mención, se elimina de golpe el bloque completo (`@documento`) y se desvincula automáticamente el archivo de la cabecera de referencias sin dejar residuos.
* **Sincronización Bidireccional**: Al hacer clic en la `✕` de la pastilla superior de referencia, la mención en el texto también se retira automáticamente.

---

### 9. Visor de PDF Interactivo con Menú IA Flotante y Subrayado Continuo
* **Lectura Activa sin Fricción (*Zero-Friction In-Document AI*)**: Al resaltar cualquier frase o artículo con el ratón sobre el PDF, aparece al instante una cápsula flotante contextual (`[ 🧠 Preguntar a la IA ]` y `[ 📋 Copiar ]`).
* **Capa Vectorial de Selección Continua (`pdftotext -bbox-layout` + `PdfLine`)**: Extracción de coordenadas vectoriales a nivel de línea para ofrecer un subrayado suave, uniforme y continuo idéntico al de procesadores de texto.
* **Menú Flotante con Portal Aislado (`createPortal`)**: El menú contextual flota sobre `document.body` y calcula dinámicamente sus límites para no cortarse jamás con los paneles laterales.

---

### 10. Onboarding Conversacional y Perfil de Aprendizaje Personalizado
* **Asistente de Bienvenida con Proxo**: Cuestionario interactivo inicial que recopila el nivel educativo, campo de estudio, principal dificultad y estilo pedagógico preferido.
* **Persistencia en `UserProfileRepository`**: Almacenamiento local del perfil del estudiante en `.data/user-profile/profile.json`.
* **Adaptación Silenciosa del Tutor**: El agente adapta su vocabulario, profundidad teórica y ritmo pedagógico sin recurrir a frases robóticas.
* **Gestión de Privacidad y Reseteo Total**: Modal `UserProfileModal` con visualización de memoria y botón para purgar todos los datos de estudio con un solo clic.

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
  4. `review-knowledge-gaps`: Detección, quiz de refuerzo (rescate de lagunas) y dominio de debilidades.
  5. `adaptive-study-plan`: Diagnóstico de biblioteca + lagunas y nota-roadmap persistida.

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

## 3. 🎨 Experiencia de Usuario, Animaciones e Identidad Visual (UX / UI)

* **Identidad Visual de Proxo**:
  - Mascota animada con ciclo de pensamiento (*thinking animation*) mientras la IA procesa.
  - Avatar socrático dinámico que cambia de expresión según el modo pedagógico seleccionado.
* **Caja de Entrada Inteligente «MagIA»**: Dictado por voz, ecualizador reactivo, selector de adjuntos y autocomplete de menciones `@`.
* **Tema Claro / Oscuro Global**: Paletas calibradas en `slate-950` / `white` con contraste accesible en componentes, fórmulas e insignias.
* **Paneles Divididos Ajustables (`Split-Pane Resizer`)**: Divisores arrastrables con el ratón y accesibles por teclado (flechas `←` y `→`).
* **Animaciones Fluidas de Montaje**: Transiciones de entrada y salida suaves para el panel lateral del chat.

---

## 4. 📚 Espacio de Estudio y Artefactos Interactivos (Study Workspace)

* **Visor de Notas (`NoteViewer`)**: Renderizado Markdown fluido con fórmulas matemáticas, bloques de código e icono para copiar al portapapeles.
* **Resolutor de Quizzes (`QuizWorkspace`)**: Feedback en vivo por pregunta; el attempt y las lagunas se persisten al completar el quiz.
* **Simulador de Examen (`ExamWorkspace`)**: Temporizador con aviso de expiración, matriz de navegación con banderas de revisión y acta oficial sobre 10.

---

## 5. 📄 Visor de Documentos PDF y Lectura Activa (PDF Engine & Reader)

* **Renderizado Rápido a 144 DPI con Poppler**: Visualización nítida y extracción de coordenadas de palabras y líneas para subrayado vectorial interactivo.
* **Navegación por Páginas con Zoom, Ajuste a Pantalla (*Fit Page / Fit Width*) y Pre-carga en Memoria**.

---

## 6. 🏗️ Arquitectura Backend, API y Tipado Effect (Backend & Fullstack)

* **Monorepo `pnpm` con TypeScript Estricto**:
  - `packages/shared`: Esquemas Effect `Schema`, errores HTTP tipados (`ResourceHttpErrors`, `ServiceHttpErrors`) y endpoints `HttpApiGroup` compartidos (cero duplicación de tipos).
  - `packages/server`: Arquitectura por capas con Effect Services (`MaterialRepository`, `ArtifactRepository`, `KnowledgeRepository`, `UserProfileRepository`, `MindMapService`, `PdfService`, `TutorChatService`).
  - `packages/web`: React 19 + `@effect/atom-react` para estado reactivo e invalidaciones automáticas con claves de caché.
  - `packages/ai-google`: Integración de cliente Gemini para Effect AI.
* **Modularización del Frontend**:
  - Descomposición en custom hooks especializados: `useChatSessions`, `useChatPdfUpload`, `useTutorTurn`, `useMindMapViewport`.
  - Shell del workspace extraído a `components/workspace/` y helpers PDF a `components/pdf/selection-highlights.ts`.
  - Componentes atómicos: `ChatMentionInput`, `ChatModeSwitcher`, `ChatMessageList`, `ReasoningFlowBox`.
* **Persistencia Local Desacoplada**:
  - `.data/materials/` para PDFs, metadatos y esquemas `{id}.mindmap.json`.
  - `.data/artifacts/` para notas, quizzes y simulacros con sus intentos calificados.
  - `.data/knowledge/profile.json` para lagunas activas y tasa de dominio.
  - `.data/user-profile/profile.json` para el perfil de aprendizaje del estudiante.

---

## 7. ♿ Accesibilidad (a11y), Testing y Rendimiento

* **Verificación de Tipos Completa**:
  ```sh
  pnpm run typecheck # 4/4 paquetes pasando con 0 errores
  ```
* **Suite de Tests Vitest**:
  ```sh
  pnpm --filter @proxus/web run test
  pnpm --filter @proxus/server run test
  ```
  CI (`.github/workflows/ci.yml`) ejecuta typecheck, esos unitarios y el build web. Las evals de Gemini son scripts manuales y no corren en Actions.
* **Build de Producción y Code-Splitting**:
  ```sh
  pnpm --filter @proxus/web run build # Bundle optimizado con lazy-loading y vendor chunk splitting
  ```
* **CI Automatizado con GitHub Actions**:
  - Pipeline `.github/workflows/ci.yml` que valida typecheck, tests y build en cada push y pull request.
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

2. **Onboarding conversacional**:
   - Responder a las preguntas iniciales de Proxo (Nivel, carrera, dificultad y estilo).
   - Comprobar cómo se guarda el perfil en la memoria del tutor.

3. **Subir un PDF**: Clic en «Subir PDF» → arrastrar un documento → confirmar. Se abre automáticamente el visor.

4. **Explorar el visor de PDF y Lectura Activa**:
   - Navegar por páginas con flechas o thumbnails.
   - Seleccionar texto con el ratón → aparece el menú flotante «Preguntar a la IA» y «Copiar».
   - Probar los modos de visualización (ajustar a página / ancho / zoom).

5. **Interactuar con el tutor y Menciones `@`**:
   - Abrir el panel «Tutor» desde la barra superior.
   - Escribir una pregunta con mención `@` (ej: "Explícame los conceptos clave de `@tema.pdf`").
   - Observar el flujo de razonamiento: el tutor busca (`materials search`), localiza la página y cita con referencias exactas.
   - Probar el dictado por voz con el botón de micrófono.

6. **Crear ejercicios y probar los dos modos (Quiz vs Simulacro)**:
   - Clic en el botón **«Crear ejercicio»** en la barra lateral.
   - Probar crear un **Quiz de práctica** (3 preguntas) → resolverlo y comprobar que el resultado y las lagunas se guardan al completar.
   - Probar crear un **Simulacro de examen** (10 preguntas) → observar el cronómetro formal, las banderas de revisión (icono `flag`) y el acta oficial sobre 10 al entregar.

7. **Verificar el Knowledge Gap System**:
   - Ir a la pestaña **«Lagunas»** tras fallar preguntas.
   - Comprobar que aparecen las preguntas falladas con estado «Activa».
   - Clic en **«Repasar con Tutor»** o pulsar la tarjeta **«Rescate de lagunas»** en el chat → el tutor formula un quiz específico de refuerzo.

8. **Generar y explorar el Mapa Mental (Esquema Visual)**:
   - Ir a la pestaña **«Esquema»** con un material seleccionado.
   - Clic en **«Generar Esquema con IA»** → observar el estado de carga y el despliegue automático del grafo espacial.
   - Explorar con pan/zoom y panel lateral de conceptos.

9. **Plan de Estudio Inteligente**:
   - En el chat vacío, pulsar la tarjeta **«Plan de estudio inteligente»** → Proxo analiza la biblioteca de PDFs y genera un Roadmap estructurado guardado en notas.

---

## ✅ Checks Ejecutados

```sh
# Typecheck — 4/4 paquetes con 0 errores
pnpm run typecheck

# Tests frontend — 16 archivos, 61 tests pasando
pnpm --filter @proxus/web run test

# Tests backend — 12 archivos, 42 tests pasando
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

1. **Spaced Repetition System (SRS / FSRS)**: Integrar un algoritmo SM-2 o FSRS en el Knowledge Gap System para programar repasos espaciados automáticos según la curva de olvido de Ebbinghaus.
2. **Streaming real del tutor con partial UI updates**: Extender el streaming token a token con Server-Sent Events y renderizado incremental de artefactos a medida que se generan.
3. **Persistencia con SQLite / Turso**: Migrar de archivos JSON en `.data/` a SQLite embebido (vía `@effect/sql-sqlite-node`) para consistencia transaccional y soporte multi-usuario.
4. **Evaluaciones automáticas en CI**: Integrar los AI evals como paso obligatorio en GitHub Actions con un presupuesto de tokens fijo por PR.
5. **Colaboración en tiempo real**: Soporte multi-usuario con CRDT (Yjs) para sesiones de estudio grupales y resolución colaborativa de simulacros.
