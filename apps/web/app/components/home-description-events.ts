export const homeDescriptionEvent = 'akiksystems:home-description';

export interface HomeDescriptionDetail {
  label: string;
  description: string;
}

export interface HomeDescriptionEventDetail {
  channel: 'focus' | 'pointer';
  content: HomeDescriptionDetail | null;
}

export function announceHomeDescription(detail: HomeDescriptionEventDetail) {
  window.dispatchEvent(new CustomEvent(homeDescriptionEvent, { detail }));
}
