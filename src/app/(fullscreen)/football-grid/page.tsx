'use client';

import { Suspense } from 'react';
import { FootballGridFlowScreen } from '@/features/football-grid/FootballGridFlowScreen';

export default function FootballGridPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-surface-page-alt" />}>
      <FootballGridFlowScreen />
    </Suspense>
  );
}
