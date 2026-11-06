'use client';

/** Dev: playstyle-picker layouts to choose from (PickerLab). Guarded by NODE_ENV. */

import { PickerLab } from '@/features/zone-match/picker/PickerLab';

export default function DevZoneMatchPickerPage() {
  if (process.env.NODE_ENV !== 'development') {
    return <div className="flex min-h-dvh items-center justify-center bg-surface-page font-poppins text-white">Dev only</div>;
  }
  return <PickerLab />;
}
