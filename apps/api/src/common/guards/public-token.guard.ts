import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import {
  InvalidQrTokenError,
  type QrTokenClaims,
  type QrTokenKind,
  QrTokenService,
} from '../../infrastructure/tokens/qr-token.service';

/**
 * Guard pour les routes publiques par token (page client `/p/t/:token`).
 * À utiliser combiné avec `@Public()` pour bypasser le SessionGuard global.
 *
 * Le token est lu depuis le param `:token` de l'URL. Si valide, hydrate
 * `request.qrToken = { tid, kind }` que le controller peut consommer.
 */
@Injectable()
export class PublicTokenGuard implements CanActivate {
  constructor(private readonly qrTokens: QrTokenService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<FastifyRequest & {
      qrToken?: QrTokenClaims;
      params: Record<string, string>;
    }>();
    const token = req.params['token'];
    if (!token) {
      throw new UnauthorizedException('Token manquant');
    }
    try {
      const claims = this.qrTokens.verify(token);
      req.qrToken = claims;
      return true;
    } catch (err) {
      if (err instanceof InvalidQrTokenError) {
        throw new UnauthorizedException(err.message);
      }
      throw new UnauthorizedException('Token invalide');
    }
  }
}

/**
 * Helper pour les controllers : lit le token validé par PublicTokenGuard.
 */
export function getQrTokenClaims(
  req: FastifyRequest,
  expectedKind?: QrTokenKind,
): QrTokenClaims {
  const claims = (req as FastifyRequest & { qrToken?: QrTokenClaims }).qrToken;
  if (!claims) {
    throw new UnauthorizedException('Token non vérifié (guard manquant ?)');
  }
  if (expectedKind && claims.kind !== expectedKind) {
    throw new UnauthorizedException(`Type de token attendu : ${expectedKind}`);
  }
  return claims;
}
