import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Center,
  Group,
  Loader,
  Stack,
  Text,
  Timeline,
  Title,
} from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import type { TicketStatus } from '@ifsuv/shared';
import { IconAlertCircle, IconRefresh } from '@tabler/icons-react';
import { useParams } from 'react-router-dom';
import { RichTextDisplay } from '../../components/editor/RichTextDisplay';
import { fetchPublicTicket } from '../../features/public/api';

const STATUS_LABEL: Record<TicketStatus, { label: string; color: string }> = {
  NEW: { label: 'Nouveau', color: 'blue' },
  IN_PROGRESS: { label: 'En cours', color: 'orange' },
  RESOLVED: { label: 'Résolu', color: 'teal' },
  CLOSED: { label: 'Clôturé', color: 'gray' },
};

export function PublicTicketPage(): JSX.Element {
  const params = useParams();
  const token = params['token'] ?? '';

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['public-ticket', token],
    queryFn: () => fetchPublicTicket(token),
    enabled: !!token,
    retry: false,
  });

  return (
    <Box mih="100vh" bg="var(--mantine-color-body)" py="md">
      <Box maw={520} mx="auto" px="md">
        <Stack>
          <Group justify="space-between" align="center">
            <Title order={3}>Suivi de votre ticket</Title>
          </Group>

          {isLoading && (
            <Center p="xl">
              <Loader />
            </Center>
          )}

          {isError && (
            <Alert color="red" icon={<IconAlertCircle size={16} />}>
              {(error as Error)?.message ?? 'Lien invalide ou expiré.'}
            </Alert>
          )}

          {data && (
            <>
              <Card withBorder padding="lg">
                <Stack gap="xs">
                  <Group justify="space-between" align="center">
                    <Title order={2}>{data.ref}</Title>
                    <Badge
                      size="lg"
                      color={STATUS_LABEL[data.status].color}
                      variant="filled"
                    >
                      {STATUS_LABEL[data.status].label}
                    </Badge>
                  </Group>
                  {data.customerName && (
                    <Text c="dimmed">Pour : {data.customerName}</Text>
                  )}
                  {data.problemType && (
                    <Text style={{ whiteSpace: 'pre-wrap' }}>{data.problemType}</Text>
                  )}
                </Stack>
              </Card>

              {data.diagnosticHtml && (
                <Card withBorder padding="lg">
                  <Title order={5} mb="xs">
                    Diagnostic
                  </Title>
                  <RichTextDisplay html={data.diagnosticHtml} />
                </Card>
              )}

              <Card withBorder padding="lg">
                <Title order={5} mb="md">
                  Historique
                </Title>
                {data.events.length === 0 ? (
                  <Text c="dimmed" size="sm">
                    Aucun événement.
                  </Text>
                ) : (
                  <Timeline active={data.events.length} bulletSize={16} lineWidth={2}>
                    {data.events
                      .filter((e) =>
                        ['ticket.created', 'ticket.transition'].includes(e.type),
                      )
                      .map((event) => (
                        <Timeline.Item key={event.id} title={renderEventTitle(event)}>
                          <Text size="xs" c="dimmed">
                            {new Date(event.at).toLocaleString('fr-FR')}
                          </Text>
                        </Timeline.Item>
                      ))}
                  </Timeline>
                )}
              </Card>

              <Group justify="center">
                <Button
                  variant="default"
                  leftSection={<IconRefresh size={16} />}
                  onClick={() => void refetch()}
                  loading={isFetching}
                >
                  Actualiser
                </Button>
              </Group>

              <Text size="xs" c="dimmed" ta="center" mt="md">
                IFSUV — Suivi en temps quasi-réel via votre QR code.
              </Text>
            </>
          )}
        </Stack>
      </Box>
    </Box>
  );
}

function renderEventTitle(event: {
  type: string;
  payload?: Record<string, unknown>;
}): string {
  if (event.type === 'ticket.created') return 'Ticket créé';
  if (event.type === 'ticket.transition') {
    const p = event.payload as { to?: string } | undefined;
    const to = p?.to as TicketStatus | undefined;
    if (to && STATUS_LABEL[to]) {
      return `Statut : ${STATUS_LABEL[to].label}`;
    }
    return `Statut : ${p?.to ?? '?'}`;
  }
  return event.type;
}
