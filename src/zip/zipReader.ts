import * as zlib from "zlib";

export interface ZipEntry {
  name: string;
  data: Buffer;
  isDirectory: boolean;
}

const EOCD_SIG = 0x06054b50;
const CDH_SIG = 0x02014b50;

/**
 * يقرأ أرشيف ZIP من الذاكرة عبر تحليل الفهرس المركزي (Central Directory)
 * ثم استخراج كل مُدخل حسب إزاحته في رؤوس الملفات المحلية (Local File Headers).
 * يدعم أساليب الضغط STORE (0) و DEFLATE (8) فقط، وهو ما يستخدمه كل من
 * .dlofpkg و .dlofSeries و أدوات zip القياسية.
 */
export function readZip(buf: Buffer): ZipEntry[] {
  // ابحث عن توقيع نهاية الفهرس المركزي (EOCD) من نهاية الملف
  let eocdPos = -1;
  const minEocd = 22;
  for (let i = buf.length - minEocd; i >= 0 && i >= buf.length - minEocd - 65557; i--) {
    if (buf.readUInt32LE(i) === EOCD_SIG) {
      eocdPos = i;
      break;
    }
  }
  if (eocdPos === -1) {
    throw new Error("ملف ZIP غير صالح: لم يُعثر على EOCD (نهاية الفهرس المركزي)");
  }

  const totalEntries = buf.readUInt16LE(eocdPos + 10);
  const cdSize = buf.readUInt32LE(eocdPos + 12);
  const cdOffset = buf.readUInt32LE(eocdPos + 16);

  const entries: ZipEntry[] = [];
  let pos = cdOffset;
  for (let i = 0; i < totalEntries; i++) {
    if (buf.readUInt32LE(pos) !== CDH_SIG) {
      throw new Error(`رأس الفهرس المركزي غير صالح عند الموضع ${pos}`);
    }
    const method = buf.readUInt16LE(pos + 10);
    const compSize = buf.readUInt32LE(pos + 20);
    const uncompSize = buf.readUInt32LE(pos + 24);
    const nameLen = buf.readUInt16LE(pos + 28);
    const extraLen = buf.readUInt16LE(pos + 30);
    const commentLen = buf.readUInt16LE(pos + 32);
    const localHeaderOffset = buf.readUInt32LE(pos + 42);
    const name = buf.toString("utf8", pos + 46, pos + 46 + nameLen);

    entries.push(
      readLocalEntry(buf, localHeaderOffset, name, method, compSize, uncompSize)
    );

    pos += 46 + nameLen + extraLen + commentLen;
  }

  return entries;
}

function readLocalEntry(
  buf: Buffer,
  localOffset: number,
  name: string,
  method: number,
  compSize: number,
  uncompSize: number
): ZipEntry {
  const LFH_SIG = 0x04034b50;
  if (buf.readUInt32LE(localOffset) !== LFH_SIG) {
    throw new Error(`رأس الملف المحلي غير صالح للمُدخل "${name}"`);
  }
  const nameLen = buf.readUInt16LE(localOffset + 26);
  const extraLen = buf.readUInt16LE(localOffset + 28);
  const dataStart = localOffset + 30 + nameLen + extraLen;
  const raw = buf.subarray(dataStart, dataStart + compSize);

  let data: Buffer;
  if (method === 0) {
    data = Buffer.from(raw);
  } else if (method === 8) {
    data = zlib.inflateRawSync(raw);
  } else {
    throw new Error(`أسلوب ضغط غير مدعوم (${method}) للمُدخل "${name}"`);
  }

  if (uncompSize && data.length !== uncompSize) {
    // بعض الأدوات تكتب 0 في compSize للمجلدات؛ لا نرمي خطأ صارماً هنا لمرونة أكبر
  }

  return { name, data, isDirectory: name.endsWith("/") };
}

/** يبحث عن مُدخل باسم مطابق (نسبي) داخل قائمة المُدخلات */
export function findEntry(entries: ZipEntry[], name: string): ZipEntry | undefined {
  return entries.find((e) => e.name === name || e.name === name.replace(/^\//, ""));
}
