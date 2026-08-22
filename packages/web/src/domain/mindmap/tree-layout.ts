export interface MindMapNode {
  readonly id: string;
  readonly label: string;
  readonly notes?: string | undefined;
  readonly page?: number | undefined;
  readonly color?: string | undefined;
  readonly icon?: string | undefined;
  readonly children?: readonly MindMapNode[] | undefined;
}

export function buildFallbackMindMap(material: { readonly id: string; readonly title: string; readonly pageCount: number }): MindMapNode {
  return {
    id: `map-${material.id}`,
    label: material.title,
    color: "#6366f1",
    icon: "auto_stories",
    notes: `Documento de ${material.pageCount} páginas en tu biblioteca. Pulsa en "Generar con IA" para que Proxo extraiga los conceptos clave, fórmulas y secciones en un mapa interactivo.`,
    children: [
      {
        id: `gen-${material.id}`,
        label: "Generar mapa conceptual con IA",
        color: "#8b5cf6",
        icon: "auto_awesome",
        notes: `Pide a Proxo que analice "${material.title}" y cree un esquema estructurado con los apartados y conceptos fundamentales.`
      }
    ]
  };
}

export function parseMarkdownToMindMap(title: string, markdown: string, rootId = "root"): MindMapNode {
  const lines = markdown.split("\n");
  const branchColors = ["#f59e0b", "#06b6d4", "#ec4899", "#8b5cf6", "#10b981", "#3b82f6", "#ef4444", "#14b8a6"];

  interface RawNode {
    level: number;
    label: string;
    notes?: string | undefined;
    page?: number | undefined;
    children: RawNode[];
  }

  const root: RawNode = {
    level: 0,
    label: title.replace(/^Esquema:\s*/i, "").trim() || "Esquema Conceptual",
    children: []
  };

  const stack: RawNode[] = [root];

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith("---") || trimmed.startsWith("```")) continue;

    let level = 1;
    let label = trimmed;
    let notes: string | undefined;
    let page: number | undefined;

    if (trimmed.startsWith("# ")) {
      const mainTitle = trimmed.replace(/^#\s+/, "").replace(/\*\*/g, "").replace(/^Esquema:\s*/i, "").trim();
      if (mainTitle) root.label = mainTitle;
      continue;
    } else if (trimmed.startsWith("## ")) {
      level = 1;
      label = trimmed.replace(/^##\s+/, "").replace(/^\d+(\.\d+)*[\.\)\:\-]\s*/, "").replace(/\*\*/g, "").trim();
    } else if (trimmed.startsWith("### ")) {
      level = 2;
      label = trimmed.replace(/^###\s+/, "").replace(/^\d+(\.\d+)*[\.\)\:\-]\s*/, "").replace(/\*\*/g, "").trim();
    } else if (trimmed.startsWith("#### ")) {
      level = 3;
      label = trimmed.replace(/^####\s+/, "").replace(/^\d+(\.\d+)*[\.\)\:\-]\s*/, "").replace(/\*\*/g, "").trim();
    } else if (/^\d+\.\s+/.test(trimmed)) {
      if (/^\d+\.\d+\.\s+/.test(trimmed)) {
        level = 2;
        label = trimmed.replace(/^\d+\.\d+[\.\)\:\-]\s*/, "").replace(/\*\*/g, "").trim();
      } else {
        level = 1;
        label = trimmed.replace(/^\d+[\.\)\:\-]\s*/, "").replace(/\*\*/g, "").trim();
      }
    } else if (/^[-*•]\s+/.test(trimmed)) {
      level = 3;
      const bulletText = trimmed.replace(/^[-*•]\s+/, "").trim();
      const boldMatch = /^\*\*([^*]+)\*\*:\s*(.*)$/.exec(bulletText);
      if (boldMatch) {
        label = boldMatch[1]!.trim();
        notes = boldMatch[2]!.replace(/\*\*/g, "").trim();
      } else {
        const colonIdx = bulletText.indexOf(":");
        if (colonIdx > 0 && colonIdx < 45) {
          label = bulletText.slice(0, colonIdx).replace(/\*\*/g, "").trim();
          notes = bulletText.slice(colonIdx + 1).replace(/\*\*/g, "").trim();
        } else {
          label = bulletText.replace(/\*\*/g, "").trim();
        }
      }
    } else if (/^\*\*([^*]+)\*\*:\s*(.*)$/.test(trimmed)) {
      level = 2;
      const boldMatch = /^\*\*([^*]+)\*\*:\s*(.*)$/.exec(trimmed);
      if (boldMatch) {
        label = boldMatch[1]!.trim();
        notes = boldMatch[2]!.replace(/\*\*/g, "").trim();
      }
    } else {
      continue;
    }

    if (!label) continue;

    const pageMatch = /\((?:Pág|Págs|Página|Páginas)\.?\s*(\d+)(?:-\d+)?\)/i.exec(label);
    if (pageMatch && pageMatch[1]) {
      page = parseInt(pageMatch[1], 10);
    }

    const newNode: RawNode = {
      level,
      label,
      notes,
      page,
      children: []
    };

    while (stack.length > 1 && stack[stack.length - 1]!.level >= level) {
      stack.pop();
    }

    const parent = stack[stack.length - 1]!;
    parent.children.push(newNode);
    stack.push(newNode);
  }

  function convert(node: RawNode, path: string, branchIdx = 0, depth = 0): MindMapNode {
    const color = depth === 0 ? "#6366f1" : depth === 1 ? branchColors[branchIdx % branchColors.length] : undefined;
    return {
      id: `${rootId}-${path}`,
      label: node.label,
      notes: node.notes,
      page: node.page,
      color,
      children: node.children.length > 0
        ? node.children.map((c, i) => convert(c, `${path}-${i}`, depth === 0 ? i : branchIdx, depth + 1))
        : undefined
    };
  }

  const result = convert(root, "0", 0, 0);

  if (!result.children || result.children.length === 0) {
    return {
      id: rootId,
      label: title || root.label,
      children: []
    };
  }

  return result;
}

