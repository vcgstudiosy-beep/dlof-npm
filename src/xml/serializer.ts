import { encodeEntities } from "./parser";

export interface EBuilder {
  tag: string;
  attrs?: Record<string, string | number | boolean | undefined>;
  text?: string;
  children?: EBuilder[];
  selfClosing?: boolean;
  /** تعليق XML يُدرج قبل هذا العنصر (اختياري) */
  commentBefore?: string;
}

function attrString(attrs?: Record<string, string | number | boolean | undefined>): string {
  if (!attrs) return "";
  const parts: string[] = [];
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined) continue;
    parts.push(`${k}="${encodeEntities(String(v))}"`);
  }
  return parts.length ? " " + parts.join(" ") : "";
}

function renderNode(node: EBuilder, indent: number): string {
  const pad = "  ".repeat(indent);
  const lines: string[] = [];
  if (node.commentBefore) {
    lines.push(`${pad}<!-- ${node.commentBefore} -->`);
  }
  const attrs = attrString(node.attrs);
  const hasChildren = node.children && node.children.length > 0;
  const hasText = node.text !== undefined && node.text !== "";

  if (!hasChildren && !hasText) {
    lines.push(`${pad}<${node.tag}${attrs}/>`);
    return lines.join("\n");
  }

  if (hasText && !hasChildren) {
    lines.push(`${pad}<${node.tag}${attrs}>${encodeEntities(node.text!)}</${node.tag}>`);
    return lines.join("\n");
  }

  lines.push(`${pad}<${node.tag}${attrs}>`);
  if (hasText) {
    lines.push(`${"  ".repeat(indent + 1)}${encodeEntities(node.text!)}`);
  }
  for (const ch of node.children ?? []) {
    lines.push(renderNode(ch, indent + 1));
  }
  lines.push(`${pad}</${node.tag}>`);
  return lines.join("\n");
}

/** يبني مستند XML كامل بترويسة UTF-8 من عنصر جذر واحد */
export function buildXmlDocument(root: EBuilder): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n${renderNode(root, 0)}\n`;
}
