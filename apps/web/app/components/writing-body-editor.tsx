import { Node } from '@tiptap/core';
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

export interface WritingBodyAsset {
  id: string;
  label: string;
  altText: string | null;
  caption: string | null;
}

const ContextualImage = Node.create({
  name: 'image',
  group: 'block',
  atom: true,
  addAttributes() {
    return {
      assetId: {
        default: null,
      },
    };
  },
  parseHTML() {
    return [{ tag: 'figure[data-writing-image]' }];
  },
  renderHTML({ node }) {
    return [
      'figure',
      {
        'data-writing-image': '',
        'data-asset-id': node.attrs.assetId,
      },
      ['figcaption', {}, `Contextual image · ${node.attrs.assetId}`],
    ];
  },
});

function editorJson(document: WritingEditorDocument) {
  return {
    type: document.type,
    content: document.content,
  };
}

export function WritingBodyEditor({
  assets,
  initialDocument,
  locale,
}: {
  assets: WritingBodyAsset[];
  initialDocument: WritingEditorDocument;
  locale: 'en' | 'fr';
}) {
  const documentInput = useRef<HTMLInputElement>(null);
  const bodyInput = useRef<HTMLInputElement>(null);
  const label = locale === 'fr' ? 'Corps de l’écrit' : 'Writing body';

  const syncDocument = (value: unknown) => {
    const record =
      value !== null && typeof value === 'object' && !Array.isArray(value)
        ? value
        : {};
    const document = parseWritingEditorDocument({
      ...record,
      version: 1,
    });
    if (document === null) return;

    if (documentInput.current !== null) {
      documentInput.current.value = JSON.stringify(document);
    }
    if (bodyInput.current !== null) {
      bodyInput.current.value = writingEditorDocumentToPlainText(document);
    }
  };

  const editor = useEditor({
    extensions: [Document, Paragraph, TextNode, ContextualImage],
    content: editorJson(initialDocument),
    immediatelyRender: false,
    editorProps: {
      attributes: {
        'aria-label': label,
        class: 'aks-writing-editor-content',
      },
    },
    onUpdate({ editor: currentEditor }) {
      syncDocument(currentEditor.getJSON());
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
            ? 'Schéma v1 · médias contextuels'
            : 'Schema v1 · contextual media'}
        </span>
      </div>
      <EditorContent editor={editor} />

      <div className="aks-writing-editor-assets">
        <span>
          {locale === 'fr'
            ? 'Insérer un média de ce Writing'
            : 'Insert media from this Writing'}
        </span>
        {assets.length === 0 ? (
          <span className="aks-writing-editor-note">
            {locale === 'fr'
              ? 'Aucun média contextuel. Téléverse un média dans cette fiche Writing.'
              : 'No contextual media. Upload media in this Writing card first.'}
          </span>
        ) : (
          <div className="aks-proof-actions">
            {assets.map((asset) => (
              <button
                disabled={asset.altText === null}
                key={asset.id}
                onClick={() => {
                  editor
                    ?.chain()
                    .focus()
                    .insertContent({
                      type: 'image',
                      attrs: { assetId: asset.id },
                    })
                    .run();
                }}
                title={
                  asset.altText === null
                    ? locale === 'fr'
                      ? 'Ajoute d’abord le texte alternatif français.'
                      : 'Add English alt text first.'
                    : asset.caption ?? asset.altText
                }
                type="button"
              >
                {locale === 'fr' ? 'Insérer' : 'Insert'} · {asset.label}
              </button>
            ))}
          </div>
        )}
      </div>

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
          ? 'Les médias sont liés à ce Writing et référencés par identifiant dans le document. L’alt localisé est obligatoire avant publication.'
          : 'Media stays linked to this Writing and is referenced by identifier in the document. Localized alt text is required before publication.'}
      </p>
    </div>
  );
}
