import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ContactHistoryDocument = HydratedDocument<ContactHistory>;

@Schema({ timestamps: true, collection: 'contactsHistory' })
export class ContactHistory {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true, index: true })
  companyId!: Types.ObjectId;

  @Prop({ required: true })
  name!: string;

  @Prop()
  phone?: string;

  @Prop()
  email?: string;

  @Prop()
  note?: string;

  @Prop({ index: { sparse: true } })
  legacyId?: number;
}

export const ContactHistorySchema = SchemaFactory.createForClass(ContactHistory);
