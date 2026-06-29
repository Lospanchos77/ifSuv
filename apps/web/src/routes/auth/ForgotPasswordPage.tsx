import { Anchor, Button, Card, Center, Stack, Text, TextInput, Title } from '@mantine/core';
import { zodResolver } from '@hookform/resolvers/zod';
import { PasswordResetRequestInput } from '@ifsuv/shared';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { passwordResetRequest } from '../../features/auth/api';
import { swalError } from '../../lib/swal';

export function ForgotPasswordPage(): JSX.Element {
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PasswordResetRequestInput>({
    resolver: zodResolver(PasswordResetRequestInput),
    defaultValues: { email: '' },
  });

  const mutation = useMutation({
    mutationFn: passwordResetRequest,
    onSuccess: () => {
      setSubmitted(true);
    },
    onError: (err) => {
      swalError('Erreur', err instanceof Error ? err.message : 'Erreur inconnue');
    },
  });

  const onSubmit = handleSubmit((data) => mutation.mutate(data));

  return (
    <Center h="100vh">
      <Card withBorder padding="xl" w={420}>
        <Title order={2} mb="md">
          Mot de passe oublié
        </Title>
        {submitted ? (
          <Stack>
            <Text>
              Si un compte existe pour cette adresse, un email de réinitialisation vient
              d&apos;être envoyé. Pensez à vérifier vos spams.
            </Text>
            <Anchor component={Link} to="/login">
              Retour à la connexion
            </Anchor>
          </Stack>
        ) : (
          <form onSubmit={onSubmit}>
            <Stack>
              <Text c="dimmed" size="sm">
                Entrez votre email — nous vous enverrons un lien pour définir un nouveau mot
                de passe.
              </Text>
              <TextInput
                label="Email"
                type="email"
                autoComplete="email"
                {...register('email')}
                error={errors.email?.message}
              />
              <Button type="submit" loading={mutation.isPending} fullWidth>
                Envoyer le lien
              </Button>
              <Anchor component={Link} to="/login" size="sm" ta="center">
                Retour à la connexion
              </Anchor>
            </Stack>
          </form>
        )}
      </Card>
    </Center>
  );
}
