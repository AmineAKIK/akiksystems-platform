export const presentationDocumentVersion = 1 as const;

export type PresentationDocumentVersion = typeof presentationDocumentVersion;

export interface PresentationDocument {
  version: PresentationDocumentVersion;
  blocks: PresentationBlock[];
}

export type PresentationBlock =
  | PresentationHeadingBlock
  | PresentationParagraphBlock
  | PresentationListBlock
  | PresentationCodeBlock
  | PresentationImageBlock
  | PresentationQuoteBlock;

export interface PresentationHeadingBlock {
  type: 'heading';
  level: 2 | 3;
  text: string;
}

export interface PresentationParagraphBlock {
  type: 'paragraph';
  text: string;
}

export interface PresentationListBlock {
  type: 'list';
  style: 'unordered' | 'ordered';
  items: string[];
}

export interface PresentationCodeBlock {
  type: 'code';
  code: string;
  language: string | null;
}

export interface PresentationImageBlock {
  type: 'image';
  assetId: string;
}

export interface PresentationQuoteBlock {
  type: 'quote';
  text: string;
  attribution: string | null;
}

export interface PresentationDocumentValidationResult {
  success: boolean;
  errors: string[];
}

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasOnlyKeys(value: JsonObject, keys: readonly string[]): boolean {
  return Object.keys(value).every((key) => keys.includes(key));
}

function isNonEmptyText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isNullableText(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function validateBlock(
  block: unknown,
  index: number,
  errors: string[],
): block is PresentationBlock {
  if (!isObject(block)) {
    errors.push(`blocks[${index}] must be an object.`);
    return false;
  }

  switch (block.type) {
    case 'heading': {
      if (!hasOnlyKeys(block, ['type', 'level', 'text'])) {
        errors.push(`blocks[${index}] heading contains unsupported properties.`);
      }
      if (block.level !== 2 && block.level !== 3) {
        errors.push(`blocks[${index}].level must be 2 or 3.`);
      }
      if (!isNonEmptyText(block.text)) {
        errors.push(`blocks[${index}].text must be non-empty text.`);
      }
      break;
    }

    case 'paragraph': {
      if (!hasOnlyKeys(block, ['type', 'text'])) {
        errors.push(`blocks[${index}] paragraph contains unsupported properties.`);
      }
      if (!isNonEmptyText(block.text)) {
        errors.push(`blocks[${index}].text must be non-empty text.`);
      }
      break;
    }

    case 'list': {
      if (!hasOnlyKeys(block, ['type', 'style', 'items'])) {
        errors.push(`blocks[${index}] list contains unsupported properties.`);
      }
      if (block.style !== 'unordered' && block.style !== 'ordered') {
        errors.push(
          `blocks[${index}].style must be "unordered" or "ordered".`,
        );
      }
      if (
        !Array.isArray(block.items) ||
        block.items.length === 0 ||
        !block.items.every(isNonEmptyText)
      ) {
        errors.push(
          `blocks[${index}].items must contain one or more non-empty text items.`,
        );
      }
      break;
    }

    case 'code': {
      if (!hasOnlyKeys(block, ['type', 'code', 'language'])) {
        errors.push(`blocks[${index}] code contains unsupported properties.`);
      }
      if (!isNonEmptyText(block.code)) {
        errors.push(`blocks[${index}].code must be non-empty text.`);
      }
      if (!isNullableText(block.language)) {
        errors.push(`blocks[${index}].language must be text or null.`);
      }
      break;
    }

    case 'image': {
      if (!hasOnlyKeys(block, ['type', 'assetId'])) {
        errors.push(`blocks[${index}] image contains unsupported properties.`);
      }
      if (!isNonEmptyText(block.assetId)) {
        errors.push(`blocks[${index}].assetId must be a non-empty asset ID.`);
      }
      break;
    }

    case 'quote': {
      if (!hasOnlyKeys(block, ['type', 'text', 'attribution'])) {
        errors.push(`blocks[${index}] quote contains unsupported properties.`);
      }
      if (!isNonEmptyText(block.text)) {
        errors.push(`blocks[${index}].text must be non-empty text.`);
      }
      if (!isNullableText(block.attribution)) {
        errors.push(`blocks[${index}].attribution must be text or null.`);
      }
      break;
    }

    default:
      errors.push(
        `blocks[${index}].type must be heading, paragraph, list, code, image, or quote.`,
      );
  }

  return errors.length === 0;
}

export function validatePresentationDocument(
  value: unknown,
): PresentationDocumentValidationResult {
  const errors: string[] = [];

  if (!isObject(value)) {
    return {
      success: false,
      errors: ['presentation_document must be an object.'],
    };
  }

  if (!hasOnlyKeys(value, ['version', 'blocks'])) {
    errors.push(
      'presentation_document contains unsupported top-level properties.',
    );
  }

  if (value.version !== presentationDocumentVersion) {
    errors.push(
      `presentation_document.version must be ${presentationDocumentVersion}.`,
    );
  }

  if (!Array.isArray(value.blocks)) {
    errors.push('presentation_document.blocks must be an array.');
  } else {
    value.blocks.forEach((block, index) => {
      const blockErrorsBefore = errors.length;
      validateBlock(block, index, errors);

      if (errors.length === blockErrorsBefore && isObject(block)) {
        if ('html' in block || 'layout' in block || 'style' in block && block.type !== 'list') {
          errors.push(
            `blocks[${index}] contains page-builder or raw HTML semantics.`,
          );
        }
      }
    });
  }

  return {
    success: errors.length === 0,
    errors,
  };
}

export function parsePresentationDocument(value: unknown): PresentationDocument {
  const result = validatePresentationDocument(value);

  if (!result.success) {
    throw new Error(
      `Invalid presentation document: ${result.errors.join(' ')}`,
    );
  }

  return value as PresentationDocument;
}
