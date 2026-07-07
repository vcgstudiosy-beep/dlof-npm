/**
 * محلّل XML خفيف بلا اعتمادات خارجية.
 * غير مصمم كمحلل XML عام كامل المواصفة، بل مخصّص لتغطية كل ما تحتاجه صيغة DLoF:
 * عناصر متداخلة، صفات، نص، CDATA، تعليقات، عناصر ذاتية الإغلاق، وترميز UTF-8.
 */

export interface XmlNode {
  tag: string;
  attrs: Record<string, string>;
  children: XmlNode[];
  text: string; // النص المباشر المُجمَّع لهذا العنصر (بعد إزالة العناصر الفرعية)
}

const ENTITY_MAP: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
};

function decodeEntities(input: string): string {
  return input.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, ent: string) => {
    if (ent[0] === "#") {
      const isHex = ent[1] === "x" || ent[1] === "X";
      const code = parseInt(ent.slice(isHex ? 2 : 1), isHex ? 16 : 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    return ENTITY_MAP[ent] ?? match;
  });
}

export function encodeEntities(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

class Cursor {
  pos = 0;
  constructor(public src: string) {}
  eof(): boolean {
    return this.pos >= this.src.length;
  }
  peek(len = 1): string {
    return this.src.slice(this.pos, this.pos + len);
  }
  startsWith(s: string): boolean {
    return this.src.startsWith(s, this.pos);
  }
}

function skipWhitespace(c: Cursor) {
  while (!c.eof() && /\s/.test(c.peek())) c.pos++;
}

function skipProlog(c: Cursor) {
  // <?xml ... ?>
  skipWhitespace(c);
  while (c.startsWith("<?")) {
    const end = c.src.indexOf("?>", c.pos);
    c.pos = end === -1 ? c.src.length : end + 2;
    skipWhitespace(c);
  }
  // تعليقات وDOCTYPE قبل الجذر
  for (;;) {
    if (c.startsWith("<!--")) {
      const end = c.src.indexOf("-->", c.pos);
      c.pos = end === -1 ? c.src.length : end + 3;
      skipWhitespace(c);
      continue;
    }
    if (c.startsWith("<!DOCTYPE")) {
      const end = c.src.indexOf(">", c.pos);
      c.pos = end === -1 ? c.src.length : end + 1;
      skipWhitespace(c);
      continue;
    }
    break;
  }
}

function readTagName(c: Cursor): string {
  const start = c.pos;
  while (!c.eof() && /[^\s/>]/.test(c.peek())) c.pos++;
  return c.src.slice(start, c.pos);
}

function readAttrs(c: Cursor): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (;;) {
    skipWhitespace(c);
    if (c.eof() || c.peek() === "/" || c.peek() === ">") break;
    const nameStart = c.pos;
    while (!c.eof() && /[^\s=/>]/.test(c.peek())) c.pos++;
    const name = c.src.slice(nameStart, c.pos);
    skipWhitespace(c);
    if (c.peek() === "=") {
      c.pos++; // =
      skipWhitespace(c);
      const quote = c.peek();
      let value = "";
      if (quote === '"' || quote === "'") {
        c.pos++;
        const valStart = c.pos;
        const endIdx = c.src.indexOf(quote, c.pos);
        const valEnd = endIdx === -1 ? c.src.length : endIdx;
        value = c.src.slice(valStart, valEnd);
        c.pos = valEnd + 1;
      } else {
        const valStart = c.pos;
        while (!c.eof() && /[^\s/>]/.test(c.peek())) c.pos++;
        value = c.src.slice(valStart, c.pos);
      }
      if (name) attrs[name] = decodeEntities(value);
    } else if (name) {
      attrs[name] = "";
    }
  }
  return attrs;
}

/**
 * يحلّل مستند XML كاملاً ويعيد العنصر الجذر.
 */
export function parseXml(source: string): XmlNode {
  const c = new Cursor(source);
  skipProlog(c);

  function parseElement(): XmlNode {
    // نتوقع c.peek() === '<'
    c.pos++; // تجاوز '<'
    const tag = readTagName(c);
    const attrs = readAttrs(c);
    skipWhitespace(c);

    const node: XmlNode = { tag, attrs, children: [], text: "" };

    if (c.peek(2) === "/>") {
      c.pos += 2;
      return node;
    }
    if (c.peek() === ">") {
      c.pos += 1;
    }

    const textParts: string[] = [];

    for (;;) {
      if (c.eof()) break;

      if (c.startsWith("<!--")) {
        const end = c.src.indexOf("-->", c.pos);
        c.pos = end === -1 ? c.src.length : end + 3;
        continue;
      }
      if (c.startsWith("<![CDATA[")) {
        const end = c.src.indexOf("]]>", c.pos);
        const contentEnd = end === -1 ? c.src.length : end;
        textParts.push(c.src.slice(c.pos + 9, contentEnd));
        c.pos = end === -1 ? c.src.length : end + 3;
        continue;
      }
      if (c.startsWith("</")) {
        const end = c.src.indexOf(">", c.pos);
        c.pos = end === -1 ? c.src.length : end + 1;
        break; // نهاية هذا العنصر
      }
      if (c.peek() === "<") {
        const child = parseElement();
        node.children.push(child);
        continue;
      }
      // نص عادي حتى أول '<'
      const nextLt = c.src.indexOf("<", c.pos);
      const textEnd = nextLt === -1 ? c.src.length : nextLt;
      textParts.push(c.src.slice(c.pos, textEnd));
      c.pos = textEnd;
    }

    node.text = decodeEntities(textParts.join("")).trim();
    return node;
  }

  skipWhitespace(c);
  if (c.eof() || c.peek() !== "<") {
    throw new Error("مستند XML غير صالح: لا يوجد عنصر جذر");
  }
  return parseElement();
}

/** يبحث عن أول عنصر فرعي مباشر بالاسم المحدد */
export function child(node: XmlNode | undefined, tag: string): XmlNode | undefined {
  return node?.children.find((n) => n.tag === tag);
}

/** يعيد كل العناصر الفرعية المباشرة بالاسم المحدد */
export function children(node: XmlNode | undefined, tag: string): XmlNode[] {
  return node?.children.filter((n) => n.tag === tag) ?? [];
}

/** نص عنصر فرعي مباشر، أو undefined إن لم يوجد */
export function childText(node: XmlNode | undefined, tag: string): string | undefined {
  const n = child(node, tag);
  return n ? n.text : undefined;
}
