import {
  Anchor,
  Badge,
  Button,
  Card,
  Center,
  Collapse,
  Divider,
  Grid,
  Group,
  Loader,
  SimpleGrid,
  Stack,
  Text,
  Timeline,
  Title,
} from '@mantine/core';
import {
  IconArrowLeft,
  IconChevronDown,
  IconChevronUp,
  IconEdit,
  IconPrinter,
  IconTag,
  IconTrash,
} from '@tabler/icons-react';
import { Role } from '@ifsuv/shared';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { RichTextDisplay } from '../../components/editor/RichTextDisplay';
import { useAuth } from '../../features/auth/useAuth';
import { useSiteSettings } from '../../features/settings/hooks';
import { DiagnosticEditor } from '../../features/tickets/DiagnosticEditor';
import { PriorityBadge } from '../../features/tickets/PriorityBadge';
import { StatusBadge } from '../../features/tickets/StatusBadge';
import { StatusTransitionMenu } from '../../features/tickets/StatusTransitionMenu';
import { TicketFormDrawer } from '../../features/tickets/TicketFormDrawer';
import { TicketFiles } from '../../features/tickets/TicketFiles';
import { useDeleteTicket, useTicket } from '../../features/tickets/hooks';
import { swalConfirm, swalError, swalSuccess } from '../../lib/swal';

