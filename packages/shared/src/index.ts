export const SHARED_VERSION = '0.0.0';

// Enums (re-exports nommés explicites — nécessaire pour que Vite/cjs-module-lexer
// résolve les imports nommés depuis le bundle CJS).
export { Role, TicketStatus } from './enums';

// Schémas Zod
export {
  // common
  ObjectIdString,
  PaginationQuery,
  // auth
  LoginInput,
  PasswordResetRequestInput,
  PasswordResetConfirmInput,
  LogoutResponse,
  OkResponse,
  CurrentUser,
  LoginResponse,
  // user
  UserCreateInput,
  UserUpdateInput,
  UserPublic,
  UserListQuery,
  UserListResponse,
  // company
  CompanyKind,
  CompanyCreateInput,
  CompanyUpdateInput,
  CompanyPublic,
  CompanyListQuery,
  CompanyListResponse,
  // ticket
  TicketStatusSchema,
  TicketPrioritySchema,
  TicketMeta,
  TicketCreateInput,
  TicketUpdateInput,
  TicketTransitionInput,
  TicketEventPublic,
  TicketFilePublic,
  TICKET_PHOTO_MIME_TYPES,
  IMAGE_PREVIEW_MIME,
  TICKET_FILE_MAX_BYTES,
  TICKET_FILE_MAX_COUNT,
  TicketCompanyEmbed,
  TicketUserEmbed,
  TicketPublic,
  TicketListQuery,
  TicketListItem,
  TicketListResponse,
  TicketStatsResponse,
  CustomFieldsData,
  CustomerSuggestQuery,
  CustomerSuggestion,
  CustomerSuggestionsResponse,
  // settings
  SiteSettings,
  SiteSettingsUpdateInput,
  MantineColorSchema,
  RadiusSchema,
  FontFamilySchema,
  CustomFieldTypeSchema,
  CustomFieldDef,
  // health
  HealthStatus,
} from './schemas';

// Types-only (pas de schéma Zod homonyme) — re-export explicite en `export type`.
export type { TicketPriority, MantineColor } from './schemas';
