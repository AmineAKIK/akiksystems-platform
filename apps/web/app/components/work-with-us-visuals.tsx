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
      <circle
        className="aks-work-with-us-approach-glyph-frame"
        cx="48"
        cy="48"
        r="32"
      />
      <path
        className="aks-work-with-us-approach-glyph-line-soft"
        d="M25 61 C31 52 36 48 43 46"
      />
      <circle
        className="aks-work-with-us-approach-glyph-focus-shape"
        cx="46"
        cy="41"
        r="12"
      />
      <path
        className="aks-work-with-us-approach-glyph-line"
        d="M55 50 L67 62"
      />
      <circle
        className="aks-work-with-us-approach-glyph-point"
        cx="29"
        cy="57"
        r="2.3"
      />
      <circle
        className="aks-work-with-us-approach-glyph-point aks-work-with-us-approach-glyph-point-muted"
        cx="36"
        cy="49"
        r="1.7"
      />
      <circle
        className="aks-work-with-us-approach-glyph-point"
        cx="44"
        cy="39"
        r="2"
      />
    </>
  );
}

function StructureGlyph() {
  return (
    <>
      <circle
        className="aks-work-with-us-approach-glyph-frame"
        cx="48"
        cy="48"
        r="32"
      />
      <path
        className="aks-work-with-us-approach-glyph-line"
        d="M48 40 V49 M36 49 H60 M36 49 V56 M60 49 V56"
      />
      <rect
        className="aks-work-with-us-approach-glyph-focus-shape"
        x="39"
        y="28"
        width="18"
        height="12"
        rx="3"
      />
      <rect
        className="aks-work-with-us-approach-glyph-node-shape"
        x="27"
        y="56"
        width="18"
        height="12"
        rx="3"
      />
      <rect
        className="aks-work-with-us-approach-glyph-node-shape"
        x="51"
        y="56"
        width="18"
        height="12"
        rx="3"
      />
      <circle
        className="aks-work-with-us-approach-glyph-point"
        cx="48"
        cy="49"
        r="2.2"
      />
    </>
  );
}

function BuildGlyph() {
  return (
    <>
      <circle
        className="aks-work-with-us-approach-glyph-frame"
        cx="48"
        cy="48"
        r="32"
      />
      <path
        className="aks-work-with-us-approach-glyph-focus-shape"
        d="M30 41 L47 31 L64 41 L47 51 Z"
      />
      <path
        className="aks-work-with-us-approach-glyph-line-soft"
        d="M30 51 L47 61 L64 51 M30 61 L47 71 L64 61"
      />
      <path
        className="aks-work-with-us-approach-glyph-line aks-work-with-us-approach-glyph-accent"
        d="M57 34 L68 23 M61 23 H68 V30"
      />
      <circle
        className="aks-work-with-us-approach-glyph-point"
        cx="47"
        cy="51"
        r="2"
      />
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
      <svg viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">
        {kind === 'understand' ? <UnderstandGlyph /> : null}
        {kind === 'structure' ? <StructureGlyph /> : null}
        {kind === 'build' ? <BuildGlyph /> : null}
      </svg>
    </span>
  );
}
