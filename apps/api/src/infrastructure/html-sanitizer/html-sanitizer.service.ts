import { Injectable } from '@nestjs/common';
import sanitizeHtml from 'sanitize-html';

/**
 * Whitelist Tiptap-friendly pour les diagnostics et rapports.
 * Tags + attrs sont volontairement restrictifs : pas de styles inline, pas de scripts,
 * pas d'iframe. Les liens sont normalisés (rel=noopener+noreferrer, target=_blank).
 */
const TIPTAP_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'p',
    'br',
    'strong',
    'em',
    'u',
    's',
    'h1',
    'h2',
    'h3',
    'h4',
    'ul',
    'ol',
    'li',
    'blockquote',
    'code',
    'pre',
    'a',
    'img',
    'hr',
  ],
  allowedAttributes: {
    a: ['href', 'name', 'target', 'rel'],
    img: ['src', 'alt', 'width', 'height'],
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesAppliedToAttributes: ['href', 'src'],
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', {
      target: '_blank',
      rel: 'noopener noreferrer',
    }),
  },
  // Désactive toute conversion de texte en HTML (pas d'auto-link, etc.)
  textFilter: undefined,
};

@Injectable()
export class HtmlSanitizerService {
  /**
   * Sanitize un fragment HTML produit par TipTap (diagnostic, rapport).
   * Retourne une chaîne vide si l'input est falsy.
   */
  sanitizeTiptap(html: string | null | undefined): string {
    if (!html) return '';
    return sanitizeHtml(html, TIPTAP_OPTIONS);
  }
}
