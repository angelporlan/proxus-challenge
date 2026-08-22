export interface SelectionHighlight {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

export function getPdfPageCacheKey(materialId: string, page: number): string {
  return `${materialId}::${page}`;
}

export function selectionHighlightsFromRects(
  rects: readonly DOMRect[],
  containerRect: DOMRect
): readonly SelectionHighlight[] {
  const rawRects = rects
    .filter((rect) => rect.width > 0 && rect.height > 0)
    .map((rect) => ({
      left: rect.left - containerRect.left,
      top: rect.top - containerRect.top,
      right: rect.right - containerRect.left,
      bottom: rect.bottom - containerRect.top,
      height: rect.height
    }))
    .sort((left, right) => left.top - right.top || left.left - right.left);

  const merged: Array<{
    left: number;
    top: number;
    right: number;
    bottom: number;
    height: number;
  }> = [];

  for (const rect of rawRects) {
    const previous = merged[merged.length - 1];
    const sameLine = previous && Math.abs(rect.top - previous.top) <= Math.max(3, rect.height * 0.45);
    const closeEnough = previous && rect.left - previous.right <= Math.max(10, rect.height * 1.75);

    if (previous && sameLine && closeEnough) {
      previous.left = Math.min(previous.left, rect.left);
      previous.top = Math.min(previous.top, rect.top);
      previous.right = Math.max(previous.right, rect.right);
      previous.bottom = Math.max(previous.bottom, rect.bottom);
      previous.height = Math.max(previous.height, rect.height);
    } else {
      merged.push({ ...rect });
    }
  }

  return merged.map((rect) => ({
    left: Math.max(0, (rect.left / containerRect.width) * 100),
    top: Math.max(0, (rect.top / containerRect.height) * 100),
    width: Math.min(100, ((rect.right - rect.left) / containerRect.width) * 100),
    height: Math.min(100, ((rect.bottom - rect.top) / containerRect.height) * 100)
  }));
}
