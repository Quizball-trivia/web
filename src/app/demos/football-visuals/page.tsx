import { notFound } from 'next/navigation';
import { FootballVisualPreview } from '@/features/mini-games/components/FootballVisualPreview';

export default function FootballVisualsPage() {
  if (process.env.NODE_ENV !== 'development') notFound();
  return <FootballVisualPreview />;
}
