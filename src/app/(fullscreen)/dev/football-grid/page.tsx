import { FootballGridDevPreview } from '@/features/football-grid/FootballGridDevPreview';
import { notFound } from 'next/navigation';

export default function FootballGridDevPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <FootballGridDevPreview />;
}
