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
  ChevronDown,
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
   Metadata
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
const VISIBLE_PER_GROUP = 8;

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
  error:   { bar: 'bg-rose-500',  icon: 'bg-rose-50 text-rose-600 ring-rose-200',     daysClass: 'text-rose-700 bg-rose-50 ring-rose-200' },
  warning: { bar: 'bg-amber-500', icon: 'bg-amber-50 text-amber-600 ring-amber-200',  daysClass: 'text-amber-700 bg-amber-50 ring-amber-200' },
  info:    { bar: 'bg-sky-500',   icon: 'bg-sky-50 text-sky-600 ring-sky-200',        daysClass: 'text-sky-700 bg-sky-50 ring-sky-200' },
} as const;

/** Pull structured fields out of well-known message formats. */
function parseMessage(alert: DashboardAlert): {
  title: string;
  amount?: string;
  days?: number;
  trailing?: string;
} {
  if (alert.type === 'overdue_payment') {
    const m = alert.message.match(/^(.+?)\s+ka borxh\s+(€[\d.,]+)\s+\((\d+)\s+ditë pa paguar\)\s*$/);
    if (m) return { title: m[1], amount: m[2], days: parseInt(m[3], 10) };
  }
  if (alert.type === 'instructor_high_debt') {
    const m = alert.message.match(/^(.+?)\s+ka borxh\s+(€[\d.,]+)/);
    if (m) return { title: m[1], amount: m[2], trailing: alert.message.slice(m[0].length).trim() };
  }
  return { title: alert.message };
}

/* ────────────────────────────────────────────────────────────────────────────
   Page
   ──────────────────────────────────────────────────────────────────────────── */