export interface PositionedNode {
  readonly id: string;
  readonly label: string;
  readonly notes?: string | undefined;
  readonly page?: number | undefined;
  readonly color: string;
  readonly icon?: string | undefined;
  readonly level: number;
  readonly side: "left" | "right";
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly parentAnchorX: number;
  readonly parentAnchorY: number;
  readonly children: readonly PositionedNode[];
  readonly hasChildren: boolean;
  readonly isCollapsed: boolean;
  readonly rawNode: MindMapNode;
}

export interface ConnectorLine {
  readonly id: string;
  readonly color: string;
  readonly strokeWidth: number;
  readonly pathD: string;
  readonly isBranchHovered?: boolean;
}

export function getNodeDimensions(label: string, level: number): { width: number; height: number } {
  if (level === 0) {
    return { width: 280, height: 64 };
  }
  if (level === 1) {
    const length = label.length;
    const width = Math.min(320, Math.max(220, length * 7.0 + 50));
    return { width, height: length > 28 ? 58 : 46 };
  }
  if (level === 2) {
    const length = label.length;
    const width = Math.min(300, Math.max(200, length * 6.6 + 40));
    return { width, height: length > 26 ? 54 : 42 };
  }
  const length = label.length;
  const width = Math.min(310, Math.max(190, length * 6.2 + 36));
  return { width, height: length > 28 ? 52 : 40 };
}

export function computeSubtreeHeight(
  node: MindMapNode,
  level: number,
  collapsedIds: Set<string>
): number {
  const isCollapsed = collapsedIds.has(node.id);
  const dims = getNodeDimensions(node.label, level);
  const hasChildren = Boolean(node.children && node.children.length > 0);

  if (!hasChildren || isCollapsed) {
    return dims.height + 14;
  }

  let totalChildHeight = 0;
  for (const child of node.children!) {
    totalChildHeight += computeSubtreeHeight(child, level + 1, collapsedIds);
  }

  return Math.max(dims.height + 14, totalChildHeight);
}

export function layoutSubtree(
  node: MindMapNode,
  level: number,
  side: "left" | "right",
  startX: number,
  centerY: number,
  branchColor: string,
  parentAnchorX: number,
  parentAnchorY: number,
  collapsedIds: Set<string>
): { positionedNode: PositionedNode; connectors: ConnectorLine[] } {
  const isCollapsed = collapsedIds.has(node.id);
  const dims = getNodeDimensions(node.label, level);
  const color = node.color || branchColor;
  const hasChildren = Boolean(node.children && node.children.length > 0);

  const nodeX = side === "right" ? startX : startX - dims.width;
  const nodeY = centerY - dims.height / 2;

  const outAnchorX = side === "right" ? nodeX + dims.width : nodeX;
  const outAnchorY = centerY;

  const connectors: ConnectorLine[] = [];

  if (level > 0) {
    const inAnchorX = side === "right" ? nodeX : nodeX + dims.width;
    const inAnchorY = centerY;
    const dx = Math.abs(inAnchorX - parentAnchorX);
    const cp1X = parentAnchorX + (side === "right" ? 1 : -1) * (dx * 0.5);
    const cp1Y = parentAnchorY;
    const cp2X = inAnchorX - (side === "right" ? 1 : -1) * (dx * 0.5);
    const cp2Y = inAnchorY;

    connectors.push({
      id: `conn-${node.id}`,
      color,
      strokeWidth: level === 1 ? 3.5 : level === 2 ? 2.5 : 1.8,
      pathD: `M ${parentAnchorX} ${parentAnchorY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${inAnchorX} ${inAnchorY}`
    });
  }

  const positionedChildren: PositionedNode[] = [];

  if (hasChildren && !isCollapsed) {
    const nextLevel = level + 1;
    const levelSpacing = level === 0 ? 80 : level === 1 ? 70 : 60;
    const nextStartX = side === "right" ? outAnchorX + levelSpacing : outAnchorX - levelSpacing;

    const childHeights = node.children!.map((child) =>
      computeSubtreeHeight(child, nextLevel, collapsedIds)
    );
    const totalChildrenHeight = childHeights.reduce((acc, h) => acc + h, 0);

    let currentY = centerY - totalChildrenHeight / 2;

    node.children!.forEach((child, index) => {
      const chHeight = childHeights[index]!;
      const childCenterY = currentY + chHeight / 2;

      const { positionedNode: posChild, connectors: childConns } = layoutSubtree(
        child,
        nextLevel,
        side,
        nextStartX,
        childCenterY,
        color,
        outAnchorX,
        outAnchorY,
        collapsedIds
      );

      positionedChildren.push(posChild);
      connectors.push(...childConns);

      currentY += chHeight;
    });
  }

  const positionedNode: PositionedNode = {
    id: node.id,
    label: node.label,
    notes: node.notes,
    page: node.page,
    color,
    icon: node.icon,
    level,
    side,
    x: nodeX,
    y: nodeY,
    width: dims.width,
    height: dims.height,
    parentAnchorX,
    parentAnchorY,
    children: positionedChildren,
    hasChildren,
    isCollapsed,
    rawNode: node
  };

  return { positionedNode, connectors };
}
