export const writingDocumentVersion = 1 as const;

export type WritingDocumentVersion = typeof writingDocumentVersion;

export interface WritingDocument {
  version: WritingDocumentVersion;
  type: 'doc';
  content: WritingBlockNode[];
}

export interface WritingTextNode {
  type: 'text';
  text: string;
}

export interface WritingParagraphNode {
  type: 'paragraph';
  content?: WritingTextNode[];
}

export interface WritingHeadingNode {
  type: 'heading';
  attrs: {
    level: 2 | 3;
  };
  content: WritingTextNode[];
}

export interface WritingListItemNode {
  type: 'listItem';
  content: WritingParagraphNode[];
}

export interface WritingBulletListNode {
  type: 'bulletList';
  content: WritingListItemNode[];
}

export interface WritingOrderedListNode {
  type: 'orderedList';
  content: WritingListItemNode[];
}

export interface WritingBlockquoteNode {
  type: 'blockquote';
  content: WritingParagraphNode[];
}

export interface WritingCodeBlockNode {
  type: 'codeBlock';
  attrs?: {
    language?: string | null;
  };
  content?: WritingTextNode[];
}

export interface WritingImageNode {
  type: 'image';
  attrs: {
    assetId: string;
  };
}

export interface WritingGalleryNode {
  type: 'gallery';
  content: WritingImageNode[];
}

export interface WritingCalloutNode {
  type: 'callout';
  content: WritingParagraphNode[];
}

export type WritingBlockNode =
  | WritingParagraphNode
  | WritingHeadingNode
  | WritingBulletListNode
  | WritingOrderedListNode
  | WritingBlockquoteNode
  | WritingCodeBlockNode
  | WritingImageNode
  | WritingGalleryNode
  | WritingCalloutNode;

export interface WritingDocumentValidationResult {
  success: boolean;
  errors: string[];
}

type JsonObject = Record<string, unknown>;

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const languagePattern = /^[a-z0-9+#._-]{1,32}$/i;
const maxBlocks = 250;
const maxTextNodeLength = 50_000;
const maxListItems = 100;
const maxParagraphsPerContainer = 50;
const maxGalleryImages = 12;

function isObject(value: unknown): value is JsonObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasOnlyKeys(value: JsonObject, keys: readonly string[]): boolean {
  const allowed = new Set(keys);
  return Object.keys(value).every((key) => allowed.has(key));
}

function validateTextNode(
  value: unknown,
  path: string,
  errors: string[],
): value is WritingTextNode {
  if (!isObject(value)) {
    errors.push(`${path} must be a text node object.`);
    return false;
  }

  if (!hasOnlyKeys(value, ['type', 'text'])) {
    errors.push(`${path} contains unsupported text properties or marks.`);
  }
  if (value.type !== 'text') {
    errors.push(`${path}.type must be "text".`);
  }
  if (
    typeof value.text !== 'string' ||
    value.text.length === 0 ||
    value.text.length > maxTextNodeLength
  ) {
    errors.push(
      `${path}.text must be non-empty text up to ${maxTextNodeLength} characters.`,
    );
  }

  return errors.length === 0;
}

function validateTextContent(
  value: unknown,
  path: string,
  errors: string[],
  options: { allowEmpty: boolean },
): value is WritingTextNode[] | undefined {
  if (value === undefined) {
    if (!options.allowEmpty) {
      errors.push(`${path} must contain text.`);
      return false;
    }
    return true;
  }

  if (!Array.isArray(value)) {
    errors.push(`${path} must be an array of text nodes.`);
    return false;
  }

  if (!options.allowEmpty && value.length === 0) {
    errors.push(`${path} must contain text.`);
  }

  value.forEach((node, index) => {
    const nestedErrors: string[] = [];
    validateTextNode(node, `${path}[${index}]`, nestedErrors);
    errors.push(...nestedErrors);
  });

  return errors.length === 0;
}

function validateParagraph(
  value: unknown,
  path: string,
  errors: string[],
): value is WritingParagraphNode {
  if (!isObject(value)) {
    errors.push(`${path} must be a paragraph object.`);
    return false;
  }

  if (!hasOnlyKeys(value, ['type', 'content'])) {
    errors.push(`${path} paragraph contains unsupported properties.`);
  }
  if (value.type !== 'paragraph') {
    errors.push(`${path}.type must be "paragraph".`);
  }

  const nestedErrors: string[] = [];
  validateTextContent(value.content, `${path}.content`, nestedErrors, {
    allowEmpty: true,
  });
  errors.push(...nestedErrors);

  return nestedErrors.length === 0;
}

function validateParagraphContainer(
  value: unknown,
  path: string,
  errors: string[],
): value is WritingParagraphNode[] {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(`${path} must contain one or more paragraphs.`);
    return false;
  }
  if (value.length > maxParagraphsPerContainer) {
    errors.push(
      `${path} must contain at most ${maxParagraphsPerContainer} paragraphs.`,
    );
  }

  value.forEach((paragraph, index) => {
    const nestedErrors: string[] = [];
    validateParagraph(paragraph, `${path}[${index}]`, nestedErrors);
    errors.push(...nestedErrors);
  });

  return errors.length === 0;
}

