import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema({ _id: true })
export class TicketEvent {
  // Optionnel : les actions déclenchées via le QR technicien (sans login) n'ont
  // pas d'utilisateur identifié — l'event est alors « anonyme » (via QR).
  @Prop({ type: Types.ObjectId, ref: 'User' })
  actorUserId?: Types.ObjectId;

  @Prop({ required: true })
  type!: string;

  @Prop({ type: Object, default: {} })
  payload?: Record<string, unknown>;

  @Prop({ type: Date, default: Date.now })
  at!: Date;
}

export const TicketEventSchema = SchemaFactory.createForClass(TicketEvent);
