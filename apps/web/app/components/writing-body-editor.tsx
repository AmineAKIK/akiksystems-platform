import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import TextNode from '@tiptap/extension-text';
import { EditorContent, useEditor } from '@tiptap/react';
import { useRef } from 'react';

import {
  parseWritingEditorDocument,
  writingEditorDocumentToPlainText,
  type WritingEditorDocument,
} from '../lib/writing-editor';

export function WritingBodyEditor({
  initialDocument,
  locale,
}: {
  initialDocument: WritingEditorDocument;
  locale: 'en' | 'fr';
}) {
  const documentInput = useRef<HTMLInputElement>(null);
  const bodyInput = useRef<HTMLInputElement>(null);
  const label =
    locale === 'fr'
      ? 'Corps de l’écrit'
      : 'Writing body';

  const editor = useEditor({
    extensions: [Document, Paragraph, TextNode],
    content: initialDocument,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        'aria-label': label,
        class: 'aks-writing-editor-content',
      },
    },
    onUpdate({ editor: currentEditor }) {
      const document = parseWritingEditorDocument(currentEditor.getJSON());
      if (document === null) return;

      if (documentInput.current !== null) {
        documentInput.current.value = JSON.stringify(document);
      }
      if (bodyInput.current !== null) {
        bodyInput.current.value = writingEditorDocumentToPlainText(document);
      }
    },
  });

  const initialDocumentJson = JSON.stringify(initialDocument);
  const initialBody = writingEditorDocumentToPlainText(initialDocument);

  return (
    <div
      className="aks-writing-editor"
      data-editor-ready={editor === null ? 'false' : 'true'}
      data-writing-editor
    >
      <div className="aks-writing-editor-heading">
        <span>{label}</span>
        <span className="aks-writing-editor-contract">
          {locale === 'fr'
            ? 'Tiptap · paragraphes contrôlés'
            : 'Tiptap · controlled paragraphs'}
        </span>
      </div>
      <EditorContent editor={editor} />
      <input
        defaultValue={initialDocumentJson}
        name="editorDocument"
        ref={documentInput}
        type="hidden"
      />
      <input
        defaultValue={initialBody}
        name="body"
        ref={bodyInput}
        type="hidden"
      />
      <p className="aks-writing-editor-note">
        {locale === 'fr'
          ? 'AKS-105 installe l’éditeur headless et sa persistance. Le vocabulaire riche reste volontairement limité jusqu’au schéma AKS-106.'
          : 'AKS-105 installs the headless editor and persistence. Rich vocabulary stays intentionally limited until the AKS-106 schema.'}
      </p>
    </div>
  );
}
