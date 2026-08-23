# Datos locales

El server usa storage local bajo `packages/server/.data`. Esa carpeta está ignorada por git y no debe subirse a la repo.

## Layout esperado

```txt
packages/server/.data/
  agent-sessions/
    <sessionId>.json
  artifacts/
    artifacts/
      <artifactId>.json
    attempts/
      <attemptId>.json
  knowledge/
    profile.json
  materials/
    pdfs/
      *.pdf
      <materialId>.mindmap.json
  user_profile.json
```

## Materials

Los documentos y temarios en PDF se guardan en:

```txt
packages/server/.data/materials/pdfs/
```

### Ingesta de Documentos
- **Desde la UI**: El estudiante puede subir apuntes o temarios directamente arrastrando y soltando o seleccionando archivos PDF en la plataforma.
- **Desde la API**: Mediante `POST /api/materials/upload` con validación de integridad y extracción automática de páginas.
- **Eliminación**: Directamente desde la UI o mediante `DELETE /api/materials/:id`. Borra en cascada el mind map, los artefactos con ese `sourceMaterialId` y las lagunas asociadas.

El repo espera que Poppler esté instalado para inspeccionar/renderizar PDFs:

- `pdfinfo`
- `pdftoppm`
- `pdftotext`

El tutor puede usar:

```txt
materials list
materials search <materialId> "<query>"
materials view <materialId> <pages>
materials delete <materialId>
```

`materials search` localiza páginas por texto. `materials view` renderiza páginas como imágenes para Gemini multimodal.

## Artifacts

Los artifacts creados por el tutor o por comandos se guardan como JSON.

Kinds:

- `note`
- `quiz`
- `test`

Attempts:

- `ungraded`
- `graded`

Las correcciones viven dentro del attempt; no hay entidad `Review` separada. Un attempt calificado puede incluir `knowledgeUpdates` (`masteredGapIds`, `reinforcedGapIds`, `newGapIds`, `orphanedAnchorIds`).

Las preguntas de quiz/test aceptan `reinforcesGapId` opcional para anclar un rescate a una laguna existente.

## Knowledge

El perfil de lagunas vive en `.data/knowledge/profile.json`.

Al calificar un quiz o test, `resolveGapTransitions` actualiza ese perfil: crea o incrementa lagunas, cuenta `failCount` / `correctStreak`, y deriva `mastered` cuando hay dos aciertos ligados. El agente no escribe dominio.

## Reset local

Para limpiar datos generados, para el server y borra selectivamente:

```bash
rm -rf packages/server/.data/artifacts
rm -rf packages/server/.data/agent-sessions
rm -rf packages/server/.data/knowledge
```

No borres `materials/pdfs` si quieres conservar PDFs de prueba. `user_profile.json` es independiente del historial de lagunas.

## Añadir contenidos para empezar

No hay seed data commiteada dentro de `.data`. Para probar el flujo con tus propios materiales locales:

```bash
mkdir -p packages/server/.data/materials/pdfs
cp /ruta/a/un-pdf-publico-o-sintetico.pdf packages/server/.data/materials/pdfs/
```

Después arranca el server y pide al tutor:

```bash
pnpm --filter @proxus/server run agent:tutor "list my uploaded materials"
pnpm --filter @proxus/server run agent:tutor "Crea un quiz corto usando los materiales disponibles"
```

Usa PDFs públicos, sintéticos o propios. No uses apuntes privados, exámenes no autorizados, datos de estudiantes ni documentación propietaria en una PR.

## Estrategia recomendada si quieres aportar datos demo

No commitees `packages/server/.data`. Si una mejora necesita contenido de ejemplo, preferimos una de estas opciones:

1. Añadir fixtures públicos/sintéticos fuera de `.data`, por ejemplo:

   ```txt
   packages/server/fixtures/materials/demo.pdf
   packages/server/fixtures/artifacts/*.json
   ```

2. Añadir un script tipo `seed:demo` que copie o genere esos fixtures hacia `.data`.
3. Documentar el origen/licencia del material demo.

## Semillas

No dependas de datos locales no versionados para una feature crítica. Si tu cambio requiere datos de ejemplo, documenta cómo crearlos o añade un script pequeño que los genere sin secretos.
