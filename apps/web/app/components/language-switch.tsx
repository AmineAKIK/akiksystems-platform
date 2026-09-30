import { Fragment, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router';

import type { Locale } from '../i18n/locales';

/** Always shown in this order, whatever the active language. */
const switchOrder: Locale[] = ['fr', 'en'];

const labels: Record<Locale, string> = {
  fr: 'Français actif. Afficher en anglais.',
  en: 'English active. View in French.',
};

/**
 * The section the reader is in, so switching language lands on the same place. Sections and
 * cards share their ids across languages (#sentinel, #protocap, #workbench…).
 */
export function useCurrentSectionHash(): string {
  const { pathname } = useLocation();
  const [hash, setHash] = useState('');

  useEffect(() => {
    let frame = 0;

    const update = () => {
      frame = 0;
      const line = window.innerHeight * 0.35;
      const anchors = [
        ...document.querySelectorAll<HTMLElement>(
          '#experience-outlet section[id], #experience-outlet article[id]',
        ),
      ];
      let current = '';
      for (const anchor of anchors) {
        if (anchor.getBoundingClientRect().top <= line) current = anchor.id;
      }
      // At the very bottom a short last section never reaches the line: it is the one being read.
      const atBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      const last = anchors[anchors.length - 1];
      if (atBottom && last !== undefined && last.getBoundingClientRect().top < window.innerHeight) {
        current = last.id;
      }
      setHash(current);
    };

    const schedule = () => {
      if (frame === 0) frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);

    return () => {
      if (frame !== 0) window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [pathname]);

  return hash;
}

/** The "FR / EN" switch shared by the Home and the experience shell. */
export function LanguageSwitch({
  className,
  locale,
  to,
}: {
  className?: string;
  locale: Locale;
  to: string;
}) {
  const alternateLocale: Locale = locale === 'en' ? 'fr' : 'en';
  const hash = useCurrentSectionHash();

  return (
    <Link
      aria-label={labels[locale]}
      className={['aks-home-language', className].filter(Boolean).join(' ')}
      hrefLang={alternateLocale}
      prefetch="intent"
      to={hash === '' ? to : `${to}#${hash}`}
    >
      <span aria-hidden="true" className="aks-home-language-display">
        {switchOrder.map((code, index) => (
          <Fragment key={code}>
            {index > 0 ? <span className="aks-home-language-separator">/</span> : null}
            <span
              className={code === locale ? 'aks-home-language-current' : 'aks-home-language-target'}
              lang={code}
            >
              {code.toUpperCase()}
            </span>
          </Fragment>
        ))}
      </span>
    </Link>
  );
}
