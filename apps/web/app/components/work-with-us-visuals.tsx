import { BrandMark } from '@akiksystems/ui';

export type WorkWithUsApproachKind =
  | 'understand'
  | 'structure'
  | 'build';

export function WorkWithUsBrandVisual() {
  return (
    <div aria-hidden="true" className="aks-work-with-us-brand-field">
      <BrandMark className="aks-work-with-us-brand-mark" />
    </div>
  );
}

function UnderstandGlyph() {
  return (
    <>
      <path d="M3.5 12s3.1-5 8.5-5 8.5 5 8.5 5-3.1 5-8.5 5-8.5-5-8.5-5Z" />
      <circle cx="12" cy="12" r="2.75" />
    </>
  );
}

function StructureGlyph() {
  return (
    <>
      <rect x="3" y="4" width="6" height="5" rx="1.4" />
      <rect x="15" y="4" width="6" height="5" rx="1.4" />
      <rect x="9" y="15" width="6" height="5" rx="1.4" />
      <path d="M6 9v2.5h12V9M12 11.5V15" />
    </>
  );
}

function BuildGlyph() {
  return (
    <>
      <path d="M12 3 20 7.5 12 12 4 7.5 12 3Z" />
      <path d="m4 12 8 4.5 8-4.5" />
      <path d="m4 16.5 8 4.5 8-4.5" />
    </>
  );
}

export function WorkWithUsApproachGlyph({
  kind,
}: {
  kind: WorkWithUsApproachKind;
}) {
  return (
    <span
      aria-hidden="true"
      className="aks-work-with-us-approach-glyph"
      data-kind={kind}
    >
      <svg
        fill="none"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        {kind === 'understand' ? <UnderstandGlyph /> : null}
        {kind === 'structure' ? <StructureGlyph /> : null}
        {kind === 'build' ? <BuildGlyph /> : null}
      </svg>
    </span>
  );
}
