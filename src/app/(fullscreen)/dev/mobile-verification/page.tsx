'use client';

import { MobileVerificationStep } from '@/features/onboarding/MobileVerificationStep';

export default function MobileVerificationPreviewPage() {
  return <MobileVerificationStep isCompleting={false} onContinue={async () => {}} />;
}
