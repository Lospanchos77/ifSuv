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
import { IconEdit, IconPlus, IconSearch, IconTrash } from '@tabler/icons-react';
import { Role, type UserPublic } from '@ifsuv/shared';
import { useState } from 'react';
import { useDeleteUser, useUsersList } from '../../features/users/hooks';
import { UserFormDrawer } from '../../features/users/UserFormDrawer';
import { swalConfirm, swalError, swalSuccess } from '../../lib/swal';

const PAGE_SIZE = 20;

const ROLE_LABEL: Record<UserPublic['role'], string> = {
  ADMIN: 'Administrateur',
  TECHNICIAN: 'Technicien',
  CLIENT_USER: 'Client',
};
const ROLE_COLOR: Record<UserPublic['role'], string> = {
  ADMIN: 'red',
  TECHNICIAN: 'blue',
  CLIENT_USER: 'grape',
};

export function UsersPage(): JSX.Element {
  const [q, setQ] = useState('');
  const [debouncedQ] = useDebouncedValue(q, 300);
  const [role, setRole] = useState<UserPublic['role'] | undefined>(undefined);
  const [page, setPage] = useState(1);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<UserPublic | null>(null);

  const { data, isLoading, isError, error } = useUsersList({
    q: debouncedQ || undefined,
    role,
    page,
    pageSize: PAGE_SIZE,
  });
  const deleteMut = useDeleteUser();

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  function openCreate(): void {
    setEditing(null);
    setDrawerOpen(true);
  }

  function openEdit(user: UserPublic): void {
    setEditing(user);
    setDrawerOpen(true);
  }

  async function confirmDelete(user: UserPublic): Promise<void> {
    const ok = await swalConfirm({
      title: 'Supprimer cet utilisateur ?',
      html: `Supprimer <strong>${escapeHtml(user.email)}</strong> ? Toutes les sessions actives seront révoquées.`,
      confirmText: 'Supprimer',
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteMut.mutateAsync(user.id);
      swalSuccess('Utilisateur supprimé');
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
        <Title order={2}>Utilisateurs</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={openCreate}>
          Nouvel utilisateur
        </Button>
      </Group>

      <Card withBorder padding="md">
        <Group>
          <TextInput
            placeholder="Rechercher (email, nom, prénom…)"
            leftSection={<IconSearch size={16} />}
            value={q}
            onChange={(e) => {
              setQ(e.currentTarget.value);
              setPage(1);
            }}
            style={{ flex: 1 }}
          />
          <Select
            placeholder="Rôle"
            value={role ?? null}
            onChange={(v) => {
              setRole((v as UserPublic['role'] | null) ?? undefined);
              setPage(1);
            }}
            data={[
              { value: Role.Admin, label: 'Administrateur' },
              { value: Role.Technician, label: 'Technicien' },
              { value: Role.ClientUser, label: 'Client' },
            ]}
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
          <Table.ScrollContainer minWidth={700}>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Nom</Table.Th>
                  <Table.Th>Email</Table.Th>
                  <Table.Th>Rôle</Table.Th>
                  <Table.Th>Reset requis</Table.Th>
                  <Table.Th style={{ width: 100 }}>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {data.items.length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={5}>
                      <Text c="dimmed" ta="center" py="lg">
                        Aucun utilisateur trouvé.
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ) : (
                  data.items.map((user) => (
                    <Table.Tr key={user.id}>
                      <Table.Td>
                        {user.firstName} {user.lastName}
                      </Table.Td>
                      <Table.Td>{user.email}</Table.Td>
                      <Table.Td>
                        <Badge color={ROLE_COLOR[user.role]} variant="light">
                          {ROLE_LABEL[user.role]}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        {user.mustResetPassword ? (
                          <Badge color="orange" variant="light">
                            Oui
                          </Badge>
                        ) : (
                          <Text c="dimmed" size="sm">
                            —
                          </Text>
                        )}
                      </Table.Td>
                      <Table.Td>
                        <Group gap="xs">
                          <Tooltip label="Modifier">
                            <ActionIcon variant="subtle" onClick={() => openEdit(user)}>
                              <IconEdit size={16} />
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip label="Supprimer">
                            <ActionIcon
                              variant="subtle"
                              color="red"
                              onClick={() => confirmDelete(user)}
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

      <UserFormDrawer
        opened={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        user={editing}
      />
    </Stack>
  );
}
