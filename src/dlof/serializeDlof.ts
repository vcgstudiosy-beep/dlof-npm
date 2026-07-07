import { buildXmlDocument, EBuilder } from "../xml/serializer";
import { DocumentLoop } from "../types";

const DLOF_NAMESPACE = "https://dlof.org/schema/1.0";

/** يحوّل كائن DocumentLoop مُنمَّط إلى نص XML صالح لملف .dlof */
export function serializeDlof(doc: DocumentLoop): string {
  const metadataChildren: EBuilder[] = [
    { tag: "title", text: doc.metadata.title },
    { tag: "domain", text: doc.metadata.domain },
  ];
  if (doc.metadata.author) metadataChildren.push({ tag: "author", text: doc.metadata.author });
  if (doc.metadata.createdAt)
    metadataChildren.push({ tag: "createdAt", text: doc.metadata.createdAt });
  if (doc.metadata.updatedAt)
    metadataChildren.push({ tag: "updatedAt", text: doc.metadata.updatedAt });
  if (doc.metadata.language) metadataChildren.push({ tag: "language", text: doc.metadata.language });
  if (doc.metadata.tags && doc.metadata.tags.length) {
    metadataChildren.push({
      tag: "tags",
      children: doc.metadata.tags.map((t) => ({ tag: "tag", text: t })),
    });
  }

  const loopLinksChildren: EBuilder[] = [];
  if (doc.loopLinks.previous) {
    loopLinksChildren.push({
      tag: "previous",
      attrs: { ref: doc.loopLinks.previous.ref, title: doc.loopLinks.previous.title },
    });
  }
  if (doc.loopLinks.next) {
    loopLinksChildren.push({
      tag: "next",
      attrs: { ref: doc.loopLinks.next.ref, title: doc.loopLinks.next.title },
    });
  }
  loopLinksChildren.push({ tag: "loopRoot", text: String(doc.loopLinks.loopRoot) });

  let contentChild: EBuilder;
  const c = doc.content;
  switch (c.kind) {
    case "genericItem":
      contentChild = {
        tag: "genericItem",
        attrs: { customType: c.customType },
        children: [
          c.type !== undefined ? { tag: "type", text: c.type } : undefined,
          c.element !== undefined ? { tag: "element", text: c.element } : undefined,
          c.body !== undefined ? { tag: "body", text: c.body } : undefined,
        ].filter(Boolean) as EBuilder[],
      };
      break;
    case "qaItem":
      contentChild = {
        tag: "qaItem",
        children: [
          { tag: "question", text: c.question },
          { tag: "answer", text: c.answer },
          c.explanation !== undefined ? { tag: "explanation", text: c.explanation } : undefined,
          c.difficulty !== undefined ? { tag: "difficulty", text: c.difficulty } : undefined,
        ].filter(Boolean) as EBuilder[],
      };
      break;
    case "bookChapter":
      contentChild = {
        tag: "bookChapter",
        children: [
          c.chapterNumber !== undefined
            ? { tag: "chapterNumber", text: String(c.chapterNumber) }
            : undefined,
          { tag: "chapterTitle", text: c.chapterTitle },
          { tag: "text", text: c.text },
          c.summary !== undefined ? { tag: "summary", text: c.summary } : undefined,
        ].filter(Boolean) as EBuilder[],
      };
      break;
    case "termDefinition":
      contentChild = {
        tag: "termDefinition",
        children: [
          { tag: "term", text: c.term },
          { tag: "definition", text: c.definition },
          c.example !== undefined ? { tag: "example", text: c.example } : undefined,
        ].filter(Boolean) as EBuilder[],
      };
      break;
    case "infoExplain":
      contentChild = {
        tag: "infoExplain",
        children: [
          { tag: "topic", text: c.topic },
          { tag: "explanation", text: c.explanation },
          c.source !== undefined ? { tag: "source", text: c.source } : undefined,
        ].filter(Boolean) as EBuilder[],
      };
      break;
    case "episodeItem":
      contentChild = {
        tag: "episodeItem",
        children: [
          c.episodeNumber !== undefined
            ? { tag: "episodeNumber", text: String(c.episodeNumber) }
            : undefined,
          c.seasonNumber !== undefined
            ? { tag: "seasonNumber", text: String(c.seasonNumber) }
            : undefined,
          { tag: "episodeTitle", text: c.episodeTitle },
          c.synopsis !== undefined ? { tag: "synopsis", text: c.synopsis } : undefined,
          c.duration !== undefined ? { tag: "duration", text: String(c.duration) } : undefined,
          c.seriesTitle !== undefined ? { tag: "seriesTitle", text: c.seriesTitle } : undefined,
          c.mediaRef !== undefined ? { tag: "mediaRef", text: c.mediaRef } : undefined,
          c.releaseDate !== undefined ? { tag: "releaseDate", text: c.releaseDate } : undefined,
          c.body !== undefined ? { tag: "body", text: c.body } : undefined,
          c.thumbnailBase64 !== undefined
            ? { tag: "thumbnailBase64", text: c.thumbnailBase64 }
            : undefined,
        ].filter(Boolean) as EBuilder[],
      };
      break;
  }

  const rootChildren: EBuilder[] = [
    { tag: "metadata", children: metadataChildren },
    { tag: "loopLinks", children: loopLinksChildren },
    { tag: "content", children: [contentChild] },
  ];

  if (doc.attachments && doc.attachments.length) {
    rootChildren.push({
      tag: "attachments",
      children: doc.attachments.map((a) => ({
        tag: "attachment",
        attrs: {
          id: a.id,
          fileName: a.fileName,
          mimeType: a.mimeType,
          kind: a.kind,
          sizeBytes: a.sizeBytes,
        },
        children: [
          a.data !== undefined ? { tag: "data", text: a.data } : undefined,
          a.uri !== undefined ? { tag: "uri", text: a.uri } : undefined,
          a.caption !== undefined ? { tag: "caption", text: a.caption } : undefined,
        ].filter(Boolean) as EBuilder[],
      })),
    });
  }

  if (doc.template) {
    rootChildren.push({
      tag: "template",
      attrs: {
        ref: doc.template.ref,
        primaryColor: doc.template.primaryColor,
        secondaryColor: doc.template.secondaryColor,
        backgroundColor: doc.template.backgroundColor,
        textColor: doc.template.textColor,
        fontFamily: doc.template.fontFamily,
        layout: doc.template.layout,
        headerAttachmentRef: doc.template.headerAttachmentRef,
      },
    });
  }

  if (doc.mediaFolder && doc.mediaFolder.length) {
    rootChildren.push({
      tag: "mediaFolder",
      children: doc.mediaFolder.map((m) => ({
        tag: "mediaFile",
        attrs: { path: m.path, kind: m.kind, label: m.label },
      })),
    });
  }

  return buildXmlDocument({
    tag: "documentLoop",
    attrs: { xmlns: DLOF_NAMESPACE, version: doc.version, id: doc.id },
    children: rootChildren,
  });
}
