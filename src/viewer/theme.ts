import { Template } from "../types";
import { BRAND_DARK, BRAND_LIGHT, loopLogoSvg } from "./brand";

export interface ResolvedTheme {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  fontFamily: string;
  layout: string;
  /** true إذا حدّد المستند قالباً مخصّصاً صراحةً (يوقف التبديل التلقائي بين الوضع الليلي/النهاري) */
  custom: boolean;
}

const FONT_STACKS: Record<string, string> = {
  serif: "'Amiri', 'Noto Naskh Arabic', Georgia, serif",
  "sans-serif": "'Tajawal', 'IBM Plex Sans Arabic', 'Segoe UI', sans-serif",
  monospace: "'Cascadia Code', 'Courier New', monospace",
  cursive: "'Aref Ruqaa', cursive",
};

/**
 * يحلّ القالب النهائي: إذا حدّد المستند تصميماً مخصّصاً (template) صراحةً، يُستخدم
 * حرفياً (تماماً كما في تطبيق Android الأصلي عند وجود template.backgroundColor/
 * textColor/primaryColor). بخلاف ذلك تُستخدم هوية DLoF الرسمية (Copper/Moss)
 * كافتراضية، مع دعم تلقائي للوضع الليلي حسب تفضيل نظام المستخدم.
 */
export function resolveTheme(template?: Template): ResolvedTheme {
  const t = template ?? {};
  const custom = Boolean(t.primaryColor || t.secondaryColor || t.backgroundColor || t.textColor);
  const fontFamily = t.fontFamily ? FONT_STACKS[t.fontFamily] ?? t.fontFamily : FONT_STACKS["sans-serif"];
  return {
    primaryColor: t.primaryColor ?? BRAND_LIGHT.primary,
    secondaryColor: t.secondaryColor ?? BRAND_LIGHT.secondary,
    backgroundColor: t.backgroundColor ?? BRAND_LIGHT.background,
    textColor: t.textColor ?? BRAND_LIGHT.text,
    fontFamily,
    layout: t.layout ?? "standard",
    custom,
  };
}

/** يبني كتلة CSS أساسية مشتركة بين العارض والمشغّل، بهوية DLoF البصرية الرسمية ودعم RTL كامل */
export function baseCss(theme: ResolvedTheme): string {
  const darkOverride = theme.custom
    ? ""
    : `
    @media (prefers-color-scheme: dark) {
      :root {
        --primary: ${BRAND_DARK.primary};
        --secondary: ${BRAND_DARK.secondary};
        --bg: ${BRAND_DARK.background};
        --surface: ${BRAND_DARK.surface};
        --surface-variant: ${BRAND_DARK.surfaceVariant};
        --text: ${BRAND_DARK.text};
        --muted: ${BRAND_DARK.muted};
        --border: ${BRAND_DARK.border};
      }
    }`;

  return `
    :root {
      --primary: ${theme.primaryColor};
      --secondary: ${theme.secondaryColor};
      --bg: ${theme.backgroundColor};
      --surface: color-mix(in srgb, ${theme.backgroundColor} 92%, #fff 8%);
      --surface-variant: color-mix(in srgb, ${theme.backgroundColor} 85%, #000 6%);
      --text: ${theme.textColor};
      --muted: color-mix(in srgb, ${theme.textColor} 60%, transparent);
      --border: color-mix(in srgb, ${theme.textColor} 90%, transparent);
      --font: ${theme.fontFamily};
    }
    ${darkOverride}
    * { box-sizing: border-box; }
    html, body {
      margin: 0; padding: 0;
      background: var(--bg);
      color: var(--text);
      font-family: var(--font);
      direction: rtl;
    }
    body { min-height: 100vh; }
    a { color: var(--primary); }
    .app { max-width: 900px; margin: 0 auto; padding: 0 20px 64px; }

    /* ── الترويسة: شعار الحلقة + العنوان ── */
    .dlof-header {
      display: flex; align-items: center; gap: 14px;
      padding: 18px 4px 14px;
      border-bottom: 1px solid var(--border);
      margin-bottom: 20px;
    }
    .dlof-header .logo-title { font-size: 1.15rem; font-weight: 800; letter-spacing: .01em; }
    .dlof-header .logo-title .accent { color: var(--secondary); }
    .dlof-header .logo-sub { font-size: .78rem; color: var(--muted); margin-top: 2px; }

    .badge {
      display: inline-flex; align-items: center; gap: 4px;
      background: var(--primary); color: #fff;
      border-radius: 999px; padding: 3px 12px; font-size: .72rem; font-weight: 600;
      margin-inline-end: 6px;
    }
    .badge.outline {
      background: transparent; color: var(--secondary);
      border: 1.4px solid var(--secondary);
    }
    .badge.ghost { background: var(--surface-variant); color: var(--text); font-weight: 500; }

    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 20px 22px;
      box-shadow: 0 1px 3px rgba(0,0,0,.06);
      margin-bottom: 18px;
    }
    .card.magazine { border-inline-start: 6px solid var(--primary); }
    .card.minimal { box-shadow: none; background: transparent; padding: 8px 0; border: none; }

    h1 { font-size: 1.55rem; margin: .25em 0; }
    h2 { font-size: 1.15rem; color: var(--primary); }
    .meta-row {
      display: flex; flex-wrap: wrap; align-items: center; gap: 8px;
      font-size: .82rem; color: var(--muted); margin-bottom: 12px;
    }
    .tag { font-size: .8rem; color: var(--muted); margin-inline-end: 8px; }
    .body-text { white-space: pre-wrap; line-height: 1.9; }

    /* ── قائمة "الملفات" — بطاقات مطابقة لشاشة ملفاتي في تطبيق Android ── */
    .files-section-title {
      font-size: .78rem; font-weight: 700; color: var(--muted);
      letter-spacing: .04em; margin: 22px 2px 10px;
    }
    .file-card {
      display: flex; align-items: center; gap: 12px;
      background: var(--surface); border: 1px solid var(--border);
      border-radius: 14px; padding: 12px 14px; margin-bottom: 8px;
      text-decoration: none; color: inherit;
    }
    .file-card .file-icon {
      flex-shrink: 0; width: 42px; height: 42px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center; font-size: 1.25rem;
    }
    .file-card .file-info { flex: 1; min-width: 0; }
    .file-card .file-name {
      font-weight: 600; font-size: .95rem;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .file-card .file-meta { font-size: .76rem; color: var(--muted); margin-top: 2px; display: flex; gap: 8px; }
    .attachment-preview { margin: 10px 0 18px; }
    .attachment-preview img { max-width: 100%; border-radius: 12px; }
    .attachment-preview video, .attachment-preview audio { width: 100%; border-radius: 12px; }
    .attachment-caption { font-size: .78rem; color: var(--muted); margin-top: 4px; }

    .footer-nav { display: flex; justify-content: space-between; gap: 12px; margin-top: 24px; }
    .nav-btn {
      flex: 1; text-align: center; padding: 13px 16px;
      background: var(--primary); color: #fff; border-radius: 12px;
      text-decoration: none; font-weight: 700; cursor: pointer; border: none;
      font-family: var(--font); font-size: .95rem;
      display: flex; align-items: center; justify-content: center; gap: 6px;
    }
    .nav-btn.secondary { background: var(--secondary); color: var(--text); }
    .nav-btn:disabled { opacity: .35; cursor: not-allowed; }
  `;
}

export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export { loopLogoSvg };
