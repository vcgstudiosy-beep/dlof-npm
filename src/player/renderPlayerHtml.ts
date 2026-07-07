import { DlofSeries, DocumentLoop } from "../types";
import { baseCss, escapeHtml, resolveTheme } from "../viewer/theme";
import { renderDocumentCard } from "../viewer/renderContent";
import { resolveLoopChain } from "../loop/loopUtils";

export interface PlayerOptions {
  /** الحد الأقصى بالبايت لتضمين ملف وسائط كـ data URL مباشرة داخل الصفحة (افتراضي 20MB) */
  maxInlineMediaBytes?: number;
  title?: string;
}

const DEFAULT_MAX_INLINE = 20 * 1024 * 1024;

const MIME_BY_EXT: Record<string, string> = {
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  mkv: "video/x-matroska",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  m4a: "audio/mp4",
  aac: "audio/aac",
  flac: "audio/flac",
};

function guessMime(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return MIME_BY_EXT[ext] ?? "application/octet-stream";
}

function isVideo(mime: string) {
  return mime.startsWith("video/");
}
function isAudio(mime: string) {
  return mime.startsWith("audio/");
}

/**
 * مشغّل dlof: يبني تطبيق HTML/JS تفاعلي واحد لسلسلة أو حلقة كاملة من ملفات .dlof.
 * يوفر: قائمة تصفح جانبية، أزرار التالي/السابق (تتبع loopLinks)، تشغيل الوسائط
 * المرجعية (mediaRef / mediaFolder) مع شريط تقدّم قابل للسحب، وحفظ آخر موضع
 * تصفح في التخزين المحلي للمتصفح بين الجلسات.
 */
