import { inflateSync } from "fflate";

export interface ZipEntry {
  name: string;
  data: Uint8Array;
  isDirectory: boolean;
}

const EOCD_SIG = 0x06054b50;
const CDH_SIG = 0x02014b50;

function readUInt32LE(buf: Uint8Array, offset: number): number {
  return (
    (buf[offset] |
      (buf[offset + 1] << 8) |
      (buf[offset + 2] << 16) |
      (buf[offset + 3] << 24)) >>>
    0
  );
}

function readUInt16LE(buf: Uint8Array, offset: number): number {
  return buf[offset] | (buf[offset + 1] << 8);
}

function toUtf8(buf: Uint8Array, start: number, end: number): string {
  return new TextDecoder("utf-8").decode(buf.subarray(start, end));
}

/**
 * نسخة متوافقة مع المتصفح من readZip (تعمل بنفس منطق src/zip/zipReader.ts)
 * لكنها تستخدم fflate بدل وحدة zlib الخاصة بـ Node، وتتعامل مع Uint8Array
 * بدل Buffer حتى تعمل داخل المتصفح مباشرة بدون أي polyfill لـ Node.
 */
export function readZipBrowser(buf: Uint8Array): ZipEntry[] {
  let eocdPos = -1;
  const minEocd = 22;
  for (
    let i = buf.length - minEocd;
    i >= 0 && i >= buf.length - minEocd - 65557;
    i--
  ) {
    if (readUInt32LE(buf, i) === EOCD_SIG) {
      eocdPos = i;
      break;
    }
  }
  if (eocdPos === -1) {
    throw new Error("ملف ZIP غير صالح: لم يُعثر على EOCD (نهاية الفهرس المركزي)");
  }

  const totalEntries = readUInt16LE(buf, eocdPos + 10);
  const cdOffset = readUInt32LE(buf, eocdPos + 16);

  const entries: ZipEntry[] = [];
  let pos = cdOffset;
  for (let i = 0; i < totalEntries; i++) {
    if (readUInt32LE(buf, pos) !== CDH_SIG) {
      throw new Error(`رأس الفهرس المركزي غير صالح عند الموضع ${pos}`);
    }
    const method = readUInt16LE(buf, pos + 10);
    const compSize = readUInt32LE(buf, pos + 20);
    const uncompSize = readUInt32LE(buf, pos + 24);
    const nameLen = readUInt16LE(buf, pos + 28);
    const extraLen = readUInt16LE(buf, pos + 30);
    const commentLen = readUInt16LE(buf, pos + 32);
    const localHeaderOffset = readUInt32LE(buf, pos + 42);
    const name = toUtf8(buf, pos + 46, pos + 46 + nameLen);

    entries.push(
      readLocalEntry(buf, localHeaderOffset, name, method, compSize, uncompSize)
    );

    pos += 46 + nameLen + extraLen + commentLen;
  }

  return entries;
}

function readLocalEntry(
  buf: Uint8Array,
  offset: number,
  name: string,
  method: number,
  compSize: number,
  uncompSize: number
): ZipEntry {
  const nameLen = readUInt16LE(buf, offset + 26);
  const extraLen = readUInt16LE(buf, offset + 28);
  const dataStart = offset + 30 + nameLen + extraLen;
  const raw = buf.subarray(dataStart, dataStart + compSize);

  let data: Uint8Array;
  if (method === 0) {
    data = raw;
  } else if (method === 8) {
    data = inflateSync(raw, { size: uncompSize } as any);
  } else {
    throw new Error(`أسلوب ضغط غير مدعوم: ${method}`);
  }

  return {
    name,
    data,
    isDirectory: name.endsWith("/"),
  };
}

export function findEntry(entries: ZipEntry[], name: string): ZipEntry | undefined {
  return entries.find((e) => e.name === name || e.name === `/${name}`);
}
