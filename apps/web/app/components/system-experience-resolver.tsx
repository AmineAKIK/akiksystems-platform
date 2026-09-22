import type { SystemPresentationKind } from '@akiksystems/core';

import {
  SystemDetailView,
  type SystemDetailViewProps,
} from './system-detail-view';

export type SystemExperienceRendererId =
  | 'standard'
  | 'guided-demo'
  | 'interactive-entry';

export const systemExperienceRendererByKind = {
  standard: 'standard',
  guided_demo: 'guided-demo',
  interactive_entry: 'interactive-entry',
} as const satisfies Record<SystemPresentationKind, SystemExperienceRendererId>;

export function resolveSystemExperience(
  presentationKind: SystemPresentationKind,
): SystemExperienceRendererId {
  return systemExperienceRendererByKind[presentationKind];
}

export interface SystemExperienceProps extends SystemDetailViewProps {
  presentationKind: SystemPresentationKind;
}

function StandardSystemExperience(props: SystemDetailViewProps) {
  return <SystemDetailView {...props} />;
}

function GuidedDemoSystemExperience(props: SystemDetailViewProps) {
  return <SystemDetailView {...props} />;
}

function InteractiveEntrySystemExperience(props: SystemDetailViewProps) {
  return <SystemDetailView {...props} />;
}

const rendererById = {
  standard: StandardSystemExperience,
  'guided-demo': GuidedDemoSystemExperience,
  'interactive-entry': InteractiveEntrySystemExperience,
} as const satisfies Record<
  SystemExperienceRendererId,
  (props: SystemDetailViewProps) => React.ReactNode
>;

export function SystemExperience({
  presentationKind,
  ...props
}: SystemExperienceProps) {
  const rendererId = resolveSystemExperience(presentationKind);
  const Renderer = rendererById[rendererId];

  return (
    <div
      className="aks-system-experience"
      data-presentation-kind={presentationKind}
      data-renderer={rendererId}
    >
      <Renderer {...props} />
    </div>
  );
}
