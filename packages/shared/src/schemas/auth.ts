import { z } from 'zod';
import { Role } from '../enums';
import { ObjectIdString } from './common';

export const LoginInput = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(8).max(200),
});
export type LoginInput = z.infer<typeof LoginInput>;

export const PasswordResetRequestInput = z.object({
  email: z.string().email().toLowerCase(),
});
export type PasswordResetRequestInput = z.infer<typeof PasswordResetRequestInput>;

export const PasswordResetConfirmInput = z.object({
  token: z.string().min(20).max(200),
  newPassword: z.string().min(12).max(200),
});
export type PasswordResetConfirmInput = z.infer<typeof PasswordResetConfirmInput>;

export const LogoutResponse = z.object({ ok: z.literal(true) });
export type LogoutResponse = z.infer<typeof LogoutResponse>;

export const OkResponse = z.object({ ok: z.literal(true) });
export type OkResponse = z.infer<typeof OkResponse>;

export const CurrentUser = z.object({
  id: ObjectIdString,
  email: z.string().email(),
  role: z.enum([Role.Admin, Role.Technician, Role.ClientUser]),
  firstName: z.string(),
  lastName: z.string(),
  companyId: ObjectIdString.nullable(),
  mustResetPassword: z.boolean(),
});
export type CurrentUser = z.infer<typeof CurrentUser>;

export const LoginResponse = CurrentUser;
export type LoginResponse = z.infer<typeof LoginResponse>;
