import { Box, Text } from '@mantine/core';

interface Props {
  html: string;
  emptyText?: string;
}

/**
 * Affichage read-only d'un fragment HTML déjà sanitizé côté serveur.
 * Le serveur (HtmlSanitizerService) est l'autorité — on fait confiance au contenu en base.
 */
export function RichTextDisplay({ html, emptyText = 'Aucun contenu.' }: Props): JSX.Element {
  if (!html || html.trim() === '') {
    return (
      <Text c="dimmed" size="sm">
        {emptyText}
      </Text>
    );
  }
  return (
    <Box
      className="ifsuv-richtext"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
