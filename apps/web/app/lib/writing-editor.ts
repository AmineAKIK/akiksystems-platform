import {
  parseWritingDocument,
  writingDocumentFromPlainText,
  writingDocumentToPlainText,
  type WritingDocument,
} from '@akiksystems/core/writing-document';

export type WritingEditorDocument = WritingDocument;

export function parseWritingEditorDocument(
  value: unknown,
): WritingEditorDocument | null {
  return parseWritingDocument(value);
}

export function parseWritingEditorDocumentJson(
  value: string,
): WritingEditorDocument | null {
  if (value.length > 500_000) return null;

  try {
    return parseWritingDocument(JSON.parse(value));
  } catch {
    return null;
  }
}

export function writingEditorDocumentFromPlainText(
  value: string | null | undefined,
): WritingEditorDocument {
  return writingDocumentFromPlainText(value);
}

export function writingEditorDocumentToPlainText(
  document: WritingEditorDocument,
): string {
  return writingDocumentToPlainText(document);
}

export function writingEditorDocumentForDraft(
  document: unknown,
  fallbackBody: string | null | undefined,
): WritingEditorDocument {
  return (
    parseWritingDocument(document) ??
    writingDocumentFromPlainText(fallbackBody)
  );
}
