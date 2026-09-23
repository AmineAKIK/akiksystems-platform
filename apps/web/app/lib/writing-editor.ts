export interface WritingEditorTextNode {
  type: 'text';
  text: string;
}

export interface WritingEditorParagraphNode {
  type: 'paragraph';
  content?: WritingEditorTextNode[];
}

export interface WritingEditorDocument {
  type: 'doc';
  content: WritingEditorParagraphNode[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
): boolean {
  const allowed = new Set(keys);
  return Object.keys(value).every((key) => allowed.has(key));
}

function parseTextNode(value: unknown): WritingEditorTextNode | null {
  if (!isRecord(value) || !hasOnlyKeys(value, ['type', 'text'])) return null;
  if (value.type !== 'text' || typeof value.text !== 'string') return null;
  if (value.text.length === 0) return null;
  return { type: 'text', text: value.text };
}

function parseParagraphNode(
  value: unknown,
): WritingEditorParagraphNode | null {
  if (!isRecord(value) || !hasOnlyKeys(value, ['type', 'content'])) return null;
  if (value.type !== 'paragraph') return null;

  if (value.content === undefined) {
    return { type: 'paragraph' };
  }

  if (!Array.isArray(value.content)) return null;
  const content = value.content.map(parseTextNode);
  if (content.some((node) => node === null)) return null;

  return content.length === 0
    ? { type: 'paragraph' }
    : {
        type: 'paragraph',
        content: content as WritingEditorTextNode[],
      };
}

export function parseWritingEditorDocument(
  value: unknown,
): WritingEditorDocument | null {
  if (!isRecord(value) || !hasOnlyKeys(value, ['type', 'content'])) return null;
  if (value.type !== 'doc' || !Array.isArray(value.content)) return null;

  const content = value.content.map(parseParagraphNode);
  if (content.length === 0 || content.some((node) => node === null)) return null;

  return {
    type: 'doc',
    content: content as WritingEditorParagraphNode[],
  };
}

export function parseWritingEditorDocumentJson(
  value: string,
): WritingEditorDocument | null {
  if (value.length > 500_000) return null;

  try {
    return parseWritingEditorDocument(JSON.parse(value));
  } catch {
    return null;
  }
}

export function writingEditorDocumentFromPlainText(
  value: string | null | undefined,
): WritingEditorDocument {
  const normalized = value?.replace(/\r\n?/g, '\n').trim() ?? '';
  const paragraphs =
    normalized === ''
      ? ['']
      : normalized
          .split(/\n\s*\n/)
          .map((paragraph) => paragraph.replace(/\s*\n\s*/g, ' ').trim());

  return {
    type: 'doc',
    content: paragraphs.map((paragraph) =>
      paragraph === ''
        ? { type: 'paragraph' }
        : {
            type: 'paragraph',
            content: [{ type: 'text', text: paragraph }],
          },
    ),
  };
}

export function writingEditorDocumentToPlainText(
  document: WritingEditorDocument,
): string {
  return document.content
    .map((paragraph) =>
      (paragraph.content ?? []).map((node) => node.text).join(''),
    )
    .join('\n\n')
    .trim();
}

export function writingEditorDocumentForDraft(
  document: unknown,
  fallbackBody: string | null | undefined,
): WritingEditorDocument {
  return (
    parseWritingEditorDocument(document) ??
    writingEditorDocumentFromPlainText(fallbackBody)
  );
}
