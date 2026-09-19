import type { Metadata, Viewport } from 'next';
import '@fontsource/noto-sans-georgian/500.css';
import '@fontsource/noto-sans-georgian/700.css';
import '@fontsource/noto-sans-georgian/900.css';
import '@/styles/table-derby.css';
import { TableDerbyApp } from '@/features/table-derby/TableDerbyApp';

export const metadata: Metadata = {
  title: 'მაგიდის დერბი',
  description: 'Betsson Sport · მაგიდის დერბი — პირისპირ ონლაინ დუელი',
  robots: { index: false }, // prototype route; unpublish from crawlers
};

export const viewport: Viewport = {
  themeColor: '#141414',
};

export default function TableDerbyPage() {
  return <TableDerbyApp />;
}
