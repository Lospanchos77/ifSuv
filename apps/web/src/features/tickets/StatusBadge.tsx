import { Badge } from '@mantine/core';
import type { TicketStatus } from '@ifsuv/shared';

const LABEL: Record<TicketStatus, string> = {
  NEW: 'Nouveau',
  IN_PROGRESS: 'En cours',
  RESOLVED: 'Résolu',
  CLOSED: 'Clos',
};

const COLOR: Record<TicketStatus, string> = {
  NEW: 'blue',
  IN_PROGRESS: 'orange',
  RESOLVED: 'teal',
  CLOSED: 'gray',
};

interface Props {
  status: TicketStatus;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

export function StatusBadge({ status, size = 'sm' }: Props): JSX.Element {
  return (
    <Badge
      color={COLOR[status]}
      variant="filled"
      size={size}
      styles={{
        root: {
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          fontWeight: 700,
          paddingLeft: 12,
          paddingRight: 12,
        },
      }}
    >
      {LABEL[status]}
    </Badge>
  );
}
