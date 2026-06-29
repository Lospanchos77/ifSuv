import { z } from 'zod';

// Taille max d'une data URI logo (~270ko de base64 = ~200ko binaire)
const LOGO_MAX_LEN = 280_000;

const DataUrlImage = z
  .string()
  .max(LOGO_MAX_LEN, 'Logo trop volumineux (max ~200ko)')
  .regex(
    /^data:image\/(png|jpeg|jpg|webp|svg\+xml);base64,/,
    'Format de logo non supporté (PNG, JPEG, WEBP ou SVG)',
  );

/** Couleurs primaires Mantine acceptées pour le thème global. */
export const MantineColorSchema = z.enum([
  'dark',
  'gray',
  'red',
  'pink',
  'grape',
  'violet',
  'indigo',
  'blue',
  'cyan',
  'teal',
  'green',
  'lime',
  'yellow',
  'orange',
]);
export type MantineColor = z.infer<typeof MantineColorSchema>;

/** Taille de bord par défaut appliquée aux Cards, Buttons, Inputs… */
export const RadiusSchema = z.enum(['xs', 'sm', 'md', 'lg', 'xl']);
export type RadiusSize = z.infer<typeof RadiusSchema>;

/** Familles de polices préset (mappées vers une font-stack côté front). */
export const FontFamilySchema = z.enum(['system', 'serif', 'mono', 'rounded']);
export type FontFamilyKey = z.infer<typeof FontFamilySchema>;

/** Types supportés pour les champs ticket custom. */
export const CustomFieldTypeSchema = z.enum(['text', 'textarea', 'checkbox', 'select']);
export type CustomFieldType = z.infer<typeof CustomFieldTypeSchema>;

/**
 * Définition d'un champ custom configuré par l'admin dans les paramètres du site.
 * - `key` : slug technique stable utilisé comme clé en base (a-z0-9_, lowercase)
 * - `label` : libellé affiché dans le formulaire
 * - `type` : nature du champ
 * - `options` : valeurs possibles pour `type='select'` (ignorées sinon)
 * - `required` : si true, le formulaire affiche "*" (validation soft, non bloquante)
 */
export const CustomFieldDef = z.object({
  key: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z][a-z0-9_]*$/, 'Clé invalide (minuscules, chiffres, underscore, commence par lettre)'),
  label: z.string().min(1).max(80),
  type: CustomFieldTypeSchema,
  options: z.array(z.string().min(1).max(80)).max(50).optional(),
  required: z.boolean().optional(),
  /**
   * Largeur du champ dans le formulaire ticket :
   * - 1 : pleine largeur (12/12) — défaut
   * - 2 : demi-largeur (6/12)
   * - 3 : tiers de largeur (4/12)
   * Sur mobile, tous les champs sont en pleine largeur quelle que soit la valeur.
   */
  widthCols: z.coerce.number().int().min(1).max(3).optional(),
  /**
   * Si true, la valeur de ce champ est affichée sur la TicketCard du dashboard.
   * Permet à l'admin de mettre en avant 1-2 infos clés (ex. type d'appareil)
   * sans surcharger la card.
   */
  showOnDashboard: z.boolean().optional(),
});
export type CustomFieldDef = z.infer<typeof CustomFieldDef>;

const HexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Couleur hex attendue (ex. #5c7cfa)');

export const SiteSettings = z.object({
  siteName: z.string().min(1).max(80),
  siteTagline: z.string().max(160).optional(),
  logoDataUrl: z.string().optional(),
  primaryColor: MantineColorSchema.optional(),
  siteNameColor: HexColor.optional(),
  showSiteName: z.boolean().optional(),
  defaultRadius: RadiusSchema.optional(),
  fontFamily: FontFamilySchema.optional(),
  logoHeight: z.coerce.number().int().min(16).max(256).optional(),
  headerPaddingY: z.coerce.number().int().min(-48).max(48).optional(),
  customTicketFields: z.array(CustomFieldDef).max(50).optional(),
  supportEmail: z
    .string()
    .email()
    .optional()
    .or(z.literal('').transform(() => undefined)),
  supportPhone: z.string().max(40).optional(),
  companyAddress: z.string().max(300).optional(),
  // Identité société pour les documents imprimés (fiche de prise en charge, rapports).
  companyName: z.string().max(120).optional(),
  companySiret: z.string().max(40).optional(),
});
export type SiteSettings = z.infer<typeof SiteSettings>;

export const SiteSettingsUpdateInput = z.object({
  siteName: z.string().min(1).max(80).optional(),
  siteTagline: z.string().max(160).optional(),
  logoDataUrl: DataUrlImage.optional().or(z.literal('').transform(() => undefined)),
  primaryColor: MantineColorSchema.optional(),
  siteNameColor: HexColor.optional().or(z.literal('').transform(() => undefined)),
  showSiteName: z.boolean().optional(),
  defaultRadius: RadiusSchema.optional(),
  fontFamily: FontFamilySchema.optional(),
  logoHeight: z.coerce.number().int().min(16).max(256).optional(),
  headerPaddingY: z.coerce.number().int().min(-48).max(48).optional(),
  customTicketFields: z.array(CustomFieldDef).max(50).optional(),
  supportEmail: z
    .string()
    .email()
    .optional()
    .or(z.literal('').transform(() => undefined)),
  supportPhone: z.string().max(40).optional(),
  companyAddress: z.string().max(300).optional(),
  companyName: z.string().max(120).optional(),
  companySiret: z.string().max(40).optional(),
});
export type SiteSettingsUpdateInput = z.infer<typeof SiteSettingsUpdateInput>;
