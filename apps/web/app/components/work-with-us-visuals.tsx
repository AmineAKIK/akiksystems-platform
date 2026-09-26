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
      <defs>
        <mask
          id="aks-work-with-us-terrain-marker-cutout"
          maskUnits="userSpaceOnUse"
          x="0"
          y="0"
          width="24"
          height="24"
        >
          <rect x="0" y="0" width="24" height="24" fill="white" />
          <path
            d="M12 2.8a3.1 3.1 0 0 0-3.1 3.1c0 2.4 3.1 5.4 3.1 5.4s3.1-3 3.1-5.4A3.1 3.1 0 0 0 12 2.8Z"
            fill="black"
            stroke="black"
            strokeWidth="1.6"
          />
        </mask>
      </defs>

      <g className="aks-work-with-us-approach-artwork">
        <g
          className="aks-work-with-us-terrain-map"
          mask="url(#aks-work-with-us-terrain-marker-cutout)"
        >
          <path d="M3.5 8.1 8.5 5.7l7 2.4 5-2.4v12.6l-5 2.4-7-2.4-5 2.4Z" />
          <path d="M8.5 5.7v12.6M15.5 8.1v12.6" />
        </g>

        <g className="aks-work-with-us-terrain-marker">
          <path d="M12 2.8a3.1 3.1 0 0 0-3.1 3.1c0 2.4 3.1 5.4 3.1 5.4s3.1-3 3.1-5.4A3.1 3.1 0 0 0 12 2.8Z" />
          <circle
            className="aks-work-with-us-approach-glyph-dot"
            cx="12"
            cy="5.9"
            r="0.78"
          />
        </g>
      </g>
    </>
  );
}

function StructureGlyph() {
  return (
    <g className="aks-work-with-us-approach-artwork">
      <rect x="3.5" y="4.5" width="5" height="4.5" rx="1.25" />
      <rect x="15.5" y="4.5" width="5" height="4.5" rx="1.25" />
      <rect x="9.5" y="15" width="5" height="4.5" rx="1.25" />
      <path d="M6 9v2.5h12V9M12 11.5V15" />
    </g>
  );
}

function BuildGlyph() {
  return (
    <g
      className="aks-work-with-us-approach-artwork aks-work-with-us-spiral-artwork"
      transform="translate(0 1.05)"
    >
      <path d="M19.4 12.1c0-4.35-3.42-7.73-7.67-7.73-3.87 0-7.05 3.07-7.05 6.9 0 3.55 2.84 6.37 6.37 6.37 3.17 0 5.72-2.5 5.72-5.65 0-2.76-2.2-4.94-4.93-4.94-2.34 0-4.22 1.86-4.22 4.19 0 1.96 1.57 3.5 3.51 3.5 1.55 0 2.79-1.22 2.79-2.76 0-1.13-.9-2.03-2.02-2.03-.8 0-1.44.63-1.44 1.42 0 .52.41.93.92.93" />
    </g>
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
