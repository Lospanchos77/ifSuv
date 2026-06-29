import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { SessionService } from '../../modules/auth/services/session.service';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessions: SessionService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const req = context.switchToHttp().getRequest<FastifyRequest>();
    const reply = context.switchToHttp().getResponse<FastifyReply>();
    const cookieName = this.config.getOrThrow<string>('COOKIE_NAME');

    const cookieValue = req.cookies?.[cookieName];
    if (!cookieValue) {
      throw new UnauthorizedException('Session manquante');
    }

    const result = await this.sessions.findActiveBySecret(cookieValue);
    if (!result) {
      reply.clearCookie(cookieName, { path: '/' });
      throw new UnauthorizedException('Session invalide');
    }

    req.user = result.user;
    req.session = { id: result.session._id };

    const newExpiresAt = await this.sessions.touchAndSlide(result.session._id);
    if (newExpiresAt) {
      reply.setCookie(cookieName, cookieValue, {
        httpOnly: true,
        sameSite: 'lax',
        secure: this.config.get<boolean>('COOKIE_SECURE', false),
        path: '/',
        expires: newExpiresAt,
      });
    }

    return true;
  }
}
