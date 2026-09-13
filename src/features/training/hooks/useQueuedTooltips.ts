'use client';

import { useCallback, useRef, useState } from 'react';
import type { MessageKey } from '@/lib/i18n/messages';

export interface QueuedTooltipDefinition<Beat extends string = string> {
  id: Beat;
  titleKey: MessageKey;
  messageKey: MessageKey;
  position: 'top' | 'center' | 'bottom';
  /** Spotlight selector (`data-*-anchor` hooks on the live components). */
  highlight?: string;
}

/**
 * Queued tooltips for a scripted training: a beat that lands while another
 * tooltip is open waits its turn instead of replacing it, each beat shows once
 * per run, and `reset` clears the shown set for a replay. `isPaused` is what
 * freezes the scripted engine.
 */
export function useQueuedTooltips<Beat extends string>(definitions: Record<Beat, QueuedTooltipDefinition<Beat>>) {
  const [active, setActive] = useState<QueuedTooltipDefinition<Beat> | null>(null);
  const activeRef = useRef<QueuedTooltipDefinition<Beat> | null>(null);
  const queueRef = useRef<QueuedTooltipDefinition<Beat>[]>([]);
  const shownRef = useRef(new Set<Beat>());

  const present = useCallback((next: QueuedTooltipDefinition<Beat> | null) => {
    activeRef.current = next;
    setActive(next);
  }, []);

  const show = useCallback(
    (beat: Beat) => {
      if (shownRef.current.has(beat)) return;
      shownRef.current.add(beat);
      const def = definitions[beat];
      if (activeRef.current) queueRef.current.push(def);
      else present(def);
    },
    [definitions, present],
  );

  const dismiss = useCallback(() => {
    present(queueRef.current.shift() ?? null);
  }, [present]);

  const reset = useCallback(() => {
    shownRef.current = new Set();
    queueRef.current = [];
    present(null);
  }, [present]);

  return { active, isPaused: active !== null, show, dismiss, reset };
}
