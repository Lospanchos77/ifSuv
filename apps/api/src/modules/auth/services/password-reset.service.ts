import { createHash, randomBytes } from 'node:crypto';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditService } from '../../../infrastructure/audit/audit.service';
import { MailerService } from '../../../infrastructure/mailer/mailer.service';
import { User, UserDocument } from '../../users/schemas/user.schema';
import {
  PasswordResetToken,
  PasswordResetTokenDocument,
} from '../schemas/password-reset-token.schema';
import { PasswordService } from './password.service';
import { SessionService } from './session.service';

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1h
const TOKEN_TTL_HOURS = 1;

function sha256Hex(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);

  constructor(
    @InjectModel(User.name) private readonly users: Model<UserDocument>,
    @InjectModel(PasswordResetToken.name)
    private readonly tokens: Model<PasswordResetTokenDocument>,
    private readonly password: PasswordService,
    private readonly sessions: SessionService,
    private readonly mailer: MailerService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Toujours retourner OK — pas d'oracle d'existence.
   */
  async request(email: string, ctx: { ip?: string; ua?: string }): Promise<void> {
    const normalized = email.trim().toLowerCase();
    const user = await this.users.findOne({ email: normalized, deletedAt: null });
    if (!user) {
      this.logger.warn(`password-reset.request for unknown email=${normalized}`);
      return;
    }

    const token = randomBytes(32).toString('base64url');
    const tokenHash = sha256Hex(token);
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

    await this.tokens.create({ userId: user._id, tokenHash, expiresAt });

    const appUrl = this.config.getOrThrow<string>('APP_URL');
    const resetUrl = `${appUrl.replace(/\/$/, '')}/reset-password?token=${token}`;

    await this.mailer.sendPasswordReset({
      to: user.email,
      firstName: user.firstName,
      resetUrl,
      ttlHours: TOKEN_TTL_HOURS,
    });

    await this.audit.log({
      userId: user._id,
      action: 'auth.password_reset.requested',
      ip: ctx.ip,
      ua: ctx.ua,
    });
  }

  async confirm(
    token: string,
    newPassword: string,
    ctx: { ip?: string; ua?: string },
  ): Promise<void> {
    const tokenHash = sha256Hex(token);
    const record = await this.tokens.findOne({
      tokenHash,
      expiresAt: { $gt: new Date() },
      usedAt: null,
    });
    if (!record) {
      throw new BadRequestException('Token invalide ou expiré');
    }

    const passwordHash = await this.password.hash(newPassword);
    await this.users.updateOne(
      { _id: record.userId },
      { $set: { passwordHash, mustResetPassword: false } },
    );

    await this.tokens.updateOne(
      { _id: record._id },
      { $set: { usedAt: new Date() } },
    );

    await this.sessions.revokeAllForUser(record.userId);

    await this.audit.log({
      userId: record.userId,
      action: 'auth.password_reset.confirmed',
      ip: ctx.ip,
      ua: ctx.ua,
    });
  }
}
