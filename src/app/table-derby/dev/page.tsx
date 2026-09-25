import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import '@fontsource/noto-sans-georgian/500.css';
import '@fontsource/noto-sans-georgian/600.css'; // closest static match for Betsson's 545
import '@fontsource/noto-sans-georgian/700.css';
import '@fontsource/noto-sans-georgian/900.css';
import '@/styles/table-derby.css';
import { DevPlayground } from '@/features/table-derby/dev/DevPlayground';

export const metadata: Metadata = {
  title: 'Table Derby · playground',
  robots: { index: false },
};

export default function TableDerbyDevPage() {
  if (process.env.NODE_ENV !== 'development') notFound();
  return <DevPlayground />;
}
