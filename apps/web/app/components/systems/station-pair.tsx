import type { SystemsStation } from '../../content/systems.types';
import { SystemsActionLink, SystemsMediaPicture, SystemsStatusBadge } from './systems-ui';

function StationCard({ station }: { station: SystemsStation }) {
  return (
    <article
      className="aks-station-card"
      data-placeholder-content={station.placeholder || undefined}
      id={station.id}
    >
      <SystemsMediaPicture className="aks-station-card-media" media={station.media} />
      <div className="aks-station-card-copy">
        <div className="aks-station-heading-row">
          <h3>{station.name}</h3>
          <SystemsStatusBadge label={station.statusLabel} status={station.status} />
        </div>
        <p>{station.function}</p>
        <SystemsActionLink action={station.action} />
      </div>
    </article>
  );
}

export function StationPair({ stations }: { stations: [SystemsStation, SystemsStation] }) {
  return (
    <div className="aks-station-pair" data-systems-reveal>
      {stations.map((station) => (
        <StationCard key={station.name} station={station} />
      ))}
    </div>
  );
}
