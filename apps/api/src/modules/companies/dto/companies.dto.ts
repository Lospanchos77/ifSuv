import { createZodDto } from 'nestjs-zod';
import {
  CompanyCreateInput,
  CompanyListQuery,
  CompanyListResponse,
  CompanyPublic,
  CompanyUpdateInput,
} from '@ifsuv/shared';

export class CompanyCreateInputDto extends createZodDto(CompanyCreateInput) {}
export class CompanyUpdateInputDto extends createZodDto(CompanyUpdateInput) {}
export class CompanyListQueryDto extends createZodDto(CompanyListQuery) {}
export class CompanyPublicDto extends createZodDto(CompanyPublic) {}
export class CompanyListResponseDto extends createZodDto(CompanyListResponse) {}