export default function AlarmetPage() {
  const [severity, setSeverity] = useState<SeverityFilter>('all');
  const [group, setGroup] = useState<GroupFilter>('all');
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const { data: alerts = [], isLoading } = useQuery<DashboardAlert[]>({
    queryKey: ['dashboard-alerts'],
    queryFn: async () => (await api.get('/dashboard/alerts')).data,
  });

  const counts = useMemo(() => {
    const c = { total: alerts.length, error: 0, warning: 0, info: 0 };
    alerts.forEach((a) => (c[a.severity] += 1));
    return c;
  }, [alerts]);

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

  const grouped = useMemo(() => {
    const map = new Map<AlertGroup, DashboardAlert[]>();
    filtered.forEach((a) => {
      const g = TYPE_META[a.type].group;
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(a);
    });
    const sevRank = { error: 0, warning: 1, info: 2 };
    map.forEach((list) =>
      list.sort((x, y) => {
        const rs = sevRank[x.severity] - sevRank[y.severity];
        if (rs !== 0) return rs;
        const px = parseMessage(x);
        const py = parseMessage(y);
        // Within same severity: more days overdue first, then alphabetical
        const dx = px.days ?? -1;
        const dy = py.days ?? -1;
        if (dx !== dy) return dy - dx;
        return px.title.localeCompare(py.title);
      })
    );
    return map;
  }, [filtered]);

  const anyExpanded = Object.values(expanded).some(Boolean);

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
        {anyExpanded && (
          <button
            type="button"
            onClick={() => setExpanded({})}
            className="self-start rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            Përmblidh të gjitha
          </button>
        )}
      </div>

      {/* Summary tiles (also act as severity filters) */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryTile label="Gjithsej"      value={counts.total}   tone="slate"   active={severity === 'all'}     onClick={() => setSeverity('all')} />
        <SummaryTile label="Kritike"        value={counts.error}   tone="error"   active={severity === 'error'}   onClick={() => setSeverity(severity === 'error' ? 'all' : 'error')} />
        <SummaryTile label="Paralajmërime" value={counts.warning} tone="warning" active={severity === 'warning'} onClick={() => setSeverity(severity === 'warning' ? 'all' : 'warning')} />
        <SummaryTile label="Informuese"    value={counts.info}    tone="info"    active={severity === 'info'}    onClick={() => setSeverity(severity === 'info' ? 'all' : 'info')} />
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
            const isExpanded = expanded[g] === true;
            const visible = isExpanded ? list : list.slice(0, VISIBLE_PER_GROUP);
            const hidden = list.length - visible.length;

            return (
              <section key={g}>
                <div className="mb-2 flex items-center gap-2 px-1">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">{g}</h2>
                  <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-slate-100 px-1.5 text-[11px] font-semibold text-slate-600">
                    {list.length}
                  </span>
                </div>

                <Card className="divide-y divide-slate-100 overflow-hidden">
                  {visible.map((alert, i) => (
                    <AlertRow key={`${alert.type}-${alert.entityId}-${i}`} alert={alert} />
                  ))}
                </Card>

                {(hidden > 0 || isExpanded) && (
                  <div className="mt-2 flex justify-center">
                    <button
                      type="button"
                      onClick={() => setExpanded((p) => ({ ...p, [g]: !p[g] }))}
                      className="group inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                    >
                      {isExpanded ? (
                        <>
                          Shfaq vetëm {VISIBLE_PER_GROUP}
                          <ChevronDown className="h-3.5 w-3.5 rotate-180 transition" />
                        </>
                      ) : (
                        <>
                          Shfaq edhe {hidden} {hidden === 1 ? 'alarm' : 'alarme'}
                          <ChevronDown className="h-3.5 w-3.5 transition group-hover:translate-y-0.5" />
                        </>
                      )}
                    </button>
                  </div>
                )}
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
  active,
  onClick,
}: {
  label: string;
  value: number;
  tone: 'slate' | 'error' | 'warning' | 'info';
  active: boolean;
  onClick: () => void;
}) {
  const tones = {
    slate:   { iconBg: 'bg-slate-100',  iconFg: 'text-slate-600',  ring: 'ring-slate-200',  label: 'text-slate-700' },
    error:   { iconBg: 'bg-rose-50',    iconFg: 'text-rose-600',   ring: 'ring-rose-200',   label: 'text-rose-700' },
    warning: { iconBg: 'bg-amber-50',   iconFg: 'text-amber-600',  ring: 'ring-amber-200',  label: 'text-amber-700' },
    info:    { iconBg: 'bg-sky-50',     iconFg: 'text-sky-600',    ring: 'ring-sky-200',    label: 'text-sky-700' },
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
        <div className={cn('text-xs font-semibold uppercase tracking-wider', tones.label)}>{label}</div>
        <div className="mt-1 text-3xl font-bold tracking-tight text-slate-900">{value}</div>
      </div>
      <span className={cn('grid h-10 w-10 place-items-center rounded-lg ring-1 ring-inset', tones.iconBg, tones.iconFg, tones.ring)}>
        <AlertTriangle className="h-5 w-5" />
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
  const parsed = parseMessage(alert);

  const inner = (
    <div className="relative grid grid-cols-[auto,1fr,auto] items-center gap-3 px-4 py-3 transition group-hover:bg-slate-50/70">
      {/* Severity bar */}
      <span className={cn('absolute inset-y-2 left-0 w-0.5 rounded-r-full', sev.bar)} aria-hidden />
      {/* Icon */}
      <span className={cn('grid h-9 w-9 place-items-center rounded-lg ring-1 ring-inset', sev.icon)}>
        <Icon className="h-[18px] w-[18px]" />
      </span>
      {/* Title + secondary line */}
      <div className="min-w-0">
        <p className="truncate text-[13.5px] font-medium text-slate-900">{parsed.title}</p>
        <p className="mt-0.5 truncate text-[11.5px] text-slate-500">{meta.label}{parsed.trailing ? ` · ${parsed.trailing}` : ''}</p>
      </div>
      {/* Right column: amount / days / chevron */}
      <div className="flex items-center gap-2.5">
        {parsed.amount && (
          <span className="hidden text-sm font-bold tabular-nums text-slate-900 sm:inline">{parsed.amount}</span>
        )}
        {parsed.days !== undefined && (
          <span
            className={cn(
              'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset tabular-nums',
              sev.daysClass
            )}
            title={`${parsed.days} ditë pa paguar`}
          >
            {parsed.days} ditë
          </span>
        )}
        {link && (
          <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500" />
        )}
      </div>
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
