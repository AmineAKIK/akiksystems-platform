import type { HTMLAttributes, ReactNode } from 'react';

export interface HeadingProps extends HTMLAttributes<HTMLHeadingElement> {
  children: ReactNode;
  level?: 1 | 2 | 3;
  size?: 'sm' | 'md' | 'lg';
}

export function Heading({
  children,
  className,
  level = 2,
  size = 'md',
  ...props
}: HeadingProps) {
  const Component = level === 1 ? 'h1' : level === 2 ? 'h2' : 'h3';

  return (
    <Component
      className={['aks-heading', className].filter(Boolean).join(' ')}
      data-size={size}
      {...props}
    >
      {children}
    </Component>
  );
}
