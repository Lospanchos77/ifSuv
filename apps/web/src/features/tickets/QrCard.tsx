import { Card, Group, Image, Stack, Text, Title } from '@mantine/core';

interface Props {
  ticketId: string;
  variant: 'tech' | 'client';
}

const VARIANT_LABEL = {
  tech: { title: 'QR Technicien', desc: 'À scanner pour ouvrir la fiche en édition.' },
  client: {
    title: 'QR Client',
    desc: 'À donner au client. Permet de suivre l\'avancement en lecture seule.',
  },
} as const;

export function QrCard({ ticketId, variant }: Props): JSX.Element {
  const meta = VARIANT_LABEL[variant];
  // L'endpoint API renvoie le PNG du QR — chargé via <img> avec credentials cookie
  // (le navigateur les envoie automatiquement sur les requêtes d'images same-origin).
  const src = `/api/v1/tickets/${ticketId}/qr/${variant}`;

  return (
    <Card withBorder padding="md">
      <Stack gap="xs" align="center">
        <Title order={5}>{meta.title}</Title>
        <Image
          src={src}
          alt={meta.title}
          w={200}
          h={200}
          fit="contain"
          radius="sm"
          bg="white"
          p="xs"
        />
        <Text size="xs" c="dimmed" ta="center" maw={200}>
          {meta.desc}
        </Text>
      </Stack>
    </Card>
  );
}

export function QrPair({ ticketId }: { ticketId: string }): JSX.Element {
  return (
    <Group justify="center" gap="md">
      <QrCard ticketId={ticketId} variant="tech" />
      <QrCard ticketId={ticketId} variant="client" />
    </Group>
  );
}
