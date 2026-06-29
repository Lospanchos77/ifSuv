import { describe, expect, it } from 'vitest';
import {
  TicketCreateInput,
  TicketListQuery,
  TicketStatusSchema,
  TicketTransitionInput,
} from './ticket';

describe('TicketStatusSchema', () => {
  it('valide les 4 statuts', () => {
    expect(TicketStatusSchema.parse('NEW')).toBe('NEW');
    expect(TicketStatusSchema.parse('IN_PROGRESS')).toBe('IN_PROGRESS');
    expect(TicketStatusSchema.parse('RESOLVED')).toBe('RESOLVED');
    expect(TicketStatusSchema.parse('CLOSED')).toBe('CLOSED');
  });

  it('rejette autre', () => {
    expect(() => TicketStatusSchema.parse('UNKNOWN')).toThrow();
  });
});

describe('TicketCreateInput', () => {
  it('companyId optionnel (absent → OK)', () => {
    const parsed = TicketCreateInput.parse({});
    expect(parsed.companyId).toBeUndefined();
  });

  it('companyId valide ObjectId', () => {
    const parsed = TicketCreateInput.parse({
      companyId: '0123456789abcdef01234567',
    });
    expect(parsed.companyId).toBe('0123456789abcdef01234567');
  });

  it('companyId mauvais format → rejet', () => {
    expect(() => TicketCreateInput.parse({ companyId: 'not-an-objectid' })).toThrow();
  });
});

describe('TicketTransitionInput', () => {
  it('exige to', () => {
    expect(() => TicketTransitionInput.parse({})).toThrow();
  });

  it('accepte commentaire optionnel', () => {
    const parsed = TicketTransitionInput.parse({
      to: 'IN_PROGRESS',
      comment: 'Démarrage diagnostic',
    });
    expect(parsed.to).toBe('IN_PROGRESS');
    expect(parsed.comment).toBe('Démarrage diagnostic');
  });
});

describe('TicketListQuery', () => {
  it('defaults', () => {
    const parsed = TicketListQuery.parse({});
    expect(parsed.page).toBe(1);
    expect(parsed.pageSize).toBe(20);
  });

  it('coerce page+pageSize', () => {
    const parsed = TicketListQuery.parse({ page: '2', pageSize: '50' });
    expect(parsed.page).toBe(2);
    expect(parsed.pageSize).toBe(50);
  });
});
