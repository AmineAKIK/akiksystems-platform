import { Node } from '@tiptap/core';
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

const Heading = Node.create({
  name: 'heading',
  group: 'block',
  content: 'text+',
  defining: true,
  addAttributes() {
    return {
      level: {
        default: 2,
        parseHTML: (element) => Number(element.tagName.slice(1)),
        renderHTML: (attributes) => ({ level: attributes.level }),
      },
    };
  },
  parseHTML() {
    return [{ tag: 'h2' }, { tag: 'h3' }];
  },
  renderHTML({ node }) {
    const level = node.attrs.level === 3 ? 3 : 2;
    return [`h${level}`, 0];
  },
});

const ListItem = Node.create({
  name: 'listItem',
  content: 'paragraph+',
  defining: true,
  parseHTML() {
    return [{ tag: 'li' }];
  },
  renderHTML() {
    return ['li', 0];
  },
});

const BulletList = Node.create({
  name: 'bulletList',
  group: 'block',
  content: 'listItem+',
  parseHTML() {
    return [{ tag: 'ul' }];
  },
  renderHTML() {
    return ['ul', 0];
  },
});

const OrderedList = Node.create({
  name: 'orderedList',
  group: 'block',
  content: 'listItem+',
  parseHTML() {
    return [{ tag: 'ol' }];
  },
  renderHTML() {
    return ['ol', 0];
  },
});

const Blockquote = Node.create({
  name: 'blockquote',
  group: 'block',
  content: 'paragraph+',
  defining: true,
  parseHTML() {
    return [{ tag: 'blockquote' }];
  },
  renderHTML() {
    return ['blockquote', 0];
  },
});

const CodeBlock = Node.create({
  name: 'codeBlock',
  group: 'block',
  content: 'text*',
  code: true,
  defining: true,
  marks: '',
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
      ['code', 0],
    ];
  },
});

const ImageNode = Node.create({
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
      ['figcaption', {}, `Asset ${node.attrs.assetId}`],
    ];
  },
});

const Gallery = Node.create({
  name: 'gallery',
  group: 'block',
  content: 'image{2,12}',
  defining: true,
  parseHTML() {
    return [{ tag: 'div[data-writing-gallery]' }];
  },
  renderHTML() {
    return ['div', { 'data-writing-gallery': '' }, 0];
  },
});

const Callout = Node.create({
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

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function editorJson(document: WritingEditorDocument) {
  return {
    type: document.type,
    content: document.content,
  };
}

export function WritingBodyEditor({
  initialDocument,
  locale,
}: {
  initialDocument: WritingEditorDocument;
  locale: 'en' | 'fr';
}) {
  const documentInput = useRef<HTMLInputElement>(null);
  const bodyInput = useRef<HTMLInputElement>(null);
  const [assetReferences, setAssetReferences] = useState('');
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
    extensions: [
      Document,
      Paragraph,
      TextNode,
      Heading,
      ListItem,
      BulletList,
      OrderedList,
      Blockquote,
      CodeBlock,
      ImageNode,
      Gallery,
      Callout,
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

  const insertBlock = (content: Record<string, unknown>) => {
    editor?.chain().focus().insertContent(content).run();
  };

  const addImage = () => {
    const assetId = assetReferences.trim();
    if (!uuidPattern.test(assetId)) return;
    insertBlock({ type: 'image', attrs: { assetId } });
    setAssetReferences('');
  };

  const addGallery = () => {
    const assetIds = assetReferences
      .split(',')
      .map((value) => value.trim())
      .filter((value) => uuidPattern.test(value));
    if (assetIds.length < 2 || assetIds.length > 12) return;
    insertBlock({
      type: 'gallery',
      content: assetIds.map((assetId) => ({
        type: 'image',
        attrs: { assetId },
      })),
    });
    setAssetReferences('');
  };

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
            ? 'Schéma riche v1 · structure contrôlée'
            : 'Rich schema v1 · controlled structure'}
        </span>
      </div>

      <div
        aria-label={
          locale === 'fr'
            ? 'Insérer un bloc éditorial'
            : 'Insert editorial block'
        }
        className="aks-writing-editor-toolbar"
        role="group"
      >
        <button
          onClick={() =>
            insertBlock({
              type: 'heading',
              attrs: { level: 2 },
              content: [{ type: 'text', text: 'Section heading' }],
            })
          }
          type="button"
        >
          H2
        </button>
        <button
          onClick={() =>
            insertBlock({
              type: 'heading',
              attrs: { level: 3 },
              content: [{ type: 'text', text: 'Subheading' }],
            })
          }
          type="button"
        >
          H3
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
                      content: [{ type: 'text', text: 'List item' }],
                    },
                  ],
                },
              ],
            })
          }
          type="button"
        >
          {locale === 'fr' ? 'Liste' : 'List'}
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
                      content: [{ type: 'text', text: 'First item' }],
                    },
                  ],
                },
              ],
            })
          }
          type="button"
        >
          1.
        </button>
        <button
          onClick={() =>
            insertBlock({
              type: 'blockquote',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Quotation' }],
                },
              ],
            })
          }
          type="button"
        >
          {locale === 'fr' ? 'Citation' : 'Quote'}
        </button>
        <button
          onClick={() =>
            insertBlock({
              type: 'codeBlock',
              attrs: { language: null },
              content: [{ type: 'text', text: 'const value = true;' }],
            })
          }
          type="button"
        >
          Code
        </button>
        <button
          onClick={() =>
            insertBlock({
              type: 'callout',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Important context' }],
                },
              ],
            })
          }
          type="button"
        >
          Callout
        </button>
      </div>

      <EditorContent editor={editor} />

      <div className="aks-writing-editor-assets">
        <label>
          <span>
            {locale === 'fr'
              ? 'Référence(s) asset UUID'
              : 'Asset UUID reference(s)'}
          </span>
          <input
            onChange={(event) => setAssetReferences(event.currentTarget.value)}
            placeholder={
              locale === 'fr'
                ? 'Un UUID, ou plusieurs séparés par des virgules'
                : 'One UUID, or comma-separated UUIDs'
            }
            type="text"
            value={assetReferences}
          />
        </label>
        <div className="aks-proof-actions">
          <button onClick={addImage} type="button">
            {locale === 'fr' ? 'Insérer image' : 'Insert image'}
          </button>
          <button onClick={addGallery} type="button">
            {locale === 'fr' ? 'Insérer galerie' : 'Insert gallery'}
          </button>
        </div>
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
          ? 'Paragraphes, H2/H3, listes, citations, code, callouts, images et galeries sont autorisés. Les tableaux, HTML brut, styles et mises en page arbitraires restent exclus. AKS-107 prendra en charge les assets dans leur contexte.'
          : 'Paragraphs, H2/H3, lists, quotations, code, callouts, images, and galleries are allowed. Tables, raw HTML, styles, and arbitrary layouts remain excluded. AKS-107 will manage assets in context.'}
      </p>
    </div>
  );
}
