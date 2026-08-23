# Tutor AI agent

Proxo es un tutor académico local. Trabaja con PDFs, crea artefactos de estudio y mantiene un perfil de lagunas. La tesis del agente es concreta: declara intención (`knowledge review`); no declara veredictos. El dominio lo deriva el corrector.

Capacidades:

- `note`: apunte en markdown.
- `quiz`: ejercicio cerrado autocorregible.
- `test`: simulacro con preguntas cerradas o `short-answer`.
- `knowledge gaps`: memoria de fallos; el rescate ancla preguntas con `reinforcesGapId`.
- `search-then-view`: búsqueda textual antes de renderizar páginas.
- modos pedagógicos: `socratic` o `explanatory`, pasados en `TutorChatRequest`.

## Archivos principales

- `packages/server/src/domain/agents/academic-tutor.ts`: harness y system prompt.
- `packages/server/src/domain/agents/academic-tutor.cli.ts`: CLI `pnpm run agent:tutor`.
- `packages/server/src/domain/agents/academic-tutor/tutor-chat-service.ts`: chat web y stream NDJSON.
- `packages/server/src/domain/agents/harness/session.ts`: bucle de tools. El system prompt, incluido el bloque de lagunas, se reenvía en cada step.
- `packages/server/src/domain/knowledge/gap-progress.ts`: transiciones de lagunas a partir del attempt calificado.
- `packages/server/src/domain/knowledge/gap-context.ts`: contexto acotado (top 5) inyectado en el prompt.
- `packages/server/src/domain/agents/gemini.ts`: adaptador Gemini.

### Skills

1. `use-uploaded-materials`: inspección visual de páginas PDF.
2. `search-materials`: búsqueda léxica y localización de páginas.
3. `create-study-artifacts`: notas, quizzes y tests.
4. `review-knowledge-gaps`: rescate. Cada pregunta del quiz de refuerzo debe llevar `reinforcesGapId`. No llama a `knowledge master`.
5. `adaptive-study-plan`: nota-roadmap a partir de la biblioteca y las lagunas.

### Comandos de dominio

- `packages/server/src/domain/agents/academic-tutor/material-commands.ts`
- `packages/server/src/domain/agents/academic-tutor/artifact-commands.ts` — valida `reinforcesGapId` contra el perfil.
- `packages/server/src/domain/agents/academic-tutor/knowledge-commands.ts`

## Comandos disponibles

### Materiales

```txt
materials list
materials search <materialId> "<query>"
materials view <materialId> <pages: 10 o 13-20 o 10,13-20>
materials delete <materialId>
```

### Artefactos

```txt
artifacts list [note|quiz|test]
artifacts show <artifactId>
artifacts create '<json>'
artifacts submit '<json>'
artifacts attempts [artifactId]
artifacts grade <attemptId>
```

### Lagunas

```txt
knowledge gaps
knowledge summary
knowledge review <gapId>
```

`knowledge master <gapId>` existe como guardarraíl y siempre rechaza. El dominio sale de dos aciertos ligados (`reinforcesGapId` o reintento de la pregunta original). El panel web puede marcar dominio a mano; queda como `masteryEvidence: "manual"`.

## Ciclo esperado

1. El alumno falla un quiz o test. `gradeAttempt` registra la laguna.
2. El tutor, si hay lagunas activas, recibe un bloque acotado en el system prompt. Puede cargar `review-knowledge-gaps` y crear un quiz con `reinforcesGapId`.
3. Al calificar ese quiz (o un reintento de la pregunta original), `resolveGapTransitions` actualiza `correctStreak`. Con `MASTERY_STREAK = 2` pasa a `mastered`.
4. Un fallo ligado reabre la laguna. El agente no puede cerrarla por su cuenta.

Límite conocido: si hay lagunas, el bloque se inyecta en todos los turnos y se reenvía en cada step del tool loop. El tope de cinco recorta tamaño, no repeticiones.

## Modos pedagógicos

1. **Socrático (`socratic`)**: no da la respuesta de golpe; guía con preguntas y pistas.
2. **Explicativo (`explanatory`)**: explicaciones estructuradas y citas de página.

## AI Evals

```bash
pnpm --filter @proxus/server run eval:tutor:artifact-authoring
pnpm --filter @proxus/server run eval:tutor:knowledge-gap
pnpm --filter @proxus/server run eval:tutor:socratic
pnpm --filter @proxus/server run eval:tutor:search
```

`eval:tutor:knowledge-gap` compara el mismo prompt con y sin contexto de lagunas, comprueba que un quiz de rescate use anclas válidas y que `knowledge master` se rechace.

Los tests deterministas del corrector están en `packages/server/src/domain/knowledge/gap-progress.test.ts`.

## Smoke test CLI

```bash
pnpm --filter @proxus/server run agent:tutor "list my uploaded materials"
pnpm --filter @proxus/server run agent:tutor "Crea un quiz corto de 2 preguntas sobre la Constitución"
```
