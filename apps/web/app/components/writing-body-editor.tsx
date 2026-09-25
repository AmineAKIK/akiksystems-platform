import {
  writingDocumentFromPlainText,
  writingDocumentToPlainText,
} from '@akiksystems/core';
import { Node, type JSONContent } from '@tiptap/core';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import TextNode from '@tiptap/extension-text';
import { EditorContent, useEditor } from '@tiptap/react';
import { useRef, useState } from 'react';

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

const ControlledHeading = Node.create({
  name: 'heading',
  group: 'block',
  content: 'text*',
  defining: true,
  addAttributes() {
    return {
      level: {
        default: 2,
      },
    };
  },
  parseHTML() {
    return [
      { tag: 'h2', attrs: { level: 2 } },
      { tag: 'h3', attrs: { level: 3 } },
    ];
  },
  renderHTML({ node }) {
    return [node.attrs.level === 3 ? 'h3' : 'h2', {}, 0];
  },
});

const ControlledListItem = Node.create({
  name: 'listItem',
  content: 'paragraph+',
  defining: true,
  parseHTML() {
    return [{ tag: 'li' }];
  },
  renderHTML() {
    return ['li', {}, 0];
  },
});

const ControlledBulletList = Node.create({
  name: 'bulletList',
  group: 'block',
  content: 'listItem+',
  parseHTML() {
    return [{ tag: 'ul' }];
  },
  renderHTML() {
    return ['ul', {}, 0];
  },
});

const ControlledOrderedList = Node.create({
  name: 'orderedList',
  group: 'block',
  content: 'listItem+',
  parseHTML() {
    return [{ tag: 'ol' }];
  },
  renderHTML() {
    return ['ol', {}, 0];
  },
});

const ControlledBlockquote = Node.create({
  name: 'blockquote',
  group: 'block',
  content: 'paragraph+',
  defining: true,
  parseHTML() {
    return [{ tag: 'blockquote' }];
  },
  renderHTML() {
    return ['blockquote', {}, 0];
  },
});

const ControlledCodeBlock = Node.create({
  name: 'codeBlock',
  group: 'block',
  content: 'text*',
  marks: '',
  code: true,
  defining: true,
  addAttributes() {
    return {
      language: {
        default: null,
      },
    };
  },
  parseHTML() {
    return [{ tag: 'pre' }];
  },
  renderHTML({ node }) {
    const language =
      typeof node.attrs.language === 'string' ? node.attrs.language : null;
    return [
      'pre',
      language === null ? {} : { 'data-language': language },
      ['code', {}, 0],
    ];
  },
});

const ControlledCallout = Node.create({
  name: 'callout',
  group: 'block',
  content: 'paragraph+',
  defining: true,
  parseHTML() {
    return [{ tag: 'aside[data-writing-callout]' }];
  },
  renderHTML() {
    return ['aside', { 'data-writing-callout': '' }, 0];
  },
});

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

const ControlledGallery = Node.create({
  name: 'gallery',
  group: 'block',
  content: 'image{2,12}',
  defining: true,
  parseHTML() {
    return [{ tag: '[data-writing-gallery]' }];
  },
  renderHTML() {
    return ['div', { 'data-writing-gallery': '' }, 0];
  },
});

function editorJson(document: WritingEditorDocument): JSONContent {
  return {
    type: document.type,
    content: document.content,
  };
}

