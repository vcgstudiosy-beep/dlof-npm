import { parseXml, child, children, childText, XmlNode } from "../xml/parser";
import {
  Attachment,
  AttachmentKind,
  Content,
  DocumentLoop,
  LoopLink,
  LoopLinks,
  MediaFile,
  MediaKind,
  Metadata,
  Template,
} from "../types";

function parseMetadata(root: XmlNode): Metadata {
  const meta = child(root, "metadata");
  const tagsNode = child(meta, "tags");
  const tags = tagsNode ? children(tagsNode, "tag").map((t) => t.text) : undefined;
  return {
    title: childText(meta, "title") ?? "",
    domain: childText(meta, "domain") ?? "custom",
    author: childText(meta, "author"),
    createdAt: childText(meta, "createdAt"),
    updatedAt: childText(meta, "updatedAt"),
    language: childText(meta, "language") ?? "ar",
    tags,
  };
}

function parseLoopLinks(root: XmlNode): LoopLinks {
  const ll = child(root, "loopLinks");
  const prevNode = child(ll, "previous");
  const nextNode = child(ll, "next");
  const previous: LoopLink | undefined = prevNode
    ? { ref: prevNode.attrs.ref ?? "", title: prevNode.attrs.title }
    : undefined;
  const next: LoopLink | undefined = nextNode
    ? { ref: nextNode.attrs.ref ?? "", title: nextNode.attrs.title }
    : undefined;
  const loopRoot = (childText(ll, "loopRoot") ?? "false").trim().toLowerCase() === "true";
  return { previous, next, loopRoot };
}

function numOrUndef(v: string | undefined): number | undefined {
  if (v === undefined || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function parseContent(root: XmlNode): Content {
  const c = child(root, "content");
  if (!c) {
    return { kind: "genericItem" };
  }
  const generic = child(c, "genericItem");
  if (generic) {
    return {
      kind: "genericItem",
      customType: generic.attrs.customType,
      type: childText(generic, "type"),
      element: childText(generic, "element"),
      body: childText(generic, "body"),
    };
  }
  const qa = child(c, "qaItem");
  if (qa) {
    return {
      kind: "qaItem",
      question: childText(qa, "question") ?? "",
      answer: childText(qa, "answer") ?? "",
      explanation: childText(qa, "explanation"),
      difficulty: childText(qa, "difficulty"),
    };
  }
  const chapter = child(c, "bookChapter");
  if (chapter) {
    return {
      kind: "bookChapter",
      chapterTitle: childText(chapter, "chapterTitle") ?? "",
      text: childText(chapter, "text") ?? "",
      chapterNumber: numOrUndef(childText(chapter, "chapterNumber")),
      summary: childText(chapter, "summary"),
    };
  }
  const term = child(c, "termDefinition");
  if (term) {
    return {
      kind: "termDefinition",
      term: childText(term, "term") ?? "",
      definition: childText(term, "definition") ?? "",
      example: childText(term, "example"),
    };
  }
  const info = child(c, "infoExplain");
  if (info) {
    return {
      kind: "infoExplain",
      topic: childText(info, "topic") ?? "",
      explanation: childText(info, "explanation") ?? "",
      source: childText(info, "source"),
    };
  }
  const episode = child(c, "episodeItem");
  if (episode) {
    return {
      kind: "episodeItem",
      episodeNumber: numOrUndef(childText(episode, "episodeNumber")),
      seasonNumber: numOrUndef(childText(episode, "seasonNumber")),
      episodeTitle: childText(episode, "episodeTitle") ?? "",
      synopsis: childText(episode, "synopsis"),
      duration: numOrUndef(childText(episode, "duration")),
      seriesTitle: childText(episode, "seriesTitle"),
      mediaRef: childText(episode, "mediaRef"),
      releaseDate: childText(episode, "releaseDate"),
      body: childText(episode, "body"),
      thumbnailBase64: childText(episode, "thumbnailBase64"),
    };
  }
  // نوع محتوى غير معروف: يُرجع كعنصر عام لتجنّب الانهيار (توصية القسم 10 من المواصفة)
  return { kind: "genericItem", body: c.text };
}

function parseAttachments(root: XmlNode): Attachment[] | undefined {
  const wrap = child(root, "attachments");
  if (!wrap) return undefined;
  const list = children(wrap, "attachment");
  if (!list.length) return undefined;
  return list.map((a) => ({
    id: a.attrs.id ?? "",
    fileName: a.attrs.fileName ?? "",
    mimeType: a.attrs.mimeType ?? "application/octet-stream",
    kind: (a.attrs.kind as AttachmentKind) ?? "file",
    sizeBytes: numOrUndef(a.attrs.sizeBytes),
    data: childText(a, "data"),
    uri: childText(a, "uri"),
    caption: childText(a, "caption"),
  }));
}

function parseTemplate(root: XmlNode): Template | undefined {
  const t = child(root, "template");
  if (!t) return undefined;
  return {
    ref: t.attrs.ref,
    primaryColor: t.attrs.primaryColor,
    secondaryColor: t.attrs.secondaryColor,
    backgroundColor: t.attrs.backgroundColor,
    textColor: t.attrs.textColor,
    fontFamily: t.attrs.fontFamily,
    layout: t.attrs.layout,
    headerAttachmentRef: t.attrs.headerAttachmentRef,
  };
}

function parseMediaFolder(root: XmlNode): MediaFile[] | undefined {
  const mf = child(root, "mediaFolder");
  if (!mf) return undefined;
  const files = children(mf, "mediaFile");
  if (!files.length) return undefined;
  return files.map((f) => ({
    path: f.attrs.path ?? "",
    kind: (f.attrs.kind as MediaKind) ?? "file",
    label: f.attrs.label,
  }));
}

/** يحلّل نص XML كامل لملف .dlof (أو .ep / .episode) إلى كائن DocumentLoop مُنمَّط */
export function parseDlof(xmlSource: string, sourceFileName?: string): DocumentLoop {
  const root = parseXml(xmlSource);
  if (root.tag !== "documentLoop") {
    throw new Error(
      `ملف dlof غير صالح: العنصر الجذر يجب أن يكون <documentLoop> وليس <${root.tag}>`
    );
  }
  return {
    version: root.attrs.version ?? "1.0",
    id: root.attrs.id ?? "",
    metadata: parseMetadata(root),
    loopLinks: parseLoopLinks(root),
    content: parseContent(root),
    attachments: parseAttachments(root),
    template: parseTemplate(root),
    mediaFolder: parseMediaFolder(root),
    sourceFileName,
  };
}

/** امتدادات ملفات dlof المقبولة (المواصفة، القسم 11) */
export const DLOF_EXTENSIONS = [".dlof", ".ep", ".episode"];

export function isDlofFileName(name: string): boolean {
  const lower = name.toLowerCase();
  return DLOF_EXTENSIONS.some((ext) => lower.endsWith(ext));
}