export function TicketDetailPage(): JSX.Element {
  const params = useParams();
  const id = params['id'];
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data, isLoading, isError, error } = useTicket(id);
  const deleteMut = useDeleteTicket();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [expandedEventIds, setExpandedEventIds] = useState<Set<string>>(new Set());
  const isAdmin = user?.role === Role.Admin;

  async function confirmDelete(ref: string, ticketId: string): Promise<void> {
    const ok = await swalConfirm({
      title: `Supprimer le ticket ${ref} ?`,
      html: 'Cette action est <strong>irréversible</strong>. L\'historique, le diagnostic et les QR codes seront définitivement perdus.',
      confirmText: 'Supprimer définitivement',
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteMut.mutateAsync(ticketId);
      swalSuccess(`Ticket ${ref} supprimé`);
      navigate('/tickets', { replace: true });
    } catch (err) {
      swalError(
        'Suppression échouée',
        err instanceof Error ? err.message : 'Erreur inconnue',
      );
    }
  }

  function toggleEvent(eventId: string): void {
    setExpandedEventIds((prev) => {
      const next = new Set(prev);
      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }
      return next;
    });
  }

  if (isLoading) {
    return (
      <Center p="xl">
        <Loader />
      </Center>
    );
  }

  if (isError || !data) {
    return (
      <Stack>
        <Anchor component={Link} to="/tickets">
          <Group gap="xs">
            <IconArrowLeft size={16} />
            Retour à la liste
          </Group>
        </Anchor>
        <Text c="red">Erreur : {(error as Error)?.message ?? 'Ticket introuvable'}</Text>
      </Stack>
    );
  }

  return (
    <Stack>
      <Group justify="space-between" wrap="nowrap">
        <Group gap="xs">
          <Anchor component={Link} to="/tickets" c="dimmed">
            <Group gap={4}>
              <IconArrowLeft size={16} />
              <Text size="sm">Tickets</Text>
            </Group>
          </Anchor>
          <Title order={2}>{data.ref}</Title>
          <StatusBadge status={data.status} size="md" />
          <PriorityBadge priority={data.priority} size="md" animated />
        </Group>
        <Group>
          {isAdmin && (
            <Button
              variant="default"
              color="red"
              leftSection={<IconTrash size={16} />}
              onClick={() => confirmDelete(data.ref, data.id)}
              loading={deleteMut.isPending}
            >
              Supprimer
            </Button>
          )}
          <Button
            variant="default"
            leftSection={<IconEdit size={16} />}
            onClick={() => setDrawerOpen(true)}
          >
            Modifier
          </Button>
          <StatusTransitionMenu ticket={data} />
        </Group>
      </Group>

      <Card withBorder padding="lg">
        <Group justify="space-between" mb="md">
          <Title order={4}>Informations</Title>
          <Group gap="xs">
            <Button
              component={Link}
              to={`/tickets/${data.id}/print/fiche`}
              target="_blank"
              variant="default"
              size="xs"
              leftSection={<IconPrinter size={14} />}
            >
              Fiche client
            </Button>
            <Button
              component={Link}
              to={`/tickets/${data.id}/print/etiquette`}
              target="_blank"
              variant="default"
              size="xs"
              leftSection={<IconTag size={14} />}
            >
              Étiquette
            </Button>
          </Group>
        </Group>
        <Grid>
          <Grid.Col span={{ base: 12, md: 8 }}>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              <Field
                label="Entreprise"
                value={
                  data.company ? (
                    <Anchor component={Link} to={`/clients/${data.company.id}`}>
                      {data.company.name}
                    </Anchor>
                  ) : (
                    '—'
                  )
                }
              />
              <Field
                label="Technicien"
                value={
                  data.assignedTech
                    ? `${data.assignedTech.firstName} ${data.assignedTech.lastName}`
                    : <Text c="dimmed">Non assigné</Text>
                }
              />
              <Field
                label="Nom du client"
                value={
                  data.customerName ? (
                    <Text component="span" tt="uppercase">
                      {data.customerName}
                    </Text>
                  ) : (
                    '—'
                  )
                }
              />
              <Field label="Téléphone" value={data.customerPhone ?? '—'} />
              <Field
                label="Email"
                value={
                  data.customerEmail ? (
                    <Anchor href={`mailto:${data.customerEmail}`} size="sm">
                      {data.customerEmail}
                    </Anchor>
                  ) : (
                    '—'
                  )
                }
              />
              <Field label="Adresse" value={data.customerAddress ?? '—'} />
              {data.location && (
                <Field label="Emplacement" value={data.location} />
              )}
              {data.pcPassword && (
                <Field label="Mot de passe PC" value={data.pcPassword} />
              )}
            </SimpleGrid>
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Group gap="md" justify="center">
              <Stack gap={4} align="center">
                <Text size="xs" c="dimmed" fw={500}>
                  QR Tech
                </Text>
                <img
                  src={`/api/v1/tickets/${data.id}/qr/tech`}
                  alt="QR Technicien"
                  style={{
                    width: 130,
                    height: 130,
                    background: 'white',
                    padding: 4,
                    borderRadius: 4,
                  }}
                />
              </Stack>
              <Stack gap={4} align="center">
                <Text size="xs" c="dimmed" fw={500}>
                  QR Client
                </Text>
                <img
                  src={`/api/v1/tickets/${data.id}/qr/client`}
                  alt="QR Client"
                  style={{
                    width: 130,
                    height: 130,
                    background: 'white',
                    padding: 4,
                    borderRadius: 4,
                  }}
                />
              </Stack>
            </Group>
          </Grid.Col>
        </Grid>
        {data.problemType && (
          <>
            <Divider my="md" />
            <Stack gap={4}>
              <Text size="sm" c="dimmed">
                Type de problème
              </Text>
              <Text style={{ whiteSpace: 'pre-wrap' }}>{data.problemType}</Text>
            </Stack>
          </>
        )}
        <CustomFieldsDisplay data={data.customFieldsData} />
      </Card>

      <DiagnosticEditor ticketId={data.id} diagnosticHtml={data.diagnosticHtml} />

      <TicketFiles ticketId={data.id} files={data.files} />

      <Card withBorder padding="lg">
        <Title order={4} mb="md">
          Historique
        </Title>
        {data.events.length === 0 ? (
          <Text c="dimmed" size="sm">
            Aucun événement.
          </Text>
        ) : (
          <Timeline active={data.events.length} bulletSize={20}>
            {data.events.map((event) => {
              const detail = event.payload
                ? renderPayload(event.type, event.payload)
                : null;
              const diagnosticSnapshot = getDiagnosticSnapshot(event.payload);
              const isExpanded = expandedEventIds.has(event.id);
              return (
                <Timeline.Item key={event.id} title={renderEventTitle(event)}>
                  <Text size="xs" c="dimmed">
                    {event.actorName ?? '—'} ·{' '}
                    {new Date(event.at).toLocaleString('fr-FR')}
                  </Text>
                  {detail && (
                    <Text size="xs" c="dimmed" mt={4}>
                      {detail}
                    </Text>
                  )}
                  {diagnosticSnapshot && (
                    <Stack gap="xs" mt="xs">
                      <Button
                        size="xs"
                        variant="subtle"
                        leftSection={
                          isExpanded ? (
                            <IconChevronUp size={14} />
                          ) : (
                            <IconChevronDown size={14} />
                          )
                        }
                        onClick={() => toggleEvent(event.id)}
                        style={{ alignSelf: 'flex-start' }}
                      >
                        {isExpanded ? 'Masquer' : 'Voir le contenu écrit'}
                      </Button>
                      <Collapse in={isExpanded}>
                        <Card withBorder padding="sm" bg="var(--mantine-color-default-hover)">
                          <RichTextDisplay html={diagnosticSnapshot} />
                        </Card>
                      </Collapse>
                    </Stack>
                  )}
                </Timeline.Item>
              );
            })}
          </Timeline>
        )}
      </Card>

      <TicketFormDrawer
        opened={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        ticket={data}
      />
    </Stack>
  );
}

