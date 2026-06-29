export const Role = {
  Admin: 'ADMIN',
  Technician: 'TECHNICIAN',
  ClientUser: 'CLIENT_USER',
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const TicketStatus = {
  New: 'NEW',
  InProgress: 'IN_PROGRESS',
  Resolved: 'RESOLVED',
  Closed: 'CLOSED',
} as const;
export type TicketStatus = (typeof TicketStatus)[keyof typeof TicketStatus];
