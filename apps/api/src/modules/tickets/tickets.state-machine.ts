import { Role, TicketStatus } from '@ifsuv/shared';

/**
 * Transitions valides pour la state machine ticket.
 * Clé = état source, valeur = liste des transitions autorisées
 * (target + rôles autorisés à effectuer la transition).
 */
const TRANSITIONS: Record<
  TicketStatus,
  Array<{ to: TicketStatus; allowedRoles: Role[] }>
> = {
  [TicketStatus.New]: [
    { to: TicketStatus.InProgress, allowedRoles: [Role.Admin, Role.Technician] },
  ],
  [TicketStatus.InProgress]: [
    { to: TicketStatus.Resolved, allowedRoles: [Role.Admin, Role.Technician] },
    { to: TicketStatus.New, allowedRoles: [Role.Admin, Role.Technician] }, // annulation
  ],
  [TicketStatus.Resolved]: [
    { to: TicketStatus.Closed, allowedRoles: [Role.Admin, Role.Technician] },
    { to: TicketStatus.InProgress, allowedRoles: [Role.Admin] }, // réouverture admin
  ],
  [TicketStatus.Closed]: [
    { to: TicketStatus.InProgress, allowedRoles: [Role.Admin] }, // réouverture admin uniquement
  ],
};

export interface TransitionCheckResult {
  ok: boolean;
  reason?: 'invalid_transition' | 'forbidden_role';
  message?: string;
}

export function canTransition(
  from: TicketStatus,
  to: TicketStatus,
  role: Role,
): TransitionCheckResult {
  const transitions = TRANSITIONS[from] ?? [];
  const found = transitions.find((t) => t.to === to);
  if (!found) {
    return {
      ok: false,
      reason: 'invalid_transition',
      message: `Transition ${from} → ${to} non autorisée`,
    };
  }
  if (!found.allowedRoles.includes(role)) {
    return {
      ok: false,
      reason: 'forbidden_role',
      message: `Le rôle ${role} ne peut pas effectuer ${from} → ${to}`,
    };
  }
  return { ok: true };
}

export function allowedTransitionsFrom(from: TicketStatus, role: Role): TicketStatus[] {
  return (TRANSITIONS[from] ?? [])
    .filter((t) => t.allowedRoles.includes(role))
    .map((t) => t.to);
}
