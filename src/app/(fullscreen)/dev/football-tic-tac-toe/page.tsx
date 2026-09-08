import { TicTacToeSoundHarness } from '@/lib/sounds/dev/TicTacToeSoundHarness';
import { DevGameAudioProvider } from '@/lib/sounds/dev/DevGameAudio';
import { notFound } from 'next/navigation';

export default function FootballTicTacToeDevPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <DevGameAudioProvider mode="grid"><TicTacToeSoundHarness /></DevGameAudioProvider>;
}
