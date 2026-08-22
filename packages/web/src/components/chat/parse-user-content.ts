export interface ParsedUserDoc {
  readonly id?: string | undefined;
  readonly title: string;
  readonly pageCount?: number | undefined;
}

export function parseUserContent(
  rawContent: string,
  materials: readonly { readonly id: string; readonly title: string; readonly pageCount?: number | undefined }[]
): { readonly docs: readonly ParsedUserDoc[]; readonly text: string } {
  const foundDocs: ParsedUserDoc[] = [];
  const socraticPattern = /\[Enfoque pedagógico:\s*[^\]]+\]/g;
  let cleanText = rawContent.replace(socraticPattern, "").trim();

  const refPattern = /\[Documentos de referencia:\s*([^\]]+)\]/g;
  let match: RegExpExecArray | null;
  while ((match = refPattern.exec(cleanText)) !== null) {
    const listStr = match[1]!;
    const items = listStr.split(",").map((s) => s.trim());
    for (const itm of items) {
      const matched = materials.find(
        (m) =>
          m.id.toLowerCase() === itm.toLowerCase() ||
          m.title.toLowerCase() === itm.toLowerCase() ||
          m.title.toLowerCase().includes(itm.toLowerCase())
      );
      if (matched) {
        if (!foundDocs.some((d) => d.id === matched.id)) {
          foundDocs.push({ id: matched.id, title: matched.title, pageCount: matched.pageCount });
        }
      } else if (!foundDocs.some((d) => d.title === itm)) {
        foundDocs.push({ title: itm });
      }
    }
  }
  cleanText = cleanText.replace(refPattern, "").trim();

  const quotedMentionPattern = /@\["([^"]+)"\]/g;
  while ((match = quotedMentionPattern.exec(cleanText)) !== null) {
    const term = match[1]!;
    const matched = materials.find(
      (m) =>
        m.id.toLowerCase() === term.toLowerCase() ||
        m.title.toLowerCase() === term.toLowerCase() ||
        m.title.toLowerCase().includes(term.toLowerCase())
    );
    if (matched) {
      if (!foundDocs.some((d) => d.id === matched.id)) {
        foundDocs.push({ id: matched.id, title: matched.title, pageCount: matched.pageCount });
      }
    } else {
      foundDocs.push({ title: term.replace(/[-_]/g, " ") });
    }
  }
  cleanText = cleanText.replace(quotedMentionPattern, "@$1");

  const inlineMentionPattern = /@([a-zA-Z0-9_\-\.]+)/g;
  while ((match = inlineMentionPattern.exec(cleanText)) !== null) {
    const term = match[1]!;
    const norm = term.toLowerCase().replace(/[-_]/g, " ").trim();
    const slug = term.toLowerCase().replace(/\s+/g, "-").trim();

    const matched = materials.find((m) => {
      const mId = m.id.toLowerCase();
      const mTitle = m.title.toLowerCase().replace(/[-_]/g, " ");
      return (
        mId === slug ||
        mId.startsWith(slug) ||
        mId.includes(slug) ||
        mTitle.includes(norm) ||
        norm.includes(mTitle)
      );
    });

    if (matched) {
      if (!foundDocs.some((d) => d.id === matched.id)) {
        foundDocs.push({ id: matched.id, title: matched.title, pageCount: matched.pageCount });
      }
    } else {
      foundDocs.push({ title: term.replace(/[-_]/g, " ") });
    }
  }

  return {
    docs: foundDocs,
    text: cleanText
  };
}

export function cleanAssistantContent(raw: string, options: { readonly hasArtifactWidget?: boolean } = {}): string {
  if (!raw) return "";
  const trimmed = raw.trim();
  if (/^(?:Tool call\s+)?[a-zA-Z0-9_-]+\s*:\s*(?:json=)?\{/i.test(trimmed)) {
    return "He preparado el recurso solicitado. Puedes revisarlo a continuación:";
  }
  const cleaned = raw.replace(/^(?:Tool call\s+)?[a-zA-Z0-9_-]+\s*:\s*(?:json=)?\{[^\n]+\}\n*/gi, "").trim() || raw;
  if (!options.hasArtifactWidget) return cleaned;

  const questionDumpPattern = /(?:^|\n)\s*(?:pregunta\s*\d+|q\d+\s*[:.)]|respuesta\s+correcta|opciones?\s*:|art(?:ifact|e?fact)\s*(?:id| creado)|responde\s+(?:con|las)|[A-D][.)]\s+)/i;
  if (!questionDumpPattern.test(cleaned)) return cleaned;

  const presentation = cleaned
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => !/^(?:pregunta\s*\d+|q\d+\s*[:.)]|respuesta\s+correcta|opciones?\s*:|art(?:ifact|e?fact)\s*(?:id| creado)|responde\s+(?:con|las)|[A-D][.)]\s+)/i.test(line))
    .join(" ")
    .trim();

  return presentation || "He preparado el ejercicio. Puedes resolverlo en el widget interactivo que aparece a continuación:";
}
