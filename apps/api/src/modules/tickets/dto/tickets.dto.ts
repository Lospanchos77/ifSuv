import { createZodDto } from 'nestjs-zod';
import {
  CustomerSuggestQuery,
  TicketCreateInput,
  TicketListQuery,
  TicketListResponse,
  TicketFilePublic,
  TicketPublic,
  TicketStatsResponse,
  TicketTransitionInput,
  TicketUpdateInput,
} from '@ifsuv/shared';

export class TicketCreateInputDto extends createZodDto(TicketCreateInput) {}
export class TicketUpdateInputDto extends createZodDto(TicketUpdateInput) {}
export class TicketTransitionInputDto extends createZodDto(TicketTransitionInput) {}
export class TicketListQueryDto extends createZodDto(TicketListQuery) {}
export class TicketPublicDto extends createZodDto(TicketPublic) {}
export class TicketFilePublicDto extends createZodDto(TicketFilePublic) {}
export class TicketListResponseDto extends createZodDto(TicketListResponse) {}
export class TicketStatsResponseDto extends createZodDto(TicketStatsResponse) {}
export class CustomerSuggestQueryDto extends createZodDto(CustomerSuggestQuery) {}
