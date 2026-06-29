import { ConfigService } from '@nestjs/config';
import { describe, expect, it } from 'vitest';
import { PasswordService } from './password.service';

function makeService(): PasswordService {
  // Paramètres très bas pour les tests (rapide).
  const config = {
    get: (key: string, def: number): number => {
      if (key === 'ARGON2_MEMORY_COST') return 8192;
      if (key === 'ARGON2_TIME_COST') return 1;
      return def;
    },
  } as unknown as ConfigService;
  return new PasswordService(config);
}

describe('PasswordService', () => {
  const service = makeService();

  it('hash + verify round-trip', async () => {
    const hash = await service.hash('Admin!Pass2026');
    expect(hash).toMatch(/^\$argon2id\$/);
    expect(await service.verify(hash, 'Admin!Pass2026')).toBe(true);
  });

  it('verify retourne false sur mauvais mot de passe', async () => {
    const hash = await service.hash('Admin!Pass2026');
    expect(await service.verify(hash, 'wrong')).toBe(false);
  });

  it('verify retourne false sur format invalide sans throw', async () => {
    expect(await service.verify('not-an-argon2-hash', 'whatever')).toBe(false);
  });

  it('generateRandomPassword retourne la bonne longueur', () => {
    expect(service.generateRandomPassword(16)).toHaveLength(16);
    expect(service.generateRandomPassword(24)).toHaveLength(24);
  });
});
