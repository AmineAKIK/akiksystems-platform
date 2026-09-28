import { Link as RouterLink } from 'react-router';

import type { SystemsAction, SystemsMedia, SystemsStatus } from '../../content/systems.types';

export function SystemsMediaPicture({
  className,
  media,
}: {
  className?: string;
  media: SystemsMedia;
}) {
  return (
    <picture className={className} data-placeholder-media={media.placeholder || undefined}>
      <source srcSet={media.avif} type="image/avif" />
      <source srcSet={media.webp} type="image/webp" />
      <img
        alt={media.alt}
        decoding="async"
        fetchPriority={media.priority ? 'high' : 'auto'}
        height={media.height}
        loading={media.priority ? 'eager' : 'lazy'}
        src={media.webp}
        width={media.width}
      />
    </picture>
  );
}

export function SystemsActionLink({
  action,
  className = '',
}: {
  action: SystemsAction;
  className?: string;
}) {
  const classes = `aks-systems-action aks-systems-action-${action.kind} ${className}`.trim();
  const content = (
    <>
      <span>{action.label}</span>
      <span aria-hidden="true" className="aks-systems-action-arrow">
        ↗
      </span>
    </>
  );

  if (action.href.startsWith('/')) {
    return (
      <RouterLink className={classes} prefetch="intent" to={action.href} viewTransition>
        {content}
      </RouterLink>
    );
  }

  return (
    <a className={classes} href={action.href}>
      {content}
    </a>
  );
}

const statusIcons: Record<SystemsStatus, string> = {
  archived: '—',
  building: '●',
  deployed: '●',
  experimental: '◇',
  private: '◆',
};

export function SystemsStatusBadge({ label, status }: { label: string; status: SystemsStatus }) {
  return (
    <span className="aks-systems-status" data-status={status}>
      <span aria-hidden="true" className="aks-systems-status-icon">
        {statusIcons[status]}
      </span>
      <span>{label}</span>
    </span>
  );
}
