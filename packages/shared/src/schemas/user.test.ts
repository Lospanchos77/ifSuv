import { describe, expect, it } from 'vitest';
import { Role } from '../enums';
import { UserCreateInput, UserUpdateInput } from './user';

describe('UserCreateInput refine companyId', () => {
  const baseInput = {
    email: 'test@test.fr',
    password: 'AzertyUiopMnB',
    role: Role.Technician,
    firstName: 'Test',
    lastName: 'User',
  };

  it('CLIENT_USER avec companyId null → rejet', () => {
    expect(() =>
      UserCreateInput.parse({
        ...baseInput,
        role: Role.ClientUser,
        companyId: null,
      }),
    ).toThrow(/companyId.*requis/);
  });

  it('CLIENT_USER avec companyId valide → OK', () => {
    const parsed = UserCreateInput.parse({
      ...baseInput,
      role: Role.ClientUser,
      companyId: '0123456789abcdef01234567',
    });
    expect(parsed.companyId).toBe('0123456789abcdef01234567');
  });

  it('TECHNICIAN avec companyId null → OK', () => {
    const parsed = UserCreateInput.parse({
      ...baseInput,
      role: Role.Technician,
      companyId: null,
    });
    expect(parsed.companyId).toBeNull();
  });

  it('ADMIN avec companyId null → OK', () => {
    const parsed = UserCreateInput.parse({
      ...baseInput,
      role: Role.Admin,
    });
    expect(parsed.role).toBe(Role.Admin);
  });
});

describe('UserUpdateInput', () => {
  it('tous les champs optionnels', () => {
    const parsed = UserUpdateInput.parse({});
    expect(parsed).toEqual({});
  });

  it('accepte email seul', () => {
    const parsed = UserUpdateInput.parse({ email: 'NEW@test.fr' });
    expect(parsed.email).toBe('new@test.fr');
  });

  it('rejette mot de passe trop court', () => {
    expect(() => UserUpdateInput.parse({ password: 'short' })).toThrow();
  });
});
