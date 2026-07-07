#!/usr/bin/env node
import * as fs from "fs";
import * as path from "path";
import { parseDlof, isDlofFileName } from "./dlof/parseDlof";
import { validateDlof } from "./dlof/validate";
import { readDlofPkg, writeDlofPkg, buildDefaultMeta } from "./packages/dlofpkg";
import { readDlofSeries, writeDlofSeries } from "./packages/dlofSeries";
import { renderViewerHtml } from "./viewer/renderViewerHtml";
import { renderPlayerHtml } from "./player/renderPlayerHtml";
import { DlofSeries, DocumentLoop } from "./types";

const HELP = `dlof — أداة سطر أوامر لصيغة DLoF (Document Loop Format)

الاستخدام:
  dlof view <file.dlof|file.dlofpkg> [-o out.html]     يبني عارض HTML لملف أو حزمة
  dlof play <file.dlofSeries|folder>  [-o out.html]     يبني مشغّل HTML تفاعلي لسلسلة/حلقة كاملة
  dlof validate <file.dlof>                             يتحقق من صحة ملف مقابل المواصفة
  dlof pack <package.dlof> [-o out.dlofpkg]             يحزم ملف dlof واحد كـ .dlofpkg
  dlof pack-series <folder> [-o out.dlofSeries]         يحزم مجلد سلسلة كـ .dlofSeries
  dlof unpack <file.dlofpkg|file.dlofSeries> <outDir>   يفك ضغط حزمة إلى مجلد

أمثلة:
  dlof view ep01.dlofpkg -o ep01.html
  dlof play MySeries.dlofSeries -o player.html
  dlof play ./MySeries -o player.html   (مجلد سلسلة غير مضغوط)
  dlof validate ch01.dlof
`;

function readArgFlag(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);
  return idx !== -1 ? args[idx + 1] : undefined;
}

function loadDocumentLoop(filePath: string): DocumentLoop {
  const xml = fs.readFileSync(filePath, "utf8");
  return parseDlof(xml, path.basename(filePath));
}

