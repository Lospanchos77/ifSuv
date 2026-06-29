import { Alert, Anchor, Center, Loader, Stack, Text } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useEffect } from 'react';
import { apiFetch } from '../../lib/api-client';

interface ResolveResponse {
  ticketId: string;
}

export function TechTokenRedirectPage(): JSX.Element {
  const params = useParams();
  const token = params['token'] ?? '';
  const navigate = useNavigate();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['tech-resolve', token],
    queryFn: () =>
      apiFetch<ResolveResponse>(
        `/tickets/resolve-tech-token/${encodeURIComponent(token)}`,
      ),
    enabled: !!token,
    retry: false,
  });

  useEffect(() => {
    if (data?.ticketId) {
      navigate(`/tickets/${data.ticketId}`, { replace: true });
    }
  }, [data, navigate]);

  if (isLoading) {
    return (
      <Center h="50vh">
        <Stack align="center" gap="xs">
          <Loader />
          <Text size="sm" c="dimmed">
            Ouverture du ticket…
          </Text>
        </Stack>
      </Center>
    );
  }

  if (isError) {
    return (
      <Center h="50vh">
        <Stack maw={420} px="md">
          <Alert color="red" icon={<IconAlertCircle size={16} />} title="Lien invalide">
            {(error as Error)?.message ?? 'Token tech invalide ou expiré.'}
          </Alert>
          <Anchor component={Link} to="/tickets" ta="center">
            Retour à la liste des tickets
          </Anchor>
        </Stack>
      </Center>
    );
  }

  return (
    <Center h="50vh">
      <Loader />
    </Center>
  );
}
