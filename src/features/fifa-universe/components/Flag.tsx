'use client';

import { footballGridAssetUrl } from '@/lib/football-grid/assets';

export function Flag({ code, width = 22, height = 15, className = '' }: { code: string; width?: number; height?: number; className?: string }) {
  if (!code) return null;
  return (
    <span className={`inline-block shrink-0 overflow-hidden rounded-[3px] shadow-[0_1px_2px_rgba(0,0,0,0.4)] ${className}`} style={{ width, height }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={flagUrl(code)} alt="" width={width * 2} height={height * 2} className="block h-full w-full object-cover" />
    </span>
  );
}

export const flagUrl = (code: string) => footballGridAssetUrl(`/assets/football-grid/flags/${code}.svg`) ?? '';
