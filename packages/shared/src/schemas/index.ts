import { z } from 'zod';

export const HealthStatus = z.object({
  status: z.literal('ok'),
  uptime: z.number().nonnegative(),
  mongoState: z.enum(['connected', 'connecting', 'disconnected', 'unknown']),
  version: z.string(),
});
export type HealthStatus = z.infer<typeof HealthStatus>;

export * from './common';
export * from './auth';
export * from './user';
export * from './company';
export * from './ticket';
export * from './settings';
