import { Role, TicketStatus } from '@ifsuv/shared';
import { describe, expect, it } from 'vitest';
import { allowedTransitionsFrom, canTransition } from './tickets.state-machine';

describe('canTransition', () => {
  it('NEW → IN_PROGRESS autorisé pour technicien', () => {
    const r = canTransition(TicketStatus.New, TicketStatus.InProgress, Role.Technician);
    expect(r.ok).toBe(true);
  });

  it('NEW → IN_PROGRESS autorisé pour admin', () => {
    const r = canTransition(TicketStatus.New, TicketStatus.InProgress, Role.Admin);
    expect(r.ok).toBe(true);
  });

  it('NEW → IN_PROGRESS refusé pour client_user', () => {
    const r = canTransition(TicketStatus.New, TicketStatus.InProgress, Role.ClientUser);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('forbidden_role');
  });

  it('NEW → CLOSED transition invalide', () => {
    const r = canTransition(TicketStatus.New, TicketStatus.Closed, Role.Admin);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('invalid_transition');
  });

  it('CLOSED → IN_PROGRESS réservé admin (réouverture)', () => {
    const adminR = canTransition(TicketStatus.Closed, TicketStatus.InProgress, Role.Admin);
    expect(adminR.ok).toBe(true);

    const techR = canTransition(
      TicketStatus.Closed,
      TicketStatus.InProgress,
      Role.Technician,
    );
    expect(techR.ok).toBe(false);
    expect(techR.reason).toBe('forbidden_role');
  });

  it('IN_PROGRESS → RESOLVED puis RESOLVED → CLOSED autorisés pour technicien', () => {
    expect(
      canTransition(TicketStatus.InProgress, TicketStatus.Resolved, Role.Technician).ok,
    ).toBe(true);
    expect(
      canTransition(TicketStatus.Resolved, TicketStatus.Closed, Role.Technician).ok,
    ).toBe(true);
  });

  it('RESOLVED → IN_PROGRESS uniquement admin', () => {
    expect(
      canTransition(TicketStatus.Resolved, TicketStatus.InProgress, Role.Admin).ok,
    ).toBe(true);
    expect(
      canTransition(TicketStatus.Resolved, TicketStatus.InProgress, Role.Technician).ok,
    ).toBe(false);
  });
});

describe('allowedTransitionsFrom', () => {
  it('depuis NEW pour technicien : seulement IN_PROGRESS', () => {
    const t = allowedTransitionsFrom(TicketStatus.New, Role.Technician);
    expect(t).toEqual([TicketStatus.InProgress]);
  });

  it('depuis IN_PROGRESS pour technicien : RESOLVED + NEW', () => {
    const t = allowedTransitionsFrom(TicketStatus.InProgress, Role.Technician);
    expect(t.sort()).toEqual([TicketStatus.New, TicketStatus.Resolved].sort());
  });

  it('depuis CLOSED pour technicien : aucune', () => {
    expect(allowedTransitionsFrom(TicketStatus.Closed, Role.Technician)).toEqual([]);
  });

  it('depuis CLOSED pour admin : IN_PROGRESS', () => {
    expect(allowedTransitionsFrom(TicketStatus.Closed, Role.Admin)).toEqual([
      TicketStatus.InProgress,
    ]);
  });
});
