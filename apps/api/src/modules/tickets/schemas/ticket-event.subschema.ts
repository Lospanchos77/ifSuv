import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema({ _id: true })
export class TicketEvent {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  actorUserId!: Types.ObjectId;

  @Prop({ required: true })
  type!: string;

  @Prop({ type: Object, default: {} })
  payload?: Record<string, unknown>;

  @Prop({ type: Date, default: Date.now })
  at!: Date;
}

export const TicketEventSchema = SchemaFactory.createForClass(TicketEvent);
