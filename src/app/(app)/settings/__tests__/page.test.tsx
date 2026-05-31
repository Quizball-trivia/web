import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import SettingsPage from '../page';

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock('@/features/settings/SettingsScreen', () => ({
  SettingsScreen: ({ onBack }: { onBack: () => void }) => (
    <button type="button" onClick={onBack}>
      Back
    </button>
  ),
}));

describe('SettingsPage', () => {
  beforeEach(() => {
    mocks.push.mockClear();
  });

  it('returns directly to the app play route', () => {
    render(<SettingsPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Back' }));

    expect(mocks.push).toHaveBeenCalledWith('/play');
  });
});
