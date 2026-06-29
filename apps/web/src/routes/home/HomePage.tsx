import {
  Anchor,
  Button,
  Card,
  Center,
  Group,
  Loader,
  Pagination,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import type { TicketStatus } from '@ifsuv/shared';
import {
  IconCheck,
  IconClock,
  IconFlame,
  IconLock,
  IconPlus,
  type TablerIcon,
} from '@tabler/icons-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { TicketCard } from '../../features/tickets/TicketCard';
import { TicketFormDrawer } from '../../features/tickets/TicketFormDrawer';
import { useTicketStats, useTicketsList } from '../../features/tickets/hooks';

interface StatusMeta {
  label: string;
  color: string;
  icon: TablerIcon;
}

const STATUS_META: Record<TicketStatus, StatusMeta> = {
  NEW: { label: 'Nouveaux', color: 'blue', icon: IconFlame },
  IN_PROGRESS: { label: 'En cours', color: 'orange', icon: IconClock },
  RESOLVED: { label: 'Résolus', color: 'teal', icon: IconCheck },
  CLOSED: { label: 'Clos', color: 'gray', icon: IconLock },
};

const PAGE_SIZE = 12;

export function HomePage(): JSX.Element {
  const [page, setPage] = useState(1);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const stats = useTicketStats();
  const tickets = useTicketsList({ page, pageSize: PAGE_SIZE });

  const totalPages = tickets.data
    ? Math.max(1, Math.ceil(tickets.data.total / PAGE_SIZE))
    : 1;

  return (
    <Stack>
      <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
        {(Object.keys(STATUS_META) as TicketStatus[]).map((s) => {
          const meta = STATUS_META[s];
          const Icon = meta.icon;
          return (
            <Card
              key={s}
              withBorder
              padding="md"
              radius="md"
              style={{
                borderLeftWidth: 4,
                borderLeftColor: `var(--mantine-color-${meta.color}-6)`,
                boxShadow: `0 4px 16px var(--mantine-color-${meta.color}-2)`,
              }}
            >
              <Group justify="space-between" wrap="nowrap">
                <Stack gap={4} style={{ minWidth: 0 }}>
                  <Text size="sm" c="dimmed">
                    {meta.label}
                  </Text>
                  <Title order={2} c={meta.color}>
                    {stats.data?.byStatus[s] ?? '—'}
                  </Title>
                </Stack>
                <ThemeIcon
                  variant="light"
                  color={meta.color}
                  size="xl"
                  radius="md"
                >
                  <Icon size={22} />
                </ThemeIcon>
              </Group>
            </Card>
          );
        })}
      </SimpleGrid>

      <Group justify="space-between" mt="md">
        <Title order={4}>Tickets</Title>
        <Group gap="sm">
          <Anchor component={Link} to="/tickets" size="sm">
            Tout voir →
          </Anchor>
          <Button
            size="xs"
            leftSection={<IconPlus size={14} />}
            onClick={() => setDrawerOpen(true)}
          >
            Nouveau ticket
          </Button>
        </Group>
      </Group>

      {tickets.isLoading && (
        <Center p="xl">
          <Loader />
        </Center>
      )}

      {tickets.isError && (
        <Card withBorder padding="md">
          <Text c="red" size="sm">
            Erreur : {(tickets.error as Error).message}
          </Text>
        </Card>
      )}

      {tickets.data && tickets.data.items.length === 0 && (
        <Card withBorder padding="lg">
          <Stack align="center" gap="sm">
            <Text c="dimmed" size="sm">
              Aucun ticket pour l&apos;instant.
            </Text>
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={() => setDrawerOpen(true)}
            >
              Créer le premier ticket
            </Button>
          </Stack>
        </Card>
      )}

      {tickets.data && tickets.data.items.length > 0 && (
        <>
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
            {tickets.data.items.map((ticket) => (
              <TicketCard key={ticket.id} ticket={ticket} />
            ))}
          </SimpleGrid>

          {tickets.data.total > PAGE_SIZE && (
            <Group justify="space-between" mt="md">
              <Text c="dimmed" size="sm">
                {tickets.data.total} ticket{tickets.data.total > 1 ? 's' : ''} ·
                page {page}/{totalPages}
              </Text>
              <Pagination total={totalPages} value={page} onChange={setPage} />
            </Group>
          )}
        </>
      )}

      <TicketFormDrawer
        opened={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        ticket={null}
      />
    </Stack>
  );
}
