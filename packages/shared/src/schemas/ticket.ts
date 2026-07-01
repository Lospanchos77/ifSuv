import { z } from 'zod';
import { TicketStatus } from '../enums';
import { ObjectIdString } from './common';

/**
 * Helper : pour les champs ObjectId optionnels côté form (companyId, techId).
 * Mantine Select / nos Selects renvoient `null` quand on clear, et un form
 * peut accidentellement contenir `''`. Zod refuse ces deux cas par défaut pour
 * un ObjectIdString — on les normalise en `undefined`.
 */
const OptionalObjectId = z.preprocess(
  (v) => (v === '' || v === null ? undefined : v),
  ObjectIdString.optional(),
);

/**
 * Valeurs des champs custom stockées par ticket — clé = `CustomFieldDef.key`.
 * Le `preprocess` strip les clés à valeur vide/undefined/null avant validation,
 * pour qu'un Select custom cleared ne fasse pas échouer le formulaire.
 */
export const CustomFieldsData = z.preprocess(
  (val) => {
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      return Object.fromEntries(
        Object.entries(val as Record<string, unknown>).filter(
          ([, v]) => v !== undefined && v !== null && v !== '',
        ),
      );
    }
    return val;
  },
  z.record(z.union([z.string(), z.boolean(), z.number()])),
);
export type CustomFieldsData = z.infer<typeof CustomFieldsData>;

export const TicketStatusSchema = z.enum([
  TicketStatus.New,
  TicketStatus.InProgress,
  TicketStatus.Resolved,
  TicketStatus.Closed,
]);

export const TicketPrioritySchema = z.enum(['LOW', 'NORMAL', 'HIGH']);
export type TicketPriority = z.infer<typeof TicketPrioritySchema>;

export const TicketMeta = z.object({
  isLaptop: z.boolean().optional(),
  hasBag: z.boolean().optional(),
  hasCharger: z.boolean().optional(),
  hasMouse: z.boolean().optional(),
  hasKeyboard: z.boolean().optional(),
  otherMaterial: z.string().max(500).optional(),
});
export type TicketMeta = z.infer<typeof TicketMeta>;

export const TicketCreateInput = z.object({
  companyId: OptionalObjectId,
  assignedTechId: OptionalObjectId,
  customerName: z.string().max(200).optional(),
  customerPhone: z.string().max(40).optional(),
  customerEmail: z
    .string()
    .email()
    .max(200)
    .optional()
    .or(z.literal('').transform(() => undefined)),
  customerAddress: z.string().max(500).optional(),
  pcPassword: z.string().max(200).optional(),
  location: z.string().max(200).optional(),
  problemType: z.string().max(500).optional(),
  priority: TicketPrioritySchema.optional(),
  meta: TicketMeta.optional(),
  customFieldsData: CustomFieldsData.optional(),
});
export type TicketCreateInput = z.infer<typeof TicketCreateInput>;

export const TicketUpdateInput = TicketCreateInput.partial().extend({
  diagnosticHtml: z.string().max(50000).optional(),
});
export type TicketUpdateInput = z.infer<typeof TicketUpdateInput>;

export const TicketTransitionInput = z.object({
  to: TicketStatusSchema,
  comment: z.string().max(500).optional(),
});
export type TicketTransitionInput = z.infer<typeof TicketTransitionInput>;

export const TicketEventPublic = z.object({
  id: ObjectIdString,
  // Optionnel : les actions via QR technicien (sans login) n'ont pas d'acteur identifié.
  actorUserId: ObjectIdString.optional(),
  actorName: z.string().optional(),
  type: z.string(),
  payload: z.record(z.unknown()).optional(),
  at: z.string().datetime(),
});
export type TicketEventPublic = z.infer<typeof TicketEventPublic>;

/**
 * Édition du diagnostic via le QR technicien (accès restreint sans login) :
 * seul le contenu du diagnostic est modifiable — aucun autre champ du ticket.
 */
export const TechDiagnosticInput = z.object({
  diagnosticHtml: z.string().max(50000),
});
export type TechDiagnosticInput = z.infer<typeof TechDiagnosticInput>;

/**
 * Pièce jointe d'un ticket (image OU document). Le binaire est servi par l'API
 * (`GET /tickets/:id/files/:fileId`) — le front construit l'URL à partir de `id`.
 * La clé de stockage et l'identité de l'uploadeur restent internes.
 */
export const TicketFilePublic = z.object({
  id: ObjectIdString,
  name: z.string(),
  mimeType: z.string(),
  size: z.number().int().nonnegative(),
  uploadedAt: z.string().datetime(),
});
export type TicketFilePublic = z.infer<typeof TicketFilePublic>;