function loadSeriesFromFolder(folder: string): DlofSeries {
  const documents: Record<string, DocumentLoop> = {};
  const assets: Record<string, Buffer> = {};

  function walk(dir: string, relBase: string) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      const rel = relBase ? `${relBase}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        walk(full, rel);
      } else if (isDlofFileName(entry.name) && !relBase) {
        documents[entry.name] = parseDlof(fs.readFileSync(full, "utf8"), entry.name);
      } else {
        assets[rel] = fs.readFileSync(full);
      }
    }
  }
  walk(folder, "");

  let rootFileName = Object.keys(documents).find((f) => documents[f].loopLinks.loopRoot);
  if (!rootFileName && documents["series-index.dlof"]) rootFileName = "series-index.dlof";

  return { name: path.basename(folder), documents, rootFileName, assets };
}

function writeOutput(defaultName: string, outFlag: string | undefined, content: string | Buffer) {
  const outPath = outFlag ?? defaultName;
  fs.writeFileSync(outPath, content);
  console.log(`✅ تم الإنشاء: ${path.resolve(outPath)}`);
}

function cmdView(args: string[]) {
  const input = args[0];
  if (!input) return fail("يرجى تحديد ملف .dlof أو .dlofpkg");
  const out = readArgFlag(args, "-o") ?? readArgFlag(args, "--out");
  const lower = input.toLowerCase();
  let html: string;
  if (lower.endsWith(".dlofpkg")) {
    const pkg = readDlofPkg(fs.readFileSync(input));
    html = renderViewerHtml(pkg);
  } else {
    html = renderViewerHtml(loadDocumentLoop(input));
  }
  writeOutput(defaultOutName(input, ".view.html"), out, html);
}

function cmdPlay(args: string[]) {
  const input = args[0];
  if (!input) return fail("يرجى تحديد ملف .dlofSeries أو مجلد سلسلة");
  const out = readArgFlag(args, "-o") ?? readArgFlag(args, "--out");
  const stat = fs.statSync(input);
  let series: DlofSeries;
  if (stat.isDirectory()) {
    series = loadSeriesFromFolder(input);
  } else if (input.toLowerCase().endsWith(".dlofseries")) {
    series = readDlofSeries(fs.readFileSync(input));
  } else {
    // ملف .dlof منفرد: عامله كحلقة من عنصر واحد
    const doc = loadDocumentLoop(input);
    series = { name: path.basename(input, path.extname(input)), documents: { [path.basename(input)]: doc }, rootFileName: path.basename(input), assets: {} };
  }
  const html = renderPlayerHtml(series);
  writeOutput(defaultOutName(input, ".player.html"), out, html);
}

function cmdValidate(args: string[]) {
  const input = args[0];
  if (!input) return fail("يرجى تحديد ملف .dlof");
  const doc = loadDocumentLoop(input);
  const result = validateDlof(doc);
  for (const issue of result.issues) {
    const prefix = issue.level === "error" ? "❌ خطأ" : "⚠️  تنبيه";
    console.log(`${prefix}: ${issue.message}`);
  }
  console.log(result.valid ? "\n✅ الملف صالح." : "\n❌ الملف يحتوي أخطاء.");
  if (!result.valid) process.exitCode = 1;
}

function cmdPack(args: string[]) {
  const input = args[0];
  if (!input) return fail("يرجى تحديد ملف package.dlof لتحزيمه");
  const out = readArgFlag(args, "-o") ?? readArgFlag(args, "--out");
  const doc = loadDocumentLoop(input);
  const buf = writeDlofPkg({ meta: buildDefaultMeta(doc), document: doc, attachments: {} });
  writeOutput(defaultOutName(input, ".dlofpkg"), out, buf);
}

function cmdPackSeries(args: string[]) {
  const input = args[0];
  if (!input) return fail("يرجى تحديد مجلد السلسلة لتحزيمه");
  const out = readArgFlag(args, "-o") ?? readArgFlag(args, "--out");
  const series = loadSeriesFromFolder(input);
  const buf = writeDlofSeries(series);
  writeOutput(defaultOutName(input, ".dlofSeries"), out, buf);
}

function cmdUnpack(args: string[]) {
  const input = args[0];
  const outDir = args[1];
  if (!input || !outDir) return fail("الاستخدام: dlof unpack <file> <outDir>");
  const lower = input.toLowerCase();
  fs.mkdirSync(outDir, { recursive: true });
  if (lower.endsWith(".dlofpkg")) {
    const pkg = readDlofPkg(fs.readFileSync(input));
    fs.writeFileSync(path.join(outDir, "package.dlof"), Buffer.from(require("./dlof/serializeDlof").serializeDlof(pkg.document)));
    fs.writeFileSync(path.join(outDir, "meta.json"), JSON.stringify(pkg.meta, null, 2));
    for (const [rel, data] of Object.entries(pkg.attachments)) {
      const full = path.join(outDir, rel);
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(full, data);
    }
  } else if (lower.endsWith(".dlofseries")) {
    const series = readDlofSeries(fs.readFileSync(input));
    const { serializeDlof } = require("./dlof/serializeDlof");
    for (const [fileName, doc] of Object.entries(series.documents)) {
      fs.writeFileSync(path.join(outDir, fileName), serializeDlof(doc));
    }
    for (const [rel, data] of Object.entries(series.assets)) {
      const full = path.join(outDir, rel);
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(full, data as Buffer);
    }
  } else {
    return fail("امتداد غير مدعوم لفك الضغط (المتوقع .dlofpkg أو .dlofSeries)");
  }
  console.log(`✅ تم فك الضغط إلى: ${path.resolve(outDir)}`);
}

function defaultOutName(input: string, suffix: string): string {
  const base = path.basename(input, path.extname(input));
  return path.join(path.dirname(input), base + suffix);
}

function fail(message: string): never {
  console.error(`❌ ${message}\n`);
  console.log(HELP);
  process.exit(1);
}

function main() {
  const [, , command, ...rest] = process.argv;
  switch (command) {
    case "view":
      return cmdView(rest);
    case "play":
      return cmdPlay(rest);
    case "validate":
      return cmdValidate(rest);
    case "pack":
      return cmdPack(rest);
    case "pack-series":
      return cmdPackSeries(rest);
    case "unpack":
      return cmdUnpack(rest);
    case undefined:
    case "-h":
    case "--help":
    case "help":
      console.log(HELP);
      return;
    default:
      console.error(`أمر غير معروف: ${command}\n`);
      console.log(HELP);
      process.exit(1);
  }
}

main();
