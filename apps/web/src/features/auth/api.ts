import type {
  CurrentUser,
  LoginInput,
  OkResponse,
  PasswordResetConfirmInput,
  PasswordResetRequestInput,
} from '@ifsuv/shared';
import { apiFetch } from '../../lib/api-client';

export function loginRequest(input: LoginInput): Promise<CurrentUser> {
  return apiFetch<CurrentUser>('/auth/login', {
    method: 'POST',
    body: input,
    skipAuthRedirect: true,
  });
}

export function logoutRequest(): Promise<OkResponse> {
  return apiFetch<OkResponse>('/auth/logout', { method: 'POST', skipAuthRedirect: true });
}

export function meRequest(): Promise<CurrentUser> {
  return apiFetch<CurrentUser>('/auth/me', { skipAuthRedirect: true });
}

export function passwordResetRequest(
  input: PasswordResetRequestInput,
): Promise<OkResponse> {
  return apiFetch<OkResponse>('/auth/password-reset/request', {
    method: 'POST',
    body: input,
    skipAuthRedirect: true,
  });
}

export function passwordResetConfirm(
  input: PasswordResetConfirmInput,
): Promise<OkResponse> {
  return apiFetch<OkResponse>('/auth/password-reset/confirm', {
    method: 'POST',
    body: input,
    skipAuthRedirect: true,
  });
}
