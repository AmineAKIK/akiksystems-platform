import type { ButtonHTMLAttributes, ReactNode } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  emphasis?: 'primary' | 'quiet';
}

export function Button({
  children,
  className,
  emphasis = 'primary',
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      className={['aks-button', className].filter(Boolean).join(' ')}
      data-emphasis={emphasis}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}
