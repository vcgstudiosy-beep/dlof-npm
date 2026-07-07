/**
 * الهوية البصرية الرسمية لـ DLoF — مطابقة لتطبيق Android الأصلي (ui/theme/Theme.kt)
 * ولأداة web-signature (App.jsx): أخضر داكن "Copper" كلون أساسي، ذهبي/برتقالي
 * "Moss" كلون ثانوي، وخلفية حبرية للوضع الليلي. تُستخدم هذه الألوان كافتراضيات
 * لعارض HTML ومشغّل الحلقات في حزمة npm، بحيث يظهر الناتج بنفس هوية DLoF الأصلية.
 */

export const BRAND_LIGHT = {
  primary: "#1D7A3F", // DlofCopper
  secondary: "#D2A020", // DlofMoss
  background: "#EDEFF7", // DlofParchment
  surface: "#F9FAFD",
  surfaceVariant: "#E3E7F0",
  text: "#0B0B14", // DlofInk
  muted: "#5B5F6E",
  border: "rgba(11,11,20,.10)",
};

export const BRAND_DARK = {
  primary: "#4CC47B",
  secondary: "#E8C24A",
  background: "#0A0A14", // DlofSurfaceDark
  surface: "#15151F",
  surfaceVariant: "#232336",
  text: "#ECEEF6", // DlofInkLight
  muted: "#9A9DB0",
  border: "rgba(236,238,246,.10)",
};

/** شعار الحلقة (نقاط متقطعة + نواة) — نفس شعار أداة web-signature، بلون قابل للتخصيص */
export function loopLogoSvg(size = 34, color = BRAND_LIGHT.secondary, dim?: string): string {
  const d = dim ?? color;
  return `<svg width="${size}" height="${size}" viewBox="0 0 38 38" aria-hidden="true">
    <circle cx="19" cy="19" r="16" fill="none" stroke="${color}" stroke-width="2.5" stroke-dasharray="6 3"/>
    <circle cx="19" cy="19" r="8" fill="${d}" opacity="0.55"/>
    <circle cx="19" cy="19" r="3.5" fill="${color}"/>
    <path d="M19 7 L19 3 M19 35 L19 31 M7 19 L3 19 M35 19 L31 19" stroke="${color}" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`;
}

/** تسميات المجالات بالعربية — مطابقة لـ model/DlofDocument.kt (enum Domain) */
export const DOMAIN_LABELS: Record<string, string> = {
  education: "تعليم",
  book: "كتاب",
  infoApp: "تطبيق معلومات",
  infoLoop: "حلقة معلومات",
  recipe: "وصفة طعام",
  journal: "يوميات",
  series: "مسلسل / سلسلة",
  comic: "قصة مصورة",
  podcast: "بودكاست",
  characters: "شخصيات",
  custom: "مخصص",
};

export function domainLabel(domain?: string): string {
  if (!domain) return DOMAIN_LABELS.custom;
  return DOMAIN_LABELS[domain] ?? domain;
}

/** تسميات وأيقونات وألوان أنواع المحتوى (content kind) — تُستخدم في قوائم الملفات */
export const CONTENT_KIND_INFO: Record<string, { label: string; icon: string; color: string }> = {
  bookChapter: { label: "فصل كتاب", icon: "📖", color: "#6A1B9A" },
  qaItem: { label: "سؤال وجواب", icon: "❓", color: "#0277BD" },
  termDefinition: { label: "تعريف مصطلح", icon: "🔤", color: "#2E7D32" },
  infoExplain: { label: "شرح معلومة", icon: "💡", color: "#D2A020" },
  episodeItem: { label: "حلقة", icon: "🎬", color: "#2D5C6B" },
  genericItem: { label: "عنصر عام", icon: "📄", color: "#455A64" },
};

export interface FileTypeInfo {
  icon: string;
  color: string;
  label: string;
}

/**
 * توزيع أيقونة ولون على امتداد ملف معطى — مطابق لـ FileTypeIcons.kt في تطبيق
 * Android الأصلي (نفس الألوان تقريباً)، لكن بأيقونات نصية (بلا اعتماد خارجي)
 * بدل أيقونات Material كي تعمل الأداة بلا أي اعتماديات.
 */
export function fileTypeInfo(fileName: string, mimeHint?: string): FileTypeInfo {
  const ext = (fileName.split(".").pop() ?? "").toLowerCase();
  const mime = mimeHint ?? "";

  if (ext === "dlof" || ext === "dloftemplate") return { icon: "🔁", color: "#AA5B2E", label: "ملف DLoF" };
  if (ext === "dlofcomic") return { icon: "📚", color: "#4B5D3A", label: "قصة مصورة" };
  if (ext === "dlofvideo") return { icon: "📺", color: "#2D5C6B", label: "مسلسل فيديو" };

  if (mime.startsWith("image/") || ["jpg", "jpeg", "png", "webp", "gif", "bmp", "heic", "svg"].includes(ext))
    return { icon: "🖼️", color: "#2E7D32", label: "صورة" };

  if (mime.startsWith("video/") || ["mp4", "mkv", "webm", "avi", "mov", "3gp"].includes(ext))
    return { icon: "🎬", color: "#6A1B9A", label: "فيديو" };

  if (mime.startsWith("audio/") || ["mp3", "wav", "ogg", "m4a", "flac", "aac"].includes(ext))
    return { icon: "🎵", color: "#0277BD", label: "صوت" };

  if (ext === "pdf") return { icon: "📕", color: "#C62828", label: "PDF" };
  if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) return { icon: "🗜️", color: "#8D6E63", label: "أرشيف" };
  if (["xls", "xlsx", "csv", "tsv"].includes(ext)) return { icon: "📊", color: "#2E7D32", label: "جدول بيانات" };
  if (["json", "xml", "yaml", "yml", "kt", "java", "py", "js", "ts", "html", "css"].includes(ext))
    return { icon: "🧩", color: "#455A64", label: "بيانات/كود" };
  if (["txt", "md", "doc", "docx"].includes(ext)) return { icon: "📃", color: "#1976D2", label: "مستند" };

  return { icon: "📁", color: "#757575", label: "ملف" };
}

/** ينسّق حجم الملف بالبايت إلى نص مقروء بالعربية — مطابق لـ formatFileSize في FileTypeIcons.kt */
export function formatFileSize(bytes?: number): string {
  if (bytes === undefined || bytes === null || Number.isNaN(bytes)) return "";
  if (bytes < 1024) return `${bytes} بايت`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} ك.ب`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} م.ب`;
  const gb = mb / 1024;
  return `${gb.toFixed(2)} غ.ب`;
}
