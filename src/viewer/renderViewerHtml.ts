import { DlofPkg, DocumentLoop } from "../types";
import { baseCss, escapeHtml, loopLogoSvg, resolveTheme } from "./theme";
import { renderDocumentCard } from "./renderContent";
import { validateDlof } from "../dlof/validate";
import { domainLabel } from "./brand";

export interface ViewerOptions {
  /** يعرض تحذيرات التحقق أسفل البطاقة إن وُجدت (افتراضي: true) */
  showValidation?: boolean;
}

/**
 * عارض dlofpkg / dlof: يبني صفحة HTML مستقلة واحدة (بلا اعتماديات خارجية)
 * بنفس الهوية البصرية لتطبيق DLoF الأصلي (الشعار، الألوان، بطاقات الملفات)،
 * تعرض بيانات meta.json الوصفية، محتوى المستند، مرفقاته كبطاقات ملفات، وتصميمه
 * المخصّص (template) إن وُجد. الصفحة الناتجة قابلة للفتح مباشرة في أي متصفح دون خادم.
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
          validation.valid ? "var(--muted)" : "#c62828"
        }; margin-top:8px">
          <strong>${validation.valid ? "ملاحظات التحقق" : "أخطاء في الملف"}</strong>
          <ul>${validation.issues
            .map((i) => `<li>[${i.level === "error" ? "خطأ" : "تنبيه"}] ${escapeHtml(i.message)}</li>`)
            .join("")}</ul>
        </div>`
      : "";

  const packageInfo = meta
    ? `<div class="meta-row"><span class="badge ghost">حزمة dlofpkg</span><span>الإصدار ${escapeHtml(
        meta.dlofpkg_version
      )}</span><span>المعرّف: ${escapeHtml(meta.id)}</span></div>`
    : "";

  const header = `<header class="dlof-header">
      ${loopLogoSvg(36, "var(--secondary)", "var(--primary)")}
      <div>
        <div class="logo-title">DLoF <span class="accent">Viewer</span></div>
        <div class="logo-sub">صيغة حلقة المستندات المستودعة</div>
      </div>
      <div style="margin-inline-start:auto;display:flex;gap:6px">
        <span class="badge">${escapeHtml(domainLabel(doc.metadata.domain))}</span>
        ${doc.loopLinks.loopRoot ? `<span class="badge outline">بداية الحلقة</span>` : ""}
      </div>
    </header>`;

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
    ${header}
    ${packageInfo}
    ${renderDocumentCard(doc, theme.layout)}
    ${issuesHtml}
  </div>
</body>
</html>`;
}
