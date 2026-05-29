import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PasswordForm } from '../PasswordForm';

vi.mock('@/contexts/LocaleContext', () => ({
  useLocale: () => ({
    t: (key: string) => {
      const messages: Record<string, string> = {
        'resetPassword.newPasswordLabel': 'New password',
        'resetPassword.newPasswordPlaceholder': 'Enter new password',
        'resetPassword.confirmPasswordLabel': 'Confirm password',
        'resetPassword.confirmPasswordPlaceholder': 'Repeat new password',
        'authValidation.passwordHelper': 'Use at least 8 characters.',
        'authValidation.passwordTooShort': 'Use at least 8 characters.',
        'authValidation.passwordMismatch': 'Passwords do not match.',
      };
      return messages[key] ?? key;
    },
  }),
}));

function renderPasswordForm(onSubmit = vi.fn()) {
  render(
    <PasswordForm
      onSubmit={onSubmit}
      submitLabel="Update password"
      submittingLabel="Updating..."
      submitting={false}
    />,
  );
  return { onSubmit };
}

describe('PasswordForm', () => {
  it('does not show password helper text before validation', () => {
    renderPasswordForm();

    expect(screen.queryByText('Use at least 8 characters.')).not.toBeInTheDocument();
  });

  it('shows one brand-red password validation error after submit', () => {
    const { onSubmit } = renderPasswordForm();

    fireEvent.change(screen.getByPlaceholderText('Enter new password'), {
      target: { value: 'short' },
    });
    fireEvent.change(screen.getByPlaceholderText('Repeat new password'), {
      target: { value: 'short' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Update password' }));

    const errors = screen.getAllByText('Use at least 8 characters.');
    expect(errors).toHaveLength(1);
    expect(errors[0]).toHaveClass('text-brand-red-light');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits a valid password', () => {
    const { onSubmit } = renderPasswordForm();

    fireEvent.change(screen.getByPlaceholderText('Enter new password'), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByPlaceholderText('Repeat new password'), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Update password' }));

    expect(onSubmit).toHaveBeenCalledWith('password123');
  });
});
