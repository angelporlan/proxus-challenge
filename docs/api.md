# API

La API principal se define en `packages/shared/src/api/*` con Effect HTTP API.

En local:

- Docs interactivas: `http://localhost:3000/docs`
- OpenAPI JSON: `http://localhost:3000/openapi.json`

## Endpoints

### Tutor

```http
POST /api/tutor/chat
POST /api/tutor/chat/stream
```

`/stream` devuelve NDJSON:

```json
{ "type": "message", "message": {} }
{ "type": "done" }
```

La ruta streaming está implementada a mano (`POST /api/tutor/chat/stream`) porque Effect HttpApi no expone NDJSON incremental. Los errores se mapean con `httpErrorResponse` (los mismos 400/404/503/500 que el resto de la API).

### Materials

```http
GET /api/materials/
GET /api/materials/:id
POST /api/materials/upload
DELETE /api/materials/:id
```

Los materiales representan PDFs disponibles para el tutor (apuntes, temarios, diapositivas).
- `POST /api/materials/upload`: Permite la ingesta de documentos subiendo el PDF codificado en Base64 con metadatos (`fileName`, `contentBase64`, `title`). Valida la integridad del PDF y extrae el conteo de páginas.
- `DELETE /api/materials/:id`: Elimina el PDF, su mind map, los artefactos con `sourceMaterialId` de ese material y las lagunas asociadas.
- El server puede renderizar páginas vía Poppler (`pdftoppm`) para que Gemini las procese como imágenes.

### Artifacts

```http
GET /api/artifacts/
GET /api/artifacts/:id
POST /api/artifacts/:id/submit
```

`submit` crea y corrige un intento, devolviendo un attempt con estado `graded` cuando aplica.

## Tipos de artifact

- `note`: contenido markdown.
- `quiz`: preguntas cerradas.
- `test`: preguntas cerradas o `short-answer`.

Tipos de pregunta:

- `multiple-choice`
- `true-false`
- `short-answer` solo para tests.

Formato correcto para multiple choice:

```json
{
  "type": "multiple-choice",
  "options": [
    { "id": "a", "text": "Respuesta A" },
    { "id": "b", "text": "Respuesta B" }
  ]
}
```

El CLI tolera options como strings y las normaliza, pero el contrato estable usa `{ id, text }`.

## Cliente web

- Cliente API: `packages/web/src/api/client.ts`
- Runtime Effect: `packages/web/src/lib/runtime.ts`
- Streaming tutor: `packages/web/src/domain/tutor/stream.ts`
