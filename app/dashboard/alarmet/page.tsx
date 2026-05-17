'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  AlertTriangle,
  BadgeCheck,
  Car,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Filter,
  Inbox,
  Search,
  ShieldAlert,
  Wallet,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import type { DashboardAlert } from '@/lib/types';
import { cn } from '@/lib/utils';

/* ────────────────────────────────────────────────────────────────────────────
   Alert metadata — keep this in one place
   ──────────────────────────────────────────────────────────────────────────── */

type AlertGroup = 'Pagesat' | 'Automjetet' | 'Instruktorët';

const TYPE_META: Record<
  DashboardAlert['type'],
  { label: string; icon: LucideIcon; group: AlertGroup }
> = {
  expiring_registration:        { label: 'Regjistrimi i automjetit',  icon: Car,         group: 'Automjetet' },
  expiring_technical_control:   { label: 'Kontrolli teknik',          icon: Wrench,      group: 'Automjetet' },
  expiring_insurance:           { label: 'Sigurimi i automjetit',     icon: ShieldAlert, group: 'Automjetet' },
  expiring_instructor_license:  { label: 'Licenca e instruktorit',    icon: BadgeCheck,  group: 'Instruktorët' },
  overdue_payment:              { label: 'Pagesë në vonesë',          icon: CreditCard,  group: 'Pagesat' },
  instructor_high_debt:         { label: 'Borxh i lartë',             icon: Wallet,      group: 'Instruktorët' },
};

const ALL_GROUPS: AlertGroup[] = ['Pagesat', 'Automjetet', 'Instruktorët'];

type SeverityFilter = 'all' | 'error' | 'warning' | 'info';
type GroupFilter = 'all' | AlertGroup;

function getAlertLink(alert: DashboardAlert): string | null {
  switch (alert.type) {
    case 'expiring_registration':
    case 'expiring_technical_control':
    case 'expiring_insurance':
      return '/dashboard/automjetet';
    case 'expiring_instructor_license':
    case 'instructor_high_debt':
      return '/dashboard/instruktoret';
    case 'overdue_payment':
      return alert.entityId ? `/dashboard/kandidatet/${alert.entityId}` : null;
    default:
      return null;
  }
}

const SEVERITY_STYLES = {
  error: {
    dot: 'bg-rose-500',
    bar: 'bg-rose-500',
    chip: 'bg-rose-50 text-rose-700 ring-rose-200',
    icon: 'bg-rose-50 text-rose-600',
  },
  warning: {
    dot: 'bg-amber-500',
    bar: 'bg-amber-500',
    chip: 'bg-amber-50 text-amber-700 ring-amber-200',
    icon: 'bg-amber-50 text-amber-600',
  },
  info: {
    dot: 'bg-sky-500',
    bar: 'bg-sky-500',
    chip: 'bg-sky-50 text-sky-700 ring-sky-200',
    icon: 'bg-sky-50 text-sky-600',
  },
} as const;

/* ────────────────────────────────────────────────────────────────────────────
   Page
   ──────────────────────────────────────────────────────────────────────────── */

