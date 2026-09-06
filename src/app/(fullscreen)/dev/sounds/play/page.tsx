import Link from 'next/link';
import { notFound } from 'next/navigation';
import SoundEditor from './SoundEditor';

export const metadata = { title: 'Game sound playground · Quizball', robots: { index: false, follow: false } };
export default function SoundPlayground() {
  if (process.env.NODE_ENV !== 'development') notFound();
  return <main className="min-h-dvh bg-[#111813] px-4 py-8 text-[#f3f5eb] sm:px-8"><div className="mx-auto max-w-6xl"><Link href="/dev/sounds" className="text-xs text-white/50">← Sound lab</Link><SoundEditor /></div></main>;
}
