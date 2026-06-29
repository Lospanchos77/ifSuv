import {
  ActionIcon,
  AppShell,
  Burger,
  Group,
  Image,
  NavLink,
  Stack,
  Title,
  Tooltip,
  useComputedColorScheme,
  useMantineColorScheme,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Role } from '@ifsuv/shared';
import {
  IconDashboard,
  IconHistory,
  IconLogout,
  IconMoon,
  IconSettings,
  IconSun,
  IconTicket,
  IconUsers,
  IconUserCog,
} from '@tabler/icons-react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/useAuth';
import { useSiteSettings } from '../../features/settings/hooks';

export function AppShellLayout(): JSX.Element {
  const [opened, { toggle }] = useDisclosure();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const settings = useSiteSettings();
  const { setColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme('light', {
    getInitialValueInEffect: true,
  });

  const handleLogout = async (): Promise<void> => {
    await logout.mutateAsync();
    navigate('/login', { replace: true });
  };

  const toggleTheme = (): void => {
    setColorScheme(computedColorScheme === 'dark' ? 'light' : 'dark');
  };

  const isAdmin = user?.role === Role.Admin;
  const isDark = computedColorScheme === 'dark';
  const siteName = settings.data?.siteName ?? 'IFSUV';
  const logoDataUrl = settings.data?.logoDataUrl;
  const logoHeight = settings.data?.logoHeight ?? 36;
  const headerPaddingY = settings.data?.headerPaddingY ?? 8;
  const siteNameColor = settings.data?.siteNameColor;
  const showSiteName = settings.data?.showSiteName !== false;
  const siteNameStyle: React.CSSProperties = siteNameColor
    ? { color: siteNameColor, letterSpacing: '0.5px' }
    : {
        background:
          'linear-gradient(90deg, var(--mantine-color-indigo-6), var(--mantine-color-grape-6))',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        color: 'transparent',
        letterSpacing: '0.5px',
      };

  return (
    <AppShell
      header={{
        // Header height = logo + (titre si affiché) + 2 × padding vertical.
        // Plancher à 24px pour autoriser des configs très tassées (paddingY négatif).
        // Quand la hauteur descend sous la taille du logo, le logo est ancré en haut
        // et le bas est clippé (overflow hidden) — utile pour bouffer la marge blanche
        // intégrée dans certains fichiers logo.
        height: Math.max(
          24,
          logoHeight + (showSiteName ? 28 : 0) + headerPaddingY * 2,
        ),
      }}
      navbar={{ width: 240, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between" align="center" wrap="nowrap">
          <Group
            gap="sm"
            align="center"
            wrap="nowrap"
            style={{ height: '100%', overflow: 'hidden' }}
          >
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Stack gap={2} align="center" justify="center" style={{ height: '100%' }}>
              {logoDataUrl && (
                <Image
                  src={logoDataUrl}
                  alt={siteName}
                  h={logoHeight}
                  w="auto"
                  maw={400}
                  fit="contain"
                  radius="sm"
                />
              )}
              {showSiteName && (
                <Title order={5} style={siteNameStyle} lh={1}>
                  {siteName}
                </Title>
              )}
            </Stack>
          </Group>
          <Group gap="xs">
            {user && (
              <Title order={6} c="dimmed">
                {user.firstName} {user.lastName} · {user.role}
              </Title>
            )}
            <Tooltip label={isDark ? 'Thème clair' : 'Thème sombre'}>
              <ActionIcon
                variant="subtle"
                onClick={toggleTheme}
                aria-label="Basculer le thème"
              >
                {isDark ? <IconSun size={18} /> : <IconMoon size={18} />}
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Se déconnecter">
              <ActionIcon
                variant="subtle"
                onClick={handleLogout}
                loading={logout.isPending}
                aria-label="Se déconnecter"
              >
                <IconLogout size={18} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="xs">
        <NavLink
          component={Link}
          to="/"
          label="Tableau de bord"
          leftSection={<IconDashboard size={18} />}
          active={location.pathname === '/'}
        />
        <NavLink
          component={Link}
          to="/tickets"
          label="Tickets"
          leftSection={<IconTicket size={18} />}
          active={
            location.pathname.startsWith('/tickets') &&
            location.pathname !== '/tickets/history'
          }
        />
        <NavLink
          component={Link}
          to="/tickets/history"
          label="Historique"
          leftSection={<IconHistory size={18} />}
          active={location.pathname === '/tickets/history'}
        />
        <NavLink
          component={Link}
          to="/clients"
          label="Clients"
          leftSection={<IconUsers size={18} />}
          active={location.pathname.startsWith('/clients')}
        />
        {isAdmin && (
          <NavLink
            component={Link}
            to="/users"
            label="Utilisateurs"
            leftSection={<IconUserCog size={18} />}
            active={location.pathname.startsWith('/users')}
          />
        )}
        {isAdmin && (
          <NavLink
            component={Link}
            to="/settings"
            label="Paramètres"
            leftSection={<IconSettings size={18} />}
            active={location.pathname.startsWith('/settings')}
          />
        )}
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
