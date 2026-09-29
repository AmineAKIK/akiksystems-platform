/**
 * Mounts the interactive ProtoCap map into `root` and returns its cleanup. The map is written
 * in French; `dictionary` maps its French strings to another language.
 */
export function mountProtocapMap(
  root: HTMLElement,
  dictionary?: Record<string, string>,
): () => void;
