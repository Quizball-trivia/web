'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import { useSystemStatus } from '@/lib/realtime/system-status';
import { useSystemStatusPoll } from '@/lib/realtime/useSystemStatusPoll';

/**
 * In-match outage indicator (INC-2026-07-29). Shown while the server DB write
 * path is degraded — a calm yellow "paused, protected" pill that appears
 * IMMEDIATELY (no debounce: an outage is not a transient blip), then a
 * transient green "Back online" pulse on recovery.
 *
 * Deliberately does NOT reuse the 1.5s disconnect debounce from
 * GameConnectionIndicator: during a real DB outage we want the reassurance on
 * screen at once, because the connection itself is fine — only writes are.
 */
export function SystemDegradedIndicator() {
  const { t } = useLocale();
  // The /game route uses the fullscreen layout, which does NOT mount AppShell
  // (and thus not the app-shell poll). Mount the poll fallback here so an
  // outage/recovery still reaches the in-match indicator if the socket drops.
  useSystemStatusPoll();
  const { degraded, recoveredUntilMs } = useSystemStatus();

  // Bump `now` once when the recovery window ends so the pulse auto-dismisses,
  // without ever calling setState synchronously inside the effect body.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!recoveredUntilMs) return;
    const remaining = recoveredUntilMs - Date.now();
    if (remaining <= 0) return;
    const timeoutId = window.setTimeout(() => setNow(Date.now()), remaining);
    return () => window.clearTimeout(timeoutId);
  }, [recoveredUntilMs]);

  const recoveryVisible = recoveredUntilMs !== null && recoveredUntilMs > now;
  const show = degraded || recoveryVisible;
  // While degraded always wins; only show the green pulse once writes are back.
  const mode: 'degraded' | 'recovered' = degraded ? 'degraded' : 'recovered';

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+0.75rem)] z-[100] flex justify-center px-3">
      <AnimatePresence mode="wait">
        {show ? (
          <motion.div
            key={mode}
            role="status"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className={
              mode === 'degraded'
                ? 'flex max-w-full items-center gap-2 rounded-full border border-brand-yellow/50 bg-surface-deep/95 px-3.5 py-2 font-poppins text-xs font-semibold text-brand-yellow-soft backdrop-blur-sm sm:text-sm'
                : 'flex max-w-full items-center gap-2 rounded-full border border-brand-green/50 bg-surface-deep/95 px-3.5 py-2 font-poppins text-xs font-semibold text-brand-green-light backdrop-blur-sm sm:text-sm'
            }
          >
            {mode === 'degraded' ? (
              <ShieldCheck aria-hidden="true" className="size-4 shrink-0" />
            ) : (
              <CheckCircle2 aria-hidden="true" className="size-4 shrink-0" />
            )}
            <span className="truncate">
              {mode === 'degraded'
                ? t('appShell.systemDegradedInMatch')
                : t('appShell.systemBackOnline')}
            </span>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