export default function AlarmetPage() {
  const [severity, setSeverity] = useState<SeverityFilter>('all');
  const [group, setGroup] = useState<GroupFilter>('all');
  const [query, setQuery] = useState('');

  const { data: alerts = [], isLoading } = useQuery<DashboardAlert[]>({
    queryKey: ['dashboard-alerts'],
    queryFn: async () => {
      const res = await api.get('/dashboard/alerts');
      return res.data;
    },
  });

  /* Counts for the summary tiles */
  const counts = useMemo(() => {
    const c = { total: alerts.length, error: 0, warning: 0, info: 0 };
    alerts.forEach((a) => {
      c[a.severity] += 1;
    });
    return c;
  }, [alerts]);

  /* Filtered list */
  const filtered = useMemo(() => {
    return alerts.filter((a) => {
      if (severity !== 'all' && a.severity !== severity) return false;
      if (group !== 'all' && TYPE_META[a.type].group !== group) return false;
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        if (!a.message.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [alerts, severity, group, query]);

  /* Group filtered alerts by their group */
  const grouped = useMemo(() => {
    const map = new Map<AlertGroup, DashboardAlert[]>();
    filtered.forEach((a) => {
      const g = TYPE_META[a.type].group;
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(a);
    });
    // Sort each group internally: error → warning → info
    const sev = { error: 0, warning: 1, info: 2 };
    map.forEach((list) => list.sort((x, y) => sev[x.severity] - sev[y.severity]));
    return map;
  }, [filtered]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-slate-900">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-50 text-amber-600 ring-1 ring-amber-200">
              <AlertTriangle className="h-5 w-5" />
            </span>
            Alarmet
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Të gjitha problemet që kërkojnë vëmendje — pagesa në vonesë, dokumente që po skadojnë, borxhe të mëdha.
          </p>
        </div>
      </div>

      {/* Summary tiles */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryTile label="Gjithsej" value={counts.total} tone="slate" icon={AlertTriangle} active={severity === 'all'} onClick={() => setSeverity('all')} />
        <SummaryTile label="Kritike"   value={counts.error}   tone="error"   icon={AlertTriangle} active={severity === 'error'}   onClick={() => setSeverity(severity === 'error' ? 'all' : 'error')} />
        <SummaryTile label="Paralajmërime" value={counts.warning} tone="warning" icon={AlertTriangle} active={severity === 'warning'} onClick={() => setSeverity(severity === 'warning' ? 'all' : 'warning')} />
        <SummaryTile label="Informuese" value={counts.info}    tone="info"    icon={AlertTriangle} active={severity === 'info'}    onClick={() => setSeverity(severity === 'info' ? 'all' : 'info')} />
      </div>

      {/* Filter bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Kërko në alarme (emër, mjet, mesazh)…"
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          <span className="mr-1 hidden items-center gap-1 text-xs font-medium text-slate-500 sm:inline-flex">
            <Filter className="h-3.5 w-3.5" /> Kategori:
          </span>
          <GroupChip label="Të gjitha" active={group === 'all'} onClick={() => setGroup('all')} />
          {ALL_GROUPS.map((g) => (
            <GroupChip key={g} label={g} active={group === g} onClick={() => setGroup(group === g ? 'all' : g)} />
          ))}
        </div>
      </div>

      {/* Body */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState totalAll={alerts.length} />
      ) : (
        <div className="space-y-6">
          {ALL_GROUPS.filter((g) => grouped.has(g)).map((g) => {
            const list = grouped.get(g)!;
            return (
              <section key={g}>
                <div className="mb-2 flex items-center gap-2 px-1">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">{g}</h2>
                  <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-slate-100 px-1.5 text-[11px] font-semibold text-slate-600">
                    {list.length}
                  </span>
                </div>
                <Card className="divide-y divide-slate-100 overflow-hidden">
                  {list.map((alert, i) => (
                    <AlertRow key={`${alert.type}-${alert.entityId}-${i}`} alert={alert} />
                  ))}
                </Card>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Building blocks
   ──────────────────────────────────────────────────────────────────────────── */

function SummaryTile({
  label,
  value,
  tone,
  icon: Icon,
  active,
  onClick,
}: {
  label: string;
  value: number;
  tone: 'slate' | 'error' | 'warning' | 'info';
  icon: LucideIcon;
  active: boolean;
  onClick: () => void;
}) {
  const toneClasses = {
    slate:   { bg: 'bg-slate-50',  fg: 'text-slate-700',  ring: 'ring-slate-200',  text: 'text-slate-900' },
    error:   { bg: 'bg-rose-50',   fg: 'text-rose-600',   ring: 'ring-rose-200',   text: 'text-rose-700' },
    warning: { bg: 'bg-amber-50',  fg: 'text-amber-600',  ring: 'ring-amber-200',  text: 'text-amber-700' },
    info:    { bg: 'bg-sky-50',    fg: 'text-sky-600',    ring: 'ring-sky-200',    text: 'text-sky-700' },
  }[tone];

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex items-center justify-between rounded-xl border bg-white p-4 text-left transition',
        active ? 'border-slate-900 ring-2 ring-slate-900/10' : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
      )}
    >
      <div>
        <div className={cn('text-xs font-semibold uppercase tracking-wider', toneClasses.text)}>{label}</div>
        <div className="mt-1 text-3xl font-bold tracking-tight text-slate-900">{value}</div>
      </div>
      <span className={cn('grid h-10 w-10 place-items-center rounded-lg ring-1 ring-inset', toneClasses.bg, toneClasses.fg, toneClasses.ring)}>
        <Icon className="h-5 w-5" />
      </span>
    </button>
  );
}

function GroupChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'shrink-0 rounded-full px-3 py-1.5 text-[12px] font-medium transition',
        active
          ? 'bg-slate-900 text-white shadow-sm'
          : 'bg-white text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-50 hover:text-slate-900'
      )}
    >
      {label}
    </button>
  );
}

function AlertRow({ alert }: { alert: DashboardAlert }) {
  const meta = TYPE_META[alert.type];
  const Icon = meta.icon;
  const sev = SEVERITY_STYLES[alert.severity];
  const link = getAlertLink(alert);

  const inner = (
    <div className="relative flex items-center gap-3 px-4 py-3 transition group-hover:bg-slate-50/70">
      {/* Severity bar */}
      <span className={cn('absolute inset-y-2 left-0 w-0.5 rounded-r-full', sev.bar)} aria-hidden />
      {/* Icon */}
      <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-lg', sev.icon)}>
        <Icon className="h-[18px] w-[18px]" />
      </span>
      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={cn('inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10.5px] font-semibold ring-1 ring-inset', sev.chip)}>
            {meta.label}
          </span>
        </div>
        <p className="mt-1 truncate text-sm text-slate-800">{alert.message}</p>
      </div>
      {/* Affordance */}
      {link && (
        <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500" />
      )}
    </div>
  );

  return link ? (
    <Link href={link} className="group block">
      {inner}
    </Link>
  ) : (
    <div className="group">{inner}</div>
  );
}

function EmptyState({ totalAll }: { totalAll: number }) {
  if (totalAll === 0) {
    return (
      <Card className="flex flex-col items-center justify-center gap-3 py-14 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200">
          <CheckCircle2 className="h-7 w-7" />
        </span>
        <h3 className="text-base font-semibold text-slate-900">Asnjë alarm aktiv</h3>
        <p className="max-w-sm text-sm text-slate-500">
          Të gjitha pagesat, automjetet dhe licencat janë në rregull. Vazhdoni punën e mirë!
        </p>
      </Card>
    );
  }
  return (
    <Card className="flex flex-col items-center justify-center gap-3 py-14 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-full bg-slate-100 text-slate-500">
        <Inbox className="h-7 w-7" />
      </span>
      <h3 className="text-base font-semibold text-slate-900">Asnjë alarm me filtrat e zgjedhur</h3>
      <p className="max-w-sm text-sm text-slate-500">
        Provoni të hiqni filtrat ose të kërkoni me një tjetër fjalë.
      </p>
    </Card>
  );
}
