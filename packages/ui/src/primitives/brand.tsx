import type {
  AnchorHTMLAttributes,
  ImgHTMLAttributes,
} from 'react';

export interface BrandMarkProps
  extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'alt' | 'src'> {
  title?: string;
}

export function BrandMark({
  className,
  title,
  ...props
}: BrandMarkProps) {
  const labelled = title !== undefined;

  return (
    <img
      alt={labelled ? title : ''}
      aria-hidden={labelled ? undefined : true}
      className={['aks-brand-mark', className].filter(Boolean).join(' ')}
      decoding="async"
      draggable={false}
      height={2048}
      src="/brand/AKSYS.svg"
      width={2048}
      {...props}
    />
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
