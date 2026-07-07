import { DocumentLoop } from "../types";

export interface LoopChainEntry {
  fileName: string;
  document: DocumentLoop;
}

/** يطبّع اسم مرجع ref لمطابقته بمفاتيح خريطة المستندات (يتجاهل المسارات النسبية الزائدة) */
function normalizeRef(ref: string): string {
  const cleaned = ref.replace(/^\.?\//, "");
  const parts = cleaned.split("/");
  return parts[parts.length - 1];
}

/**
 * يحلّ سلسلة الحلقة كاملة انطلاقاً من ملف بداية (أو loopRoot تلقائياً إن لم يُحدَّد)،
 * متتبعاً روابط next بالترتيب حتى: نهاية مفتوحة، أو العودة لبداية حلقة مغلقة، أو ref مفقود.
 * لا يفشل عند فقدان ملف مُشار إليه (توصية القسم 10 من المواصفة) بل يتوقف بهدوء.
 */
export function resolveLoopChain(
  documents: Record<string, DocumentLoop>,
  startFileName?: string
): LoopChainEntry[] {
  const byId = new Map<string, string>(); // id -> fileName، لدعم المراجع بالمعرف أيضاً
  for (const [fileName, doc] of Object.entries(documents)) {
    byId.set(doc.id, fileName);
  }

  function resolveFileName(ref: string): string | undefined {
    const norm = normalizeRef(ref);
    if (documents[norm]) return norm;
    if (documents[ref]) return ref;
    if (byId.has(ref)) return byId.get(ref);
    // حاول المطابقة بلا امتداد
    const withoutExt = norm.replace(/\.(dlof|ep|episode)$/i, "");
    const match = Object.keys(documents).find(
      (f) => f.replace(/\.(dlof|ep|episode)$/i, "") === withoutExt
    );
    return match;
  }

  let current =
    startFileName && documents[startFileName]
      ? startFileName
      : Object.keys(documents).find((f) => documents[f].loopLinks.loopRoot) ??
        Object.keys(documents)[0];

  if (!current) return [];

  const chain: LoopChainEntry[] = [];
  const visited = new Set<string>();

  while (current && !visited.has(current)) {
    visited.add(current);
    const doc = documents[current];
    chain.push({ fileName: current, document: doc });
    const nextRef = doc.loopLinks.next?.ref;
    if (!nextRef) break;
    const nextFile = resolveFileName(nextRef);
    if (!nextFile) break; // ref لا يُعثر عليه: توقف بهدوء دون انهيار
    current = nextFile;
  }

  return chain;
}

/** يبني خريطة تنقّل سريعة: fileName -> {previous?, next?} كأسماء ملفات محلولة فعلياً */
export function buildNavigationMap(
  chain: LoopChainEntry[]
): Record<string, { previous?: string; next?: string }> {
  const map: Record<string, { previous?: string; next?: string }> = {};
  chain.forEach((entry, idx) => {
    map[entry.fileName] = {
      previous: idx > 0 ? chain[idx - 1].fileName : undefined,
      next: idx < chain.length - 1 ? chain[idx + 1].fileName : undefined,
    };
  });
  return map;
}
