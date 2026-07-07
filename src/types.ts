/**
 * الأنواع الأساسية لصيغة DLoF (Document Loop Format)
 * مطابقة لـ docs/SPECIFICATION.md و spec/schema/dlof.xsd
 */

export type Domain = "education" | "book" | "infoApp" | "infoLoop" | "series" | "custom";

export interface Metadata {
  title: string;
  domain: Domain | string;
  author?: string;
  createdAt?: string;
  updatedAt?: string;
  language?: string;
  tags?: string[];
}

export interface LoopLink {
  ref: string;
  title?: string;
}

export interface LoopLinks {
  previous?: LoopLink;
  next?: LoopLink;
  loopRoot: boolean;
}

export interface GenericItem {
  kind: "genericItem";
  customType?: string;
  type?: string;
  element?: string;
  body?: string;
}

export interface QaItem {
  kind: "qaItem";
  question: string;
  answer: string;
  explanation?: string;
  difficulty?: string;
}

export interface BookChapter {
  kind: "bookChapter";
  chapterTitle: string;
  text: string;
  chapterNumber?: number;
  summary?: string;
}

export interface TermDefinition {
  kind: "termDefinition";
  term: string;
  definition: string;
  example?: string;
}

export interface InfoExplain {
  kind: "infoExplain";
  topic: string;
  explanation: string;
  source?: string;
}

export interface EpisodeItem {
  kind: "episodeItem";
  episodeNumber?: number;
  seasonNumber?: number;
  episodeTitle: string;
  synopsis?: string;
  duration?: number; // seconds
  seriesTitle?: string;
  mediaRef?: string;
  releaseDate?: string;
  body?: string;
  thumbnailBase64?: string;
}

export type Content =
  | GenericItem
  | QaItem
  | BookChapter
  | TermDefinition
  | InfoExplain
  | EpisodeItem;

export type AttachmentKind = "image" | "video" | "file";

export interface Attachment {
  id: string;
  fileName: string;
  mimeType: string;
  kind: AttachmentKind;
  sizeBytes?: number;
  data?: string; // base64
  uri?: string;
  caption?: string;
}

export type TemplateLayout = "standard" | "card" | "magazine" | "minimal";

export interface Template {
  ref?: string;
  primaryColor?: string;
  secondaryColor?: string;
  backgroundColor?: string;
  textColor?: string;
  fontFamily?: string;
  layout?: TemplateLayout | string;
  headerAttachmentRef?: string;
}

export type MediaKind = "image" | "video" | "audio" | "subtitle" | "file";

export interface MediaFile {
  path: string;
  kind: MediaKind;
  label?: string;
}

export interface DocumentLoop {
  version: string;
  id: string;
  metadata: Metadata;
  loopLinks: LoopLinks;
  content: Content;
  attachments?: Attachment[];
  template?: Template;
  mediaFolder?: MediaFile[];
  /** اسم الملف الأصلي إن كان معروفاً (يفيد أدوات الحلقة والعارض) */
  sourceFileName?: string;
}

export interface DlofTemplatePackage {
  id: string;
  name: string;
  author?: string;
  version: string;
  design: Omit<Template, "ref" | "headerAttachmentRef">;
}

export interface DlofPkgMeta {
  id: string;
  title: string;
  domain: string;
  version: string;
  author?: string;
  language?: string;
  createdAt?: string;
  dlofpkg_version: string;
}

export interface DlofPkg {
  meta: DlofPkgMeta;
  document: DocumentLoop;
  attachments: Record<string, Buffer>; // relative path (attachments/xxx) -> bytes
}

export interface DlofSeries {
  name: string;
  /** خريطة اسم الملف (نسبي داخل السلسلة) -> المستند المحلَّل */
  documents: Record<string, DocumentLoop>;
  /** اسم ملف نقطة انطلاق الحلقة (loopRoot) إن وُجد */
  rootFileName?: string;
  /** ملفات إضافية غير .dlof (خطوط، وسائط، إلخ) -> بايتات خام */
  assets: Record<string, Buffer>;
}
