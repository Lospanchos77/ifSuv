import {
  Anchor,
  Badge,
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
import { IconArrowLeft, IconEdit } from '@tabler/icons-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CompanyFormDrawer } from '../../features/clients/CompanyFormDrawer';
import { useCompany } from '../../features/clients/hooks';

export function ClientDetailPage(): JSX.Element {
  const params = useParams();
  const id = params['id'];
  const { data, isLoading, isError, error } = useCompany(id);
  const [drawerOpen, setDrawerOpen] = useState(false);

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
        <Anchor component={Link} to="/clients">
          <Group gap="xs">
            <IconArrowLeft size={16} />
            Retour à la liste
          </Group>
        </Anchor>
        <Text c="red">Erreur : {(error as Error)?.message ?? 'Entreprise introuvable'}</Text>
      </Stack>
    );
  }

  return (
    <Stack>
      <Group justify="space-between">
        <Group gap="xs">
          <Anchor component={Link} to="/clients" c="dimmed">
            <Group gap={4}>
              <IconArrowLeft size={16} />
              <Text size="sm">Clients</Text>
            </Group>
          </Anchor>
          <Title order={2}>{data.name}</Title>
          <Badge color={data.kind === 'COMPANY' ? 'blue' : 'grape'} variant="light">
            {data.kind === 'COMPANY' ? 'Entreprise' : 'Particulier'}
          </Badge>
        </Group>
        <Button
          leftSection={<IconEdit size={16} />}
          onClick={() => setDrawerOpen(true)}
        >
          Modifier
        </Button>
      </Group>

      <Card withBorder padding="lg">
        <Title order={4} mb="md">
          Informations
        </Title>
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          <Field label="Adresse" value={data.address} />
          <Field label="Code postal" value={data.postalCode} />
          <Field label="Ville" value={data.city} />
          <Field label="Email" value={data.email} />
          <Field label="Téléphone" value={data.phone} />
          <Field label="Site web" value={data.website} />
        </SimpleGrid>
        {data.charges && (
          <Stack gap={4} mt="md">
            <Text size="sm" c="dimmed">
              Notes / charges
            </Text>
            <Text style={{ whiteSpace: 'pre-wrap' }}>{data.charges}</Text>
          </Stack>
        )}
      </Card>

      <Card withBorder padding="lg">
        <Title order={4} mb="xs">
          Tickets liés
        </Title>
        <Text c="dimmed" size="sm">
          Disponible en Phase 3 (module Tickets).
        </Text>
      </Card>

      <CompanyFormDrawer
        opened={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        company={data}
      />
    </Stack>
  );
}

function Field({ label, value }: { label: string; value?: string }): JSX.Element {
  return (
    <Stack gap={2}>
      <Text size="sm" c="dimmed">
        {label}
      </Text>
      <Text>{value && value.length > 0 ? value : '—'}</Text>
    </Stack>
  );
}
