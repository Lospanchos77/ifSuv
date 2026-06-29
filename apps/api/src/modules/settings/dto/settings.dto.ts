import { createZodDto } from 'nestjs-zod';
import { SiteSettings, SiteSettingsUpdateInput } from '@ifsuv/shared';

export class SiteSettingsDto extends createZodDto(SiteSettings) {}
export class SiteSettingsUpdateInputDto extends createZodDto(SiteSettingsUpdateInput) {}
