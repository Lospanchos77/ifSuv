import { Role, TicketStatus } from '@ifsuv/shared';

const TRANSITIONS: Record<
  TicketStatus,
  Array<{ to: TicketStatus; allowedRoles: Role[]; label: string }>
> = {
  [TicketStatus.New]: [
    {
      to: TicketStatus.InProgress,
      allowedRoles: [Role.Admin, Role.Technician],
      label: 'Démarrer',
    },
  ],
  [TicketStatus.InProgress]: [
    {
      to: TicketStatus.Resolved,
      allowedRoles: [Role.Admin, Role.Technician],
      label: 'Marquer résolu',
    },
    {
      to: TicketStatus.New,
      allowedRoles: [Role.Admin, Role.Technician],
      label: 'Annuler',
    },
  ],
  [TicketStatus.Resolved]: [
    {
      to: TicketStatus.Closed,
      allowedRoles: [Role.Admin, Role.Technician],
      label: 'Clôturer',
    },
    {
      to: TicketStatus.InProgress,
      allowedRoles: [Role.Admin],
      label: 'Rouvrir (admin)',
    },
  ],
  [TicketStatus.Closed]: [
    {
      to: TicketStatus.InProgress,
      allowedRoles: [Role.Admin],
      label: 'Rouvrir (admin)',
    },
  ],
};

export function getAvailableTransitions(
  from: TicketStatus,
  role: Role,
): Array<{ to: TicketStatus; label: string }> {
  return (TRANSITIONS[from] ?? [])
    .filter((t) => t.allowedRoles.includes(role))
    .map((t) => ({ to: t.to, label: t.label }));
}
