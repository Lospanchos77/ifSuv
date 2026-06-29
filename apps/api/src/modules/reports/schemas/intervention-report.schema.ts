import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type InterventionReportDocument = HydratedDocument<InterventionReport>;

@Schema({ _id: false })
class EmailHistoryItem {
  @Prop({ required: true }) to!: string;
  @Prop({ type: Date, required: true }) sentAt!: Date;
  @Prop() subject?: string;
}
const EmailHistoryItemSchema = SchemaFactory.createForClass(EmailHistoryItem);

@Schema({ timestamps: true, collection: 'interventionReports' })
export class InterventionReport {
  @Prop({ type: Types.ObjectId, ref: 'Ticket', required: true, index: true })
  ticketId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  authorTechId!: Types.ObjectId;

  @Prop({ default: '' })
  contentHtml!: string;

  @Prop()
  resolutionDetails?: string;

  @Prop()
  pdfKey?: string;

  @Prop({ type: [EmailHistoryItemSchema], default: [] })
  emailHistory!: EmailHistoryItem[];

  @Prop({ index: { sparse: true } })
  legacyId?: number;
}

export const InterventionReportSchema = SchemaFactory.createForClass(InterventionReport);
