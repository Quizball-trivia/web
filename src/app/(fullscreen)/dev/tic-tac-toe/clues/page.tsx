import { notFound } from 'next/navigation';
import { CriterionGallery } from '@/features/football-grid/dev/CriterionGallery';

export default function TicTacToeClueGalleryPage() {
  if (process.env.NODE_ENV !== 'development') notFound();
  return <CriterionGallery />;
}
