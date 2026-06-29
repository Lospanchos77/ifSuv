import { z } from 'zod';
import { Role } from '../enums';
import { ObjectIdString } from './common';

const UserCreateBase = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(12).max(200),
  role: z.enum([Role.Admin, Role.Technician, Role.ClientUser]),
  companyId: ObjectIdString.nullable().default(null),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  phone: z.string().max(40).optional(),
  teamviewerId: z.string().max(100).optional(),
  systemInfo: z.string().max(500).optional(),
  notes: z.string().max(2000).optional(),
  mustResetPassword: z.boolean().default(false),
});

export const UserCreateInput = UserCreateBase.refine(
  (data) => data.role !== Role.ClientUser || data.companyId !== null,
  {
    message: 'companyId est requis pour les utilisateurs CLIENT_USER',
    path: ['companyId'],
  },
);
export type UserCreateInput = z.infer<typeof UserCreateInput>;

export const UserUpdateInput = UserCreateBase.partial().extend({
  password: z.string().min(12).max(200).optional(),
});
export type UserUpdateInput = z.infer<typeof UserUpdateInput>;

export const UserPublic = z.object({
  id: ObjectIdString,
  email: z.string().email(),
  role: z.enum([Role.Admin, Role.Technician, Role.ClientUser]),
  companyId: ObjectIdString.nullable(),
  firstName: z.string(),
  lastName: z.string(),
  phone: z.string().optional(),
  teamviewerId: z.string().optional(),
  systemInfo: z.string().optional(),
  notes: z.string().optional(),
  mustResetPassword: z.boolean(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});
export type UserPublic = z.infer<typeof UserPublic>;

export const UserListQuery = z.object({
  q: z.string().optional(),
  role: z.enum([Role.Admin, Role.Technician, Role.ClientUser]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type UserListQuery = z.infer<typeof UserListQuery>;

export const UserListResponse = z.object({
  items: z.array(UserPublic),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
});
export type UserListResponse = z.infer<typeof UserListResponse>;
