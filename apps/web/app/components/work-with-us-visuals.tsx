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
      <circle cx="10.5" cy="10.5" r="5.75" />
      <path d="m14.8 14.8 4.7 4.7" />
      <circle
        className="aks-work-with-us-approach-glyph-dot"
        cx="8"
        cy="9"
        r="0.7"
      />
      <circle
        className="aks-work-with-us-approach-glyph-dot"
        cx="11.5"
        cy="8"
        r="0.7"
      />
      <circle
        className="aks-work-with-us-approach-glyph-dot"
        cx="10"
        cy="12"
        r="0.7"
      />
    </>
  );
}

function StructureGlyph() {
  return (
    <>
      <rect x="3.5" y="4.5" width="5" height="4.5" rx="1.25" />
      <rect x="15.5" y="4.5" width="5" height="4.5" rx="1.25" />
      <rect x="9.5" y="15" width="5" height="4.5" rx="1.25" />
      <path d="M6 9v2.5h12V9M12 11.5V15" />
    </>
  );
}

function BuildGlyph() {
  return (
    <>
      <rect x="9" y="9" width="6" height="6" rx="1.4" />
      <path d="M5.2 9A7.6 7.6 0 0 1 18 5.8" />
      <path d="m17.7 3 .3 2.8-2.8.3" />
      <path d="M18.8 15A7.6 7.6 0 0 1 6 18.2" />
      <path d="m6.3 21-.3-2.8 2.8-.3" />
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
