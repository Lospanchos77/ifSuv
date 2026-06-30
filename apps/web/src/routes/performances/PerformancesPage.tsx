import { BarChart, DonutChart } from '@mantine/charts';
import {
  Card,
  Grid,
  Group,
  Loader,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import {
  IconChecks,
  IconClockCheck,
  IconClockHour4,
  IconTicket,
} from '@tabler/icons-react';
import type { ReactNode } from 'react';
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

/** "Jean Dupont" → "Jean D." pour des libellés d'axe compacts. */
function shortName(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2 && parts[1] ? `${parts[0]} ${parts[1][0]}.` : name;
}

function KpiCard({
  icon,
  color,
  label,
  value,
}: {
  icon: ReactNode;
  color: string;
  label: string;
  value: ReactNode;
}): JSX.Element {
  return (
    <Card withBorder padding="md" radius="md">
      <Group wrap="nowrap">
        <ThemeIcon size={44} radius="md" variant="light" color={color}>
          {icon}
        </ThemeIcon>
        <div>
          <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
            {label}
          </Text>
          <Text size="xl" fw={700} lh={1.2}>
            {value}
          </Text>
        </div>
      </Group>
    </Card>
  );
}

export function PerformancesPage(): JSX.Element {
  const { data, isLoading, isError, error } = useTechPerf();
  const rows = data?.rows ?? [];

  // --- Agrégats globaux ---
  const totalTickets = rows.reduce((s, r) => s + r.total, 0);
  const sumNEW = rows.reduce((s, r) => s + r.byStatus.NEW, 0);
  const sumIP = rows.reduce((s, r) => s + r.byStatus.IN_PROGRESS, 0);
  const sumRES = rows.reduce((s, r) => s + r.byStatus.RESOLVED, 0);
  const sumCLO = rows.reduce((s, r) => s + r.byStatus.CLOSED, 0);
  const traites = sumRES + sumCLO;

  // Moyennes globales pondérées par le nombre de tickets de chaque technicien.
  let resMsSum = 0;
  let resCnt = 0;
  let cloMsSum = 0;
  let cloCnt = 0;
  for (const r of rows) {
    if (r.avgResolutionMs !== null) {
      resMsSum += r.avgResolutionMs * r.resolvedCount;
      resCnt += r.resolvedCount;
    }
    if (r.avgClosureMs !== null) {
      cloMsSum += r.avgClosureMs * r.closedCount;
      cloCnt += r.closedCount;
    }
  }
  const globalAvgRes = resCnt > 0 ? Math.round(resMsSum / resCnt) : null;
  const globalAvgClo = cloCnt > 0 ? Math.round(cloMsSum / cloCnt) : null;

  // --- Données graphiques ---
  const barData = rows.map((r) => ({
    name: shortName(r.techName),
    Nouveau: r.byStatus.NEW,
    'En cours': r.byStatus.IN_PROGRESS,
    Résolus: r.byStatus.RESOLVED,
    Clos: r.byStatus.CLOSED,
  }));
  const donutData = [
    { name: 'Nouveau', value: sumNEW, color: 'blue.6' },
    { name: 'En cours', value: sumIP, color: 'yellow.6' },
    { name: 'Résolus', value: sumRES, color: 'teal.6' },
    { name: 'Clos', value: sumCLO, color: 'gray.5' },
  ].filter((d) => d.value > 0);
  const resTimeData = rows
    .filter((r) => r.avgResolutionMs !== null)
    .map((r) => ({
      name: shortName(r.techName),
      heures: Math.round((r.avgResolutionMs as number) / 360000) / 10,
    }));

  return (
    <Stack>
      <Title order={2}>Performances par technicien</Title>
      <Text c="dimmed" size="sm">
        Volume pris en charge par technicien assigné et temps moyens entre
        l'ouverture du ticket et sa résolution / clôture.
      </Text>

      {isLoading ? (
        <Group justify="center" p="xl">
          <Loader />
        </Group>
      ) : isError ? (
        <Text c="red">
          {error instanceof Error ? error.message : 'Erreur de chargement'}
        </Text>
      ) : rows.length === 0 ? (
        <Text c="dimmed">Aucune donnée pour le moment.</Text>
      ) : (
        <Stack gap="md">
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
            <KpiCard
              icon={<IconTicket size={24} />}
              color="indigo"
              label="Tickets au total"
              value={totalTickets}
            />
            <KpiCard
              icon={<IconChecks size={24} />}
              color="teal"
              label="Traités (résolus + clos)"
              value={traites}
            />
            <KpiCard
              icon={<IconClockHour4 size={24} />}
              color="grape"
              label="Tps moyen résolution"
              value={formatDuration(globalAvgRes)}
            />
            <KpiCard
              icon={<IconClockCheck size={24} />}
              color="orange"
              label="Tps moyen clôture"
              value={formatDuration(globalAvgClo)}
            />
          </SimpleGrid>

          <Grid>
            <Grid.Col span={{ base: 12, lg: 7 }}>
              <Card withBorder padding="md" radius="md" h="100%">
                <Title order={5} mb="md">
                  Tickets par technicien
                </Title>
                <BarChart
                  h={300}
                  data={barData}
                  dataKey="name"
                  type="stacked"
                  withLegend
                  legendProps={{ verticalAlign: 'bottom' }}
                  series={[
                    { name: 'Nouveau', color: 'blue.6' },
                    { name: 'En cours', color: 'yellow.6' },
                    { name: 'Résolus', color: 'teal.6' },
                    { name: 'Clos', color: 'gray.5' },
                  ]}
                />
              </Card>
            </Grid.Col>
            <Grid.Col span={{ base: 12, lg: 5 }}>
              <Card withBorder padding="md" radius="md" h="100%">
                <Title order={5} mb="md">
                  Répartition globale
                </Title>
                {donutData.length > 0 ? (
                  <Group justify="center" py="md">
                    <DonutChart
                      data={donutData}
                      withTooltip
                      size={230}
                      thickness={34}
                      chartLabel={`${totalTickets} tickets`}
                    />
                  </Group>
                ) : (
                  <Text c="dimmed">Aucune donnée.</Text>
                )}
              </Card>
            </Grid.Col>
          </Grid>

          <Card withBorder padding="md" radius="md">
            <Title order={5} mb="md">
              Temps moyen de résolution par technicien
            </Title>
            {resTimeData.length > 0 ? (
              <BarChart
                h={280}
                data={resTimeData}
                dataKey="name"
                series={[{ name: 'heures', color: 'grape.6', label: 'Heures' }]}
                valueFormatter={(v) => `${v} h`}
              />
            ) : (
              <Text c="dimmed">Aucun ticket résolu pour le moment.</Text>
            )}
          </Card>
        </Stack>
      )}
    </Stack>
  );
}
