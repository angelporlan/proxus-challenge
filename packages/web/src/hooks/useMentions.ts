import { useCallback, useMemo, useState, type RefObject } from "react";

export interface MentionPart {
  readonly kind: "text" | "mention";
  readonly value: string;
}

export interface MentionRange {
  readonly start: number;
  readonly end: number;
  readonly token: string;
  readonly title: string;
  readonly materialId?: string | undefined;
}

export interface AttachedDoc {
  readonly id: string;
  readonly title: string;
  readonly pageCount?: number | undefined;
}

export function findMentionRanges(
  value: string,
  materials: readonly { readonly id?: string | undefined; readonly title: string }[]
): readonly MentionRange[] {
  const sortedMaterials = [...materials].sort(
    (left, right) => right.title.trim().length - left.title.trim().length
  );
  const ranges: MentionRange[] = [];
  let cursor = 0;

  while (cursor < value.length) {
    if (value[cursor] !== "@" || (cursor > 0 && !/\s/.test(value[cursor - 1] ?? ""))) {
      cursor += 1;
      continue;
    }

    const matchedMaterial = sortedMaterials.find((candidate) => {
      const start = cursor + 1;
      const end = start + candidate.title.length;
      const following = value[end];
      return (
        value.slice(start, end).toLocaleLowerCase() === candidate.title.toLocaleLowerCase() &&
        (following === undefined || /\s|[.,!?;:()[\]{}"«»]/.test(following))
      );
    });

    let token = "";
    let title = "";
    let materialId: string | undefined = undefined;

    if (matchedMaterial) {
      token = `@${matchedMaterial.title}`;
      title = matchedMaterial.title;
      materialId = matchedMaterial.id;
    } else {
      const match = /^@[a-zA-Z0-9_.-]+/.exec(value.slice(cursor));
      if (match) {
        token = match[0];
        title = token.slice(1);
      }
    }

    if (!token) {
      cursor += 1;
      continue;
    }

    ranges.push({
      start: cursor,
      end: cursor + token.length,
      token,
      title,
      materialId
    });

    cursor += token.length;
  }

  return ranges;
}

export function splitMentionParts(
  value: string,
  materials: readonly { readonly id?: string | undefined; readonly title: string }[]
): readonly MentionPart[] {
  const ranges = findMentionRanges(value, materials);
  if (ranges.length === 0) {
    return value ? [{ kind: "text", value }] : [];
  }

  const parts: MentionPart[] = [];
  let textStart = 0;

  for (const r of ranges) {
    if (r.start > textStart) {
      parts.push({ kind: "text", value: value.slice(textStart, r.start) });
    }
    parts.push({ kind: "mention", value: r.token });
    textStart = r.end;
  }

  if (textStart < value.length) {
    parts.push({ kind: "text", value: value.slice(textStart) });
  }

  return parts;
}

export function useMentions<TDoc extends AttachedDoc = AttachedDoc>(
  input: string,
  setInput: (value: string | ((prev: string) => string)) => void,
  attachedDocs: readonly TDoc[],
  setAttachedDocs: (updater: (prev: TDoc[]) => TDoc[]) => void,
  availableMaterials: readonly AttachedDoc[],
  textareaRef: RefObject<HTMLTextAreaElement | null>
) {
  const [isMentionOpen, setIsMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);

  const filteredMentionMaterials = useMemo(() => {
    if (mentionQuery === null) return [];
    if (!mentionQuery) return availableMaterials;
    const q = mentionQuery.toLowerCase().replace(/[-_]/g, " ").trim();
    const qSlug = mentionQuery.toLowerCase().replace(/\s+/g, "-").trim();
    return availableMaterials.filter((m) => {
      const mId = m.id.toLowerCase();
      const mTitle = m.title.toLowerCase().replace(/[-_]/g, " ");
      return mId.includes(qSlug) || mTitle.includes(q);
    });
  }, [mentionQuery, availableMaterials]);

  const handleSelectMentionDoc = useCallback((mat: AttachedDoc) => {
    setAttachedDocs((prev) =>
      prev.some((d) => d.id === mat.id)
        ? prev
        : [...prev, { id: mat.id, title: mat.title, pageCount: mat.pageCount } as unknown as TDoc]
    );

    const textarea = textareaRef.current;
    const cursorPos = textarea ? textarea.selectionStart : input.length;
    const beforeCursor = input.slice(0, cursorPos);
    const afterCursor = input.slice(cursorPos);

    const match = /(?:^|\s)@[a-zA-Z0-9_\-.]*$/.exec(beforeCursor);
    let newCursorPos = 0;
    let nextText = "";

    if (match) {
      const matchStart = beforeCursor.lastIndexOf("@");
      const prefix = beforeCursor.slice(0, matchStart);
      const inserted = `@${mat.title} `;
      nextText = `${prefix}${inserted}${afterCursor}`;
      newCursorPos = prefix.length + inserted.length;
    } else {
      const inserted = `@${mat.title} `;
      nextText = `${beforeCursor}${inserted}${afterCursor}`;
      newCursorPos = beforeCursor.length + inserted.length;
    }

    setInput(nextText);
    setMentionQuery(null);
    setIsMentionOpen(false);

    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    });
  }, [input, setAttachedDocs, setInput, textareaRef]);

  const handleRemoveAttachedDoc = useCallback((docId: string, docTitle: string) => {
    setAttachedDocs((prev) => prev.filter((d) => d.id !== docId));
    setInput((prev) => {
      const docsList = [...availableMaterials, ...attachedDocs];
      const ranges = findMentionRanges(prev, docsList);
      const matching = ranges.filter(
        (r) => r.materialId === docId || r.title.toLowerCase() === docTitle.toLowerCase()
      );
      if (matching.length === 0) return prev;
      let nextText = prev;
      for (let i = matching.length - 1; i >= 0; i--) {
        const r = matching[i]!;
        const endWithSpace = nextText[r.end] === " " ? r.end + 1 : r.end;
        nextText = nextText.slice(0, r.start) + nextText.slice(endWithSpace);
      }
      return nextText;
    });
  }, [attachedDocs, availableMaterials, setAttachedDocs, setInput]);

  return {
    isMentionOpen,
    setIsMentionOpen,
    mentionQuery,
    setMentionQuery,
    selectedMentionIndex,
    setSelectedMentionIndex,
    filteredMentionMaterials,
    handleSelectMentionDoc,
    handleRemoveAttachedDoc
  };
}
