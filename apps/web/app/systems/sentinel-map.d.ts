/**
 * Mounts the interactive Sentinel map into `root` and returns its cleanup. The map is written
 * in French; `dictionary` maps its French strings to another language.
 */
export function mountSentinelMap(
  root: HTMLElement,
  dictionary?: Record<string, string>,
): () => void;