export function WritingBodyEditor({
  assets,
  initialDocument,
  locale,
  label: labelOverride,
  allowCode = true,
  allowMedia = true,
}: {
  assets: WritingBodyAsset[];
  initialDocument: WritingEditorDocument;
  locale: 'en' | 'fr';
  label?: string;
  allowCode?: boolean;
  allowMedia?: boolean;
}) {
  const documentInput = useRef<HTMLInputElement>(null);
  const bodyInput = useRef<HTMLInputElement>(null);
  const label =
    labelOverride ?? (locale === 'fr' ? 'Corps de l’écrit' : 'Writing body');

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
    extensions: [
      Document,
      Paragraph,
      TextNode,
      ControlledHeading,
      ControlledListItem,
      ControlledBulletList,
      ControlledOrderedList,
      ControlledBlockquote,
      ControlledCodeBlock,
      ControlledCallout,
      ContextualImage,
      ControlledGallery,
    ],
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

  const insertBlock = (block: JSONContent) => {
    if (editor === null) return;

    const selection = editor.state.selection;
    const position =
      selection.$to.depth > 0 ? selection.$to.after(1) : selection.to;

    editor.chain().focus().insertContentAt(position, block).run();
  };

  const labels =
    locale === 'fr'
      ? {
          heading2: 'Titre H2',
          heading3: 'Titre H3',
          bullet: 'Liste',
          ordered: 'Étapes',
          quote: 'Citation',
          code: 'Code',
          callout: 'Encadré',
          gallery: 'Galerie',
          headingText: 'Titre de section',
          subheadingText: 'Sous-section',
          listText: 'Élément de liste',
          stepText: 'Étape',
          quoteText: 'Citation',
          codeText: 'code',
          calloutText: 'Contexte important',
        }
      : {
          heading2: 'H2 heading',
          heading3: 'H3 heading',
          bullet: 'List',
          ordered: 'Steps',
          quote: 'Quote',
          code: 'Code',
          callout: 'Callout',
          gallery: 'Gallery',
          headingText: 'Section heading',
          subheadingText: 'Subsection',
          listText: 'List item',
          stepText: 'Step',
          quoteText: 'Quotation',
          codeText: 'code',
          calloutText: 'Important context',
        };

  const localizedAssets = assets.filter((asset) => asset.altText !== null);
  const galleryAssets = localizedAssets.slice(0, 12);

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
            ? 'Schéma v1 · sémantique contrôlée'
            : 'Schema v1 · controlled semantics'}
        </span>
      </div>

      <div
        aria-label={locale === 'fr' ? 'Blocs éditoriaux' : 'Editorial blocks'}
        className="aks-writing-editor-toolbar"
        role="toolbar"
      >
        <button
          onClick={() =>
            insertBlock({
              type: 'heading',
              attrs: { level: 2 },
              content: [{ type: 'text', text: labels.headingText }],
            })
          }
          type="button"
        >
          {labels.heading2}
        </button>
        <button
          onClick={() =>
            insertBlock({
              type: 'heading',
              attrs: { level: 3 },
              content: [{ type: 'text', text: labels.subheadingText }],
            })
          }
          type="button"
        >
          {labels.heading3}
        </button>
        <button
          onClick={() =>
            insertBlock({
              type: 'bulletList',
              content: [
                {
                  type: 'listItem',
                  content: [
                    {
                      type: 'paragraph',
                      content: [{ type: 'text', text: labels.listText }],
                    },
                  ],
                },
              ],
            })
          }
          type="button"
        >
          {labels.bullet}
        </button>
        <button
          onClick={() =>
            insertBlock({
              type: 'orderedList',
              content: [
                {
                  type: 'listItem',
                  content: [
                    {
                      type: 'paragraph',
                      content: [{ type: 'text', text: labels.stepText }],
                    },
                  ],
                },
              ],
            })
          }
          type="button"
        >
          {labels.ordered}
        </button>
        <button
          onClick={() =>
            insertBlock({
              type: 'blockquote',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: labels.quoteText }],
                },
              ],
            })
          }
          type="button"
        >
          {labels.quote}
        </button>
        {allowCode ? (
                  <button
                    onClick={() =>
                      insertBlock({
                        type: 'codeBlock',
                        content: [{ type: 'text', text: labels.codeText }],
                      })
                    }
                    type="button"
                  >
                    {labels.code}
                  </button>
        ) : null}
        <button
          onClick={() =>
            insertBlock({
              type: 'callout',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: labels.calloutText }],
                },
              ],
            })
          }
          type="button"
        >
          {labels.callout}
        </button>
        {allowMedia ? (
                  <button
                    disabled={galleryAssets.length < 2}
                    onClick={() =>
                      insertBlock({
                        type: 'gallery',
                        content: galleryAssets.map((asset) => ({
                          type: 'image',
                          attrs: { assetId: asset.id },
                        })),
                      })
                    }
                    title={
                      galleryAssets.length < 2
                        ? locale === 'fr'
                          ? 'Deux médias localisés sont nécessaires.'
                          : 'Two localized media items are required.'
                        : undefined
                    }
                    type="button"
                  >
                    {labels.gallery}
                  </button>
        ) : null}
      </div>

      <EditorContent editor={editor} />

      {allowMedia ? (
        <>
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
                            insertBlock({
                              type: 'image',
                              attrs: { assetId: asset.id },
                            });
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
        </>
      ) : null}

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
          ? 'Les contrôles insèrent uniquement les blocs du schéma v1. Aucun HTML brut, style libre, colonne ou template n’est disponible.'
          : 'Controls insert only schema v1 blocks. Raw HTML, free styling, columns, and templates are unavailable.'}
      </p>
    </div>
  );
}


export function WritingNoteEditor({
  initialDocument,
  locale,
}: {
  initialDocument: WritingEditorDocument;
  locale: 'en' | 'fr';
}) {
  const [body, setBody] = useState(() =>
    writingDocumentToPlainText(initialDocument),
  );
  const document = writingDocumentFromPlainText(body);
  const label = locale === 'fr' ? 'Corps de la note' : 'Note body';

  return (
    <div className="aks-writing-note-editor" data-writing-note-editor>
      <label>
        <span>{label}</span>
        <textarea
          aria-label={label}
          onChange={(event) => setBody(event.currentTarget.value)}
          rows={8}
          value={body}
        />
      </label>
      <input
        name="editorDocument"
        type="hidden"
        value={JSON.stringify(document)}
      />
      <input name="body" type="hidden" value={body} />
      <p className="aks-writing-editor-note">
        {locale === 'fr'
          ? 'Format court : écris directement la note. Les paragraphes suffisent ; aucun résumé, bloc riche, média ou structure long-form n’est requis.'
          : 'Short-form path: write the Note directly. Paragraphs are enough; no summary, rich block, media, or long-form structure is required.'}
      </p>
    </div>
  );
}
