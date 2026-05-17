import type { LucideIcon } from 'lucide-react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export type KpiTone = 'blue' | 'emerald' | 'violet' | 'amber' | 'rose' | 'sky' | 'slate';

const TONES: Record<KpiTone, { bg: string; fg: string; ring: string }> = {
  blue:    { bg: 'bg-blue-50',    fg: 'text-blue-600',    ring: 'ring-blue-200' },
  emerald: { bg: 'bg-emerald-50', fg: 'text-emerald-600', ring: 'ring-emerald-200' },
  violet:  { bg: 'bg-violet-50',  fg: 'text-violet-600',  ring: 'ring-violet-200' },
  amber:   { bg: 'bg-amber-50',   fg: 'text-amber-600',   ring: 'ring-amber-200' },
  rose:    { bg: 'bg-rose-50',    fg: 'text-rose-600',    ring: 'ring-rose-200' },
  sky:     { bg: 'bg-sky-50',     fg: 'text-sky-600',     ring: 'ring-sky-200' },
  slate:   { bg: 'bg-slate-100',  fg: 'text-slate-600',   ring: 'ring-slate-200' },
};

interface KpiCardProps {
  icon: LucideIcon;
  tone?: KpiTone;
  label: string;
  value: string | number;
  footer?: React.ReactNode;
  /** Optional click handler — turns the card into a button. */
  onClick?: () => void;
  /** Optional active state when clickable (shows ring). */
  active?: boolean;
  className?: string;
}

/**
 * Modern KPI tile used at the top of dashboard pages.
 * Replaces the older left-bordered Card pattern across the app.
 */
export function KpiCard({
  icon: Icon,
  tone = 'slate',
  label,
  value,
  footer,
  onClick,
  active,
  className,
}: KpiCardProps) {
  const t = TONES[tone];
  const shared = cn(
    'group relative block overflow-hidden rounded-xl border bg-white p-5 text-left transition',
    onClick && 'cursor-pointer hover:border-slate-300 hover:shadow-md',
    !onClick && 'hover:shadow-md',
    active ? 'border-slate-900 ring-2 ring-slate-900/10' : 'border-slate-200',
    className
  );

  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
        <span
          className={cn(
            'grid h-9 w-9 shrink-0 place-items-center rounded-lg ring-1 ring-inset',
            t.bg,
            t.fg,
            t.ring
          )}
        >
          <Icon className="h-[18px] w-[18px]" />
        </span>
      </div>
      <div className="mt-3 text-[28px] font-bold leading-none tracking-tight text-slate-900">{value}</div>
      {footer && <div className="mt-3 min-h-[18px]">{footer}</div>}
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={shared}>
        {content}
      </button>
    );
  }
  return <div className={shared}>{content}</div>;
}

/**
 * Up/down trend pill ("+12%", "-5%"). Returns null when value is 0.
 */
export function TrendPill({ value, suffix }: { value: number; suffix?: string }) {
  if (!value) return null;
  const positive = value > 0;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold',
        positive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
      )}
    >
      {positive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
      {Math.abs(value)}
      {suffix ?? '%'}
    </span>
  );
}