function validateListItem(
  value: unknown,
  path: string,
  errors: string[],
): value is WritingListItemNode {
  if (!isObject(value)) {
    errors.push(`${path} must be a list item object.`);
    return false;
  }

  if (!hasOnlyKeys(value, ['type', 'content'])) {
    errors.push(`${path} list item contains unsupported properties.`);
  }
  if (value.type !== 'listItem') {
    errors.push(`${path}.type must be "listItem".`);
  }

  const nestedErrors: string[] = [];
  validateParagraphContainer(value.content, `${path}.content`, nestedErrors);
  errors.push(...nestedErrors);

  return nestedErrors.length === 0;
}

function validateList(
  value: JsonObject,
  path: string,
  errors: string[],
): boolean {
  if (!hasOnlyKeys(value, ['type', 'content'])) {
    errors.push(`${path} list contains unsupported properties.`);
  }
  if (!Array.isArray(value.content) || value.content.length === 0) {
    errors.push(`${path}.content must contain one or more list items.`);
    return false;
  }
  if (value.content.length > maxListItems) {
    errors.push(`${path}.content must contain at most ${maxListItems} items.`);
  }

  value.content.forEach((item, index) => {
    const nestedErrors: string[] = [];
    validateListItem(item, `${path}.content[${index}]`, nestedErrors);
    errors.push(...nestedErrors);
  });

  return errors.length === 0;
}

function validateImage(
  value: unknown,
  path: string,
  errors: string[],
): value is WritingImageNode {
  if (!isObject(value)) {
    errors.push(`${path} must be an image object.`);
    return false;
  }

  if (!hasOnlyKeys(value, ['type', 'attrs'])) {
    errors.push(`${path} image contains unsupported properties.`);
  }
  if (value.type !== 'image') {
    errors.push(`${path}.type must be "image".`);
  }
  if (!isObject(value.attrs) || !hasOnlyKeys(value.attrs, ['assetId'])) {
    errors.push(`${path}.attrs must contain only assetId.`);
  } else if (
    typeof value.attrs.assetId !== 'string' ||
    !uuidPattern.test(value.attrs.assetId)
  ) {
    errors.push(`${path}.attrs.assetId must be a UUID.`);
  }

  return errors.length === 0;
}

function validateBlock(
  value: unknown,
  index: number,
  errors: string[],
): value is WritingBlockNode {
  const path = `content[${index}]`;
  if (!isObject(value)) {
    errors.push(`${path} must be an object.`);
    return false;
  }

  const before = errors.length;

  switch (value.type) {
    case 'paragraph':
      validateParagraph(value, path, errors);
      break;

    case 'heading': {
      if (!hasOnlyKeys(value, ['type', 'attrs', 'content'])) {
        errors.push(`${path} heading contains unsupported properties.`);
      }
      if (
        !isObject(value.attrs) ||
        !hasOnlyKeys(value.attrs, ['level']) ||
        (value.attrs.level !== 2 && value.attrs.level !== 3)
      ) {
        errors.push(`${path}.attrs.level must be 2 or 3.`);
      }
      const nestedErrors: string[] = [];
      validateTextContent(value.content, `${path}.content`, nestedErrors, {
        allowEmpty: false,
      });
      errors.push(...nestedErrors);
      break;
    }

    case 'bulletList':
    case 'orderedList':
      validateList(value, path, errors);
      break;

    case 'blockquote':
    case 'callout': {
      if (!hasOnlyKeys(value, ['type', 'content'])) {
        errors.push(`${path} ${value.type} contains unsupported properties.`);
      }
      const nestedErrors: string[] = [];
      validateParagraphContainer(value.content, `${path}.content`, nestedErrors);
      errors.push(...nestedErrors);
      break;
    }

    case 'codeBlock': {
      if (!hasOnlyKeys(value, ['type', 'attrs', 'content'])) {
        errors.push(`${path} code block contains unsupported properties.`);
      }
      if (value.attrs !== undefined) {
        if (
          !isObject(value.attrs) ||
          !hasOnlyKeys(value.attrs, ['language']) ||
          (value.attrs.language !== undefined &&
            value.attrs.language !== null &&
            (typeof value.attrs.language !== 'string' ||
              !languagePattern.test(value.attrs.language)))
        ) {
          errors.push(
            `${path}.attrs.language must be null or a short language identifier.`,
          );
        }
      }
      const nestedErrors: string[] = [];
      validateTextContent(value.content, `${path}.content`, nestedErrors, {
        allowEmpty: true,
      });
      errors.push(...nestedErrors);
      break;
    }

    case 'image':
      validateImage(value, path, errors);
      break;

    case 'gallery': {
      if (!hasOnlyKeys(value, ['type', 'content'])) {
        errors.push(`${path} gallery contains unsupported properties.`);
      }
      if (
        !Array.isArray(value.content) ||
        value.content.length < 2 ||
        value.content.length > maxGalleryImages
      ) {
        errors.push(
          `${path}.content must contain between 2 and ${maxGalleryImages} images.`,
        );
        break;
      }
      value.content.forEach((image, imageIndex) => {
        const nestedErrors: string[] = [];
        validateImage(
          image,
          `${path}.content[${imageIndex}]`,
          nestedErrors,
        );
        errors.push(...nestedErrors);
      });
      break;
    }

    default:
      errors.push(
        `${path}.type is unsupported. Tables and arbitrary layout nodes are not part of Writing schema v1.`,
      );
  }

  return errors.length === before;
}

