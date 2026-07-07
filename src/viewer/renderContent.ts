import { Attachment, DocumentLoop } from "../types";
import { escapeHtml } from "./theme";

function attachmentSrc(a: Attachment): string | undefined {
  if (a.data) return `data:${a.mimeType};base64,${a.data}`;
  if (a.uri) return a.uri;
  return undefined;
}

function renderAttachment(a: Attachment): string {
  const src = attachmentSrc(a);
  if (!src) return "";
  const caption = a.caption ? `<div class="tag">${escapeHtml(a.caption)}</div>` : "";
  if (a.kind === "image") {
    return `<div class="attachment"><img src="${src}" alt="${escapeHtml(
      a.fileName
    )}" loading="lazy"/>${caption}</div>`;
  }
  if (a.kind === "video") {
    return `<div class="attachment"><video controls src="${src}"></video>${caption}</div>`;
  }
  return `<div class="attachment"><a href="${src}" download="${escapeHtml(
    a.fileName
  )}">📎 ${escapeHtml(a.fileName)}</a>${caption}</div>`;
}

function contentHtml(doc: DocumentLoop): string {
  const c = doc.content;
  switch (c.kind) {
    case "bookChapter":
      return `
        ${c.chapterNumber !== undefined ? `<div class="tag">الفصل ${c.chapterNumber}</div>` : ""}
        <h1>${escapeHtml(c.chapterTitle)}</h1>
        ${c.summary ? `<p class="tag">${escapeHtml(c.summary)}</p>` : ""}
        <div class="body-text">${escapeHtml(c.text)}</div>`;
    case "qaItem":
      return `
        <h2>❓ ${escapeHtml(c.question)}</h2>
        <div class="body-text">${escapeHtml(c.answer)}</div>
        ${c.explanation ? `<p class="tag">${escapeHtml(c.explanation)}</p>` : ""}
        ${c.difficulty ? `<span class="badge">${escapeHtml(c.difficulty)}</span>` : ""}`;
    case "termDefinition":
      return `
        <h1>${escapeHtml(c.term)}</h1>
        <div class="body-text">${escapeHtml(c.definition)}</div>
        ${c.example ? `<p class="tag">مثال: ${escapeHtml(c.example)}</p>` : ""}`;
    case "infoExplain":
      return `
        <h1>${escapeHtml(c.topic)}</h1>
        <div class="body-text">${escapeHtml(c.explanation)}</div>
        ${c.source ? `<p class="tag">المصدر: ${escapeHtml(c.source)}</p>` : ""}`;
    case "episodeItem":
      return `
        <div class="tag">${c.seriesTitle ? escapeHtml(c.seriesTitle) + " · " : ""}${
        c.seasonNumber !== undefined ? "الموسم " + c.seasonNumber + " · " : ""
      }${c.episodeNumber !== undefined ? "الحلقة " + c.episodeNumber : ""}</div>
        <h1>${escapeHtml(c.episodeTitle)}</h1>
        ${c.synopsis ? `<p class="tag">${escapeHtml(c.synopsis)}</p>` : ""}
        ${c.body ? `<div class="body-text">${escapeHtml(c.body)}</div>` : ""}`;
    case "genericItem":
    default:
      return `
        <h1>${escapeHtml(doc.metadata.title || "مستند")}</h1>
        ${c.type ? `<span class="badge">${escapeHtml(c.type)}</span>` : ""}
        ${c.element ? `<p class="tag">${escapeHtml(c.element)}</p>` : ""}
        ${c.body ? `<div class="body-text">${escapeHtml(c.body)}</div>` : ""}`;
  }
}

/** يبني كتلة HTML كاملة (بطاقة) لمستند DocumentLoop واحد مع مرفقاته */
export function renderDocumentCard(doc: DocumentLoop, layout: string): string {
  const tags = (doc.metadata.tags ?? []).map((t) => `<span class="tag">#${escapeHtml(t)}</span>`).join("");
  const meta = `<div class="meta-row">${escapeHtml(doc.metadata.author ?? "")}${
    doc.metadata.author && doc.metadata.createdAt ? " · " : ""
  }${doc.metadata.createdAt ? escapeHtml(doc.metadata.createdAt.slice(0, 10)) : ""}</div>`;

  const attachmentsHtml = (doc.attachments ?? []).map(renderAttachment).join("\n");

  return `
    <div class="card ${escapeHtml(layout)}">
      ${meta}
      ${contentHtml(doc)}
      ${tags ? `<div style="margin-top:10px">${tags}</div>` : ""}
      ${attachmentsHtml}
    </div>`;
}
