import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Center,
  Group,
  Loader,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Role } from '@ifsuv/shared';
import type { TicketPublic, TicketStatus } from '@ifsuv/shared';
import {
  IconAlertCircle,
  IconDeviceFloppy,
  IconRefresh,
} from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { TipTapEditor } from '../../components/editor/TipTapEditor';
import { getAvailableTransitions } from '../../features/tickets/transitions';
import {
  fetchTechTicket,
  saveTechDiagnostic,
  transitionTechTicket,
  uploadTechDiagImage,
} from '../../features/tech/api';
import { swalError, swalSuccess } from '../../lib/swal';

const STATUS_LABEL: Record<TicketStatus, { label: string; color: string }> = {
  NEW: { label: 'Nouveau', color: 'blue' },
  IN_PROGRESS: { label: 'En cours', color: 'orange' },
  RESOLVED: { label: 'Résolu', color: 'teal' },
  CLOSED: { label: 'Clôturé', color: 'gray' },
};

export function TechFichePage(): JSX.Element {
  const params = useParams();
  const token = params['token'] ?? '';
  const qc = useQueryClient();
  const queryKey = ['tech-ticket', token];

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey,
    queryFn: () => fetchTechTicket(token),
    enabled: !!token,
    retry: false,
  });

  // Brouillon local du diagnostic (initialisé au 1er chargement de la fiche).
  const [draft, setDraft] = useState<string | null>(null);
  useEffect(() => {
    if (data && draft === null) setDraft(data.diagnosticHtml ?? '');
  }, [data, draft]);

  const saveMut = useMutation({
    mutationFn: (html: string) => saveTechDiagnostic(token, html),
    onSuccess: (updated: TicketPublic) => {
      qc.setQueryData(queryKey, updated);
      setDraft(updated.diagnosticHtml ?? '');
      swalSuccess('Diagnostic enregistré');
    },
    onError: (err: unknown) => {
      swalError('Échec', err instanceof Error ? err.message : 'Erreur inconnue');
    },
  });

  const transMut = useMutation({
    mutationFn: (to: TicketStatus) => transitionTechTicket(token, to),
    onSuccess: (updated: TicketPublic) => {
      qc.setQueryData(queryKey, updated);
      swalSuccess(`Statut → ${STATUS_LABEL[updated.status].label}`);
    },
    onError: (err: unknown) => {
      swalError(
        'Transition refusée',
        err instanceof Error ? err.message : 'Erreur inconnue',
      );
    },
  });

  const dirty = data != null && draft != null && draft !== (data.diagnosticHtml ?? '');
  const transitions = data ? getAvailableTransitions(data.status, Role.Technician) : [];

  return (
    <Box mih="100vh" bg="var(--mantine-color-body)" py="md">
      <Box maw={760} mx="auto" px="md">
        <Stack>
          <Group justify="space-between" align="center">
            <Title order={3}>Fiche technicien</Title>
            {data && (
              <Button
                variant="default"
                size="xs"
                leftSection={<IconRefresh size={14} />}
                onClick={() => void refetch()}
                loading={isFetching}
              >
                Actualiser
              </Button>
            )}
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

          {data && draft !== null && (
            <>
              {/* Entête ticket + client */}
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
                  <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs" verticalSpacing={4}>
                    <Info label="Client" value={data.customerName} />
                    <Info label="Téléphone" value={data.customerPhone} />
                    <Info label="Email" value={data.customerEmail} />
                    <Info label="Adresse" value={data.customerAddress} />
                    <Info label="Emplacement" value={data.location} />
                    <Info label="Mot de passe PC" value={data.pcPassword} />
                  </SimpleGrid>
                  {data.problemType && (
                    <Box>
                      <Text size="xs" c="dimmed" fw={600}>
                        Problème signalé
                      </Text>
                      <Text style={{ whiteSpace: 'pre-wrap' }}>{data.problemType}</Text>
                    </Box>
                  )}
                </Stack>
              </Card>

              {/* Changement de statut */}
              {transitions.length > 0 && (
                <Card withBorder padding="lg">
                  <Title order={5} mb="sm">
                    Statut
                  </Title>
                  <Group>
                    {transitions.map((t) => (
                      <Button
                        key={t.to}
                        variant="light"
                        loading={transMut.isPending}
                        onClick={() => transMut.mutate(t.to)}
                      >
                        {t.label}
                      </Button>
                    ))}
                  </Group>
                </Card>
              )}

              {/* Diagnostic éditable */}
              <Card withBorder padding="lg">
                <Group justify="space-between" mb="sm">
                  <Title order={5}>Diagnostic</Title>
                  <Button
                    leftSection={<IconDeviceFloppy size={16} />}
                    disabled={!dirty}
                    loading={saveMut.isPending}
                    onClick={() => saveMut.mutate(draft)}
                  >
                    Enregistrer
                  </Button>
                </Group>
                <TipTapEditor
                  value={draft}
                  onChange={setDraft}
                  onImageUpload={(file) => uploadTechDiagImage(token, data.id, file)}
                />
              </Card>

              <Text size="xs" c="dimmed" ta="center" mt="md">
                IFSUV — Accès technicien restreint à ce ticket via QR code.
              </Text>
            </>
          )}
        </Stack>
      </Box>
    </Box>
  );
}

function Info({ label, value }: { label: string; value?: string }): JSX.Element | null {
  if (!value) return null;
  return (
    <Box>
      <Text size="xs" c="dimmed" fw={600}>
        {label}
      </Text>
      <Text style={{ wordBreak: 'break-word' }}>{value}</Text>
    </Box>
  );
}