/** Types MIME image acceptés pour les images inline du diagnostic. */
export const TICKET_PHOTO_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
/** Images affichables en miniature/inline (rasters sûrs — pas de SVG : risque XSS). */
export const IMAGE_PREVIEW_MIME = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;
/** Pièces jointes (galerie) : tout type de fichier, ≤ 25 Mo, ≤ 20 par ticket. */
export const TICKET_FILE_MAX_BYTES = 25 * 1024 * 1024;
export const TICKET_FILE_MAX_COUNT = 20;
/**
 * Plafond d'images inline de diagnostic par ticket. Contrairement aux pièces
 * jointes, ces images sont uploadables via le QR technicien (endpoint public sans
 * login) : le plafond borne une saturation disque par upload en boucle. Généreux
 * (documentation photo d'une réparation) tout en coupant l'abus.
 */
export const TICKET_DIAG_IMAGE_MAX_COUNT = 100;

export const TicketCompanyEmbed = z.object({
  id: ObjectIdString,
  name: z.string(),
  kind: z.enum(['COMPANY', 'INDIVIDUAL']),
});

export const TicketUserEmbed = z.object({
  id: ObjectIdString,
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email(),
});

export const TicketPublic = z.object({
  id: ObjectIdString,
  ref: z.string(),
  status: TicketStatusSchema,
  priority: TicketPrioritySchema,
  companyId: ObjectIdString.optional(),
  company: TicketCompanyEmbed.optional(),
  assignedTechId: ObjectIdString.optional(),
  assignedTech: TicketUserEmbed.optional(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  customerEmail: z.string().optional(),
  customerAddress: z.string().optional(),
  pcPassword: z.string().optional(),
  location: z.string().optional(),
  problemType: z.string().optional(),
  meta: TicketMeta.optional(),
  customFieldsData: CustomFieldsData.optional(),
  diagnosticHtml: z.string(),
  events: z.array(TicketEventPublic),
  files: z.array(TicketFilePublic).default([]),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
  closedAt: z.string().datetime().optional(),
});
export type TicketPublic = z.infer<typeof TicketPublic>;

export const TicketListQuery = z.object({
  q: z.string().optional(),
  status: TicketStatusSchema.optional(),
  priority: TicketPrioritySchema.optional(),
  techId: ObjectIdString.optional(),
  companyId: ObjectIdString.optional(),
  /**
   * Filtre par défaut côté API quand `status` n'est pas fourni :
   * - 'active' (défaut) : exclut les CLOSED (vue "travail courant")
   * - 'archived' : uniquement les CLOSED (vue "historique")
   * - 'all' : tous statuts
   * Le filtre `status` explicite reste toujours prioritaire sur `mode`.
   */
  mode: z.enum(['active', 'archived', 'all']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type TicketListQuery = z.infer<typeof TicketListQuery>;

export const CustomerSuggestQuery = z.object({
  q: z.string().min(1).max(80),
  limit: z.coerce.number().int().min(1).max(20).default(8),
});
export type CustomerSuggestQuery = z.infer<typeof CustomerSuggestQuery>;

export const CustomerSuggestion = z.object({
  name: z.string(),
  phone: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
});
export type CustomerSuggestion = z.infer<typeof CustomerSuggestion>;

export const CustomerSuggestionsResponse = z.array(CustomerSuggestion);
export type CustomerSuggestionsResponse = z.infer<typeof CustomerSuggestionsResponse>;

export const TicketListItem = TicketPublic.omit({
  events: true,
  files: true,
});
export type TicketListItem = z.infer<typeof TicketListItem>;

export const TicketListResponse = z.object({
  items: z.array(TicketListItem),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
});
export type TicketListResponse = z.infer<typeof TicketListResponse>;

export const TicketStatsResponse = z.object({
  byStatus: z.object({
    NEW: z.number().int().nonnegative(),
    IN_PROGRESS: z.number().int().nonnegative(),
    RESOLVED: z.number().int().nonnegative(),
    CLOSED: z.number().int().nonnegative(),
  }),
  total: z.number().int().nonnegative(),
});
export type TicketStatsResponse = z.infer<typeof TicketStatsResponse>;

/**
 * Stats de performance par technicien (admin) : volume pris en charge + temps
 * moyens ouverture→résolution et ouverture→clôture (durées en millisecondes,
 * null si aucun ticket résolu/clos). Groupé par technicien assigné.
 */
export const TechPerfRow = z.object({
  techId: ObjectIdString.nullable(),
  techName: z.string(),
  total: z.number().int().nonnegative(),
  byStatus: z.object({
    NEW: z.number().int().nonnegative(),
    IN_PROGRESS: z.number().int().nonnegative(),
    RESOLVED: z.number().int().nonnegative(),
    CLOSED: z.number().int().nonnegative(),
  }),
  resolvedCount: z.number().int().nonnegative(),
  closedCount: z.number().int().nonnegative(),
  avgResolutionMs: z.number().nonnegative().nullable(),
  avgClosureMs: z.number().nonnegative().nullable(),
});
export type TechPerfRow = z.infer<typeof TechPerfRow>;

export const TechPerfStatsResponse = z.object({
  rows: z.array(TechPerfRow),
});
export type TechPerfStatsResponse = z.infer<typeof TechPerfStatsResponse>;
