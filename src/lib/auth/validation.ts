import { z } from 'zod';
import type { MessageKey } from '@/lib/i18n/messages';

/**
 * Shared auth field validation for login / signup / reset / change-password.
 * Single source of truth so the same rules apply everywhere and the backend's
 * own min-length enforcement is never the only gate.
 *
 * Validators return a translation KEY (MessageKey) on failure, or null when
 * valid — callers resolve the key with t() so all copy stays in en/ka.json.
 */

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

const EMAIL_SCHEMA = z.string().trim().min(1).email().max(254);

/** Normalize an email for submission: trimmed + lowercased. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validateEmail(email: string): MessageKey | null {
  const value = email.trim();
  if (value.length === 0) return 'authValidation.emailRequired';
  if (!EMAIL_SCHEMA.safeParse(value).success) return 'authValidation.emailInvalid';
  return null;
}

export function validatePassword(password: string): MessageKey | null {
  if (password.length === 0) return 'authValidation.passwordRequired';
  if (password.length < PASSWORD_MIN) return 'authValidation.passwordTooShort';
  if (password.length > PASSWORD_MAX) return 'authValidation.passwordTooLong';
  return null;
}

/** Login only needs a non-empty password (length rules are signup/reset). */
export function validateLoginPassword(password: string): MessageKey | null {
  if (password.length === 0) return 'authValidation.passwordRequired';
  return null;
}

export function validateConfirmPassword(
  password: string,
  confirmPassword: string,
): MessageKey | null {
  if (confirmPassword.length === 0) return 'authValidation.confirmPasswordRequired';
  if (password !== confirmPassword) return 'authValidation.passwordMismatch';
  return null;
}

export interface AuthFieldErrors {
  email?: MessageKey;
  password?: MessageKey;
  confirmPassword?: MessageKey;
}

export function validateLogin(email: string, password: string): AuthFieldErrors {
  const errors: AuthFieldErrors = {};
  const emailError = validateEmail(email);
  if (emailError) errors.email = emailError;
  const passwordError = validateLoginPassword(password);
  if (passwordError) errors.password = passwordError;
  return errors;
}

export function validateSignup(
  email: string,
  password: string,
  confirmPassword: string,
): AuthFieldErrors {
  const errors: AuthFieldErrors = {};
  const emailError = validateEmail(email);
  if (emailError) errors.email = emailError;
  const passwordError = validatePassword(password);
  if (passwordError) errors.password = passwordError;
  const confirmError = validateConfirmPassword(password, confirmPassword);
  if (confirmError) errors.confirmPassword = confirmError;
  return errors;
}

/** New-password + confirm (reset page and Settings change/add password). */
export function validateNewPassword(
  password: string,
  confirmPassword: string,
): AuthFieldErrors {
  const errors: AuthFieldErrors = {};
  const passwordError = validatePassword(password);
  if (passwordError) errors.password = passwordError;
  const confirmError = validateConfirmPassword(password, confirmPassword);
  if (confirmError) errors.confirmPassword = confirmError;
  return errors;
}

export function hasErrors(errors: AuthFieldErrors): boolean {
  return Boolean(errors.email || errors.password || errors.confirmPassword);
}
