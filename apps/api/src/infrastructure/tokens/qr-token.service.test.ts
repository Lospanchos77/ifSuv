import { ConfigService } from '@nestjs/config';
import { describe, expect, it } from 'vitest';
import { InvalidQrTokenError, QrTokenService } from './qr-token.service';

function makeService(secret = 'a'.repeat(32), ttlDays = 30): QrTokenService {
  const config = {
    getOrThrow: (key: string): string => {
      if (key === 'QR_TOKEN_SECRET') return secret;
      throw new Error(`unexpected key ${key}`);
    },
    get: (key: string, def: number): number => {
      if (key === 'QR_TOKEN_TTL_DAYS') return ttlDays;
      return def;
    },
  } as unknown as ConfigService;
  return new QrTokenService(config);
}

describe('QrTokenService', () => {
  it('sign + verify round-trip', () => {
    const service = makeService();
    const token = service.sign({ tid: '0123456789abcdef01234567', kind: 'public' });
    const claims = service.verify(token);
    expect(claims.tid).toBe('0123456789abcdef01234567');
    expect(claims.kind).toBe('public');
  });

  it('verify rejette token signé avec autre secret', () => {
    const a = makeService('a'.repeat(32));
    const b = makeService('b'.repeat(32));
    const token = a.sign({ tid: '0123456789abcdef01234567', kind: 'public' });
    expect(() => b.verify(token)).toThrow(InvalidQrTokenError);
  });

  it('verify rejette garbage', () => {
    const service = makeService();
    expect(() => service.verify('not.a.jwt')).toThrow(InvalidQrTokenError);
    expect(() => service.verify('')).toThrow(InvalidQrTokenError);
  });

  it('public et tech sont des kinds distincts', () => {
    const service = makeService();
    const publicTok = service.sign({ tid: 'xyz', kind: 'public' });
    const techTok = service.sign({ tid: 'xyz', kind: 'tech' });
    expect(publicTok).not.toBe(techTok);
    expect(service.verify(publicTok).kind).toBe('public');
    expect(service.verify(techTok).kind).toBe('tech');
  });
});
