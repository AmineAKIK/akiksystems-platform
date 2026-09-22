import {
  validatePresentationDocument,
  type PresentationDocument,
} from './presentation-document.js';

export interface SystemPublicationCandidate {
  slug: string | null;
  title: string | null;
  summary: string | null;
  proofRole: string | null;
  proofMaturity: string | null;
  proofDemoNature: string | null;
  proofDataNature: string | null;
  proofLimits: string | null;
  presentationDocument: PresentationDocument | null;
}

export interface SystemPublicationReadiness {
  ready: boolean;
  errors: string[];
}

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function hasText(value: string | null): value is string {
  return value !== null && value.trim().length > 0;
}

export function validateSystemPublicationReadiness(
  candidate: SystemPublicationCandidate,
): SystemPublicationReadiness {
  const errors: string[] = [];

  if (!hasText(candidate.slug)) {
    errors.push('Slug is required before publication.');
  } else if (!slugPattern.test(candidate.slug)) {
    errors.push(
      'Slug must use lowercase letters, numbers, and single hyphens only.',
    );
  }

  if (!hasText(candidate.title)) {
    errors.push('Title is required before publication.');
  }

  if (!hasText(candidate.summary)) {
    errors.push('Summary is required before publication.');
  }

  if (!hasText(candidate.proofRole)) {
    errors.push('Proof role is required before publication.');
  }

  if (!hasText(candidate.proofMaturity)) {
    errors.push('Proof maturity is required before publication.');
  }

  if (!hasText(candidate.proofDemoNature)) {
    errors.push('Demo nature is required before publication.');
  }

  if (!hasText(candidate.proofDataNature)) {
    errors.push('Data nature is required before publication.');
  }

  if (!hasText(candidate.proofLimits)) {
    errors.push('Relevant limits are required before publication.');
  }

  if (candidate.presentationDocument === null) {
    errors.push('Presentation document is required before publication.');
  } else {
    const validation = validatePresentationDocument(
      candidate.presentationDocument,
    );

    if (!validation.success) {
      errors.push(
        ...validation.errors.map(
          (error) => `Presentation document: ${error}`,
        ),
      );
    } else if (candidate.presentationDocument.blocks.length === 0) {
      errors.push(
        'Presentation document must contain at least one block before publication.',
      );
    }
  }

  return {
    ready: errors.length === 0,
    errors,
  };
}
