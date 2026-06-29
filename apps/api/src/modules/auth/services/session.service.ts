import { createHash, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Session, SessionDocument } from '../schemas/session.schema';
import { User, UserDocument } from '../../users/schemas/user.schema';

export interface SessionContext {
  ip?: string;
  ua?: string;
}

export interface NewSession {
  secret: string;
  expiresAt: Date;
  sessionId: Types.ObjectId;
}

export interface ActiveSession {
  session: SessionDocument;
  user: UserDocument;
}

function sha256Hex(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

@Injectable()
export class SessionService {
  private readonly ttlMs: number;

  constructor(
    @InjectModel(Session.name) private readonly sessions: Model<SessionDocument>,
    @InjectModel(User.name) private readonly users: Model<UserDocument>,
    config: ConfigService,
  ) {
    const ttlDays = config.get<number>('SESSION_TTL_DAYS', 30);
    this.ttlMs = ttlDays * 24 * 60 * 60 * 1000;
  }

  async createSession(userId: Types.ObjectId, ctx: SessionContext): Promise<NewSession> {
    const secret = randomBytes(32).toString('base64url');
    const secretHash = sha256Hex(secret);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.ttlMs);

    const created = await this.sessions.create({
      userId,
      secretHash,
      expiresAt,
      lastActiveAt: now,
      ip: ctx.ip,
      userAgent: ctx.ua,
    });

    return { secret, expiresAt, sessionId: created._id };
  }

  async findActiveBySecret(secret: string): Promise<ActiveSession | null> {
    const secretHash = sha256Hex(secret);
    const session = await this.sessions.findOne({
      secretHash,
      expiresAt: { $gt: new Date() },
    });
    if (!session) {
      return null;
    }

    const user = await this.users.findOne({ _id: session.userId, deletedAt: null });
    if (!user) {
      return null;
    }

    return { session, user };
  }

  /**
   * Slide TTL : ne réécrit que si la session est à plus de la mi-vie écoulée,
   * pour limiter le bruit en écriture par requête.
   * Retourne la nouvelle `expiresAt` si elle a été mise à jour, sinon null.
   */
  async touchAndSlide(sessionId: Types.ObjectId): Promise<Date | null> {
    const now = new Date();
    const session = await this.sessions.findById(sessionId);
    if (!session) {
      return null;
    }

    const elapsed = now.getTime() - session.lastActiveAt.getTime();
    if (elapsed < this.ttlMs / 2) {
      // Pas encore à mi-vie : on ne touche rien.
      return null;
    }

    const newExpiresAt = new Date(now.getTime() + this.ttlMs);
    await this.sessions.updateOne(
      { _id: sessionId },
      { $set: { lastActiveAt: now, expiresAt: newExpiresAt } },
    );
    return newExpiresAt;
  }

  async revoke(sessionId: Types.ObjectId): Promise<void> {
    await this.sessions.deleteOne({ _id: sessionId });
  }

  async revokeAllForUser(userId: Types.ObjectId): Promise<void> {
    await this.sessions.deleteMany({ userId });
  }
}
