'use client';

/** Dev harness: the 3D stadium and its crowd scenes (StadiumLab). Guarded by NODE_ENV. */

import { StadiumLab } from '@/features/stadium/StadiumLab';

export default function DevStadium3DPage() {
  if (process.env.NODE_ENV !== 'development') {
    return <div className="flex min-h-dvh items-center justify-center bg-surface-page font-poppins text-white">Dev only</div>;
  }
  return <StadiumLab />;
}
