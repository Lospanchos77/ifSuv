import { createZodDto } from 'nestjs-zod';
import {
  CustomerSuggestQuery,
  TechDiagnosticInput,
  TicketCreateInput,
  TicketListQuery,
  TicketListResponse,
  TicketFilePublic,
  TicketPublic,
  TicketStatsResponse,
  TechPerfStatsResponse,
  TicketTransitionInput,
  TicketUpdateInput,
} from '@ifsuv/shared';

export class TicketCreateInputDto extends createZodDto(TicketCreateInput) {}
export class TicketUpdateInputDto extends createZodDto(TicketUpdateInput) {}
export class TicketTransitionInputDto extends createZodDto(TicketTransitionInput) {}
export class TechDiagnosticInputDto extends createZodDto(TechDiagnosticInput) {}
export class TicketListQueryDto extends createZodDto(TicketListQuery) {}
export class TicketPublicDto extends createZodDto(TicketPublic) {}
export class TicketFilePublicDto extends createZodDto(TicketFilePublic) {}
export class TicketListResponseDto extends createZodDto(TicketListResponse) {}
export class TicketStatsResponseDto extends createZodDto(TicketStatsResponse) {}
export class TechPerfStatsResponseDto extends createZodDto(TechPerfStatsResponse) {}
export class CustomerSuggestQueryDto extends createZodDto(CustomerSuggestQuery) {}
