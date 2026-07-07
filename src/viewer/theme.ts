import { Template } from "../types";

export interface ResolvedTheme {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  fontFamily: string;
  layout: string;
}

const DEFAULTS: ResolvedTheme = {
  primaryColor: "#6750A4",
  secondaryColor: "#1E88E5",
  backgroundColor: "#FFFFFF",
  textColor: "#212121",
  fontFamily: "sans-serif",
  layout: "standard",
};

const FONT_STACKS: Record<string, string> = {
  serif: "'Amiri', 'Noto Naskh Arabic', Georgia, serif",
  "sans-serif": "'Tajawal', 'IBM Plex Sans Arabic', 'Segoe UI', sans-serif",
  monospace: "'Cascadia Code', 'Courier New', monospace",
  cursive: "'Aref Ruqaa', cursive",
};

export function resolveTheme(template?: Template): ResolvedTheme {
  const t = template ?? {};
  const fontFamily = t.fontFamily ? FONT_STACKS[t.fontFamily] ?? t.fontFamily : FONT_STACKS["sans-serif"];
  return {
    primaryColor: t.primaryColor ?? DEFAULTS.primaryColor,
    secondaryColor: t.secondaryColor ?? DEFAULTS.secondaryColor,
    backgroundColor: t.backgroundColor ?? DEFAULTS.backgroundColor,
    textColor: t.textColor ?? DEFAULTS.textColor,
    fontFamily,
    layout: t.layout ?? DEFAULTS.layout,
  };
}

/** يبني كتلة CSS أساسية مشتركة بين العارض والمشغّل، بدعم كامل للـ RTL */
export function baseCss(theme: ResolvedTheme): string {
  return `
    :root {
      --primary: ${theme.primaryColor};
      --secondary: ${theme.secondaryColor};
      --bg: ${theme.backgroundColor};
      --text: ${theme.textColor};
      --font: ${theme.fontFamily};
    }
    * { box-sizing: border-box; }
    html, body {
      margin: 0; padding: 0;
      background: var(--bg);
      color: var(--text);
      font-family: var(--font);
      direction: rtl;
    }
    body { min-height: 100vh; }
    a { color: var(--secondary); }
    .app {
      max-width: 860px;
      margin: 0 auto;
      padding: 24px 20px 64px;
    }
    .badge {
      display: inline-block;
      background: var(--primary);
      color: #fff;
      border-radius: 999px;
      padding: 2px 12px;
      font-size: 12px;
      margin-inline-end: 6px;
    }
    .card {
      background: color-mix(in srgb, var(--bg) 92%, #000 4%);
      border-radius: 16px;
      padding: 20px 22px;
      box-shadow: 0 1px 3px rgba(0,0,0,.08);
      margin-bottom: 18px;
    }
    .card.magazine { border-inline-start: 6px solid var(--primary); }
    .card.minimal { box-shadow: none; background: transparent; padding: 8px 0; }
    h1 { font-size: 1.6rem; margin: .2em 0; }
    h2 { font-size: 1.2rem; color: var(--primary); }
    .meta-row { font-size: .85rem; opacity: .75; margin-bottom: 12px; }
    .tag { font-size: .75rem; opacity: .7; margin-inline-end: 8px; }
    .attachment img { max-width: 100%; border-radius: 12px; margin: 10px 0; }
    .attachment video, .attachment audio { width: 100%; margin: 10px 0; }
    .footer-nav {
      display: flex; justify-content: space-between; gap: 12px;
      margin-top: 24px;
    }
    .nav-btn {
      flex: 1; text-align: center; padding: 12px 16px;
      background: var(--primary); color: #fff; border-radius: 12px;
      text-decoration: none; font-weight: 600; cursor: pointer; border: none;
      font-family: var(--font); font-size: 1rem;
    }
    .nav-btn.secondary { background: var(--secondary); }
    .nav-btn:disabled { opacity: .4; cursor: not-allowed; }
    .body-text { white-space: pre-wrap; line-height: 1.9; }
  `;
}

export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
