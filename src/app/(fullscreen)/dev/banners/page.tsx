'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Gamepad2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

type BannerKey =
  | 'friendlyLobby'
  | 'rankedLobby'
  | 'draft'
  | 'rejoin'
  | 'completed'
  | 'forfeitPending';

const BANNERS: Array<{ key: BannerKey; label: string; dot: string }> = [
  { key: 'friendlyLobby', label: 'Friendly Lobby (rejoin)', dot: 'bg-brand-green' },
  { key: 'rankedLobby', label: 'Ranked Lobby (preparing)', dot: 'bg-brand-blue' },
  { key: 'draft', label: 'Draft active', dot: 'bg-brand-orange' },
  { key: 'rejoin', label: 'Rejoin live match', dot: 'bg-brand-yellow' },
  { key: 'completed', label: 'Match finished', dot: 'bg-brand-green' },
  { key: 'forfeitPending', label: 'Forfeit finalizing', dot: 'bg-brand-red-soft' },
];

const dangerBtnClass = 'h-9 bg-brand-red-soft text-white hover:bg-brand-red-soft/90';

export default function BannersPlaygroundPage() {
  const router = useRouter();
  const [visible, setVisible] = useState<Record<BannerKey, boolean>>({
    friendlyLobby: true,
    rankedLobby: true,
    draft: true,
    rejoin: true,
    completed: true,
    forfeitPending: true,
  });
  const [socketConnected, setSocketConnected] = useState(true);
  const [byForfeit, setByForfeit] = useState(false);
  const [rejoinSource, setRejoinSource] = useState<'rejoin' | 'active'>('rejoin');

  const toggle = (key: BannerKey) =>
    setVisible((prev) => ({ ...prev, [key]: !prev[key] }));

  const setAll = (value: boolean) =>
    setVisible({
      friendlyLobby: value,
      rankedLobby: value,
      draft: value,
      rejoin: value,
      completed: value,
      forfeitPending: value,
    });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="border-b border-border bg-surface-card-deep px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold">Banner Playground</h1>
            <p className="text-sm text-muted-foreground">
              All persistent status banners rendered in isolation. Toggle each to inspect.
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push('/')}
            className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Exit playground"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {BANNERS.map((b) => (
            <button
              key={b.key}
              type="button"
              onClick={() => toggle(b.key)}
              className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                visible[b.key]
                  ? 'border-white/20 bg-white/10 text-white'
                  : 'border-white/10 bg-transparent text-muted-foreground hover:bg-white/5'
              }`}
            >
              <span className={`size-2 rounded-full ${visible[b.key] ? b.dot : 'bg-white/20'}`} />
              {b.label}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setAll(true)}>
              Show all
            </Button>
            <Button size="sm" variant="outline" onClick={() => setAll(false)}>
              Hide all
            </Button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={socketConnected}
              onChange={(e) => setSocketConnected(e.target.checked)}
            />
            Socket connected (toggles &ldquo;Reconnecting…&rdquo; pill)
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={byForfeit}
              onChange={(e) => setByForfeit(e.target.checked)}
            />
            Completed match was a forfeit
          </label>
          <label className="flex items-center gap-2">
            Rejoin source:
            <select
              value={rejoinSource}
              onChange={(e) => setRejoinSource(e.target.value as 'rejoin' | 'active')}
              className="rounded border border-border bg-background px-2 py-1"
            >
              <option value="rejoin">rejoin (shows reconnect countdown)</option>
              <option value="active">active (live match)</option>
            </select>
          </label>
        </div>
      </div>

      <div className="space-y-4 p-6">
        {visible.forfeitPending && (
          <div className="rounded-2xl border-2 border-brand-red-soft bg-brand-red-soft/10 px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-brand-red-soft/20 text-brand-red-soft flex items-center justify-center">
                  <Gamepad2 className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Match finalizing…</p>
                  <p className="text-xs text-white/70">
                    Opponent disconnected. Confirming the result.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {visible.completed && (
          <div className="rounded-2xl border-2 border-brand-green bg-brand-green/10 px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-brand-green/20 text-brand-green flex items-center justify-center">
                  <Gamepad2 className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">
                    Match finished against <span className="text-white">RivalUser</span>
                  </p>
                  <p className="text-xs text-white/70">
                    {byForfeit
                      ? 'Reconnect limit reached. Final result is ready.'
                      : 'View the final result'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  className="h-9 bg-brand-green text-white hover:bg-brand-green-deep"
                >
                  View Results <ArrowRight className="ml-2 size-4" />
                </Button>
                <Button size="sm" className={dangerBtnClass}>
                  Dismiss <X className="ml-2 size-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {visible.draft && (
          <div className="rounded-2xl border-2 border-brand-orange bg-brand-orange/10 px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-brand-orange/20 text-brand-orange flex items-center justify-center">
                  <Gamepad2 className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">
                    Draft active against <span className="text-white">RivalUser</span>
                  </p>
                  <p className="text-xs text-white/70">
                    Return to category banning before the match starts
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                className="h-9 bg-brand-orange text-white hover:bg-brand-orange-light"
              >
                Return to Draft <ArrowRight className="ml-2 size-4" />
              </Button>
            </div>
          </div>
        )}

        {visible.rejoin && (
          <div className="rounded-2xl border-2 border-brand-yellow bg-brand-yellow/10 px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-brand-yellow/20 text-brand-yellow flex items-center justify-center">
                  <Gamepad2 className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">
                    Match still active against <span className="text-white">RivalUser</span>
                  </p>
                  <p className="text-xs text-white/70">
                    {rejoinSource === 'rejoin'
                      ? 'You have 2 reconnect attempts left.'
                      : 'Return to the live match'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  className="h-9 bg-brand-yellow text-surface-page hover:bg-brand-yellow-deep"
                >
                  Rejoin Match <ArrowRight className="ml-2 size-4" />
                </Button>
                <Button size="sm" className={dangerBtnClass}>
                  Forfeit <X className="ml-2 size-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {visible.friendlyLobby && (
          <div className="rounded-2xl border-2 border-brand-green bg-brand-green/10 px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-brand-green/20 text-brand-green flex items-center justify-center">
                  <Gamepad2 className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">
                    You&rsquo;re still in <span className="text-white">Elite The Kop</span>
                  </p>
                  <p className="text-xs text-white/70">
                    Code <span className="font-mono font-bold text-white">EHVLNY</span>
                    {!socketConnected && (
                      <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-brand-yellow/20 px-2 py-0.5 text-[10px] font-semibold text-brand-yellow">
                        Reconnecting…
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  className="h-9 bg-brand-green text-white hover:bg-brand-green-deep"
                >
                  Return to Lobby <ArrowRight className="ml-2 size-4" />
                </Button>
                <Button size="sm" className={dangerBtnClass}>
                  Leave <X className="ml-2 size-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {visible.rankedLobby && (
          <div className="rounded-2xl border-2 border-brand-blue bg-brand-blue/10 px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-brand-blue/20 text-brand-blue flex items-center justify-center">
                  <Gamepad2 className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Ranked match is preparing</p>
                  <p className="text-xs text-white/70">
                    Opponent found: <span className="text-white">RivalUser</span>
                    {!socketConnected && (
                      <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-brand-yellow/20 px-2 py-0.5 text-[10px] font-semibold text-brand-yellow">
                        Reconnecting…
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  className="h-9 bg-brand-blue text-white hover:bg-brand-blue/90"
                >
                  Return to Matchmaking <ArrowRight className="ml-2 size-4" />
                </Button>
                <Button size="sm" className={dangerBtnClass}>
                  Leave <X className="ml-2 size-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
