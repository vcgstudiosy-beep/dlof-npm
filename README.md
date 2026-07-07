# dlof

حزمة npm احترافية كاملة لصيغة **DLoF** (Document Loop Format): مكتبة برمجية + أداة سطر أوامر
لتحليل وإنشاء ملفات `.dlof`، حزم `.dlofpkg` و `.dlofSeries`، بالإضافة إلى **عارض** و **مشغّل**
HTML تفاعليَّين يعملان بلا أي اعتمادية خارجية (Zero Dependencies) — يستخدمان فقط وحدات Node
المدمجة (`zlib`, `fs`, `path`).

## المزايا

- 📄 **تحليل/إنشاء `.dlof`**: قارئ وكاتب XML مخصّص للصيغة (`parseDlof` / `serializeDlof`)، بلا أي اعتماد خارجي.
- 📦 **`.dlofpkg`**: قراءة وكتابة حزم الملف المفرد (`package.dlof` + `meta.json` + `attachments/`).
- 🎞️ **`.dlofSeries`**: قراءة وكتابة حزم السلاسل الكاملة، مع حلّ الحلقة (`loopLinks`) تلقائياً.
- ✅ **تحقق (`validateDlof`)**: يطبّق القواعد الإلزامية في `docs/SPECIFICATION.md`.
- 🖼️ **عارض `dlofpkg`** (`renderViewerHtml`): يبني صفحة HTML واحدة مستقلة تعرض المحتوى، المرفقات، والتصميم المخصّص (template)، بدعم RTL كامل.
- ▶️ **مشغّل `dlof`** (`renderPlayerHtml`): تطبيق HTML/JS تفاعلي واحد لسلسلة/حلقة كاملة — تصفّح جانبي، أزرار التالي/السابق تتبع `loopLinks`، تشغيل الوسائط (`mediaRef`) بشريط تقدّم قابل للسحب، وحفظ آخر موضع تصفح في `localStorage`.
- 🛠️ **CLI باسم `dlof`**: أوامر جاهزة للاستخدام من الطرفية.
- 🗜️ **قارئ/كاتب ZIP خاص بلا اعتماديات** (`readZip` / `writeZip`) مبني فوق `zlib` المدمجة في Node — متوافق تماماً مع أدوات `zip`/`unzip` القياسية.

## التثبيت

```bash
npm install -g dlof     # للاستخدام كأداة سطر أوامر في أي مكان
# أو داخل مشروع:
npm install dlof
```

## سطر الأوامر

```bash
dlof view <file.dlof|file.dlofpkg> [-o out.html]     # يبني عارض HTML
dlof play <file.dlofSeries|folder>  [-o out.html]     # يبني مشغّل HTML تفاعلي
dlof validate <file.dlof>                             # تحقق من الصحة
dlof pack <package.dlof> [-o out.dlofpkg]             # تحزيم ملف dlof واحد
dlof pack-series <folder> [-o out.dlofSeries]         # تحزيم مجلد سلسلة
dlof unpack <file.dlofpkg|file.dlofSeries> <outDir>   # فك الضغط
```

أمثلة:

```bash
dlof view ep01.dlofpkg -o ep01.html
dlof play MySeries.dlofSeries -o player.html
dlof play ./MySeries -o player.html      # مجلد سلسلة غير مضغوط أيضاً مدعوم
dlof validate ch01.dlof
```

## الاستخدام البرمجي

```ts
import {
  parseDlof, serializeDlof, validateDlof,
  readDlofPkg, writeDlofPkg,
  readDlofSeries, writeDlofSeries,
  renderViewerHtml, renderPlayerHtml,
  resolveLoopChain,
} from "dlof";
import * as fs from "fs";

// تحليل ملف .dlof
const doc = parseDlof(fs.readFileSync("ch01.dlof", "utf8"));
console.log(doc.metadata.title, doc.loopLinks.next?.ref);

// التحقق
const result = validateDlof(doc);
if (!result.valid) console.error(result.issues);

// قراءة حزمة .dlofpkg وبناء عارض HTML منها
const pkg = readDlofPkg(fs.readFileSync("ep01.dlofpkg"));
fs.writeFileSync("ep01.view.html", renderViewerHtml(pkg));

// قراءة سلسلة كاملة وبناء مشغّل تفاعلي
const series = readDlofSeries(fs.readFileSync("MySeries.dlofSeries"));
fs.writeFileSync("player.html", renderPlayerHtml(series));

// حلّ سلسلة التنقّل يدوياً (previous/next) بلا بناء عارض
const chain = resolveLoopChain(series.documents, series.rootFileName);
chain.forEach((e) => console.log(e.fileName, "->", e.document.metadata.title));
```

## البنية المعمارية

```
src/
  types.ts            الأنواع المطابقة لـ docs/SPECIFICATION.md
  xml/                محلّل ومُصدِّر XML خاص (بلا اعتماديات)
  dlof/               تحليل، تصدير، والتحقق من ملفات .dlof
  zip/                قارئ وكاتب ZIP خاص (يستخدم zlib المدمجة فقط)
  packages/           قراءة/كتابة .dlofpkg و .dlofSeries
  loop/                حلّ سلسلة الحلقة (previous/next) عبر loopLinks
  viewer/             عارض HTML لمستند/حزمة واحدة
  player/             مشغّل HTML تفاعلي لسلسلة/حلقة كاملة
  cli.ts              أداة سطر الأوامر
```

## ملاحظات

- الصفحات الناتجة (عارض/مشغّل) ملفات HTML **مستقلة تماماً** — تُفتح مباشرة في أي متصفح، ولا تحتاج خادماً.
- المشغّل يضمّن ملفات الوسائط (فيديو/صوت) كـ `data:` URL إذا كان حجمها أقل من 20 ميجابايت افتراضياً (قابل للتغيير عبر `PlayerOptions.maxInlineMediaBytes`)، وإلا يعرض إشارة مرجعية فقط.
- يتماشى تنفيذ ZIP مع مواصفة PKZIP القياسية (رؤوس ملفات محلية + فهرس مركزي + EOCD)، ويدعم أسلوبي STORE و DEFLATE، وهو ما تتطلبه كل من `.dlofpkg` و `.dlofSeries`.

## الترخيص

MIT