function CustomFieldsDisplay({
  data,
}: {
  data?: Record<string, string | boolean | number>;
}): JSX.Element | null {
  const settings = useSiteSettings();
  const defs = settings.data?.customTicketFields ?? [];
  if (!data || defs.length === 0) return null;
  // On filtre les champs qui ont une valeur "présente"
  const rows = defs
    .map((def) => ({ def, value: data[def.key] }))
    .filter(({ value }) => {
      if (value === undefined || value === null) return false;
      if (typeof value === 'string') return value.trim() !== '';
      if (typeof value === 'boolean') return value === true;
      return true;
    });
  if (rows.length === 0) return null;
  return (
    <>
      <Divider my="md" />
      <Stack gap="xs">
        <Text size="sm" c="dimmed">
          Informations complémentaires
        </Text>
        <Grid gutter="sm">
          {rows.map(({ def, value }) => {
            const span =
              def.widthCols === 2 ? 6 : def.widthCols === 3 ? 4 : 12;
            return (
              <Grid.Col key={def.key} span={{ base: 12, sm: span }}>
                <Stack gap={2}>
                  <Text size="xs" c="dimmed">
                    {def.label}
                  </Text>
                  {def.type === 'checkbox' ? (
                    <Badge variant="light" color={value ? 'teal' : 'gray'}>
                      {value ? 'Oui' : 'Non'}
                    </Badge>
                  ) : (
                    <Text style={{ whiteSpace: 'pre-wrap' }}>{String(value)}</Text>
                  )}
                </Stack>
              </Grid.Col>
            );
          })}
        </Grid>
      </Stack>
    </>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }): JSX.Element {
  return (
    <Stack gap={2}>
      <Text size="sm" c="dimmed">
        {label}
      </Text>
      <Text>{value}</Text>
    </Stack>
  );
}

const STATUS_FR: Record<string, string> = {
  NEW: 'Nouveau',
  IN_PROGRESS: 'En cours',
  RESOLVED: 'Résolu',
  CLOSED: 'Clos',
};

const FIELD_LABEL: Record<string, string> = {
  customerName: 'Nom du client',
  customerPhone: 'Téléphone',
  customerEmail: 'Email',
  customerAddress: 'Adresse',
  pcPassword: 'Mot de passe PC',
  location: 'Emplacement',
  problemType: 'Type de problème',
  diagnosticHtml: 'Diagnostic',
};

function renderEventTitle(event: { type: string; payload?: Record<string, unknown> }): string {
  if (event.type === 'ticket.created') return 'Ticket créé';
  if (event.type === 'ticket.transition') {
    const p = event.payload as { from?: string; to?: string } | undefined;
    const from = STATUS_FR[p?.from ?? ''] ?? p?.from ?? '?';
    const to = STATUS_FR[p?.to ?? ''] ?? p?.to ?? '?';
    return `Statut : ${from} → ${to}`;
  }
  if (event.type === 'ticket.updated') {
    const p = event.payload as Record<string, unknown> | undefined;
    if (!p || Object.keys(p).length === 0) return 'Mise à jour';
    const fields = Object.keys(p).map((k) => FIELD_LABEL[k] ?? k);
    return `Mise à jour : ${fields.join(', ')}`;
  }
  if (event.type === 'ticket.file_added') return 'Fichier ajouté';
  if (event.type === 'ticket.file_removed') return 'Fichier supprimé';
  return event.type;
}

function renderPayload(
  eventType: string,
  payload: Record<string, unknown>,
): string | null {
  if (eventType === 'ticket.created') {
    const ref = (payload['ref'] as string | undefined) ?? null;
    return ref ? `Référence : ${ref}` : null;
  }
  if (eventType === 'ticket.transition') {
    const comment = (payload['comment'] as string | undefined) ?? null;
    return comment ? `« ${comment} »` : null;
  }
  // Pour ticket.updated le détail est dans le titre, pas la peine de répéter
  return null;
}

/**
 * Extrait le snapshot du diagnostic depuis le payload d'un event ticket.updated.
 * Retourne null pour :
 * - Les events qui ne modifient pas le diagnostic
 * - Les anciens events stockés avec `{ from: '<diff>', to: '<diff>' }` (pré-patch)
 */
function getDiagnosticSnapshot(payload?: Record<string, unknown>): string | null {
  if (!payload) return null;
  const diag = payload['diagnosticHtml'] as
    | { to?: unknown; from?: unknown }
    | undefined;
  if (!diag || typeof diag !== 'object') return null;
  const to = diag.to;
  if (typeof to !== 'string' || to === '' || to === '<diff>') return null;
  return to;
}
