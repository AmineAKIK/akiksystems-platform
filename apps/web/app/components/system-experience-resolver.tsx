import type { SystemPresentationKind } from '@akiksystems/core';
import type { ComponentType } from 'react';

import { GuidedDemoSystemRenderer } from './guided-demo-system-renderer';
import {
  StandardSystemRenderer,
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
  return <StandardSystemRenderer {...props} />;
}

function GuidedDemoSystemExperience(props: SystemDetailViewProps) {
  return <GuidedDemoSystemRenderer {...props} />;
}

function InteractiveEntrySystemExperience(props: SystemDetailViewProps) {
  return <StandardSystemRenderer {...props} />;
}

const rendererById = {
  standard: StandardSystemExperience,
  'guided-demo': GuidedDemoSystemExperience,
  'interactive-entry': InteractiveEntrySystemExperience,
} as const satisfies Record<
  SystemExperienceRendererId,
  ComponentType<SystemDetailViewProps>
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
