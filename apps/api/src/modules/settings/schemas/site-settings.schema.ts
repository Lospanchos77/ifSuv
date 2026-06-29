import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

/**
 * Définition d'un champ ticket custom — stockée en sous-document.
 * Volontairement non-strict côté Mongoose (`strict: false` sur le parent)
 * pour rester flexible si on ajoute des propriétés (defaultValue, validation, etc.).
 */
@Schema({ _id: false })
class CustomFieldDef {
  @Prop({ required: true }) key!: string;
  @Prop({ required: true }) label!: string;
  @Prop({ required: true }) type!: string; // 'text' | 'textarea' | 'checkbox' | 'select'
  @Prop({ type: [String], default: [] }) options?: string[];
  @Prop({ default: false }) required?: boolean;
  @Prop({ default: 1 }) widthCols?: number; // 1 | 2 | 3 colonnes dans le formulaire
  @Prop({ default: false }) showOnDashboard?: boolean;
}
const CustomFieldDefSchema = SchemaFactory.createForClass(CustomFieldDef);

export type SiteSettingsDocument = HydratedDocument<SiteSettings>;

/**
 * Singleton de configuration globale du site. Un seul document existe en base,
 * accédé via `findOne()` + upsert dans le service.
 *
 * Le `logoDataUrl` est une data URI base64 (image/png ou image/svg+xml), limitée
 * à ~200ko côté validation Zod. Pour de l'image plus lourde, il faudra passer
 * par MinIO en Phase 4+.
 */
@Schema({ timestamps: true, collection: 'siteSettings' })
export class SiteSettings {
  @Prop({ required: true, default: 'IFSUV' })
  siteName!: string;

  @Prop()
  siteTagline?: string;

  @Prop()
  logoDataUrl?: string;

  @Prop({ default: 'indigo' })
  primaryColor?: string;

  @Prop()
  siteNameColor?: string;

  @Prop({ default: true })
  showSiteName?: boolean;

  @Prop({ default: 'md' })
  defaultRadius?: string;

  @Prop({ default: 'system' })
  fontFamily?: string;

  @Prop({ default: 36 })
  logoHeight?: number;

  @Prop({ default: 8 })
  headerPaddingY?: number;

  @Prop({ type: [CustomFieldDefSchema], default: [] })
  customTicketFields?: CustomFieldDef[];

  @Prop()
  supportEmail?: string;

  @Prop()
  supportPhone?: string;

  @Prop()
  companyAddress?: string;

  @Prop()
  companyName?: string;

  @Prop()
  companySiret?: string;
}

export const SiteSettingsSchema = SchemaFactory.createForClass(SiteSettings);
