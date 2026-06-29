import { describe, expect, it } from 'vitest';
import { HealthStatus, Role, SHARED_VERSION, TicketStatus } from './index';

describe('@ifsuv/shared', () => {
  it('expose la version', () => {
    expect(SHARED_VERSION).toBe('0.0.0');
  });

  it('valide un HealthStatus correct', () => {
    const parsed = HealthStatus.parse({
      status: 'ok',
      uptime: 1.5,
      mongoState: 'connected',
      version: '0.0.0',
    });
    expect(parsed.status).toBe('ok');
  });

  it('expose les enums Role et TicketStatus', () => {
    expect(Role.Admin).toBe('ADMIN');
    expect(TicketStatus.New).toBe('NEW');
  });
});
