import {
  Anchor,
  Button,
  Card,
  Center,
  Image,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { zodResolver } from '@hookform/resolvers/zod';
import { LoginInput } from '@ifsuv/shared';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/useAuth';
import { useSiteSettings } from '../../features/settings/hooks';
import { swalError } from '../../lib/swal';

export function LoginPage(): JSX.Element {
  const navigate = useNavigate();
  const { login } = useAuth();
  const settings = useSiteSettings();
  const siteName = settings.data?.siteName ?? 'IFSUV';
  const siteTagline = settings.data?.siteTagline;
  const logoDataUrl = settings.data?.logoDataUrl;
  const logoSize = Math.min(256, settings.data?.logoHeight ?? 72);
  const siteNameColor = settings.data?.siteNameColor;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(LoginInput),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (data) => {
    try {
      await login.mutateAsync(data);
      navigate('/', { replace: true });
    } catch (err) {
      swalError('Connexion échouée', err instanceof Error ? err.message : 'Erreur inconnue');
    }
  });

  return (
    <Center h="100vh">
      <Card withBorder padding="xl" w={420}>
        <Stack align="center" gap="xs" mb="md">
          {logoDataUrl && (
            <Image
              src={logoDataUrl}
              alt={siteName}
              h={logoSize}
              w="auto"
              maw={360}
              fit="contain"
              radius="md"
            />
          )}
          <Title order={2} style={siteNameColor ? { color: siteNameColor } : undefined}>
            {siteName}
          </Title>
          {siteTagline && (
            <Text c="dimmed" size="sm" ta="center">
              {siteTagline}
            </Text>
          )}
        </Stack>
        <form onSubmit={onSubmit}>
          <Stack>
            <TextInput
              label="Email"
              type="email"
              autoComplete="username"
              {...register('email')}
              error={errors.email?.message}
            />
            <PasswordInput
              label="Mot de passe"
              autoComplete="current-password"
              {...register('password')}
              error={errors.password?.message}
            />
            <Button type="submit" loading={isSubmitting || login.isPending} fullWidth>
              Se connecter
            </Button>
            <Anchor component={Link} to="/forgot-password" size="sm" ta="center">
              Mot de passe oublié ?
            </Anchor>
          </Stack>
        </form>
      </Card>
    </Center>
  );
}
