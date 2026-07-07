import { readZipBrowser, findEntry } from "./zip/zipReaderBrowser";
import { parseDlof } from "./dlof/parseDlof";
import { renderViewerHtml } from "./viewer/renderViewerHtml";
import { DlofPkg, DlofPkgMeta } from "./types";

/**
 * نسخة متوافقة مع المتصفح من readDlofPkg (راجع src/packages/dlofpkg.ts).
 * تستقبل Uint8Array (من File/ArrayBuffer) بدل Buffer الخاص بـ Node.
 */
export function readDlofPkgBrowser(buf: Uint8Array): DlofPkg {
  const entries = readZipBrowser(buf);

  const dlofEntry = findEntry(entries, "package.dlof");
  if (!dlofEntry) {
    throw new Error('حزمة .dlofpkg غير صالحة: لا يحتوي على "package.dlof"');
  }
  const decoder = new TextDecoder("utf-8");
  const document = parseDlof(decoder.decode(dlofEntry.data), "package.dlof");

  const metaEntry = findEntry(entries, "meta.json");
  let meta: DlofPkgMeta;
  if (metaEntry) {
    meta = JSON.parse(decoder.decode(metaEntry.data));
  } else {
    meta = {
      id: document.id,
      title: document.metadata.title,
      domain: document.metadata.domain,
      version: document.version,
      author: document.metadata.author,
      language: document.metadata.language,
      createdAt: document.metadata.createdAt,
      dlofpkg_version: "1.0",
    };
  }

  const attachments: Record<string, Uint8Array> = {};
  for (const entry of entries) {
    if (entry.isDirectory) continue;
    if (entry.name.startsWith("attachments/")) {
      attachments[entry.name] = entry.data;
    }
  }

  return { meta, document, attachments: attachments as any };
}

/** يقرأ ملف .dlofpkg الذي اختاره المستخدم عبر <input type="file"> ويحوّله مباشرة إلى HTML */
export async function renderDlofPkgFile(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pkg = readDlofPkgBrowser(new Uint8Array(arrayBuffer));
  return renderViewerHtml(pkg as any);
}

export { renderViewerHtml, parseDlof };
