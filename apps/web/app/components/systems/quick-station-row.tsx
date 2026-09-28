import type { SystemsStation } from '../../content/systems.types';
import { SystemsActionLink, SystemsMediaPicture, SystemsStatusBadge } from './systems-ui';

export function QuickStationRow({ station }: { station: SystemsStation }) {
  return (
    <article
      className="aks-quick-station"
      data-placeholder-content={station.placeholder || undefined}
      data-systems-reveal
      id={station.id}
    >
      <SystemsMediaPicture className="aks-quick-station-media" media={station.media} />
      <h3>{station.name}</h3>
      <p>{station.function}</p>
      <SystemsStatusBadge label={station.statusLabel} status={station.status} />
      <SystemsActionLink action={station.action} />
    </article>
  );
}
