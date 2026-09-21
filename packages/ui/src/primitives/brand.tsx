import type {
  AnchorHTMLAttributes,
  SVGAttributes,
} from 'react';

export interface BrandMarkProps extends SVGAttributes<SVGSVGElement> {
  title?: string;
}

export function BrandMark({
  className,
  title,
  ...props
}: BrandMarkProps) {
  const labelled = title !== undefined;

  return (
    <svg
      aria-hidden={labelled ? undefined : true}
      aria-label={labelled ? title : undefined}
      className={['aks-brand-mark', className].filter(Boolean).join(' ')}
      fill="none"
      role={labelled ? 'img' : undefined}
      viewBox="0 0 24 24"
      {...props}
    >
      <path
        d="M5 7.25V5h5.25M19 7.25V5h-5.25M5 16.75V19h5.25M19 16.75V19h-5.25"
        stroke="currentColor"
        strokeLinecap="square"
        strokeWidth="1.75"
      />
      <path
        d="M8.25 12h7.5M12 8.25v7.5"
        stroke="currentColor"
        strokeLinecap="square"
        strokeWidth="1.5"
      />
      <rect
        height="3.5"
        rx="0.35"
        stroke="currentColor"
        strokeWidth="1.5"
        width="3.5"
        x="10.25"
        y="10.25"
      />
    </svg>
  );
}

export interface BrandSignatureProps
  extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'children'> {
  label?: string;
  size?: 'sm' | 'md';
}

export function BrandSignature({
  className,
  label = 'AkikSystems',
  size = 'md',
  ...props
}: BrandSignatureProps) {
  return (
    <a
      className={['aks-brand-signature', className].filter(Boolean).join(' ')}
      data-size={size}
      {...props}
    >
      <BrandMark />
      <span className="aks-brand-wordmark">{label}</span>
    </a>
  );
}