export function validateWritingDocument(
  value: unknown,
): WritingDocumentValidationResult {
  const errors: string[] = [];

  if (!isObject(value)) {
    return {
      success: false,
      errors: ['Writing document must be an object.'],
    };
  }

  if (!hasOnlyKeys(value, ['version', 'type', 'content'])) {
    errors.push('Writing document contains unsupported top-level properties.');
  }
  if (value.version !== writingDocumentVersion) {
    errors.push(
      `Writing document version must be ${writingDocumentVersion}.`,
    );
  }
  if (value.type !== 'doc') {
    errors.push('Writing document type must be "doc".');
  }
  if (!Array.isArray(value.content) || value.content.length === 0) {
    errors.push('Writing document content must contain at least one block.');
  } else {
    if (value.content.length > maxBlocks) {
      errors.push(
        `Writing document content must contain at most ${maxBlocks} blocks.`,
      );
    }
    value.content.forEach((block, index) => {
      validateBlock(block, index, errors);
    });
  }

  return {
    success: errors.length === 0,
    errors,
  };
}

export function parseWritingDocument(value: unknown): WritingDocument | null {
  const validation = validateWritingDocument(value);
  return validation.success ? (value as WritingDocument) : null;
}

export function writingDocumentAssetIds(document: WritingDocument): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();

  const add = (assetId: string) => {
    if (seen.has(assetId)) return;
    seen.add(assetId);
    ids.push(assetId);
  };

  for (const block of document.content) {
    if (block.type === 'image') {
      add(block.attrs.assetId);
    } else if (block.type === 'gallery') {
      for (const image of block.content) {
        add(image.attrs.assetId);
      }
    }
  }

  return ids;
}

export function writingDocumentFromPlainText(
  value: string | null | undefined,
): WritingDocument {
  const normalized = value?.replace(/\r\n?/g, '\n').trim() ?? '';
  const paragraphs =
    normalized === ''
      ? ['']
      : normalized
          .split(/\n\s*\n/)
          .map((paragraph) => paragraph.replace(/\s*\n\s*/g, ' ').trim());

  return {
    version: writingDocumentVersion,
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

function textNodesToPlainText(content: WritingTextNode[] | undefined): string {
  return (content ?? []).map((node) => node.text).join('');
}

function paragraphsToPlainText(content: WritingParagraphNode[]): string {
  return content
    .map((paragraph) => textNodesToPlainText(paragraph.content))
    .filter(Boolean)
    .join('\n\n');
}

function blockToPlainText(block: WritingBlockNode): string {
  switch (block.type) {
    case 'paragraph':
    case 'heading':
      return textNodesToPlainText(block.content);

    case 'bulletList':
      return block.content
        .map((item) => `• ${paragraphsToPlainText(item.content)}`)
        .join('\n');

    case 'orderedList':
      return block.content
        .map(
          (item, index) =>
            `${index + 1}. ${paragraphsToPlainText(item.content)}`,
        )
        .join('\n');

    case 'blockquote':
    case 'callout':
      return paragraphsToPlainText(block.content);

    case 'codeBlock':
      return textNodesToPlainText(block.content);

    case 'image':
    case 'gallery':
      return '';
  }
}

export function writingDocumentToPlainText(document: WritingDocument): string {
  return document.content
    .map(blockToPlainText)
    .filter(Boolean)
    .join('\n\n')
    .trim();
}
