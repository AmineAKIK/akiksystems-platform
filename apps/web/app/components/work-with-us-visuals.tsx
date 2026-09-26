export type WorkWithUsApproachKind =
  | 'understand'
  | 'structure'
  | 'build';

const spiralPath =
  'M 375.6 93.6 L 415.6 108.2 L 448.5 128.9 L 472.3 154.3 L 485.8 182.5 L 488.3 211.7 L 480.0 240.0 L 461.7 265.6 L 434.9 287.0 L 401.5 302.8 L 363.9 312.2 L 324.6 314.9 L 286.2 310.7 L 251.1 300.3 L 221.5 284.4 L 199.1 264.3 L 185.1 241.3 L 180.2 217.1 L 184.3 193.3 L 197.0 171.3 L 217.1 152.5 L 243.1 138.0 L 273.0 128.6 L 304.9 124.8 L 336.6 126.5 L 366.1 133.5 L 391.5 145.2 L 411.3 160.5 L 424.6 178.3 L 430.6 197.5 L 429.4 216.7 L 421.2 234.7 L 406.9 250.3 L 387.6 262.6 L 364.9 271.1 L 340.4 275.3 L 315.7 275.1 L 292.5 270.7 L 272.1 262.7 L 255.9 251.7 L 244.5 238.6 L 238.6 224.4 L 238.3 210.0 L 243.2 196.4 L 252.7 184.5 L 266.0 174.9 L 282.0 168.1 L 299.4 164.5 L 317.0 164.0 L 333.6 166.5 L 348.2 171.7 L 359.9 178.9 L 368.2 187.7 L 372.7 197.2 L 373.4 206.7 L 370.6 215.7 L 364.7 223.5 L 356.5 229.8 L 346.6 234.1 L 335.9 236.4 L 325.3 236.7 L 315.5 235.2 L 307.2 232.1 L 300.8 227.9';

export function WorkWithUsSpiralVisual() {
  return (
    <div aria-hidden="true" className="aks-work-with-us-spiral-field">
      <svg
        className="aks-work-with-us-spiral"
        viewBox="0 0 640 420"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient
            id="work-with-us-spiral-stroke"
            gradientUnits="userSpaceOnUse"
            x1="170"
            x2="500"
            y1="310"
            y2="90"
          >
            <stop offset="0" stopColor="#88cddd" stopOpacity="0.14" />
            <stop offset="0.42" stopColor="#c2eef7" stopOpacity="0.46" />
            <stop offset="0.78" stopColor="#e7fbff" stopOpacity="0.82" />
            <stop offset="1" stopColor="#9dddec" stopOpacity="0.24" />
          </linearGradient>
        </defs>

        <path
          className="aks-work-with-us-spiral-glow"
          d={spiralPath}
          pathLength={1}
        />
        <path
          className="aks-work-with-us-spiral-path"
          d={spiralPath}
          pathLength={1}
          stroke="url(#work-with-us-spiral-stroke)"
        />

        <circle
          className="aks-work-with-us-spiral-node aks-work-with-us-spiral-node-a"
          cx="251.1"
          cy="300.3"
          r="2.2"
        />
        <circle
          className="aks-work-with-us-spiral-node aks-work-with-us-spiral-node-b"
          cx="421.2"
          cy="234.7"
          r="2"
        />
        <circle
          className="aks-work-with-us-spiral-node aks-work-with-us-spiral-node-c"
          cx="333.6"
          cy="166.5"
          r="1.8"
        />
        <circle
          className="aks-work-with-us-spiral-focus"
          cx="300.8"
          cy="227.9"
          r="3.2"
        />
      </svg>
    </div>
  );
}

function UnderstandGlyph() {
  return (
    <>
      <circle className="aks-work-with-us-approach-glyph-frame" cx="48" cy="48" r="31" />
      <path
        className="aks-work-with-us-approach-glyph-line"
        d="M24 58 C31 39 46 29 68 28 C75 28 80 30 83 33"
      />
      <circle className="aks-work-with-us-approach-glyph-point" cx="31" cy="48" r="2.5" />
      <circle className="aks-work-with-us-approach-glyph-point" cx="52" cy="31" r="2.1" />
      <circle className="aks-work-with-us-approach-glyph-point" cx="69" cy="53" r="2.8" />
    </>
  );
}

function StructureGlyph() {
  return (
    <>
      <circle className="aks-work-with-us-approach-glyph-frame" cx="48" cy="48" r="31" />
      <path
        className="aks-work-with-us-approach-glyph-line"
        d="M31 31 H65 M31 48 H65 M31 65 H65 M31 31 V65 M48 31 V65 M65 31 V65"
      />
      <rect
        className="aks-work-with-us-approach-glyph-focus-shape"
        x="44"
        y="44"
        width="8"
        height="8"
        rx="1.5"
      />
      <circle className="aks-work-with-us-approach-glyph-point" cx="31" cy="31" r="1.7" />
      <circle className="aks-work-with-us-approach-glyph-point" cx="65" cy="31" r="1.7" />
      <circle className="aks-work-with-us-approach-glyph-point" cx="31" cy="65" r="1.7" />
      <circle className="aks-work-with-us-approach-glyph-point" cx="65" cy="65" r="1.7" />
    </>
  );
}

function BuildGlyph() {
  return (
    <>
      <circle className="aks-work-with-us-approach-glyph-frame" cx="48" cy="48" r="31" />
      <path
        className="aks-work-with-us-approach-glyph-line"
        d="M48 31 L69 47 L61 69 H35 L27 47 Z M48 31 V52 M27 47 L48 52 L69 47 M35 69 L48 52 L61 69"
      />
      <circle className="aks-work-with-us-approach-glyph-point" cx="48" cy="31" r="2" />
      <circle className="aks-work-with-us-approach-glyph-point" cx="27" cy="47" r="2" />
      <circle className="aks-work-with-us-approach-glyph-point" cx="69" cy="47" r="2" />
      <circle className="aks-work-with-us-approach-glyph-point" cx="35" cy="69" r="2" />
      <circle className="aks-work-with-us-approach-glyph-point" cx="61" cy="69" r="2" />
      <circle className="aks-work-with-us-approach-glyph-focus" cx="48" cy="52" r="3.5" />
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
