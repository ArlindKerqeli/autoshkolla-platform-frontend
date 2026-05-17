import { cn } from '@/lib/utils';

interface FilterChipProps {
  label: string;
  active: boolean;
  onClick: () => void;
  /** Optional badge — small number to the right of the label. */
  count?: number;
  className?: string;
}

/**
 * Pill-style filter chip used in toolbars. Active state is dark fill.
 * Keep these inline in a horizontal toolbar rather than scattered selects.
 */
export function FilterChip({ label, active, onClick, count, className }: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium transition',
        active
          ? 'bg-slate-900 text-white shadow-sm'
          : 'bg-white text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-50 hover:text-slate-900',
        className
      )}
    >
      <span>{label}</span>
      {typeof count === 'number' && (
        <span
          className={cn(
            'inline-flex h-4 min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums',
            active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}
