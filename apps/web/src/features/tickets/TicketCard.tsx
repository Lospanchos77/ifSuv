import {
  ActionIcon,
  Anchor,
  Card,
  Divider,
  Group,
  SimpleGrid,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core';
import {
  IconAlertTriangle,
  IconBuilding,
  IconCalendar,
  IconCircleDot,
  IconClipboardText,
  IconClock,
  IconKey,
  IconPhone,
  IconPrinter,
  IconUser,
} from '@tabler/icons-react';
import type { CustomFieldDef, TicketListItem, TicketStatus } from '@ifsuv/shared';
import { Link, useNavigate } from 'react-router-dom';
import { useSiteSettings } from '../settings/hooks';
import { formatDate, timeAgo } from '../../lib/time';
import { MiniQrTech } from './MiniQrTech';
import { PriorityBadge } from './PriorityBadge';
import { StatusBadge } from './StatusBadge';
import './ticket-card.css';

interface Props {
  ticket: TicketListItem;
}

const STATUS_COLOR: Record<TicketStatus, string> = {
  NEW: 'blue',
  IN_PROGRESS: 'orange',
  RESOLVED: 'teal',
  CLOSED: 'gray',
};

function htmlToPlainSummary(html?: string, maxLen = 220): string | null {
  if (!html || typeof html !== 'string') return null;
  if (typeof document === 'undefined') return null;
  const div = document.createElement('div');
  div.innerHTML = html;
  const text = (div.textContent ?? '').replace(/\s+/g, ' ').trim();
  if (!text) return null;
  return text.length > maxLen ? `${text.slice(0, maxLen).trimEnd()}…` : text;
}

export function TicketCard({ ticket }: Props): JSX.Element {
  const navigate = useNavigate();
  const settings = useSiteSettings();
  const isHighPriority = ticket.priority === 'HIGH';
  const accent = isHighPriority ? 'red' : STATUS_COLOR[ticket.status];
  const diagSummary = htmlToPlainSummary(ticket.diagnosticHtml);
  const hasSynthese = !!ticket.problemType || !!diagSummary;

  // Champs custom flaggés "afficher sur le dashboard" qui ont une valeur sur ce ticket.
  const dashboardCustomFields: Array<{ def: CustomFieldDef; value: string }> = [];
  for (const def of settings.data?.customTicketFields ?? []) {
    if (!def.showOnDashboard) continue;
    const raw = ticket.customFieldsData?.[def.key];
    let display: string | null = null;
    if (def.type === 'checkbox') {
      if (raw === true) display = 'Oui';
    } else if (typeof raw === 'string' && raw.trim()) {
      display = raw;
    } else if (typeof raw === 'number') {
      display = String(raw);
    }
    if (display) dashboardCustomFields.push({ def, value: display });
  }

  function handleCardClick(e: React.MouseEvent<HTMLDivElement>): void {
    // Si le clic vient d'un élément interactif (lien, bouton, image cliquable),
    // on laisse l'élément gérer — il fait stopPropagation lui-même normalement.
    const target = e.target as HTMLElement;
    if (target.closest('a, button, [role="button"]')) return;
    navigate(`/tickets/${ticket.id}`);
  }

  return (
    <Card
      withBorder
      padding="md"
      radius="md"
      onClick={handleCardClick}
      className={[
        'ticket-card',
        isHighPriority ? 'ticket-card-high' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{
        borderLeftWidth: 4,
        borderLeftColor: `var(--mantine-color-${accent}-6)`,
        boxShadow: `0 4px 16px var(--mantine-color-${accent}-2)`,
        cursor: 'pointer',
      }}
    >
      <Stack gap="xs">
        <Group justify="space-between" wrap="nowrap" align="flex-start">
          <Group gap="md" wrap="nowrap" style={{ minWidth: 0, flex: 1 }}>
            <MiniQrTech ticketId={ticket.id} ticketRef={ticket.ref} size={96} />
            <Stack gap={4} style={{ minWidth: 0, flex: 1 }}>
              {/* Nom client en GROS MAJUSCULES — l'info la plus visible */}
              {ticket.customerName ? (
                <Text fw={700} size="lg" lineClamp={1} tt="uppercase">
                  {ticket.customerName}
                </Text>
              ) : (
                <Text fw={700} size="lg" lineClamp={1} c="dimmed">
                  Client non renseigné
                </Text>
              )}

              {/* Ref + statut */}
              <Group gap="xs" wrap="nowrap">
                <Anchor component={Link} to={`/tickets/${ticket.id}`} fw={500} size="sm">
                  {ticket.ref}
                </Anchor>
                <StatusBadge status={ticket.status} size="xs" />
              </Group>

              {/* Technicien — info importante remontée juste sous le numéro */}
              <Group gap={4} wrap="nowrap">
                <IconUser size={14} color="var(--mantine-color-dimmed)" />
                <Text size="xs" c="dimmed" lineClamp={1}>
                  {ticket.assignedTech
                    ? `${ticket.assignedTech.firstName} ${ticket.assignedTech.lastName}`
                    : 'Non assigné'}
                </Text>
              </Group>
            </Stack>
          </Group>

          {/* Bloc à droite : date + chrono + actions + priorité dessous */}
          <Stack gap={6} align="flex-end">
            <Group gap={6} wrap="nowrap" align="flex-start">
              <Tooltip
                label={
                  ticket.createdAt
                    ? new Date(ticket.createdAt).toLocaleString('fr-FR')
                    : ''
                }
              >
                <Stack gap={2} align="flex-end">
                  <Group gap={4} wrap="nowrap">
                    <IconCalendar size={12} color="var(--mantine-color-dimmed)" />
                    <Text size="xs" c="dimmed">
                      {formatDate(ticket.createdAt)}
                    </Text>
                  </Group>
                  <Group gap={4} wrap="nowrap">
                    <IconClock size={12} color="var(--mantine-color-dimmed)" />
                    <Text size="xs" c="dimmed" fs="italic">
                      {timeAgo(ticket.createdAt)}
                    </Text>
                  </Group>
                </Stack>
              </Tooltip>
              <Tooltip label="Imprimer la fiche client">
                <ActionIcon
                  component={Link}
                  to={`/tickets/${ticket.id}/print/fiche`}
                  target="_blank"
                  variant="subtle"
                  size="sm"
                  onClick={(e) => e.stopPropagation()}
                  aria-label="Imprimer la fiche client"
                >
                  <IconPrinter size={16} />
                </ActionIcon>
              </Tooltip>
            </Group>
            <PriorityBadge priority={ticket.priority} size="xs" animated />
          </Stack>
        </Group>

        {hasSynthese && (
          <>
            <Divider my={4} />
            {ticket.problemType && (
              <Group gap={6} wrap="nowrap" align="flex-start">
                <IconAlertTriangle
                  size={14}
                  color="var(--mantine-color-orange-6)"
                  style={{ flexShrink: 0, marginTop: 3 }}
                />
                <Stack gap={0} style={{ minWidth: 0, flex: 1 }}>
                  <Text size="xs" fw={700} c="orange.7" tt="uppercase" lh={1.2}>
                    Problème
                  </Text>
                  <Text
                    size="sm"
                    fw={500}
                    lineClamp={2}
                    style={{ whiteSpace: 'pre-wrap' }}
                  >
                    {ticket.problemType}
                  </Text>
                </Stack>
              </Group>
            )}
            {diagSummary && (
              <Group gap={6} wrap="nowrap" align="flex-start">
                <IconClipboardText
                  size={14}
                  color="var(--mantine-color-blue-6)"
                  style={{ flexShrink: 0, marginTop: 3 }}
                />
                <Stack gap={0} style={{ minWidth: 0, flex: 1 }}>
                  <Text size="xs" fw={700} c="blue.7" tt="uppercase" lh={1.2}>
                    Diagnostic
                  </Text>
                  <Text size="xs" c="dimmed" lineClamp={3}>
                    {diagSummary}
                  </Text>
                </Stack>
              </Group>
            )}
            <Divider my={4} />
          </>
        )}

        <SimpleGrid cols={2} spacing={4} verticalSpacing={4}>
          {ticket.company && (
            <Group gap={4} wrap="nowrap" style={{ minWidth: 0 }}>
              <IconBuilding size={14} color="var(--mantine-color-dimmed)" style={{ flexShrink: 0 }} />
              <Text size="xs" c="dimmed" lineClamp={1}>
                {ticket.company.name}
              </Text>
            </Group>
          )}

          {ticket.customerPhone && (
            <Group gap={4} wrap="nowrap" style={{ minWidth: 0 }}>
              <IconPhone size={14} color="var(--mantine-color-dimmed)" style={{ flexShrink: 0 }} />
              <Anchor
                href={`tel:${ticket.customerPhone}`}
                size="xs"
                c="dimmed"
                onClick={(e) => e.stopPropagation()}
                lineClamp={1}
              >
                {ticket.customerPhone}
              </Anchor>
            </Group>
          )}

          {ticket.pcPassword && (
            <Group gap={4} wrap="nowrap" style={{ minWidth: 0 }}>
              <IconKey size={14} color="var(--mantine-color-dimmed)" style={{ flexShrink: 0 }} />
              <Text size="xs" c="dimmed" lineClamp={1} ff="monospace">
                {ticket.pcPassword}
              </Text>
            </Group>
          )}

          {dashboardCustomFields.map(({ def, value }) => (
            <Group key={def.key} gap={4} wrap="nowrap" style={{ minWidth: 0 }}>
              <IconCircleDot
                size={14}
                color="var(--mantine-color-dimmed)"
                style={{ flexShrink: 0 }}
              />
              <Text size="xs" c="dimmed" lineClamp={1}>
                <Text component="span" fw={500}>
                  {def.label} :
                </Text>{' '}
                {value}
              </Text>
            </Group>
          ))}
        </SimpleGrid>
      </Stack>
    </Card>
  );
}
