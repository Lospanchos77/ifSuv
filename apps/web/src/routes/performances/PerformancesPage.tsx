import { Card, Group, Loader, Stack, Table, Text, Title } from '@mantine/core';
import type { TechPerfRow } from '@ifsuv/shared';
import { useTechPerf } from '../../features/tickets/hooks';

/** Formate une durée en ms vers un libellé court FR (min / h / j). `null` → tiret. */
function formatDuration(ms: number | null): string {
  if (ms === null) return '—';
  const totalMin = Math.round(ms / 60000);
  if (totalMin < 60) return `${totalMin} min`;
  const totalH = Math.floor(totalMin / 60);
  const min = totalMin % 60;
  if (totalH < 24) return min ? `${totalH} h ${min} min` : `${totalH} h`;
  const days = Math.floor(totalH / 24);
  const h = totalH % 24;
  return h ? `${days} j ${h} h` : `${days} j`;
}

export function PerformancesPage(): JSX.Element {
  const { data, isLoading, isError, error } = useTechPerf();

  return (
    <Stack>
      <Title order={2}>Performances par technicien</Title>
      <Text c="dimmed" size="sm">
        Volume de tickets pris en charge et temps moyens entre l'ouverture du
        ticket et sa résolution / clôture. Groupé par technicien assigné.
      </Text>

      <Card withBorder padding="md">
        {isLoading ? (
          <Group justify="center" p="xl">
            <Loader />
          </Group>
        ) : isError ? (
          <Text c="red">
            {error instanceof Error ? error.message : 'Erreur de chargement'}
          </Text>
        ) : !data || data.rows.length === 0 ? (
          <Text c="dimmed">Aucune donnée pour le moment.</Text>
        ) : (
          <Table.ScrollContainer minWidth={820}>
            <Table striped highlightOnHover withTableBorder verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Technicien</Table.Th>
                  <Table.Th ta="right">Tickets</Table.Th>
                  <Table.Th ta="right">Nouveau</Table.Th>
                  <Table.Th ta="right">En cours</Table.Th>
                  <Table.Th ta="right">Résolus</Table.Th>
                  <Table.Th ta="right">Clos</Table.Th>
                  <Table.Th ta="right">Tps moy. résolution</Table.Th>
                  <Table.Th ta="right">Tps moy. clôture</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {data.rows.map((r: TechPerfRow) => (
                  <Table.Tr key={r.techId ?? 'unassigned'}>
                    <Table.Td>
                      <Text fw={r.techId ? 500 : 400} c={r.techId ? undefined : 'dimmed'}>
                        {r.techName}
                      </Text>
                    </Table.Td>
                    <Table.Td ta="right">{r.total}</Table.Td>
                    <Table.Td ta="right">{r.byStatus.NEW}</Table.Td>
                    <Table.Td ta="right">{r.byStatus.IN_PROGRESS}</Table.Td>
                    <Table.Td ta="right">{r.byStatus.RESOLVED}</Table.Td>
                    <Table.Td ta="right">{r.byStatus.CLOSED}</Table.Td>
                    <Table.Td ta="right">{formatDuration(r.avgResolutionMs)}</Table.Td>
                    <Table.Td ta="right">{formatDuration(r.avgClosureMs)}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
      </Card>
    </Stack>
  );
}
