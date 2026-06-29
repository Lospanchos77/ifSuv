import {
  Alert,
  Anchor,
  Button,
  Card,
  Center,
  PasswordInput,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { zodResolver } from '@hookform/resolvers/zod';
import { PasswordResetConfirmInput } from '@ifsuv/shared';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { passwordResetConfirm } from '../../features/auth/api';
import { swalError, swalSuccess } from '../../lib/swal';

export function ResetPasswordPage(): JSX.Element {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') ?? '';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<{ newPassword: string }>({
    resolver: zodResolver(PasswordResetConfirmInput.pick({ newPassword: true })),
    defaultValues: { newPassword: '' },
  });

  const mutation = useMutation({
    mutationFn: passwordResetConfirm,
    onSuccess: () => {
      swalSuccess(
        'Mot de passe mis à jour',
        'Vous pouvez vous connecter avec votre nouveau mot de passe.',
      );
      navigate('/login', { replace: true });
    },
    onError: (err) => {
      swalError(
        'Échec de la réinitialisation',
        err instanceof Error ? err.message : 'Erreur inconnue',
      );
    },
  });

  const onSubmit = handleSubmit(({ newPassword }) =>
    mutation.mutate({ token, newPassword }),
  );

  if (!token) {
    return (
      <Center h="100vh">
        <Card withBorder padding="xl" w={420}>
          <Alert color="red" title="Lien invalide">
            Aucun token n&apos;a été fourni.
          </Alert>
          <Anchor component={Link} to="/forgot-password" mt="md">
            Demander un nouveau lien
          </Anchor>
        </Card>
      </Center>
    );
  }

  return (
    <Center h="100vh">
      <Card withBorder padding="xl" w={420}>
        <Title order={2} mb="md">
          Nouveau mot de passe
        </Title>
        <form onSubmit={onSubmit}>
          <Stack>
            <Text c="dimmed" size="sm">
              Choisissez un nouveau mot de passe (12 caractères minimum).
            </Text>
            <PasswordInput
              label="Nouveau mot de passe"
              autoComplete="new-password"
              {...register('newPassword')}
              error={errors.newPassword?.message}
            />
            <Button type="submit" loading={mutation.isPending} fullWidth>
              Définir le mot de passe
            </Button>
          </Stack>
        </form>
      </Card>
    </Center>
  );
}
