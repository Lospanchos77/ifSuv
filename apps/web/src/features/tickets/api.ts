import type {
  CustomerSuggestion,
  TicketCreateInput,
  TicketListQuery,
  TicketListResponse,
  TicketFilePublic,
  TicketPublic,
  TicketStatsResponse,
  TechPerfStatsResponse,
  TicketTransitionInput,
  TicketUpdateInput,
} from '@ifsuv/shared';
import { apiFetch, apiUpload } from '../../lib/api-client';

function buildQueryString(query: Partial<TicketListQuery>): string {
  const params = new URLSearchParams();
  if (query.q) params.set('q', query.q);
  if (query.status) params.set('status', query.status);
  if (query.techId) params.set('techId', query.techId);
  if (query.companyId) params.set('companyId', query.companyId);
  if (query.mode) params.set('mode', query.mode);
  if (query.page) params.set('page', String(query.page));
  if (query.pageSize) params.set('pageSize', String(query.pageSize));
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export function listTickets(
  query: Partial<TicketListQuery> = {},
): Promise<TicketListResponse> {
  return apiFetch<TicketListResponse>(`/tickets${buildQueryString(query)}`);
}

export function getTicketStats(): Promise<TicketStatsResponse> {
  return apiFetch<TicketStatsResponse>('/tickets/stats');
}

export function getTechPerf(): Promise<TechPerfStatsResponse> {
  return apiFetch<TechPerfStatsResponse>('/tickets/performance');
}

export function getTicket(id: string): Promise<TicketPublic> {
  return apiFetch<TicketPublic>(`/tickets/${id}`);
}

export function createTicket(input: TicketCreateInput): Promise<TicketPublic> {
  return apiFetch<TicketPublic>('/tickets', { method: 'POST', body: input });
}

export function updateTicket(id: string, input: TicketUpdateInput): Promise<TicketPublic> {
  return apiFetch<TicketPublic>(`/tickets/${id}`, { method: 'PATCH', body: input });
}

export function transitionTicket(
  id: string,
  input: TicketTransitionInput,
): Promise<TicketPublic> {
  return apiFetch<TicketPublic>(`/tickets/${id}/transition`, {
    method: 'POST',
    body: input,
  });
}

export function deleteTicket(id: string): Promise<void> {
  return apiFetch<void>(`/tickets/${id}`, { method: 'DELETE' });
}

export function suggestCustomers(
  q: string,
  limit = 8,
): Promise<CustomerSuggestion[]> {
  const qs = `?q=${encodeURIComponent(q)}&limit=${limit}`;
  return apiFetch<CustomerSuggestion[]>(`/tickets/customers/suggest${qs}`);
}

/** Upload d'un fichier joint de la galerie (multipart). */
export function uploadTicketFile(id: string, file: File): Promise<TicketFilePublic> {
  return apiUpload<TicketFilePublic>(`/tickets/${id}/files`, file);
}

/** Upload d'une image inline du diagnostic → renvoie son URL (à insérer dans TipTap). */
export async function uploadDiagImage(id: string, file: File): Promise<string> {
  const { filename } = await apiUpload<{ filename: string }>(
    `/tickets/${id}/diag-images`,
    file,
  );
  return `/api/v1/tickets/${id}/diag-images/${filename}`;
}

export function deleteTicketFile(id: string, fileId: string): Promise<void> {
  return apiFetch<void>(`/tickets/${id}/files/${fileId}`, { method: 'DELETE' });
}

/** URL de streaming/téléchargement d'un fichier servi par l'API (cookies same-origin). */
export function ticketFileUrl(ticketId: string, fileId: string): string {
  return `/api/v1/tickets/${ticketId}/files/${fileId}`;
}
