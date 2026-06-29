import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type {
  UserCreateInput,
  UserListQuery,
  UserListResponse,
  UserPublic,
  UserUpdateInput,
} from '@ifsuv/shared';
import { Model, Types } from 'mongoose';
import { PasswordService } from '../auth/services/password.service';
import { SessionService } from '../auth/services/session.service';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly users: Model<UserDocument>,
    private readonly password: PasswordService,
    private readonly sessions: SessionService,
  ) {}

  async create(input: UserCreateInput): Promise<UserPublic> {
    try {
      const passwordHash = await this.password.hash(input.password);
      const created = await this.users.create({
        email: input.email,
        passwordHash,
        role: input.role,
        companyId: input.companyId ? new Types.ObjectId(input.companyId) : null,
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
        teamviewerId: input.teamviewerId,
        systemInfo: input.systemInfo,
        notes: input.notes,
        mustResetPassword: input.mustResetPassword ?? false,
      });
      return toPublic(created);
    } catch (err: unknown) {
      if (isMongoDuplicate(err)) {
        throw new ConflictException('Email déjà utilisé');
      }
      throw err;
    }
  }

  async findById(id: string): Promise<UserPublic> {
    const user = await this.users.findOne({ _id: id, deletedAt: null });
    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }
    return toPublic(user);
  }

  async update(id: string, input: UserUpdateInput): Promise<UserPublic> {
    const update: Record<string, unknown> = { ...input };
    if (input.password) {
      update['passwordHash'] = await this.password.hash(input.password);
      delete update['password'];
    }
    if (Object.prototype.hasOwnProperty.call(input, 'companyId')) {
      update['companyId'] = input.companyId ? new Types.ObjectId(input.companyId) : null;
    }

    try {
      const updated = await this.users.findOneAndUpdate(
        { _id: id, deletedAt: null },
        { $set: update },
        { new: true },
      );
      if (!updated) {
        throw new NotFoundException('Utilisateur introuvable');
      }
      return toPublic(updated);
    } catch (err: unknown) {
      if (isMongoDuplicate(err)) {
        throw new ConflictException('Email déjà utilisé');
      }
      throw err;
    }
  }

  async softDelete(id: string): Promise<void> {
    const result = await this.users.updateOne(
      { _id: id, deletedAt: null },
      { $set: { deletedAt: new Date() } },
    );
    if (result.matchedCount === 0) {
      throw new NotFoundException('Utilisateur introuvable');
    }
    await this.sessions.revokeAllForUser(new Types.ObjectId(id));
  }

  async list(query: UserListQuery): Promise<UserListResponse> {
    const filter: Record<string, unknown> = { deletedAt: null };
    if (query.role) {
      filter['role'] = query.role;
    }
    if (query.q) {
      const regex = new RegExp(escapeRegex(query.q), 'i');
      filter['$or'] = [
        { email: regex },
        { firstName: regex },
        { lastName: regex },
      ];
    }

    const skip = (query.page - 1) * query.pageSize;
    const [items, total] = await Promise.all([
      this.users
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(query.pageSize),
      this.users.countDocuments(filter),
    ]);

    return {
      items: items.map(toPublic),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }
}

function toPublic(user: UserDocument): UserPublic {
  return {
    id: user._id.toString(),
    email: user.email,
    role: user.role,
    companyId: user.companyId ? user.companyId.toString() : null,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    teamviewerId: user.teamviewerId,
    systemInfo: user.systemInfo,
    notes: user.notes,
    mustResetPassword: user.mustResetPassword,
    createdAt: (user as unknown as { createdAt?: Date }).createdAt?.toISOString(),
    updatedAt: (user as unknown as { updatedAt?: Date }).updatedAt?.toISOString(),
  };
}

function isMongoDuplicate(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: number }).code === 11000
  );
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
