import {
  ActionIcon,
  Badge,
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
import {
  IconBuilding,
  IconEdit,
  IconPlus,
  IconSearch,
  IconTrash,
  IconUser,
} from '@tabler/icons-react';
import type { CompanyPublic } from '@ifsuv/shared';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CompanyFormDrawer } from '../../features/clients/CompanyFormDrawer';
import { useCompaniesList, useDeleteCompany } from '../../features/clients/hooks';
import { swalConfirm, swalError, swalSuccess } from '../../lib/swal';

const PAGE_SIZE = 20;

export function ClientsPage(): JSX.Element {
  const [q, setQ] = useState('');
  const [debouncedQ] = useDebouncedValue(q, 300);
  const [kind, setKind] = useState<'COMPANY' | 'INDIVIDUAL' | undefined>(undefined);
  const [page, setPage] = useState(1);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<CompanyPublic | null>(null);

  const { data, isLoading, isError, error } = useCompaniesList({
    q: debouncedQ || undefined,
    kind,
    page,
    pageSize: PAGE_SIZE,
  });
  const deleteMut = useDeleteCompany();

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  function openCreate(): void {
    setEditing(null);
    setDrawerOpen(true);
  }

  function openEdit(company: CompanyPublic): void {
    setEditing(company);
    setDrawerOpen(true);
  }

  async function confirmDelete(company: CompanyPublic): Promise<void> {
    const ok = await swalConfirm({
      title: 'Supprimer cette entreprise ?',
      html: `Êtes-vous sûr de vouloir supprimer <strong>${escapeHtml(company.name)}</strong> ? Cette action est irréversible.`,
      confirmText: 'Supprimer',
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteMut.mutateAsync(company.id);
      swalSuccess('Entreprise supprimée');
    } catch (err) {
      swalError(
        'Suppression échouée',
        err instanceof Error ? err.message : 'Erreur inconnue',
      );
    }
  }

  function escapeHtml(s: string): string {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>Clients</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={openCreate}>
          Nouvelle entreprise
        </Button>
      </Group>

      <Card withBorder padding="md">
        <Group>
          <TextInput
            placeholder="Rechercher (nom, ville, email…)"
            leftSection={<IconSearch size={16} />}
            value={q}
            onChange={(e) => {
              setQ(e.currentTarget.value);
              setPage(1);
            }}
            style={{ flex: 1 }}
          />
          <Select
            placeholder="Type"
            value={kind ?? null}
            onChange={(v) => {
              setKind((v as 'COMPANY' | 'INDIVIDUAL' | null) ?? undefined);
              setPage(1);
            }}
            data={[
              { value: 'COMPANY', label: 'Entreprise' },
              { value: 'INDIVIDUAL', label: 'Particulier' },
            ]}
            clearable
            w={180}
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
          <Table.ScrollContainer minWidth={600}>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Nom</Table.Th>
                  <Table.Th>Type</Table.Th>
                  <Table.Th>Ville</Table.Th>
                  <Table.Th>Email</Table.Th>
                  <Table.Th>Téléphone</Table.Th>
                  <Table.Th style={{ width: 100 }}>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {data.items.length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={6}>
                      <Text c="dimmed" ta="center" py="lg">
                        Aucune entreprise trouvée.
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ) : (
                  data.items.map((company) => (
                    <Table.Tr key={company.id}>
                      <Table.Td>
                        <Group gap="xs">
                          {company.kind === 'COMPANY' ? (
                            <IconBuilding size={16} />
                          ) : (
                            <IconUser size={16} />
                          )}
                          <Link to={`/clients/${company.id}`}>{company.name}</Link>
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <Badge
                          color={company.kind === 'COMPANY' ? 'blue' : 'grape'}
                          variant="light"
                        >
                          {company.kind === 'COMPANY' ? 'Entreprise' : 'Particulier'}
                        </Badge>
                      </Table.Td>
                      <Table.Td>{company.city ?? '—'}</Table.Td>
                      <Table.Td>{company.email ?? '—'}</Table.Td>
                      <Table.Td>{company.phone ?? '—'}</Table.Td>
                      <Table.Td>
                        <Group gap="xs">
                          <Tooltip label="Modifier">
                            <ActionIcon variant="subtle" onClick={() => openEdit(company)}>
                              <IconEdit size={16} />
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip label="Supprimer">
                            <ActionIcon
                              variant="subtle"
                              color="red"
                              onClick={() => confirmDelete(company)}
                              loading={deleteMut.isPending}
                            >
                              <IconTrash size={16} />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      </Table.Td>
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
            {data.total} résultat{data.total > 1 ? 's' : ''}
          </Text>
          <Pagination total={totalPages} value={page} onChange={setPage} />
        </Group>
      )}

      <CompanyFormDrawer
        opened={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        company={editing}
      />
    </Stack>
  );
}
