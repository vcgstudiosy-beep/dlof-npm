import { Attachment, DocumentLoop } from "../types";
import { escapeHtml } from "./theme";
import { CONTENT_KIND_INFO, fileTypeInfo, formatFileSize } from "./brand";

function attachmentSrc(a: Attachment): string | undefined {
  if (a.data) return `data:${a.mimeType};base64,${a.data}`;
  if (a.uri) return a.uri;
  return undefined;
}

/** يعرض مرفقاً واحداً كبطاقة ملف (أيقونة + اسم + حجم)، مطابقة لشكل بطاقة الملف
 *  في شاشة "ملفاتي" بتطبيق DLoF الأصلي، مع معاينة مضمّنة أسفلها للصور والفيديو. */
function renderAttachment(a: Attachment): string {
  const src = attachmentSrc(a);
  const info = fileTypeInfo(a.fileName, a.mimeType);
  const size = formatFileSize(a.sizeBytes);

  const card = `<div class="file-card">
      <div class="file-icon" style="background:${info.color}22;color:${info.color}">${info.icon}</div>
      <div class="file-info">
        <div class="file-name">${escapeHtml(a.fileName)}</div>
        <div class="file-meta"><span>${escapeHtml(info.label)}</span>${size ? `<span>${size}</span>` : ""}</div>
      </div>
    </div>`;

  if (!src) return card;

  let preview = "";
  if (a.kind === "image") {
    preview = `<div class="attachment-preview"><img src="${src}" alt="${escapeHtml(a.fileName)}" loading="lazy"/></div>`;
  } else if (a.kind === "video") {
    preview = `<div class="attachment-preview"><video controls src="${src}"></video></div>`;
  }
  const caption = a.caption ? `<div class="attachment-caption">${escapeHtml(a.caption)}</div>` : "";

  return `${card}${preview}${caption}`;
}

function contentHtml(doc: DocumentLoop): string {
  const c = doc.content;
  const kindInfo = CONTENT_KIND_INFO[c.kind] ?? CONTENT_KIND_INFO.genericItem;
  const kindBadge = `<span class="badge outline">${kindInfo.icon} ${escapeHtml(kindInfo.label)}</span>`;

  switch (c.kind) {
    case "bookChapter":
      return `
        <div style="margin-bottom:8px">${kindBadge}${
          c.chapterNumber !== undefined ? `<span class="badge ghost">الفصل ${c.chapterNumber}</span>` : ""
        }</div>
        <h1>${escapeHtml(c.chapterTitle)}</h1>
        ${c.summary ? `<p class="tag">${escapeHtml(c.summary)}</p>` : ""}
        <div class="body-text">${escapeHtml(c.text)}</div>`;
    case "qaItem":
      return `
        <div style="margin-bottom:8px">${kindBadge}${
          c.difficulty ? `<span class="badge ghost">${escapeHtml(c.difficulty)}</span>` : ""
        }</div>
        <h2>❓ ${escapeHtml(c.question)}</h2>
        <div class="body-text">${escapeHtml(c.answer)}</div>
        ${c.explanation ? `<p class="tag">${escapeHtml(c.explanation)}</p>` : ""}`;
    case "termDefinition":
      return `
        <div style="margin-bottom:8px">${kindBadge}</div>
        <h1>${escapeHtml(c.term)}</h1>
        <div class="body-text">${escapeHtml(c.definition)}</div>
        ${c.example ? `<p class="tag">مثال: ${escapeHtml(c.example)}</p>` : ""}`;
    case "infoExplain":
      return `
        <div style="margin-bottom:8px">${kindBadge}</div>
        <h1>${escapeHtml(c.topic)}</h1>
        <div class="body-text">${escapeHtml(c.explanation)}</div>
        ${c.source ? `<p class="tag">المصدر: ${escapeHtml(c.source)}</p>` : ""}`;
    case "episodeItem":
      return `
        <div style="margin-bottom:8px">${kindBadge}</div>
        <div class="tag">${c.seriesTitle ? escapeHtml(c.seriesTitle) + " · " : ""}${
        c.seasonNumber !== undefined ? "الموسم " + c.seasonNumber + " · " : ""
      }${c.episodeNumber !== undefined ? "الحلقة " + c.episodeNumber : ""}</div>
        <h1>${escapeHtml(c.episodeTitle)}</h1>
        ${c.synopsis ? `<p class="tag">${escapeHtml(c.synopsis)}</p>` : ""}
        ${c.body ? `<div class="body-text">${escapeHtml(c.body)}</div>` : ""}`;
    case "genericItem":
    default:
      return `
        <div style="margin-bottom:8px">${kindBadge}${
          c.type ? `<span class="badge ghost">${escapeHtml(c.type)}</span>` : ""
        }</div>
        <h1>${escapeHtml(doc.metadata.title || "مستند")}</h1>
        ${c.element ? `<p class="tag">${escapeHtml(c.element)}</p>` : ""}
        ${c.body ? `<div class="body-text">${escapeHtml(c.body)}</div>` : ""}`;
  }
}

/** يبني كتلة HTML كاملة (بطاقة) لمستند DocumentLoop واحد مع مرفقاته */
export function renderDocumentCard(doc: DocumentLoop, layout: string): string {
  const tags = (doc.metadata.tags ?? []).map((t) => `<span class="tag">#${escapeHtml(t)}</span>`).join("");
  const meta = `<div class="meta-row">${
    doc.metadata.author ? `<span>👤 ${escapeHtml(doc.metadata.author)}</span>` : ""
  }${doc.metadata.createdAt ? `<span>📅 ${escapeHtml(doc.metadata.createdAt.slice(0, 10))}</span>` : ""}</div>`;

  const attachments = doc.attachments ?? [];
  const attachmentsHtml = attachments.length
    ? `<div class="files-section-title">📎 المرفقات (${attachments.length})</div>${attachments
        .map(renderAttachment)
        .join("\n")}`
    : "";

  return `
    <div class="card ${escapeHtml(layout)}">
      ${meta}
      ${contentHtml(doc)}
      ${tags ? `<div style="margin-top:10px">${tags}</div>` : ""}
    </div>
    ${attachmentsHtml}`;
}
