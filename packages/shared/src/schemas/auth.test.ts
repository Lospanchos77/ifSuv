import { describe, expect, it } from 'vitest';
import {
  CurrentUser,
  LoginInput,
  PasswordResetConfirmInput,
  PasswordResetRequestInput,
} from './auth';
import { Role } from '../enums';

describe('LoginInput', () => {
  it('lowercase email + accepte mot de passe valide', () => {
    const parsed = LoginInput.parse({ email: 'ADMIN@TEST.LOCAL', password: 'azertyui' });
    expect(parsed.email).toBe('admin@test.local');
  });

  it('rejette email invalide', () => {
    expect(() => LoginInput.parse({ email: 'not-an-email', password: 'azertyui' })).toThrow();
  });

  it('rejette mot de passe trop court', () => {
    expect(() => LoginInput.parse({ email: 'a@b.fr', password: 'short' })).toThrow();
  });
});

describe('PasswordResetRequestInput / Confirm', () => {
  it('request lowercase email', () => {
    const parsed = PasswordResetRequestInput.parse({ email: 'AB@C.fr' });
    expect(parsed.email).toBe('ab@c.fr');
  });

  it('confirm exige newPassword >= 12', () => {
    expect(() =>
      PasswordResetConfirmInput.parse({ token: 'a'.repeat(40), newPassword: 'short' }),
    ).toThrow();
    const ok = PasswordResetConfirmInput.parse({
      token: 'a'.repeat(40),
      newPassword: 'AzertyUiopMnB',
    });
    expect(ok.newPassword.length).toBeGreaterThanOrEqual(12);
  });
});

describe('CurrentUser', () => {
  it('parse un user valide', () => {
    const parsed = CurrentUser.parse({
      id: '0123456789abcdef01234567',
      email: 'admin@test.fr',
      role: Role.Admin,
      firstName: 'Admin',
      lastName: 'IFSUV',
      companyId: null,
      mustResetPassword: false,
    });
    expect(parsed.role).toBe('ADMIN');
  });
});
