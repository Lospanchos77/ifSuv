import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CompanyKind = 'COMPANY' | 'INDIVIDUAL';
export type CompanyDocument = HydratedDocument<Company>;

@Schema({ timestamps: true, collection: 'companies' })
export class Company {
  @Prop({ type: String, required: true, enum: ['COMPANY', 'INDIVIDUAL'], default: 'COMPANY' })
  kind!: CompanyKind;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ type: String, default: null })
  logoKey?: string | null;

  @Prop()
  address?: string;

  @Prop()
  postalCode?: string;

  @Prop()
  city?: string;

  @Prop()
  email?: string;

  @Prop()
  phone?: string;

  @Prop()
  website?: string;

  @Prop()
  charges?: string;

  @Prop({ index: { sparse: true } })
  legacyId?: number;
}

export const CompanySchema = SchemaFactory.createForClass(Company);
CompanySchema.index({ name: 'text' });
