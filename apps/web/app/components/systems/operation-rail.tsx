import type { SystemsRailItem } from '../../content/systems.types';

export function OperationRail({ items }: { items: SystemsRailItem[] }) {
  return (
    <nav aria-label="Systems workflow" className="aks-systems-operation-rail">
      <ol>
        {items.map((item) => (
          <li key={item.index}>
            <a href={item.target}>
              <span>{item.label}</span>
              <strong>{item.index}</strong>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
