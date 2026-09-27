import type { SVGProps } from 'react';

export type ProfileIconName =
  | 'arrow-up-right'
  | 'check'
  | 'code'
  | 'collaboration'
  | 'data'
  | 'deploy'
  | 'design'
  | 'documentation'
  | 'email'
  | 'field'
  | 'frame'
  | 'github'
  | 'infrastructure'
  | 'linkedin'
  | 'management'
  | 'operate'
  | 'phone'
  | 'quality'
  | 'system'
  | 'test'
  | 'transparency'
  | 'validate'
  | 'evolve';

export function ProfileIcon({
  name,
  ...props
}: SVGProps<SVGSVGElement> & { name: ProfileIconName }) {
  const common = {
    fill: 'none',
    stroke: 'currentColor',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    strokeWidth: 1.6,
  };

  switch (name) {
    case 'linkedin':
      return (
        <svg viewBox="0 0 24 24" {...common} {...props}>
          <rect height="18" rx="3" width="18" x="3" y="3" />
          <path d="M8 10v7M8 7v.01M12 17v-7M12 13a3 3 0 0 1 6 0v4" />
        </svg>
      );
    case 'github':
      return (
        <svg viewBox="0 0 24 24" {...common} {...props}>
          <path d="M8 8l-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14" />
        </svg>
      );
    case 'email':
      return (
        <svg viewBox="0 0 24 24" {...common} {...props}>
          <rect height="14" rx="2" width="18" x="3" y="5" />
          <path d="m3 7 9 6 9-6" />
        </svg>
      );
    case 'phone':
      return (
        <svg viewBox="0 0 24 24" {...common} {...props}>
          <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
        </svg>
      );
    case 'system':
      return (
        <svg viewBox="0 0 24 24" {...common} {...props}>
          <path d="m12 2 9 5-9 5-9-5 9-5Z" />
          <path d="m3 12 9 5 9-5M3 17l9 5 9-5" />
        </svg>
      );
    case 'code':
      return (
        <svg viewBox="0 0 24 24" {...common} {...props}>
          <path d="m8 8-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14" />
        </svg>
      );
    case 'management':
      return (
        <svg viewBox="0 0 24 24" {...common} {...props}>
          <path d="M4 19V9l8-5 8 5v10M8 19v-6h8v6M7 8h.01M12 8h.01M17 8h.01" />
        </svg>
      );
    case 'field':
      return (
        <svg viewBox="0 0 24 24" {...common} {...props}>
          <path d="M4 19h16M6 19V8l6-4 6 4v11M9 19v-5h6v5M9 10h.01M15 10h.01" />
        </svg>
      );
    case 'infrastructure':
      return (
        <svg viewBox="0 0 24 24" {...common} {...props}>
          <rect height="6" rx="1" width="16" x="4" y="3" />
          <rect height="6" rx="1" width="16" x="4" y="15" />
          <path d="M8 6h.01M8 18h.01M12 9v6" />
        </svg>
      );
    case 'frame':
      return (
        <svg viewBox="0 0 24 24" {...common} {...props}>
          <path d="M4 7V4h3M17 4h3v3M20 17v3h-3M7 20H4v-3M8 12h8" />
        </svg>
      );
    case 'design':
      return (
        <svg viewBox="0 0 24 24" {...common} {...props}>
          <path d="m4 20 4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20Z" />
          <path d="m14.5 7.5 3 3" />
        </svg>
      );
    case 'validate':
    case 'check':
      return (
        <svg viewBox="0 0 24 24" {...common} {...props}>
          <path d="m5 12 4 4L19 6" />
        </svg>
      );
    case 'test':
    case 'quality':
      return (
        <svg viewBox="0 0 24 24" {...common} {...props}>
          <path d="M9 3h6M10 3v5l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3" />
          <path d="M8 15h8" />
        </svg>
      );
    case 'deploy':
      return (
        <svg viewBox="0 0 24 24" {...common} {...props}>
          <path d="m12 2 9 5-9 5-9-5 9-5ZM3 12l9 5 9-5M12 12v10" />
        </svg>
      );
    case 'operate':
      return (
        <svg viewBox="0 0 24 24" {...common} {...props}>
          <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
    case 'evolve':
      return (
        <svg viewBox="0 0 24 24" {...common} {...props}>
          <path d="M20 12a8 8 0 1 1-2.3-5.6M20 4v5h-5" />
        </svg>
      );
    case 'collaboration':
      return (
        <svg viewBox="0 0 24 24" {...common} {...props}>
          <path d="M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM16 11a3 3 0 1 0 0-6" />
          <path d="M2 20a6 6 0 0 1 12 0M14 14a6 6 0 0 1 8 6" />
        </svg>
      );
    case 'documentation':
      return (
        <svg viewBox="0 0 24 24" {...common} {...props}>
          <path d="M6 3h9l3 3v15H6V3Z" />
          <path d="M15 3v4h4M9 12h6M9 16h6" />
        </svg>
      );
    case 'transparency':
      return (
        <svg viewBox="0 0 24 24" {...common} {...props}>
          <path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12Z" />
          <circle cx="12" cy="12" r="2.5" />
        </svg>
      );
    case 'data':
      return (
        <svg viewBox="0 0 24 24" {...common} {...props}>
          <ellipse cx="12" cy="6" rx="8" ry="3" />
          <path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" />
        </svg>
      );
    case 'arrow-up-right':
      return (
        <svg viewBox="0 0 24 24" {...common} {...props}>
          <path d="M7 17 17 7M8 7h9v9" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" {...common} {...props}>
          <circle cx="12" cy="12" r="8" />
        </svg>
      );
  }
}
