import type { HTMLAttributes, ReactNode } from 'react';

export interface TextProps extends HTMLAttributes<HTMLElement> {
  as?: 'p' | 'span';
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  tone?: 'default' | 'muted' | 'strong';
}

export function Text({
  as = 'p',
  children,
  className,
  size = 'md',
  tone = 'default',
  ...props
}: TextProps) {
  const Component = as;

  return (
    <Component
      className={['aks-text', className].filter(Boolean).join(' ')}
      data-size={size}
      data-tone={tone}
      {...props}
    >
      {children}
    </Component>
  );
}
