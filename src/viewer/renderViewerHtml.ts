import { DlofPkg, DocumentLoop } from "../types";
import { baseCss, escapeHtml, resolveTheme } from "./theme";
import { renderDocumentCard } from "./renderContent";
import { validateDlof } from "../dlof/validate";

export interface ViewerOptions {
  /** يعرض تحذيرات التحقق أسفل البطاقة إن وُجدت (افتراضي: true) */
  showValidation?: boolean;
}

/**
 * عارض dlofpkg / dlof: يبني صفحة HTML مستقلة واحدة (بلا اعتماديات خارجية)
 * تعرض بيانات meta.json الوصفية، محتوى المستند، مرفقاته، وتصميمه المخصّص (template).
 * الصفحة الناتجة قابلة للفتح مباشرة في أي متصفح دون خادم.
 */
export function renderViewerHtml(input: DlofPkg | DocumentLoop, options: ViewerOptions = {}): string {
  const doc: DocumentLoop = "document" in input ? input.document : input;
  const meta = "meta" in input ? input.meta : undefined;
  const theme = resolveTheme(doc.template);
  const validation = validateDlof(doc);
  const showValidation = options.showValidation ?? true;

  const issuesHtml =
    showValidation && validation.issues.length
      ? `<div class="card minimal" style="border:1px dashed ${
          validation.valid ? "#999" : "#c62828"
        }">
          <strong>${validation.valid ? "ملاحظات التحقق" : "أخطاء في الملف"}</strong>
          <ul>${validation.issues
            .map((i) => `<li>[${i.level === "error" ? "خطأ" : "تنبيه"}] ${escapeHtml(i.message)}</li>`)
            .join("")}</ul>
        </div>`
      : "";

  const packageInfo = meta
    ? `<div class="meta-row">حزمة dlofpkg · الإصدار ${escapeHtml(meta.dlofpkg_version)} · المعرّف: ${escapeHtml(
        meta.id
      )}</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="${escapeHtml(doc.metadata.language ?? "ar")}" dir="rtl">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${escapeHtml(doc.metadata.title || "عارض DLoF")}</title>
<style>${baseCss(theme)}</style>
</head>
<body>
  <div class="app">
    <div class="badge">DLoF Viewer</div>
    ${packageInfo}
    ${renderDocumentCard(doc, theme.layout)}
    ${issuesHtml}
  </div>
</body>
</html>`;
}
