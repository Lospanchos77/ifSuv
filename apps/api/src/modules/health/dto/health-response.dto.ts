import { createZodDto } from 'nestjs-zod';
import { HealthStatus } from '@ifsuv/shared';

export class HealthResponseDto extends createZodDto(HealthStatus) {}
