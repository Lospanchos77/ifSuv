import type { TicketPublic, TicketStatus } from '@ifsuv/shared';

/**
 * Accès technicien restreint via QR (sans login). Tous les appels ciblent
 * `/public/tech/:token` — le ticket visé est déterminé par le token signé, pas
 * par un id d'URL. Requêtes directes sans cookie de session.
 */
const base = (token: string): string =>
  `/api/v1/public/tech/${encodeURIComponent(token)}`;

async function parse<T>(res: Response): Promise<T> {
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
  return body as T;
}

export async function fetchTechTicket(token: string): Promise<TicketPublic> {
  return parse<TicketPublic>(await fetch(base(token)));
}

export async function saveTechDiagnostic(
  token: string,
  diagnosticHtml: string,
): Promise<TicketPublic> {
  return parse<TicketPublic>(
    await fetch(`${base(token)}/diagnostic`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ diagnosticHtml }),
    }),
  );
}

export async function transitionTechTicket(
  token: string,
  to: TicketStatus,
  comment?: string,
): Promise<TicketPublic> {
  return parse<TicketPublic>(
    await fetch(`${base(token)}/transition`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, comment }),
    }),
  );
}

/**
 * Upload d'une image inline du diagnostic. Renvoie l'URL publique servie par
 * l'API (`GET /tickets/:id/diag-images/:filename` est public) — le ticketId est
 * connu via la fiche déjà chargée.
 */
export async function uploadTechDiagImage(
  token: string,
  ticketId: string,
  file: File,
): Promise<string> {
  const fd = new FormData();
  fd.append('file', file);
  const { filename } = await parse<{ filename: string }>(
    await fetch(`${base(token)}/diag-images`, { method: 'POST', body: fd }),
  );
  return `/api/v1/tickets/${ticketId}/diag-images/${filename}`;
}
