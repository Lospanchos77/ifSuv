import { z } from 'zod';
import { ObjectIdString } from './common';

export const CompanyKind = z.enum(['COMPANY', 'INDIVIDUAL']);
export type CompanyKind = z.infer<typeof CompanyKind>;

export const CompanyCreateInput = z.object({
  kind: CompanyKind.default('COMPANY'),
  name: z.string().min(1).max(200).trim(),
  address: z.string().max(300).optional(),
  postalCode: z.string().max(20).optional(),
  city: z.string().max(100).optional(),
  email: z.string().email().optional().or(z.literal('').transform(() => undefined)),
  phone: z.string().max(40).optional(),
  website: z.string().max(300).optional(),
  charges: z.string().max(2000).optional(),
});
export type CompanyCreateInput = z.infer<typeof CompanyCreateInput>;

export const CompanyUpdateInput = CompanyCreateInput.partial();
export type CompanyUpdateInput = z.infer<typeof CompanyUpdateInput>;

export const CompanyPublic = z.object({
  id: ObjectIdString,
  kind: CompanyKind,
  name: z.string(),
  logoKey: z.string().nullable().optional(),
  address: z.string().optional(),
  postalCode: z.string().optional(),
  city: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  charges: z.string().optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});
export type CompanyPublic = z.infer<typeof CompanyPublic>;

export const CompanyListQuery = z.object({
  q: z.string().optional(),
  kind: CompanyKind.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type CompanyListQuery = z.infer<typeof CompanyListQuery>;

export const CompanyListResponse = z.object({
  items: z.array(CompanyPublic),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
});
export type CompanyListResponse = z.infer<typeof CompanyListResponse>;
