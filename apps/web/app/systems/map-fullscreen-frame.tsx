import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

type FullscreenDocument = Document & {
  webkitExitFullscreen?: () => Promise<void> | void;
  webkitFullscreenElement?: Element | null;
};

type FullscreenElement = HTMLDivElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

type ScrollLock = {
  body: Pick<CSSStyleDeclaration, 'left' | 'overflow' | 'position' | 'right' | 'top' | 'width'>;
  htmlOverflow: string;
  scrollY: number;
};

function fullscreenElement(documentNode: FullscreenDocument) {
  return documentNode.fullscreenElement ?? documentNode.webkitFullscreenElement ?? null;
}

function requestNativeFullscreen(node: FullscreenElement) {
  if (node.requestFullscreen) {
    return node.requestFullscreen({ navigationUI: 'hide' }).catch((error: unknown) => {
      if (error instanceof TypeError) return node.requestFullscreen();
      throw error;
    });
  }
  return Promise.resolve(node.webkitRequestFullscreen?.());
}

function exitNativeFullscreen(documentNode: FullscreenDocument) {
  if (documentNode.exitFullscreen) return documentNode.exitFullscreen();
  return Promise.resolve(documentNode.webkitExitFullscreen?.());
}

export function MapFullscreenFrame({
  children,
  locale,
  name,
}: {
  children: ReactNode;
  locale: 'en' | 'fr';
  name: string;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const fallbackActiveRef = useRef(false);
  const pendingRef = useRef(false);
  const scrollLockRef = useRef<ScrollLock | null>(null);
  const [active, setActive] = useState(false);
  const [pending, setPending] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [controlSlot, setControlSlot] = useState<Element | null>(null);
  const statusId = useId();

  useEffect(() => {
    const frame = frameRef.current;
    if (frame === null) return;
    let slot: Element | null = null;
    const syncSlot = () => {
      if (slot?.isConnected) return;
      const next = frame.querySelector('[data-map-fullscreen-slot]');
      if (next === slot) return;
      slot = next;
      setControlSlot(next);
    };
    // Maps mount lazily and rebuild their SVG when crossing the responsive breakpoint.
    // The control follows the reserved SVG slot, including the SVG's own scaling.
    const observer = new MutationObserver(syncSlot);
    observer.observe(frame, { childList: true, subtree: true });
    syncSlot();
    return () => observer.disconnect();
  }, []);

  const copy = useMemo(
    () =>
      locale === 'fr'
        ? {
            enter: 'Plein écran',
            enterLabel: `Afficher la carte ${name} en plein écran`,
            entered: `Carte ${name} affichée en plein écran. Appuyez sur Échap pour quitter.`,
            exit: 'Quitter',
            exitLabel: `Quitter le plein écran de la carte ${name}`,
            exited: `Plein écran de la carte ${name} fermé.`,
            failed: `Impossible d’ouvrir la carte ${name} en plein écran.`,
          }
        : {
            enter: 'Full screen',
            enterLabel: `Show the ${name} map in full screen`,
            entered: `${name} map shown in full screen. Press Escape to exit.`,
            exit: 'Exit',
            exitLabel: `Exit full screen for the ${name} map`,
            exited: `Full screen closed for the ${name} map.`,
            failed: `Unable to open the ${name} map in full screen.`,
          },
    [locale, name],
  );

  const restoreScroll = useCallback(() => {
    const lock = scrollLockRef.current;
    if (lock === null) return;
    const { body } = lock;
    Object.assign(document.body.style, body);
    document.documentElement.style.overflow = lock.htmlOverflow;
    scrollLockRef.current = null;
    // Wait for the fixed fullscreen layer to rejoin the document flow before restoring the
    // position. Restoring synchronously can be clamped against the temporarily shorter page.
    requestAnimationFrame(() => {
      window.scrollTo({ left: 0, top: lock.scrollY, behavior: 'instant' });
    });
  }, []);

  const closeFallback = useCallback(
    (restoreFocus = true) => {
      const frame = frameRef.current;
      if (!fallbackActiveRef.current || frame === null) return;
      fallbackActiveRef.current = false;
      delete frame.dataset.fullscreenMode;
      frame.dataset.fullscreenActive = 'false';
      restoreScroll();
      setActive(false);
      setAnnouncement(copy.exited);
      if (restoreFocus)
        requestAnimationFrame(() => buttonRef.current?.focus({ preventScroll: true }));
    },
    [copy.exited, restoreScroll],
  );

  const openFallback = useCallback(() => {
    const frame = frameRef.current;
    if (frame === null || fallbackActiveRef.current) return;
    const bodyStyle = document.body.style;
    const scrollY = window.scrollY;
    scrollLockRef.current = {
      body: {
        left: bodyStyle.left,
        overflow: bodyStyle.overflow,
        position: bodyStyle.position,
        right: bodyStyle.right,
        top: bodyStyle.top,
        width: bodyStyle.width,
      },
      htmlOverflow: document.documentElement.style.overflow,
      scrollY,
    };
    Object.assign(bodyStyle, {
      left: '0',
      overflow: 'hidden',
      position: 'fixed',
      right: '0',
      top: `-${scrollY}px`,
      width: '100%',
    });
    document.documentElement.style.overflow = 'hidden';
    fallbackActiveRef.current = true;
    frame.dataset.fullscreenMode = 'fallback';
    frame.dataset.fullscreenActive = 'true';
    setActive(true);
    setAnnouncement(copy.entered);
    requestAnimationFrame(() => buttonRef.current?.focus({ preventScroll: true }));
  }, [copy.entered]);

  useEffect(() => {
    const frame = frameRef.current;
    if (frame === null) return;
    const documentNode = document as FullscreenDocument;

    const syncNativeState = () => {
      const isActive = fullscreenElement(documentNode) === frame;
      if (fallbackActiveRef.current) return;
      frame.dataset.fullscreenActive = String(isActive);
      setActive((wasActive) => {
        if (wasActive && !isActive) {
          setAnnouncement(copy.exited);
          requestAnimationFrame(() => buttonRef.current?.focus({ preventScroll: true }));
        } else if (!wasActive && isActive) {
          setAnnouncement(copy.entered);
          requestAnimationFrame(() => buttonRef.current?.focus({ preventScroll: true }));
        }
        return isActive;
      });
    };

    const reportNativeError = () => setAnnouncement(copy.failed);
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || !fallbackActiveRef.current) return;
      event.preventDefault();
      closeFallback();
    };

    document.addEventListener('fullscreenchange', syncNativeState);
    document.addEventListener('fullscreenerror', reportNativeError);
    document.addEventListener('webkitfullscreenchange', syncNativeState);
    document.addEventListener('webkitfullscreenerror', reportNativeError);
    document.addEventListener('keydown', closeOnEscape, true);
    syncNativeState();

    return () => {
      document.removeEventListener('fullscreenchange', syncNativeState);
      document.removeEventListener('fullscreenerror', reportNativeError);
      document.removeEventListener('webkitfullscreenchange', syncNativeState);
      document.removeEventListener('webkitfullscreenerror', reportNativeError);
      document.removeEventListener('keydown', closeOnEscape, true);
      closeFallback(false);
    };
  }, [closeFallback, copy.entered, copy.exited, copy.failed]);

  const toggleFullscreen = async () => {
    const frame = frameRef.current as FullscreenElement | null;
    if (frame === null || pendingRef.current) return;
    pendingRef.current = true;
    setPending(true);
    setAnnouncement('');

    try {
      if (fallbackActiveRef.current) {
        closeFallback();
        return;
      }

      const documentNode = document as FullscreenDocument;
      const current = fullscreenElement(documentNode);
      if (current === frame) {
        await exitNativeFullscreen(documentNode);
        return;
      }

      const request = frame.requestFullscreen ?? frame.webkitRequestFullscreen;
      if (request === undefined) {
        openFallback();
        return;
      }

      if (current !== null) await exitNativeFullscreen(documentNode);
      await requestNativeFullscreen(frame);
    } catch {
      setAnnouncement(copy.failed);
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  };

  const control = (
    <button
      aria-describedby={statusId}
      aria-label={active ? copy.exitLabel : copy.enterLabel}
      aria-pressed={active}
      className="aks-map-fullscreen-control"
      disabled={pending}
      onClick={() => void toggleFullscreen()}
      ref={buttonRef}
      title={active ? copy.exitLabel : copy.enterLabel}
      type="button"
    >
      <svg aria-hidden="true" viewBox="0 0 20 20">
        {active ? (
          <path d="M3 7h4V3M17 7h-4V3M3 13h4v4M17 13h-4v4" />
        ) : (
          <path d="M7 3H3v4M13 3h4v4M7 17H3v-4M13 17h4v-4" />
        )}
      </svg>
      <span>{active ? copy.exit : copy.enter}</span>
    </button>
  );

  return (
    <div
      className="aks-map-fullscreen-frame"
      data-fullscreen-active={String(active)}
      data-map={name.toLowerCase()}
      ref={frameRef}
    >
      {active ? <div className="aks-map-fullscreen-toolbar">{control}</div> : null}
      {!active && controlSlot !== null ? createPortal(control, controlSlot) : null}
      {children}
      <p aria-live="polite" className="aks-map-fullscreen-status" id={statusId}>
        {announcement}
      </p>
    </div>
  );
}
