'use client';

import { RoundIconsRow, TD_DISPLAY } from '../components/brand';
import { TD } from '../lib/copy';
import { BsButton, SectionTitle } from './ui';

export function SoloScreen({ onStart }: { onStart: () => void }) {
  return (
    <>
      <SectionTitle>{TD.soloTitle}</SectionTitle>
      <div className="flex flex-col gap-4 rounded-[12px] p-5" style={{ background: 'var(--bs-surface)' }}>
        <span className="text-2xl text-[var(--bs-text)]" style={TD_DISPLAY}>
          {TD.title}
        </span>
        <p className="bs-text text-[13px] leading-relaxed text-[var(--bs-text-2)]">{TD.soloBody}</p>
        <RoundIconsRow size={28} tone="orange" />
        <BsButton onClick={onStart}>{TD.soloStart}</BsButton>
      </div>
    </>
  );
}
