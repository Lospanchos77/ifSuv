import { Button, Menu } from '@mantine/core';
import { IconChevronDown } from '@tabler/icons-react';
import type { TicketPublic } from '@ifsuv/shared';
import { useAuth } from '../auth/useAuth';
import { swalError, swalSuccess } from '../../lib/swal';
import { useTransitionTicket } from './hooks';
import { getAvailableTransitions } from './transitions';

interface Props {
  ticket: TicketPublic;
}

export function StatusTransitionMenu({ ticket }: Props): JSX.Element | null {
  const { user } = useAuth();
  const transitionMut = useTransitionTicket(ticket.id);

  if (!user) return null;
  const transitions = getAvailableTransitions(ticket.status, user.role);
  if (transitions.length === 0) return null;

  async function handleTransition(to: TicketPublic['status']): Promise<void> {
    try {
      await transitionMut.mutateAsync({ to });
      swalSuccess(`Statut → ${to}`);
    } catch (err) {
      swalError(
        'Transition refusée',
        err instanceof Error ? err.message : 'Erreur inconnue',
      );
    }
  }

  return (
    <Menu shadow="md" width={220}>
      <Menu.Target>
        <Button
          variant="filled"
          rightSection={<IconChevronDown size={16} />}
          loading={transitionMut.isPending}
        >
          Changer le statut
        </Button>
      </Menu.Target>
      <Menu.Dropdown>
        {transitions.map((t) => (
          <Menu.Item key={t.to} onClick={() => handleTransition(t.to)}>
            {t.label}
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
}
