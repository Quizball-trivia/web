import { describe, expect, it } from 'vitest';
import {
  normalizeEmail,
  validateEmail,
  validatePassword,
  validateLoginPassword,
  validateConfirmPassword,
  validateLogin,
  validateSignup,
  validateNewPassword,
  normalizeGeorgianPhone,
  validateGeorgianPhone,
  validateOtp,
  hasErrors,
  PASSWORD_MIN,
  PASSWORD_MAX,
} from '../validation';

describe('auth validation', () => {
  describe('normalizeEmail', () => {
    it('trims and lowercases', () => {
      expect(normalizeEmail('  Player@Quizball.IO  ')).toBe('player@quizball.io');
    });
  });

  describe('validateEmail', () => {
    it('requires a value', () => {
      expect(validateEmail('   ')).toBe('authValidation.emailRequired');
    });
    it('rejects malformed addresses', () => {
      expect(validateEmail('not-an-email')).toBe('authValidation.emailInvalid');
    });
    it('accepts a valid address (with surrounding whitespace)', () => {
      expect(validateEmail('  player@quizball.io ')).toBeNull();
    });
  });

  describe('phone validation', () => {
    it('normalizes Georgian mobile formats', () => {
      expect(normalizeGeorgianPhone('+995 577 123 456')).toBe('+995577123456');
      expect(normalizeGeorgianPhone('995577123456')).toBe('+995577123456');
      expect(normalizeGeorgianPhone('577123456')).toBe('+995577123456');
    });

    it('requires a Georgian mobile number', () => {
      expect(validateGeorgianPhone('')).toBe('authValidation.phoneRequired');
      expect(validateGeorgianPhone('+12025550123')).toBe('authValidation.phoneInvalidGeorgian');
      expect(validateGeorgianPhone('+995322123456')).toBe('authValidation.phoneInvalidGeorgian');
      expect(validateGeorgianPhone('+995577123456')).toBeNull();
    });

    it('validates six digit OTP codes', () => {
      expect(validateOtp('')).toBe('authValidation.otpRequired');
      expect(validateOtp('12345')).toBe('authValidation.otpInvalid');
      expect(validateOtp('123456')).toBeNull();
    });
  });

  describe('validatePassword', () => {
    it('requires a value', () => {
      expect(validatePassword('')).toBe('authValidation.passwordRequired');
    });
    it(`rejects shorter than ${PASSWORD_MIN}`, () => {
      expect(validatePassword('a'.repeat(PASSWORD_MIN - 1))).toBe('authValidation.passwordTooShort');
    });
    it(`accepts exactly ${PASSWORD_MIN}`, () => {
      expect(validatePassword('a'.repeat(PASSWORD_MIN))).toBeNull();
    });
    it(`rejects longer than ${PASSWORD_MAX}`, () => {
      expect(validatePassword('a'.repeat(PASSWORD_MAX + 1))).toBe('authValidation.passwordTooLong');
    });
    it('does not require symbols or uppercase', () => {
      expect(validatePassword('alllowercase')).toBeNull();
    });
  });

  describe('validateLoginPassword', () => {
    it('only requires non-empty (no length rules)', () => {
      expect(validateLoginPassword('short')).toBeNull();
      expect(validateLoginPassword('')).toBe('authValidation.passwordRequired');
    });
  });

  describe('validateConfirmPassword', () => {
    it('requires confirm', () => {
      expect(validateConfirmPassword('password123', '')).toBe('authValidation.confirmPasswordRequired');
    });
    it('must match', () => {
      expect(validateConfirmPassword('password123', 'password124')).toBe('authValidation.passwordMismatch');
    });
    it('passes when matching', () => {
      expect(validateConfirmPassword('password123', 'password123')).toBeNull();
    });
  });

  describe('composite validators', () => {
    it('validateLogin flags both fields', () => {
      expect(validateLogin('', '')).toEqual({
        email: 'authValidation.emailRequired',
        password: 'authValidation.passwordRequired',
      });
    });
    it('validateLogin passes a short-but-present password', () => {
      expect(validateLogin('player@quizball.io', 'x')).toEqual({});
    });
    it('validateSignup enforces full password + confirm', () => {
      expect(validateSignup('player@quizball.io', 'short', 'nope')).toEqual({
        password: 'authValidation.passwordTooShort',
        confirmPassword: 'authValidation.passwordMismatch',
      });
    });
    it('validateSignup passes a valid trio', () => {
      const errors = validateSignup('player@quizball.io', 'password123', 'password123');
      expect(hasErrors(errors)).toBe(false);
    });
    it('validateNewPassword enforces password + confirm only', () => {
      expect(validateNewPassword('password123', 'password123')).toEqual({});
      expect(validateNewPassword('short', 'short')).toEqual({
        password: 'authValidation.passwordTooShort',
      });
    });
  });
});
