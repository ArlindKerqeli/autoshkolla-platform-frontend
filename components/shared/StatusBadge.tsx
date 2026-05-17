import { Badge, type BadgeProps } from '@/components/ui/badge';

type BadgeVariant = BadgeProps['variant'];

const DEFAULT_STATUS_MAP: Record<string, BadgeVariant> = {
  active: 'success',
  inactive: 'muted',
  paid: 'success',
  unpaid: 'error',
  partial: 'warning',
  archived: 'muted',
  scheduled: 'info',
  completed: 'success',
  cancelled: 'error',
  no_show: 'warning',
  pending: 'warning',
  expired: 'error',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Aktiv',
  inactive: 'Joaktiv',
  paid: 'Paguar',
  unpaid: 'Papaguar',
  partial: 'Pjesërisht',
  archived: 'Arkivuar',
  scheduled: 'Planifikuar',
  completed: 'Përfunduar',
  cancelled: 'Anuluar',
  no_show: 'Munguar',
  pending: 'Në pritje',
  expired: 'Skaduar',
};

interface StatusBadgeProps {
  status: string;
  statusMap?: Record<string, BadgeVariant>;
  labels?: Record<string, string>;
  className?: string;
}

export function StatusBadge({
  status,
  statusMap,
  labels,
  className,
}: StatusBadgeProps) {
  const mergedMap = { ...DEFAULT_STATUS_MAP, ...statusMap };
  const mergedLabels = { ...STATUS_LABELS, ...labels };
  const variant = mergedMap[status] || 'muted';
  const label = mergedLabels[status] || status;

  return (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  );
}
