import type {
  CompanyCreateInput,
  CompanyListQuery,
  CompanyListResponse,
  CompanyPublic,
  CompanyUpdateInput,
} from '@ifsuv/shared';
import { apiFetch } from '../../lib/api-client';

function buildQueryString(query: Partial<CompanyListQuery>): string {
  const params = new URLSearchParams();
  if (query.q) params.set('q', query.q);
  if (query.kind) params.set('kind', query.kind);
  if (query.page) params.set('page', String(query.page));
  if (query.pageSize) params.set('pageSize', String(query.pageSize));
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export function listCompanies(
  query: Partial<CompanyListQuery> = {},
): Promise<CompanyListResponse> {
  return apiFetch<CompanyListResponse>(`/companies${buildQueryString(query)}`);
}

export function getCompany(id: string): Promise<CompanyPublic> {
  return apiFetch<CompanyPublic>(`/companies/${id}`);
}

export function createCompany(input: CompanyCreateInput): Promise<CompanyPublic> {
  return apiFetch<CompanyPublic>('/companies', { method: 'POST', body: input });
}

export function updateCompany(
  id: string,
  input: CompanyUpdateInput,
): Promise<CompanyPublic> {
  return apiFetch<CompanyPublic>(`/companies/${id}`, { method: 'PATCH', body: input });
}

export function deleteCompany(id: string): Promise<void> {
  return apiFetch<void>(`/companies/${id}`, { method: 'DELETE' });
}
