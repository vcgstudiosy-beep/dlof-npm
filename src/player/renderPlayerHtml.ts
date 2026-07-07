import { DlofSeries, DocumentLoop } from "../types";
import { baseCss, escapeHtml, loopLogoSvg, resolveTheme } from "../viewer/theme";
import { renderDocumentCard } from "../viewer/renderContent";
import { resolveLoopChain } from "../loop/loopUtils";
import { CONTENT_KIND_INFO, domainLabel } from "../viewer/brand";

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
 * مشغّل dlof: يبني تطبيق HTML/JS تفاعلي واحد لسلسلة أو حلقة كاملة من ملفات .dlof،
 * بنفس الهوية البصرية لتطبيق DLoF الأصلي. يوفر: قائمة "الملفات" الجانبية (مطابقة
 * لشاشة "ملفاتي" في التطبيق: بطاقات بأيقونة/لون حسب نوع المحتوى، شارة المجال،
 * وبحث فوري)، أزرار التالي/السابق (تتبع loopLinks)، تشغيل الوسائط المرجعية
 * (mediaRef / mediaFolder) مع شريط تقدّم قابل للسحب، وحفظ آخر موضع تصفح في
 * التخزين المحلي للمتصفح بين الجلسات.
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

    const kindInfo = CONTENT_KIND_INFO[document.content.kind] ?? CONTENT_KIND_INFO.genericItem;
    const navLabel =
      document.content.kind === "episodeItem" ? document.content.episodeTitle : document.metadata.title;

    return {
      fileName,
      title: document.metadata.title,
      navLabel: navLabel || document.metadata.title || fileName,
      domain: domainLabel(document.metadata.domain),
      kindIcon: kindInfo.icon,
      kindColor: kindInfo.color,
      duration: document.content.kind === "episodeItem" ? document.content.duration ?? 0 : 0,
      cardHtml: renderDocumentCard(document, theme.layout),
      mediaHtml,
      hasMedia: !!mediaHtml && mediaHtml.includes('data-role="media"'),
    };
  });

  // ── قائمة "الملفات" الجانبية — بطاقات مطابقة لشاشة ملفاتي في التطبيق الأصلي ──
  const navListHtml = items
    .map(
      (it, idx) => `<li data-index="${idx}" data-search="${escapeHtml(
        (it.navLabel + " " + it.domain).toLowerCase()
      )}" class="file-card nav-item${idx === 0 ? " active" : ""}" role="button" tabindex="0">
        <div class="file-icon" style="background:${it.kindColor}22;color:${it.kindColor}">${it.kindIcon}</div>
        <div class="file-info">
          <div class="file-name">${escapeHtml(it.navLabel)}</div>
          <div class="file-meta"><span>${idx + 1} / ${items.length}</span><span>${escapeHtml(it.domain)}</span></div>
        </div>
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
    .layout { display: flex; gap: 22px; align-items: flex-start; }
    .sidebar {
      width: 260px; flex-shrink: 0; max-height: 80vh; overflow-y: auto;
      border-inline-start: 1px solid var(--border); padding-inline-start: 14px;
    }
    .files-search {
      width: 100%; padding: 9px 12px; margin-bottom: 10px;
      border-radius: 10px; border: 1px solid var(--border);
      background: var(--surface); color: var(--text); font-family: var(--font); font-size: .85rem;
    }
    .nav-item { cursor: pointer; margin-bottom: 8px; }
    .nav-item:hover { border-color: var(--primary); }
    .nav-item.active { background: var(--primary); border-color: var(--primary); }
    .nav-item.active .file-name, .nav-item.active .file-meta { color: #fff; }
    .nav-item.active .file-icon { background: rgba(255,255,255,.25) !important; color: #fff !important; }
    .nav-item[hidden] { display: none !important; }
    ul#navList { padding: 0; margin: 0; list-style: none; }
    .main { flex: 1; min-width: 0; }
    .player-media { width: 100%; border-radius: 14px; background: #000; margin-bottom: 4px; }
    .progress-wrap { margin-bottom: 16px; }
    .seek { width: 100%; accent-color: var(--primary); }
    .time-row { display: flex; justify-content: space-between; font-size: .75rem; color: var(--muted); }

    /* ── شريط تقدّم الحلقات — يعرض الموضع الحالي ضمن كامل الحلقة ويُسحب للانتقال مباشرة ── */
    .loop-progress { margin: 2px 0 22px; user-select: none; }
    .loop-progress-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
    .loop-progress-label { font-size: .78rem; color: var(--muted); font-weight: 600; transition: color .15s; }
    .loop-progress-label.dragging { color: var(--secondary); }
    .loop-progress-count {
      font-size: .8rem; font-weight: 800; color: var(--secondary);
      background: color-mix(in srgb, var(--secondary) 16%, transparent);
      border-radius: 20px; padding: 2px 11px;
    }
    .loop-progress-track {
      position: relative; height: 10px; border-radius: 999px;
      background: var(--surface-variant); cursor: pointer; touch-action: none;
    }
    .loop-progress-fill {
      position: absolute; inset-inline-start: 0; top: 0; bottom: 0; width: 0%;
      border-radius: 999px;
      background: linear-gradient(90deg, var(--primary), var(--secondary));
    }
    .loop-progress-thumb {
      position: absolute; top: 50%; inset-inline-start: 0%;
      width: 18px; height: 18px; border-radius: 50%;
      background: #fff; border: 3px solid var(--primary);
      box-shadow: 0 1px 5px rgba(0,0,0,.35);
      transform: translate(-50%, -50%); transition: transform .15s;
    }
    .loop-progress-thumb.dragging { transform: translate(-50%, -50%) scale(1.35); border-color: var(--secondary); }
    @media (max-width: 720px) {
      .layout { flex-direction: column; }
      .sidebar { width: 100%; max-height: 260px; border-inline-start: none; border-bottom: 1px solid var(--border); padding-bottom: 10px; }
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
    const searchInput = document.getElementById("filesSearch");
    const progressTrack = document.getElementById("loopProgressTrack");
    const progressFill = document.getElementById("loopProgressFill");
    const progressThumb = document.getElementById("loopProgressThumb");
    const progressLabel = document.querySelector('[data-role="progress-label"]');
    const progressCount = document.querySelector('[data-role="progress-count"]');
    let progressDragging = false;

    function fmt(t) {
      if (!isFinite(t)) return "0:00";
      const m = Math.floor(t / 60), s = Math.floor(t % 60);
      return m + ":" + String(s).padStart(2, "0");
    }

    function setProgressVisual(frac) {
      if (!progressTrack) return;
      const pct = Math.round(frac * 1000) / 10 + "%";
      progressFill.style.width = pct;
      progressThumb.style.insetInlineStart = pct;
    }

    function syncProgressBar(index) {
      if (!progressTrack) return;
      const frac = total > 1 ? index / (total - 1) : 0;
      setProgressVisual(frac);
      progressCount.textContent = (index + 1) + "/" + total;
    }

    function fracFromClientX(clientX) {
      const rect = progressTrack.getBoundingClientRect();
      // اتجاه الصفحة RTL: بداية الحلقة (الحلقة 1) تقع أقصى اليمين
      return Math.min(1, Math.max(0, (rect.right - clientX) / rect.width));
    }
    function indexFromFrac(frac) {
      return Math.round(frac * (total - 1));
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
      syncProgressBar(index);
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
    navItems.forEach((el) => el.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); goTo(Number(el.dataset.index)); }
    }));
    prevBtn.addEventListener("click", () => goTo(current - 1));
    nextBtn.addEventListener("click", () => goTo(current + 1));
    document.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") goTo(current - 1); // RTL: يمين = السابق
      if (e.key === "ArrowLeft") goTo(current + 1);  // RTL: يسار = التالي
    });

    if (searchInput) {
      searchInput.addEventListener("input", () => {
        const q = searchInput.value.trim().toLowerCase();
        navItems.forEach((el) => {
          const matches = !q || (el.dataset.search || "").includes(q);
          el.hidden = !matches;
        });
      });
    }

    if (progressTrack) {
      const startDrag = (e) => {
        progressDragging = true;
        progressTrack.setPointerCapture(e.pointerId);
        progressLabel.classList.add("dragging");
        progressThumb.classList.add("dragging");
        progressLabel.textContent = "اسحب للانتقال إلى حلقة أخرى";
        const frac = fracFromClientX(e.clientX);
        setProgressVisual(frac);
        progressCount.textContent = (indexFromFrac(frac) + 1) + "/" + total;
      };
      const moveDrag = (e) => {
        if (!progressDragging) return;
        const frac = fracFromClientX(e.clientX);
        setProgressVisual(frac);
        progressCount.textContent = (indexFromFrac(frac) + 1) + "/" + total;
      };
      const endDrag = (e) => {
        if (!progressDragging) return;
        progressDragging = false;
        progressLabel.classList.remove("dragging");
        progressThumb.classList.remove("dragging");
        progressLabel.textContent = "تقدّم الحلقات";
        goTo(indexFromFrac(fracFromClientX(e.clientX)));
      };
      progressTrack.addEventListener("pointerdown", startDrag);
      progressTrack.addEventListener("pointermove", moveDrag);
      progressTrack.addEventListener("pointerup", endDrag);
      progressTrack.addEventListener("pointercancel", endDrag);
    }

    // استئناف آخر موضع تصفح محفوظ
    try {
      const data = JSON.parse(localStorage.getItem(STATE_KEY) || "{}");
      if (typeof data.lastIndex === "number") goTo(data.lastIndex);
      else { setupMedia(panels[0]); syncProgressBar(0); }
    } catch (e) { setupMedia(panels[0]); syncProgressBar(0); }
    prevBtn.disabled = current === 0;
    nextBtn.disabled = current === total - 1;
  `;

  const header = `<header class="dlof-header">
      ${loopLogoSvg(36, "var(--secondary)", "var(--primary)")}
      <div>
        <div class="logo-title">DLoF <span class="accent">Player</span></div>
        <div class="logo-sub">${escapeHtml(title)}</div>
      </div>
      <div style="margin-inline-start:auto">
        <span class="badge">${items.length} ملف</span>
      </div>
    </header>`;

  const loopProgressHtml =
    items.length > 1
      ? `<div class="loop-progress">
          <div class="loop-progress-head">
            <span class="loop-progress-label" data-role="progress-label">تقدّم الحلقات</span>
            <span class="loop-progress-count" data-role="progress-count">1/${items.length}</span>
          </div>
          <div class="loop-progress-track" id="loopProgressTrack">
            <div class="loop-progress-fill" id="loopProgressFill"></div>
            <div class="loop-progress-thumb" id="loopProgressThumb"></div>
          </div>
        </div>`
      : "";

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
    ${header}
    ${loopProgressHtml}
    <div class="layout">
      <aside class="sidebar">
        <div class="files-section-title">📁 الملفات</div>
        <input id="filesSearch" class="files-search" type="search" placeholder="بحث في الملفات…"/>
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
