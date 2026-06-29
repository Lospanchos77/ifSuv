import type {
  UserCreateInput,
  UserListQuery,
  UserListResponse,
  UserPublic,
  UserUpdateInput,
} from '@ifsuv/shared';
import { apiFetch } from '../../lib/api-client';

function buildQueryString(query: Partial<UserListQuery>): string {
  const params = new URLSearchParams();
  if (query.q) params.set('q', query.q);
  if (query.role) params.set('role', query.role);
  if (query.page) params.set('page', String(query.page));
  if (query.pageSize) params.set('pageSize', String(query.pageSize));
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export function listUsers(query: Partial<UserListQuery> = {}): Promise<UserListResponse> {
  return apiFetch<UserListResponse>(`/users${buildQueryString(query)}`);
}

export function getUser(id: string): Promise<UserPublic> {
  return apiFetch<UserPublic>(`/users/${id}`);
}

export function createUser(input: UserCreateInput): Promise<UserPublic> {
  return apiFetch<UserPublic>('/users', { method: 'POST', body: input });
}

export function updateUser(id: string, input: UserUpdateInput): Promise<UserPublic> {
  return apiFetch<UserPublic>(`/users/${id}`, { method: 'PATCH', body: input });
}

export function deleteUser(id: string): Promise<void> {
  return apiFetch<void>(`/users/${id}`, { method: 'DELETE' });
}
