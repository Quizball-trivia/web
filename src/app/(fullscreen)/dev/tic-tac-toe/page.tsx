import { notFound } from 'next/navigation';
import { FootballGridDevPreview } from '@/features/football-grid/FootballGridDevPreview';

export default function TicTacToeLocalPreview() {
  if (process.env.NODE_ENV !== 'development') notFound();
  return <FootballGridDevPreview />;
}
