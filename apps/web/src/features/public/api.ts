import type { TicketPublic } from '@ifsuv/shared';

/**
 * Fetch direct (sans cookie session). La page publique est accessible sans auth.
 */
export async function fetchPublicTicket(token: string): Promise<TicketPublic> {
  const res = await fetch(`/api/v1/public/tickets/${encodeURIComponent(token)}`);
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) {
    const message =
      body && typeof body === 'object' && 'message' in body
        ? String((body as { message: unknown }).message)
        : `HTTP ${res.status}`;
    throw new Error(message);
  }
  return body as TicketPublic;
}
