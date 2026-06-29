import { describe, expect, it } from 'vitest';
import type { Connection } from 'mongoose';
import { HealthService } from './health.service';

describe('HealthService', () => {
  it('renvoie status ok et reflète readyState mongo', () => {
    const fakeConnection = { readyState: 1 } as unknown as Connection;
    const service = new HealthService(fakeConnection);
    const result = service.check();

    expect(result.status).toBe('ok');
    expect(result.mongoState).toBe('connected');
    expect(result.uptime).toBeGreaterThanOrEqual(0);
  });

  it('mappe readyState=0 vers disconnected', () => {
    const fakeConnection = { readyState: 0 } as unknown as Connection;
    const service = new HealthService(fakeConnection);
    expect(service.check().mongoState).toBe('disconnected');
  });
});
