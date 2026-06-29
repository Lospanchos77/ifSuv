import { Badge } from '@mantine/core';
import type { TicketPriority } from '@ifsuv/shared';

const LABEL: Record<TicketPriority, string> = {
  LOW: 'Basse',
  NORMAL: 'Moyenne',
  HIGH: 'Haute',
};

const COLOR: Record<TicketPriority, string> = {
  LOW: 'green',
  NORMAL: 'yellow',
  HIGH: 'red',
};

interface Props {
  priority: TicketPriority;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  animated?: boolean;
}

export function PriorityBadge({
  priority,
  size = 'xs',
  animated = false,
}: Props): JSX.Element {
  return (
    <Badge
      color={COLOR[priority]}
      variant="filled"
      size={size}
      className={
        animated && priority === 'HIGH' ? 'priority-badge-high' : undefined
      }
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
      {LABEL[priority]}
    </Badge>
  );
}
