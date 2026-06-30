import {
  ActionIcon,
  Anchor,
  Button,
  Card,
  Center,
  Group,
  Loader,
  Pagination,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { IconPlus, IconSearch, IconTrash } from '@tabler/icons-react';
import { Role, type TicketListItem, TicketStatus } from '@ifsuv/shared';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../features/auth/useAuth';
import { useCompaniesList } from '../../features/clients/hooks';
import { MiniQrTech } from '../../features/tickets/MiniQrTech';
import { StatusBadge } from '../../features/tickets/StatusBadge';
import { TicketFormDrawer } from '../../features/tickets/TicketFormDrawer';
import { useDeleteTicket, useTicketsList } from '../../features/tickets/hooks';
import { useAssignableTechs } from '../../features/users/hooks';
import { swalConfirm, swalError, swalSuccess } from '../../lib/swal';

const PAGE_SIZE = 20;

interface TicketsListPageProps {
  /**
   * Mode de la liste :
   * - `active` (défaut) : tickets non clos. L'utilisateur peut quand même
   *   sélectionner manuellement "Clos" dans le filtre status.
   * - `archived` : historique — uniquement les tickets CLOSED. Le filtre
   *   status est verrouillé (lock visuel).
   */
  mode?: 'active' | 'archived';
}

export function TicketsListPage({
  mode = 'active',
}: TicketsListPageProps = {}): JSX.Element {
  const isArchivedView = mode === 'archived';
  const [q, setQ] = useState('');
  const [debouncedQ] = useDebouncedValue(q, 300);
  const [status, setStatus] = useState<TicketStatus | undefined>(
    isArchivedView ? TicketStatus.Closed : undefined,
  );
  const [techId, setTechId] = useState<string | undefined>(undefined);
  const [companyId, setCompanyId] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { user } = useAuth();
  const isAdmin = user?.role === Role.Admin;
  const deleteMut = useDeleteTicket();

  async function confirmDelete(ticket: TicketListItem): Promise<void> {
    const ok = await swalConfirm({
      title: `Supprimer le ticket ${ticket.ref} ?`,
      html: 'Cette action est <strong>irréversible</strong>. L\'historique, le diagnostic et les QR codes seront définitivement perdus.',
      confirmText: 'Supprimer',
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteMut.mutateAsync(ticket.id);
      swalSuccess(`Ticket ${ticket.ref} supprimé`);
    } catch (err) {
      swalError(
        'Suppression échouée',
        err instanceof Error ? err.message : 'Erreur inconnue',
      );
    }
  }

  const { data, isLoading, isError, error } = useTicketsList({
    q: debouncedQ || undefined,
    status,
    techId,
    companyId,
    mode,
    page,
    pageSize: PAGE_SIZE,
  });

  const techsQuery = useAssignableTechs();
  const companiesQuery = useCompaniesList({ pageSize: 100 });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>{isArchivedView ? 'Historique' : 'Tickets'}</Title>
        {!isArchivedView && (
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={() => setDrawerOpen(true)}
          >
            Nouveau ticket
          </Button>
        )}
      </Group>

      <Card withBorder padding="md">
        <Group>
          <TextInput
            placeholder="Rechercher (ref, nom client, problème…)"
            leftSection={<IconSearch size={16} />}
            value={q}
            onChange={(e) => {
              setQ(e.currentTarget.value);
              setPage(1);
            }}
            style={{ flex: 1 }}
          />
          <Select
            placeholder="Statut"
            value={status ?? null}
            onChange={(v) => {
              setStatus((v as TicketStatus | null) ?? undefined);
              setPage(1);
            }}
            data={[
              { value: TicketStatus.New, label: 'Nouveau' },
              { value: TicketStatus.InProgress, label: 'En cours' },
              { value: TicketStatus.Resolved, label: 'Résolu' },
              { value: TicketStatus.Closed, label: 'Clos' },
            ]}
            clearable={!isArchivedView}
            disabled={isArchivedView}
            w={160}
          />
          <Select
            placeholder="Technicien"
            value={techId ?? null}
            onChange={(v) => {
              setTechId(v ?? undefined);
              setPage(1);
            }}
            data={techsQuery.items.map((u) => ({
              value: u.id,
              label: `${u.firstName} ${u.lastName}`,
            }))}
            searchable
            clearable
            w={200}
          />
          <Select
            placeholder="Client"
            value={companyId ?? null}
            onChange={(v) => {
              setCompanyId(v ?? undefined);
              setPage(1);
            }}
            data={
              companiesQuery.data?.items.map((c) => ({
                value: c.id,
                label: c.name,
              })) ?? []
            }
            searchable
            clearable
            w={200}
          />
        </Group>
      </Card>

      <Card withBorder padding={0}>
        {isLoading && (
          <Center p="xl">
            <Loader />
          </Center>
        )}
        {isError && (
          <Text c="red" p="md">
            Erreur : {(error as Error).message}
          </Text>
        )}
        {data && (
          <Table.ScrollContainer minWidth={800}>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th style={{ width: 56 }}>QR</Table.Th>
                  <Table.Th>Réf</Table.Th>
                  <Table.Th>Statut</Table.Th>
                  <Table.Th>Client</Table.Th>
                  <Table.Th>Entreprise</Table.Th>
                  <Table.Th>Technicien</Table.Th>
                  <Table.Th>Problème</Table.Th>
                  <Table.Th>Créé le</Table.Th>
                  {isAdmin && <Table.Th style={{ width: 50 }}>Actions</Table.Th>}
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {data.items.length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={isAdmin ? 9 : 8}>
                      <Text c="dimmed" ta="center" py="lg">
                        Aucun ticket trouvé.
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ) : (
                  data.items.map((ticket) => (
                    <Table.Tr key={ticket.id}>
                      <Table.Td>
                        <MiniQrTech ticketId={ticket.id} ticketRef={ticket.ref} size={40} />
                      </Table.Td>
                      <Table.Td>
                        <Anchor component={Link} to={`/tickets/${ticket.id}`}>
                          {ticket.ref}
                        </Anchor>
                      </Table.Td>
                      <Table.Td>
                        <StatusBadge status={ticket.status} />
                      </Table.Td>
                      <Table.Td>
                        {ticket.customerName ? (
                          <Text component="span" tt="uppercase">
                            {ticket.customerName}
                          </Text>
                        ) : (
                          '—'
                        )}
                      </Table.Td>
                      <Table.Td>{ticket.company?.name ?? '—'}</Table.Td>
                      <Table.Td>
                        {ticket.assignedTech
                          ? `${ticket.assignedTech.firstName} ${ticket.assignedTech.lastName}`
                          : <Text c="dimmed">Non assigné</Text>}
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" lineClamp={1}>
                          {ticket.problemType ?? '—'}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" c="dimmed">
                          {ticket.createdAt
                            ? new Date(ticket.createdAt).toLocaleDateString('fr-FR')
                            : '—'}
                        </Text>
                      </Table.Td>
                      {isAdmin && (
                        <Table.Td>
                          <Tooltip label="Supprimer">
                            <ActionIcon
                              variant="subtle"
                              color="red"
                              onClick={() => confirmDelete(ticket)}
                              loading={deleteMut.isPending}
                              aria-label={`Supprimer ${ticket.ref}`}
                            >
                              <IconTrash size={16} />
                            </ActionIcon>
                          </Tooltip>
                        </Table.Td>
                      )}
                    </Table.Tr>
                  ))
                )}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
      </Card>

      {data && data.total > PAGE_SIZE && (
        <Group justify="space-between">
          <Text c="dimmed" size="sm">
            {data.total} ticket{data.total > 1 ? 's' : ''}
          </Text>
          <Pagination total={totalPages} value={page} onChange={setPage} />
        </Group>
      )}

      <TicketFormDrawer
        opened={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        ticket={null}
      />
    </Stack>
  );
}

/**
 * Vue Historique : réutilise TicketsListPage en mode "archived" pour afficher
 * uniquement les tickets clos. Wrapper léger destiné au router.
 */
export function TicketsHistoryPage(): JSX.Element {
  return <TicketsListPage mode="archived" />;
}
