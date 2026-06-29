import { describe, expect, it } from 'vitest';
import { CompanyCreateInput, CompanyKind, CompanyListQuery } from './company';

describe('CompanyCreateInput', () => {
  it('default kind = COMPANY', () => {
    const parsed = CompanyCreateInput.parse({ name: 'Acme' });
    expect(parsed.kind).toBe('COMPANY');
  });

  it('rejette name vide', () => {
    expect(() => CompanyCreateInput.parse({ name: '' })).toThrow();
  });

  it('accepte INDIVIDUAL', () => {
    const parsed = CompanyCreateInput.parse({ name: 'Bob', kind: 'INDIVIDUAL' });
    expect(parsed.kind).toBe('INDIVIDUAL');
  });

  it('email vide → undefined', () => {
    const parsed = CompanyCreateInput.parse({ name: 'Acme', email: '' });
    expect(parsed.email).toBeUndefined();
  });
});

describe('CompanyKind', () => {
  it('valide COMPANY et INDIVIDUAL', () => {
    expect(CompanyKind.parse('COMPANY')).toBe('COMPANY');
    expect(CompanyKind.parse('INDIVIDUAL')).toBe('INDIVIDUAL');
  });

  it('rejette autre', () => {
    expect(() => CompanyKind.parse('OTHER')).toThrow();
  });
});

describe('CompanyListQuery', () => {
  it('defaults page=1, pageSize=20', () => {
    const parsed = CompanyListQuery.parse({});
    expect(parsed.page).toBe(1);
    expect(parsed.pageSize).toBe(20);
  });

  it('coerce strings to numbers', () => {
    const parsed = CompanyListQuery.parse({ page: '3', pageSize: '50' });
    expect(parsed.page).toBe(3);
    expect(parsed.pageSize).toBe(50);
  });
});
