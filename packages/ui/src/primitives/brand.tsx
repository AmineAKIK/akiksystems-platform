import type { AnchorHTMLAttributes, SVGAttributes } from 'react';

/** Vector groups of /brand/AKSYS.svg, drawn inline so the emblem stays crisp at any size. */
export const brandEmblemGroups = [
  'frame-and-serpent',
  'eagle',
  'leaf-left-upper',
  'leaf-right-upper',
  'leaf-left-middle',
  'leaf-right-middle',
  'leaf-right-lower',
  'leaf-left-lower',
  'star-center',
  'star-left',
  'star-right',
] as const;

export interface BrandMarkProps extends Omit<SVGAttributes<SVGSVGElement>, 'children'> {
  title?: string;
}

export function BrandMark({ className, title, ...props }: BrandMarkProps) {
  const labelled = title !== undefined;

  return (
    <svg
      aria-hidden={labelled ? undefined : true}
      className={['aks-brand-mark', className].filter(Boolean).join(' ')}
      focusable="false"
      role={labelled ? 'img' : undefined}
      viewBox="0 0 2048 2048"
      {...props}
    >
      {labelled ? <title>{title}</title> : null}
      {brandEmblemGroups.map((group) => (
        <use fill="currentColor" href={`/brand/AKSYS.svg#${group}`} key={group} />
      ))}
    </svg>
  );
}

export interface BrandSignatureProps extends Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  'children'
> {
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
