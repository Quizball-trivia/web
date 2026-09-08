'use client';

import { DevAnimationsContent } from './DevAnimationsContent';
import { DevGameAudioProvider } from '@/lib/sounds/dev/DevGameAudio';
import { RankedDevAudioObserver } from '@/lib/sounds/dev/RankedDevAudioObserver';

export default function DevAnimationsPage() {
  if (process.env.NODE_ENV !== 'development') {
    return (
      <div className="min-h-dvh bg-surface-deep flex items-center justify-center text-white font-fun">
        Dev only
      </div>
    );
  }
  return <DevGameAudioProvider mode="ranked"><DevAnimationsContent /><RankedDevAudioObserver /></DevGameAudioProvider>;
}
