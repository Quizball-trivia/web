import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import OnboardingPage from '../page';
import { updateMe } from '@/lib/api/endpoints';
import { apiFetch } from '@/lib/api/client';
import { loadMobileVerificationExperimentVariant } from '@/lib/experiments/mobileVerificationExperiment';

const replaceMock = vi.fn();
const setAuthenticatedMock = vi.fn();
const availability = vi.hoisted(() => ({
  country: 'GE' as string | null,
  isAvailable: true,
  isLoading: false,
}));
const authState = vi.hoisted(() => ({
  user: {
    id: 'new-user-id',
    created_at: '2026-08-19T09:00:00.000Z',
    country: 'GE',
    onboarding_complete: false,
    phone_number: null,
    phone_verified_at: null,
  },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock }),
}));

vi.mock('@/contexts/LocaleContext', () => ({
  useLocale: () => ({ t: (key: string) => key }),
}));

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: (selector: (state: unknown) => unknown) =>
    selector({ user: authState.user, setAuthenticated: setAuthenticatedMock }),
}));

vi.mock('@/features/onboarding/OnboardingFlow', () => ({
  OnboardingFlow: ({ onComplete }: { onComplete: (data: unknown) => void }) => (
    <button
      type="button"
      onClick={() => onComplete({
        favoriteClub: 'Dinamo Tbilisi',
        preferredLanguage: 'ka',
        avatar: 'green',
        username: 'NewPlayer',
        quizScore: 0,
      })}
    >
      Finish profile
    </button>
  ),
}));

vi.mock('@/features/onboarding/MobileVerificationStep', () => ({
  MobileVerificationStep: ({ onContinue }: { onContinue: () => Promise<void> }) => (
    <button type="button" onClick={() => void onContinue()}>
      Continue experiment
    </button>
  ),
}));

vi.mock('@/lib/auth/useGeorgianPhoneAuthAvailability', () => ({
  useGeorgianPhoneAuthAvailability: () => availability,
}));

vi.mock('@/lib/experiments/mobileVerificationExperiment', () => ({
  loadMobileVerificationExperimentVariant: vi.fn(),
}));

vi.mock('@/lib/api/endpoints', () => ({ updateMe: vi.fn() }));
vi.mock('@/lib/api/client', () => ({ apiFetch: vi.fn() }));
vi.mock('@/lib/analytics/game-events', () => ({ trackOnboardingCompleted: vi.fn() }));
vi.mock('@/lib/auth/postAuthRedirect', () => ({ consumePostAuthRedirect: vi.fn(() => null) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe('OnboardingPage mobile verification experiment gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    availability.country = 'GE';
    availability.isAvailable = true;
    availability.isLoading = false;
    authState.user.phone_verified_at = null;
    vi.mocked(updateMe).mockResolvedValue(undefined as never);
    vi.mocked(apiFetch).mockResolvedValue({
      ...authState.user,
      onboarding_complete: true,
    } as never);
  });

  it('shows the prompt only to the test variant and completes after continue', async () => {
    vi.mocked(loadMobileVerificationExperimentVariant).mockResolvedValue('test');
    render(<OnboardingPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Finish profile' }));

    expect(await screen.findByRole('button', { name: 'Continue experiment' })).toBeInTheDocument();
    expect(updateMe).toHaveBeenCalledTimes(1);
    expect(loadMobileVerificationExperimentVariant).toHaveBeenCalledWith(authState.user);
    expect(apiFetch).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Continue experiment' }));
    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith('post', '/api/v1/users/me/complete-onboarding');
    });
  });

  it('keeps the control path identical after assignment', async () => {
    vi.mocked(loadMobileVerificationExperimentVariant).mockResolvedValue('control');
    render(<OnboardingPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Finish profile' }));

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith('post', '/api/v1/users/me/complete-onboarding');
    });
    expect(screen.queryByRole('button', { name: 'Continue experiment' })).not.toBeInTheDocument();
  });

  it('does not enroll users outside the Georgian phone audience', async () => {
    availability.country = 'US';
    availability.isAvailable = false;
    vi.mocked(loadMobileVerificationExperimentVariant).mockResolvedValue('test');
    render(<OnboardingPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Finish profile' }));

    await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(1));
    expect(loadMobileVerificationExperimentVariant).not.toHaveBeenCalled();
  });
});
