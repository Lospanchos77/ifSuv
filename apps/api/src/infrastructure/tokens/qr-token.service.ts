import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';

export type QrTokenKind = 'public' | 'tech';

export interface QrTokenClaims {
  tid: string;
  kind: QrTokenKind;
}

export class InvalidQrTokenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidQrTokenError';
  }
}

@Injectable()
export class QrTokenService {
  private readonly secret: string;
  private readonly ttlSeconds: number;

  constructor(config: ConfigService) {
    this.secret = config.getOrThrow<string>('QR_TOKEN_SECRET');
    const days = config.get<number>('QR_TOKEN_TTL_DAYS', 30);
    this.ttlSeconds = days * 24 * 60 * 60;
  }

  sign(claims: QrTokenClaims): string {
    return jwt.sign(claims, this.secret, {
      algorithm: 'HS256',
      expiresIn: this.ttlSeconds,
    });
  }

  verify(token: string): QrTokenClaims {
    try {
      const decoded = jwt.verify(token, this.secret, {
        algorithms: ['HS256'],
      }) as jwt.JwtPayload & Partial<QrTokenClaims>;
      if (
        typeof decoded !== 'object' ||
        typeof decoded.tid !== 'string' ||
        (decoded.kind !== 'public' && decoded.kind !== 'tech')
      ) {
        throw new InvalidQrTokenError('Token claims invalides');
      }
      return { tid: decoded.tid, kind: decoded.kind };
    } catch (err) {
      if (err instanceof InvalidQrTokenError) throw err;
      if (err instanceof jwt.TokenExpiredError) {
        throw new InvalidQrTokenError('Token expiré');
      }
      throw new InvalidQrTokenError('Token invalide');
    }
  }
}
