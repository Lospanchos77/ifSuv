import { describe, expect, it } from 'vitest';
import { HtmlSanitizerService } from './html-sanitizer.service';

describe('HtmlSanitizerService', () => {
  const service = new HtmlSanitizerService();

  it('input vide → string vide', () => {
    expect(service.sanitizeTiptap('')).toBe('');
    expect(service.sanitizeTiptap(null)).toBe('');
    expect(service.sanitizeTiptap(undefined)).toBe('');
  });

  it('autorise p/strong/em/listes', () => {
    const out = service.sanitizeTiptap(
      '<p>Hello <strong>world</strong> <em>!</em></p><ul><li>a</li></ul>',
    );
    expect(out).toContain('<p>');
    expect(out).toContain('<strong>world</strong>');
    expect(out).toContain('<em>!</em>');
    expect(out).toContain('<ul>');
    expect(out).toContain('<li>a</li>');
  });

  it('strippe les <script>', () => {
    const out = service.sanitizeTiptap('<p>Safe</p><script>alert(1)</script>');
    expect(out).not.toContain('script');
    expect(out).toContain('<p>Safe</p>');
  });

  it('strippe les attrs onclick/onerror', () => {
    const out = service.sanitizeTiptap(
      '<p onclick="alert(1)">x</p><img src="x" onerror="alert(2)" />',
    );
    expect(out).not.toContain('onclick');
    expect(out).not.toContain('onerror');
  });

  it('strippe les styles inline', () => {
    const out = service.sanitizeTiptap('<p style="color:red">x</p>');
    expect(out).not.toContain('style');
    expect(out).toContain('<p>x</p>');
  });

  it('autorise les liens http/https + force target+rel', () => {
    const out = service.sanitizeTiptap('<a href="https://example.com">link</a>');
    expect(out).toContain('href="https://example.com"');
    expect(out).toContain('target="_blank"');
    expect(out).toContain('rel="noopener noreferrer"');
  });

  it('rejette les liens javascript:', () => {
    const out = service.sanitizeTiptap('<a href="javascript:alert(1)">x</a>');
    expect(out).not.toContain('javascript');
  });

  it('strippe iframe et autres tags non whitelistés', () => {
    const out = service.sanitizeTiptap(
      '<iframe src="evil"></iframe><div>x</div><span>y</span>',
    );
    expect(out).not.toContain('iframe');
    expect(out).not.toContain('<div>');
    expect(out).not.toContain('<span>');
  });

  // Les images inline du diagnostic sont servies par l'API en URL relative —
  // ce comportement DOIT survivre à la resanitization au save.
  it('conserve une image inline du diag (src relatif /api/...)', () => {
    const out = service.sanitizeTiptap(
      '<p>x</p><img src="/api/v1/tickets/abc/diag-images/u.png" alt="diag" />',
    );
    expect(out).toContain('<img');
    expect(out).toContain('src="/api/v1/tickets/abc/diag-images/u.png"');
  });

  it('rejette une image avec src data:/javascript:', () => {
    const out = service.sanitizeTiptap(
      '<img src="data:image/png;base64,AAAA" /><img src="javascript:alert(1)" />',
    );
    expect(out).not.toContain('data:');
    expect(out).not.toContain('javascript');
  });
});
