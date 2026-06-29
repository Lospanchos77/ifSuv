import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type AuditLogDocument = HydratedDocument<AuditLog>;

@Schema({ timestamps: false, collection: 'auditLog' })
export class AuditLog {
  @Prop({ type: Types.ObjectId, ref: 'User', index: true })
  userId?: Types.ObjectId;

  @Prop({ required: true, index: true })
  action!: string;

  @Prop()
  entity?: string;

  @Prop({ type: Types.ObjectId })
  entityId?: Types.ObjectId;

  @Prop({ type: Object })
  diff?: Record<string, unknown>;

  @Prop()
  ip?: string;

  @Prop()
  ua?: string;

  @Prop({ type: Date, default: Date.now, index: true })
  at!: Date;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
