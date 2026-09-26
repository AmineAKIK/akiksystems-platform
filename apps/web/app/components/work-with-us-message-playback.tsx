import { Button } from '@akiksystems/ui';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import type { Locale } from '../i18n/locales';

export interface WorkWithUsMessagePlaybackProps {
  label: string;
  locale: Locale;
  messageElementId: string;
  submitting?: boolean;
}

function supportsSpeechSynthesis(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.speechSynthesis !== 'undefined' &&
    typeof window.SpeechSynthesisUtterance === 'function'
  );
}

export function WorkWithUsMessagePlayback({
  label,
  locale,
  messageElementId,
  submitting = false,
}: WorkWithUsMessagePlaybackProps) {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const stopPlayback = useCallback((updateState = true) => {
    if (
      typeof window !== 'undefined' &&
      utteranceRef.current !== null &&
      typeof window.speechSynthesis !== 'undefined'
    ) {
      window.speechSynthesis.cancel();
    }

    utteranceRef.current = null;
    if (updateState) {
      setSpeaking(false);
    }
  }, []);

  useEffect(() => {
    setSupported(supportsSpeechSynthesis());
  }, []);

  useEffect(() => {
    if (submitting) {
      stopPlayback();
    }
  }, [stopPlayback, submitting]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handlePageHide = () => {
      stopPlayback(false);
    };

    window.addEventListener('pagehide', handlePageHide);

    return () => {
      window.removeEventListener('pagehide', handlePageHide);
      stopPlayback(false);
    };
  }, [stopPlayback]);

  if (!supported) return null;

  const togglePlayback = () => {
    if (speaking) {
      stopPlayback();
      return;
    }

    const messageElement = document.getElementById(messageElementId);
    if (!(messageElement instanceof HTMLTextAreaElement)) return;

    const message = messageElement.value.trim();
    if (message === '') return;

    const synthesis = window.speechSynthesis;
    const utterance = new window.SpeechSynthesisUtterance(message);

    utterance.lang = locale === 'fr' ? 'fr-FR' : 'en-US';

    const settle = () => {
      if (utteranceRef.current !== utterance) return;
      utteranceRef.current = null;
      setSpeaking(false);
    };

    utterance.onend = settle;
    utterance.onerror = settle;

    if (utteranceRef.current !== null) {
      synthesis.cancel();
    }

    utteranceRef.current = utterance;
    setSpeaking(true);

    try {
      synthesis.speak(utterance);
    } catch {
      settle();
    }
  };

  return (
    <Button
      aria-pressed={speaking}
      className="aks-work-with-us-message-playback"
      emphasis="quiet"
      onClick={togglePlayback}
      type="button"
    >
      <span
        aria-hidden="true"
        className="aks-work-with-us-message-playback-mark"
        data-speaking={speaking || undefined}
      />
      <span>{label}</span>
    </Button>
  );
}