export function renderPlayerHtml(series: DlofSeries, options: PlayerOptions = {}): string {
  const chain = resolveLoopChain(series.documents, series.rootFileName);
  if (!chain.length) {
    throw new Error("لا يمكن بناء المشغّل: لم يُعثر على أي حلقة صالحة من المستندات");
  }
  const maxInline = options.maxInlineMediaBytes ?? DEFAULT_MAX_INLINE;
  const firstDoc = chain[0].document;
  const theme = resolveTheme(firstDoc.template);
  const title = options.title ?? firstDoc.metadata.title ?? series.name;

  const items = chain.map(({ fileName, document }) => {
    let mediaHtml = "";
    const mediaRef = document.content.kind === "episodeItem" ? document.content.mediaRef : undefined;
    if (mediaRef) {
      const normalized = mediaRef.replace(/^\.?\//, "");
      const asset = series.assets[normalized] ?? series.assets[normalized.split("/").pop() ?? ""];
      const mime = guessMime(normalized);
      if (asset && asset.length <= maxInline && (isVideo(mime) || isAudio(mime))) {
        const dataUrl = `data:${mime};base64,${asset.toString("base64")}`;
        mediaHtml = isVideo(mime)
          ? `<video class="player-media" data-role="media" src="${dataUrl}"></video>`
          : `<audio class="player-media" data-role="media" src="${dataUrl}"></audio>`;
      } else if (asset) {
        mediaHtml = `<p class="tag">⚠️ ملف الوسائط "${escapeHtml(
          normalized
        )}" أكبر من الحد المسموح للتضمين المباشر في هذا المشغّل.</p>`;
      } else {
        mediaHtml = `<p class="tag">📁 مرجع وسائط خارجي: ${escapeHtml(normalized)}</p>`;
      }
    }

    return {
      fileName,
      title: document.metadata.title,
      navLabel:
        document.content.kind === "episodeItem"
          ? document.content.episodeTitle
          : document.metadata.title,
      duration: document.content.kind === "episodeItem" ? document.content.duration ?? 0 : 0,
      cardHtml: renderDocumentCard(document, theme.layout),
      mediaHtml,
      hasMedia: !!mediaHtml && mediaHtml.includes('data-role="media"'),
    };
  });

  const navListHtml = items
    .map(
      (it, idx) => `<li data-index="${idx}" class="nav-item${idx === 0 ? " active" : ""}">
        <span class="nav-num">${idx + 1}</span>
        <span class="nav-title">${escapeHtml(it.navLabel || it.title || it.fileName)}</span>
      </li>`
    )
    .join("");

  const panelsHtml = items
    .map(
      (it, idx) => `<section class="panel" data-index="${idx}" style="${idx === 0 ? "" : "display:none"}">
        ${it.mediaHtml}
        ${
          it.hasMedia
            ? `<div class="progress-wrap">
                <input type="range" class="seek" min="0" max="1000" value="0" data-role="seek"/>
                <div class="time-row"><span data-role="current">0:00</span><span data-role="duration">0:00</span></div>
               </div>`
            : ""
        }
        ${it.cardHtml}
      </section>`
    )
    .join("");

  const playerCss = `
    .layout { display: flex; gap: 24px; align-items: flex-start; }
    .sidebar {
      width: 220px; flex-shrink: 0; max-height: 80vh; overflow-y: auto;
      border-inline-start: 1px solid rgba(0,0,0,.08); padding-inline-start: 12px;
    }
    .nav-item {
      display: flex; align-items: center; gap: 8px; padding: 8px 6px;
      border-radius: 10px; cursor: pointer; font-size: .9rem; list-style: none;
    }
    .nav-item:hover { background: rgba(0,0,0,.05); }
    .nav-item.active { background: var(--primary); color: #fff; }
    .nav-num {
      display: inline-flex; align-items: center; justify-content: center;
      width: 22px; height: 22px; border-radius: 50%; background: rgba(0,0,0,.08);
      font-size: .75rem; flex-shrink: 0;
    }
    .nav-item.active .nav-num { background: rgba(255,255,255,.3); }
    ul#navList { padding: 0; margin: 0; }
    .main { flex: 1; min-width: 0; }
    .player-media { width: 100%; border-radius: 14px; background: #000; margin-bottom: 4px; }
    .progress-wrap { margin-bottom: 16px; }
    .seek { width: 100%; accent-color: var(--primary); }
    .time-row { display: flex; justify-content: space-between; font-size: .75rem; opacity: .7; }
    @media (max-width: 720px) {
      .layout { flex-direction: column; }
      .sidebar { width: 100%; max-height: 220px; border-inline-start: none; border-bottom: 1px solid rgba(0,0,0,.08); padding-bottom: 8px; }
    }
  `;

  const script = `
    const STATE_KEY = "dlof-player-progress::${escapeHtml(series.name)}";
    let current = 0;
    const total = ${items.length};
    const navItems = document.querySelectorAll(".nav-item");
    const panels = document.querySelectorAll(".panel");
    const prevBtn = document.getElementById("prevBtn");
    const nextBtn = document.getElementById("nextBtn");

    function fmt(t) {
      if (!isFinite(t)) return "0:00";
      const m = Math.floor(t / 60), s = Math.floor(t % 60);
      return m + ":" + String(s).padStart(2, "0");
    }

    function setupMedia(panel) {
      const media = panel.querySelector('[data-role="media"]');
      const seek = panel.querySelector('[data-role="seek"]');
      const curEl = panel.querySelector('[data-role="current"]');
      const durEl = panel.querySelector('[data-role="duration"]');
      if (!media || !seek) return;
      let seeking = false;
      media.addEventListener("loadedmetadata", () => { durEl.textContent = fmt(media.duration); });
      media.addEventListener("timeupdate", () => {
        if (!seeking) seek.value = String(Math.floor((media.currentTime / (media.duration || 1)) * 1000));
        curEl.textContent = fmt(media.currentTime);
        savePosition(media.currentTime);
      });
      seek.addEventListener("input", () => { seeking = true; });
      seek.addEventListener("change", () => {
        media.currentTime = (Number(seek.value) / 1000) * (media.duration || 0);
        seeking = false;
      });
      media.addEventListener("ended", () => { if (current < total - 1) goTo(current + 1); });
    }

    function savePosition(t) {
      try {
        const data = JSON.parse(localStorage.getItem(STATE_KEY) || "{}");
        data[current] = t;
        data.lastIndex = current;
        localStorage.setItem(STATE_KEY, JSON.stringify(data));
      } catch (e) {}
    }

    function goTo(index) {
      if (index < 0 || index >= total) return;
      current = index;
      navItems.forEach((el) => el.classList.toggle("active", Number(el.dataset.index) === index));
      panels.forEach((el) => {
        const match = Number(el.dataset.index) === index;
        el.style.display = match ? "" : "none";
        if (match) setupMedia(el);
      });
      prevBtn.disabled = index === 0;
      nextBtn.disabled = index === total - 1;
      try {
        const data = JSON.parse(localStorage.getItem(STATE_KEY) || "{}");
        data.lastIndex = index;
        localStorage.setItem(STATE_KEY, JSON.stringify(data));
        const media = panels[index].querySelector('[data-role="media"]');
        if (media && data[index]) media.currentTime = data[index];
      } catch (e) {}
      panels[index].scrollIntoView({ behavior: "smooth", block: "start" });
    }

    navItems.forEach((el) => el.addEventListener("click", () => goTo(Number(el.dataset.index))));
    prevBtn.addEventListener("click", () => goTo(current - 1));
    nextBtn.addEventListener("click", () => goTo(current + 1));
    document.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") goTo(current - 1); // RTL: يمين = السابق
      if (e.key === "ArrowLeft") goTo(current + 1);  // RTL: يسار = التالي
    });

    // استئناف آخر موضع تصفح محفوظ
    try {
      const data = JSON.parse(localStorage.getItem(STATE_KEY) || "{}");
      if (typeof data.lastIndex === "number") goTo(data.lastIndex);
      else setupMedia(panels[0]);
    } catch (e) { setupMedia(panels[0]); }
    prevBtn.disabled = current === 0;
    nextBtn.disabled = current === total - 1;
  `;

  return `<!DOCTYPE html>
<html lang="${escapeHtml(firstDoc.metadata.language ?? "ar")}" dir="rtl">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${escapeHtml(title)} — مشغّل DLoF</title>
<style>${baseCss(theme)}${playerCss}</style>
</head>
<body>
  <div class="app">
    <div class="badge">DLoF Player</div>
    <h1 style="margin-top:6px">${escapeHtml(title)}</h1>
    <div class="layout">
      <aside class="sidebar">
        <ul id="navList">${navListHtml}</ul>
      </aside>
      <main class="main">
        ${panelsHtml}
        <div class="footer-nav">
          <button id="prevBtn" class="nav-btn">◀ السابق</button>
          <button id="nextBtn" class="nav-btn secondary">التالي ▶</button>
        </div>
      </main>
    </div>
  </div>
  <script>${script}</script>
</body>
</html>`;
}
