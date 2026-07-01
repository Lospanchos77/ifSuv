import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { TicketStatus } from '@ifsuv/shared';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { TicketEvent, TicketEventSchema } from './ticket-event.subschema';

export type TicketDocument = HydratedDocument<Ticket>;

@Schema({ _id: false })
class TicketMeta {
  @Prop({ default: false }) isLaptop?: boolean;
  @Prop({ default: false }) hasBag?: boolean;
  @Prop({ default: false }) hasCharger?: boolean;
  @Prop({ default: false }) hasMouse?: boolean;
  @Prop({ default: false }) hasKeyboard?: boolean;
  @Prop() otherMaterial?: string;
}
const TicketMetaSchema = SchemaFactory.createForClass(TicketMeta);

// _id activé (comme TicketEvent) : chaque fichier est adressable individuellement
// pour le download/delete via `GET|DELETE /tickets/:id/files/:fileId`.
@Schema({ _id: true })
class TicketFile {
  @Prop({ required: true }) key!: string;
  @Prop({ required: true }) name!: string;
  @Prop({ required: true }) mimeType!: string;
  @Prop({ required: true, default: 0 }) size!: number;
  @Prop({ type: Date, default: Date.now }) uploadedAt!: Date;
  @Prop({ type: Types.ObjectId, ref: 'User' }) uploadedBy?: Types.ObjectId;
}
const TicketFileSchema = SchemaFactory.createForClass(TicketFile);

@Schema({ timestamps: true, collection: 'tickets' })
export class Ticket {
  @Prop({ required: true, unique: true, index: true })
  ref!: string;

  @Prop({ type: Types.ObjectId, ref: 'Company', index: true })
  companyId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', index: true })
  assignedTechId?: Types.ObjectId;

  @Prop() customerName?: string;
  @Prop() customerPhone?: string;
  @Prop() customerEmail?: string;
  @Prop() customerAddress?: string;
  @Prop() pcPassword?: string;
  @Prop() location?: string;
  @Prop() problemType?: string;

  @Prop({
    type: String,
    required: true,
    enum: [
      TicketStatus.New,
      TicketStatus.InProgress,
      TicketStatus.Resolved,
      TicketStatus.Closed,
    ],
    default: TicketStatus.New,
    index: true,
  })
  status!: TicketStatus;

  @Prop({
    type: String,
    required: true,
    enum: ['LOW', 'NORMAL', 'HIGH'],
    default: 'NORMAL',
    index: true,
  })
  priority!: 'LOW' | 'NORMAL' | 'HIGH';

  @Prop({ default: '' })
  diagnosticHtml!: string;

  @Prop({ type: TicketMetaSchema, default: () => ({}) })
  meta!: TicketMeta;

  // Données des champs custom — bag clé/valeur, structure libre côté Mongoose
  // (la validation par type est faite côté Zod via `SiteSettings.customTicketFields`).
  @Prop({ type: MongooseSchema.Types.Mixed, default: () => ({}) })
  customFieldsData?: Record<string, unknown>;

  @Prop({ index: { unique: true, sparse: true } })
  publicToken?: string;

  @Prop({ index: { unique: true, sparse: true } })
  techToken?: string;

  @Prop({ type: [TicketEventSchema], default: [] })
  events!: TicketEvent[];

  @Prop({ type: [TicketFileSchema], default: [] })
  files!: TicketFile[];

  // Compteur cumulatif d'images inline de diagnostic uploadées (jamais décrémenté).
  // Sert de plafond anti-abus sur l'endpoint public (QR technicien). Voir
  // TICKET_DIAG_IMAGE_MAX_COUNT + TicketsService.addDiagImage.
  @Prop({ type: Number, default: 0 })
  diagImageCount!: number;

  @Prop({ index: { sparse: true } })
  legacyId?: number;

  @Prop()
  closedAt?: Date;
}

export const TicketSchema = SchemaFactory.createForClass(Ticket);
TicketSchema.index({ status: 1, assignedTechId: 1 });
TicketSchema.index({ companyId: 1, createdAt: -1 });
TicketSchema.index({ customerName: 'text', ref: 'text', problemType: 'text' });
