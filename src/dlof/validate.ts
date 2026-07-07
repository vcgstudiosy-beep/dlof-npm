import { DocumentLoop } from "../types";

export interface ValidationIssue {
  level: "error" | "warning";
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

const VALID_DOMAINS = ["education", "book", "infoApp", "infoLoop", "series", "custom"];
const VALID_ATTACHMENT_KINDS = ["image", "video", "file"];
const MAX_INLINE_ATTACHMENT_BYTES = 15 * 1024 * 1024; // 15MB، كما توصي المواصفة

/** يتحقق من مستند DLoF مقابل قواعد المواصفة الإلزامية (docs/SPECIFICATION.md) */
export function validateDlof(doc: DocumentLoop): ValidationResult {
  const issues: ValidationIssue[] = [];
  const err = (message: string) => issues.push({ level: "error", message });
  const warn = (message: string) => issues.push({ level: "warning", message });

  if (!doc.version) err("الصفة version مفقودة على <documentLoop>");
  if (!doc.id) err("الصفة id مفقودة على <documentLoop>");

  if (!doc.metadata.title) err("العنصر <title> مطلوب داخل <metadata>");
  if (!doc.metadata.domain) {
    err("العنصر <domain> مطلوب داخل <metadata>");
  } else if (!VALID_DOMAINS.includes(doc.metadata.domain)) {
    warn(
      `قيمة domain "${doc.metadata.domain}" غير معروفة (المتوقع أحد: ${VALID_DOMAINS.join(", ")})`
    );
  }

  if (!doc.loopLinks.previous && !doc.loopLinks.next) {
    warn("لا يوجد previous ولا next: هذا المستند حلقة وحيدة معزولة");
  }

  switch (doc.content.kind) {
    case "qaItem":
      if (!doc.content.question) err("qaItem: العنصر <question> مطلوب");
      if (!doc.content.answer) err("qaItem: العنصر <answer> مطلوب");
      break;
    case "bookChapter":
      if (!doc.content.chapterTitle) err("bookChapter: العنصر <chapterTitle> مطلوب");
      if (!doc.content.text) err("bookChapter: العنصر <text> مطلوب");
      break;
    case "termDefinition":
      if (!doc.content.term) err("termDefinition: العنصر <term> مطلوب");
      if (!doc.content.definition) err("termDefinition: العنصر <definition> مطلوب");
      break;
    case "infoExplain":
      if (!doc.content.topic) err("infoExplain: العنصر <topic> مطلوب");
      if (!doc.content.explanation) err("infoExplain: العنصر <explanation> مطلوب");
      break;
    case "episodeItem":
      if (!doc.content.episodeTitle) err("episodeItem: العنصر <episodeTitle> مطلوب");
      break;
  }

  for (const a of doc.attachments ?? []) {
    if (!a.id) err("attachment: الصفة id مطلوبة");
    if (!a.fileName) err("attachment: الصفة fileName مطلوبة");
    if (!VALID_ATTACHMENT_KINDS.includes(a.kind)) {
      warn(`attachment "${a.id}": قيمة kind "${a.kind}" غير معروفة`);
    }
    if (!a.data && !a.uri) {
      err(`attachment "${a.id}": يجب توفير <data> أو <uri>`);
    }
    if (a.data) {
      const approxBytes = Math.floor((a.data.length * 3) / 4);
      if (approxBytes > MAX_INLINE_ATTACHMENT_BYTES) {
        warn(
          `attachment "${a.id}": الحجم التقريبي ${(approxBytes / 1024 / 1024).toFixed(
            1
          )}MB يتجاوز الحد الموصى به (15MB) للتضمين المباشر`
        );
      }
    }
  }

  return { valid: !issues.some((i) => i.level === "error"), issues };
}
