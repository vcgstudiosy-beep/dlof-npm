import { readZip } from "../zip/zipReader";
import { writeZip, ZipInputEntry } from "../zip/zipWriter";
import { isDlofFileName, parseDlof } from "../dlof/parseDlof";
import { serializeDlof } from "../dlof/serializeDlof";
import { DlofSeries } from "../types";

/**
 * يقرأ حزمة .dlofSeries: أرشيف ZIP يحتوي مجلداً واحداً باسم السلسلة،
 * بداخله ملفات .dlof (أو .ep / .episode) بالإضافة لأصول اختيارية
 * (fonts/, media/, set.txt...). راجع spec/PACKAGE_FORMATS.md.
 */
export function readDlofSeries(buf: Buffer): DlofSeries {
  const entries = readZip(buf).filter((e) => !e.isDirectory);
  if (!entries.length) {
    throw new Error("حزمة .dlofSeries فارغة أو غير صالحة");
  }

  // اسم مجلد السلسلة هو الجزء الأول المشترك من مسارات المُدخلات
  const firstSegment = entries[0].name.split("/")[0];
  const allShareRoot = entries.every((e) => e.name.split("/")[0] === firstSegment);
  const name = allShareRoot ? firstSegment : "series";

  const docsParsed: DlofSeries["documents"] = {};
  const assets: DlofSeries["assets"] = {};
  let rootFileName: string | undefined;

  for (const entry of entries) {
    const relPath = allShareRoot ? entry.name.slice(firstSegment.length + 1) : entry.name;
    if (!relPath) continue;
    if (isDlofFileName(relPath) && !relPath.includes("/")) {
      const doc = parseDlof(entry.data.toString("utf8"), relPath);
      docsParsed[relPath] = doc;
      if (doc.loopLinks.loopRoot) rootFileName = relPath;
    } else {
      assets[relPath] = entry.data;
    }
  }

  // إن لم يُعلن أي ملف عن نفسه كـ loopRoot، جرّب series-index.dlof كافتراضي شائع
  if (!rootFileName && docsParsed["series-index.dlof"]) {
    rootFileName = "series-index.dlof";
  }

  return { name, documents: docsParsed, rootFileName, assets };
}

/** ينشئ بيانات ثنائية لحزمة .dlofSeries جاهزة للكتابة إلى القرص */
export function writeDlofSeries(series: DlofSeries): Buffer {
  const entries: ZipInputEntry[] = [];
  const base = series.name.replace(/\/+$/, "");
  for (const [fileName, doc] of Object.entries(series.documents)) {
    entries.push({
      name: `${base}/${fileName}`,
      data: Buffer.from(serializeDlof(doc), "utf8"),
    });
  }
  for (const [path, data] of Object.entries(series.assets)) {
    entries.push({ name: `${base}/${path}`, data });
  }
  return writeZip(entries);
}
