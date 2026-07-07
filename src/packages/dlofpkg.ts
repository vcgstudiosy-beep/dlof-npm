import { readZip, findEntry } from "../zip/zipReader";
import { writeZip, ZipInputEntry } from "../zip/zipWriter";
import { parseDlof } from "../dlof/parseDlof";
import { serializeDlof } from "../dlof/serializeDlof";
import { DlofPkg, DlofPkgMeta, DocumentLoop } from "../types";

/**
 * يقرأ حزمة .dlofpkg (أرشيف ZIP يحتوي package.dlof + meta.json + attachments/)
 * راجع spec/PACKAGE_FORMATS.md للبنية الرسمية.
 */
export function readDlofPkg(buf: Buffer): DlofPkg {
  const entries = readZip(buf);

  const dlofEntry = findEntry(entries, "package.dlof");
  if (!dlofEntry) {
    throw new Error('حزمة .dlofpkg غير صالحة: لا يحتوي على "package.dlof"');
  }
  const document = parseDlof(dlofEntry.data.toString("utf8"), "package.dlof");

  const metaEntry = findEntry(entries, "meta.json");
  let meta: DlofPkgMeta;
  if (metaEntry) {
    meta = JSON.parse(metaEntry.data.toString("utf8"));
  } else {
    // لا يوجد meta.json: نبني واحداً من البيانات الوصفية داخل المستند نفسه (تسامح مع حزم غير كاملة)
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

  const attachments: Record<string, Buffer> = {};
  for (const entry of entries) {
    if (entry.isDirectory) continue;
    if (entry.name.startsWith("attachments/")) {
      attachments[entry.name] = entry.data;
    }
  }

  return { meta, document, attachments };
}

/** ينشئ بيانات ثنائية لحزمة .dlofpkg جاهزة للكتابة إلى القرص */
export function writeDlofPkg(pkg: DlofPkg): Buffer {
  const entries: ZipInputEntry[] = [
    { name: "package.dlof", data: Buffer.from(serializeDlof(pkg.document), "utf8") },
    { name: "meta.json", data: Buffer.from(JSON.stringify(pkg.meta, null, 2), "utf8") },
  ];
  for (const [path, data] of Object.entries(pkg.attachments)) {
    entries.push({ name: path.startsWith("attachments/") ? path : `attachments/${path}`, data });
  }
  return writeZip(entries);
}

/** يبني meta.json افتراضياً انطلاقاً من مستند DocumentLoop */
export function buildDefaultMeta(doc: DocumentLoop): DlofPkgMeta {
  return {
    id: doc.id,
    title: doc.metadata.title,
    domain: doc.metadata.domain,
    version: doc.version,
    author: doc.metadata.author,
    language: doc.metadata.language,
    createdAt: doc.metadata.createdAt ?? new Date().toISOString(),
    dlofpkg_version: "1.0",
  };
}
