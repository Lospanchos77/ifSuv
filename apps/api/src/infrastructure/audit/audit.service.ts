import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuditLog, AuditLogDocument } from './schemas/audit-log.schema';

export interface AuditEvent {
  userId?: string | Types.ObjectId | null;
  action: string;
  entity?: string;
  entityId?: string | Types.ObjectId;
  diff?: Record<string, unknown>;
  ip?: string;
  ua?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectModel(AuditLog.name) private readonly model: Model<AuditLogDocument>,
  ) {}

  async log(event: AuditEvent): Promise<void> {
    try {
      const userId = event.userId
        ? typeof event.userId === 'string'
          ? new Types.ObjectId(event.userId)
          : event.userId
        : undefined;
      const entityId = event.entityId
        ? typeof event.entityId === 'string'
          ? new Types.ObjectId(event.entityId)
          : event.entityId
        : undefined;

      await this.model.create({
        userId,
        action: event.action,
        entity: event.entity,
        entityId,
        diff: event.diff,
        ip: event.ip,
        ua: event.ua,
        at: new Date(),
      });
    } catch (err) {
      this.logger.error(
        `audit.log failed action=${event.action}`,
        err instanceof Error ? err.stack : String(err),
      );
    }
  }
}
