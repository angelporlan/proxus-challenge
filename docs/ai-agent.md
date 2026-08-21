# Tutor AI agent

## Objetivo

El tutor ayuda a estudiar usando materiales locales y creando artefactos de aprendizaje:

- `note`: apunte/explicación.
- `quiz`: ejercicio corto, cerrado y autocorregible.
- `test`: evaluación más completa; puede incluir respuesta corta.

## Archivos principales

- `packages/server/src/domain/agents/academic-tutor.ts`
- `packages/server/src/domain/agents/academic-tutor/tutor-chat-service.ts`
- `packages/server/src/domain/agents/harness/session.ts`
- `packages/server/src/domain/agents/gemini.ts`

# Tutor AI Agent — Proxo

## Objetivo

Proxo es un tutor académico adaptativo diseñado para aprendizaje activo. Sus capacidades nucleares incluyen:

- `note`: apunte estructurado con conceptos clave y formato markdown.
- `quiz`: cuestionario autocorregible (preguntas tipo test o verdadero/falso) con retroalimentación explicativa.
- `test`: simulacro de examen con preguntas cerradas y de desarrollo (`short-answer`).
- `knowledge gaps`: memoria continua de debilidades y errores cometidos por el alumno en ejercicios.
- `search-then-view`: búsqueda textual rápida antes de inspeccionar visualmente páginas PDF.
- `modos pedagógicos`: socrático (inductivo/guiado) vs. explicativo (deductivo/estructurado).

## Archivos principales

- `packages/server/src/domain/agents/academic-tutor.ts`: Definición del harness y system prompt adaptativo.
- `packages/server/src/domain/agents/academic-tutor.cli.ts`: Entrypoint CLI para ejecución manual con `pnpm run agent:tutor`.
- `packages/server/src/domain/agents/academic-tutor/tutor-chat-service.ts`: Servicio Effect para procesar peticiones web y streaming NDJSON.
- `packages/server/src/domain/agents/harness/session.ts`: Orquestador de sesiones de chat y ejecución de tools.
- `packages/server/src/domain/agents/gemini.ts`: Adaptador REST resiliente contra Gemini 2.5 Flash.

### Skills Especializadas

1. `packages/server/src/domain/agents/academic-tutor/skills/use-uploaded-materials.ts`: Inspección visual de páginas PDF.
2. `packages/server/src/domain/agents/academic-tutor/skills/search-materials.ts`: Búsqueda léxica y localización de páginas en PDFs.
3. `packages/server/src/domain/agents/academic-tutor/skills/create-study-artifacts.ts`: Creación de notas, quizzes y exámenes.
4. `packages/server/src/domain/agents/academic-tutor/skills/review-knowledge-gaps.ts`: Detección y repaso de lagunas del alumno.

### Comandos CLI del Dominio

- `packages/server/src/domain/agents/academic-tutor/material-commands.ts`
- `packages/server/src/domain/agents/academic-tutor/artifact-commands.ts`
- `packages/server/src/domain/agents/academic-tutor/knowledge-commands.ts`

## Comandos disponibles

### 1. Materiales (`materials`)

```txt
materials list
materials search <materialId> "<query>"
materials view <materialId> <pages: 10 o 13-20 o 10,13-20>
materials delete <materialId>
```

### 2. Artefactos de estudio (`artifacts`)

```txt
artifacts list [note|quiz|test]
artifacts show <artifactId>
artifacts create '<json>'
artifacts submit '<json>'
artifacts attempts [artifactId]
artifacts grade <attemptId>
```

### 3. Lagunas de conocimiento (`knowledge`)

```txt
knowledge gaps
knowledge summary
knowledge review <gapId>
knowledge master <gapId>
```

## Modos Pedagógicos

El agente soporta dos modos de instrucción formales pasados en `TutorChatRequest`:

1. **Modo Socrático (`socratic`)**:
   - Directiva estricta: No proporcionar la respuesta directa de inmediato.
   - Formular preguntas reflexivas, pistas incrementales o contraejemplos para que el alumno deduzca la solución.
2. **Modo Explicativo (`explanatory`)**:
   - Explicaciones estructuradas, citas exactas de páginas de los materiales y analogías pedagógicas.

## AI Evals (Evaluación Automatizada)

Se incluyen 4 suites de evaluación reproducibles basadas en Effect:

```bash
# Evalúa la creación de notas y quizzes estructurados con formato JSON válido
pnpm --filter @proxus/server run eval:tutor:artifact-authoring

# Evalúa que el tutor priorice proactivamente las lagunas de conocimiento del alumno
pnpm --filter @proxus/server run eval:tutor:knowledge-gap

# Evalúa que en modo socrático el agente guíe con preguntas y no dé la respuesta directa
pnpm --filter @proxus/server run eval:tutor:socratic

# Evalúa que el agente busque texto antes de renderizar páginas en PDFs extensos
pnpm --filter @proxus/server run eval:tutor:search
```

## Smoke Test Manual CLI

```bash
pnpm --filter @proxus/server run agent:tutor "list my uploaded materials"
pnpm --filter @proxus/server run agent:tutor "Crea un quiz corto de 2 preguntas sobre la Constitución"
```
