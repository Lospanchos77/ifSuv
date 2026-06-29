import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { CurrentUser } from '@ifsuv/shared';
import { Model } from 'mongoose';
import { AuditService } from '../../../infrastructure/audit/audit.service';
import { User, UserDocument } from '../../users/schemas/user.schema';
import { PasswordService } from './password.service';
import { SessionService, type NewSession, type SessionContext } from './session.service';

const DUMMY_HASH =
  '$argon2id$v=19$m=19456,t=2,p=1$ZmFrZWZha2VmYWtlZmFrZQ$qSXjK1hIeJgcPp9R0VkHXnH2D0vH6vH+TUZmFlbHc7w';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private readonly users: Model<UserDocument>,
    private readonly password: PasswordService,
    private readonly sessionService: SessionService,
    private readonly audit: AuditService,
  ) {}

  async login(
    email: string,
    plain: string,
    ctx: SessionContext,
  ): Promise<{ user: UserDocument; newSession: NewSession }> {
    const normalized = email.trim().toLowerCase();
    const user = await this.users.findOne({ email: normalized, deletedAt: null });

    if (!user) {
      // Timing-constant : on calcule un verify dummy avant de rejeter
      await this.password.verify(DUMMY_HASH, plain);
      await this.audit.log({
        action: 'auth.login.failure',
        diff: { reason: 'unknown_email', email: normalized },
        ip: ctx.ip,
        ua: ctx.ua,
      });
      throw new UnauthorizedException('Identifiants invalides');
    }

    const ok = await this.password.verify(user.passwordHash, plain);
    if (!ok) {
      await this.audit.log({
        userId: user._id,
        action: 'auth.login.failure',
        diff: { reason: 'wrong_password' },
        ip: ctx.ip,
        ua: ctx.ua,
      });
      throw new UnauthorizedException('Identifiants invalides');
    }

    const newSession = await this.sessionService.createSession(user._id, ctx);
    await this.audit.log({
      userId: user._id,
      action: 'auth.login.success',
      ip: ctx.ip,
      ua: ctx.ua,
    });

    return { user, newSession };
  }

  async logout(
    sessionId: import('mongoose').Types.ObjectId,
    userId: import('mongoose').Types.ObjectId,
    ctx: SessionContext,
  ): Promise<void> {
    await this.sessionService.revoke(sessionId);
    await this.audit.log({
      userId,
      action: 'auth.logout',
      ip: ctx.ip,
      ua: ctx.ua,
    });
  }

  toCurrentUserDto(user: UserDocument): CurrentUser {
    return {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      companyId: user.companyId ? user.companyId.toString() : null,
      mustResetPassword: user.mustResetPassword,
    };
  }
}
