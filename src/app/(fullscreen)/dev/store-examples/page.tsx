import { notFound } from 'next/navigation';
import { StoreExamplesScreen } from '@/features/store/StoreExamplesScreen';

export default function StoreExamplesPage() {
  if (process.env.NODE_ENV !== 'development') notFound();
  return <StoreExamplesScreen />;
}
