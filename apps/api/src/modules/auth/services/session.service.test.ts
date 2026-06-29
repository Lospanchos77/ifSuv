import { ConfigService } from '@nestjs/config';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Connection, Model, Types, connect } from 'mongoose';
import { Role } from '@ifsuv/shared';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { SessionSchema, type SessionDocument } from '../schemas/session.schema';
import { UserSchema, type UserDocument } from '../../users/schemas/user.schema';
import { SessionService } from './session.service';

describe('SessionService', () => {
  let mongod: MongoMemoryServer;
  let connection: Connection;
  let sessions: Model<SessionDocument>;
  let users: Model<UserDocument>;
  let service: SessionService;
  let userId: Types.ObjectId;

  const config = {
    get: (key: string, def: number): number => {
      if (key === 'SESSION_TTL_DAYS') return 30;
      return def;
    },
  } as unknown as ConfigService;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const mongoose = await connect(mongod.getUri());
    connection = mongoose.connection;
    sessions = connection.model('Session', SessionSchema) as unknown as Model<SessionDocument>;
    users = connection.model('User', UserSchema) as unknown as Model<UserDocument>;
    service = new SessionService(sessions, users, config);
  });

  afterAll(async () => {
    await connection.close();
    await mongod.stop();
  });

  beforeEach(async () => {
    await sessions.deleteMany({});
    await users.deleteMany({});

    const user = await users.create({
      email: 'admin@test.local',
      passwordHash: 'fake',
      role: Role.Admin,
      firstName: 'Admin',
      lastName: 'Test',
      companyId: null,
    });
    userId = user._id;
  });

  it('createSession + findActiveBySecret round-trip', async () => {
    const { secret } = await service.createSession(userId, { ip: '127.0.0.1' });
    const found = await service.findActiveBySecret(secret);
    expect(found).not.toBeNull();
    expect(found?.user._id.toString()).toBe(userId.toString());
  });

  it('findActiveBySecret retourne null pour secret inconnu', async () => {
    const found = await service.findActiveBySecret('nonexistent-secret-value');
    expect(found).toBeNull();
  });

  it('findActiveBySecret retourne null si user supprimé', async () => {
    const { secret } = await service.createSession(userId, {});
    await users.updateOne({ _id: userId }, { $set: { deletedAt: new Date() } });
    const found = await service.findActiveBySecret(secret);
    expect(found).toBeNull();
  });

  it('revoke supprime la session', async () => {
    const { secret, sessionId } = await service.createSession(userId, {});
    await service.revoke(sessionId);
    expect(await service.findActiveBySecret(secret)).toBeNull();
  });

  it('revokeAllForUser supprime toutes les sessions de l\'user', async () => {
    await service.createSession(userId, {});
    await service.createSession(userId, {});
    await service.revokeAllForUser(userId);
    expect(await sessions.countDocuments({ userId })).toBe(0);
  });

  it('touchAndSlide ne modifie rien si la session est récente', async () => {
    const { sessionId } = await service.createSession(userId, {});
    const result = await service.touchAndSlide(sessionId);
    expect(result).toBeNull();
  });

  it('touchAndSlide met à jour expiresAt si la session est à mi-vie', async () => {
    const { sessionId } = await service.createSession(userId, {});
    // Force la session à être "vieille" (16j > 15j de demi-vie pour TTL=30j).
    const oldDate = new Date(Date.now() - 16 * 24 * 60 * 60 * 1000);
    await sessions.updateOne({ _id: sessionId }, { $set: { lastActiveAt: oldDate } });

    const result = await service.touchAndSlide(sessionId);
    expect(result).not.toBeNull();
    expect(result!.getTime()).toBeGreaterThan(Date.now());
  });
});
