import type { HTMLAttributes, ReactNode } from 'react';

export interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  width?: 'content' | 'wide';
}

export function Container({
  children,
  className,
  width = 'content',
  ...props
}: ContainerProps) {
  return (
    <div
      className={['aks-container', className].filter(Boolean).join(' ')}
      data-width={width}
      {...props}
    >
      {children}
    </div>
  );
}
