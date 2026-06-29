import { z } from 'zod';

export const ObjectIdString = z.string().regex(/^[a-f0-9]{24}$/i);
export type ObjectIdString = z.infer<typeof ObjectIdString>;

export const PaginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type PaginationQuery = z.infer<typeof PaginationQuery>;
