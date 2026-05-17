'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/shared/StatusBadge';
import {
  AlertTriangle,
  Archive,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Calendar,
  Clock,
  CreditCard,
  type LucideIcon,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import type {
  CategoryBreakdown,
  DashboardAlert,
  DashboardStats,
  ScheduledLesson,
} from '@/lib/types';

/* ────────────────────────────────────────────────────────────────────────────
   Page
   ──────────────────────────────────────────────────────────────────────────── */

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => (await api.get('/dashboard/stats')).data,
  });
  const { data: categories, isLoading: categoriesLoading } = useQuery<CategoryBreakdown[]>({
    queryKey: ['dashboard-categories'],
    queryFn: async () => (await api.get('/dashboard/category-breakdown')).data,
  });
  const { data: schedule, isLoading: scheduleLoading } = useQuery<ScheduledLesson[]>({
    queryKey: ['dashboard-schedule'],
    queryFn: async () => (await api.get('/dashboard/today-schedule')).data,
  });
  const { data: alerts = [], isLoading: alertsLoading } = useQuery<DashboardAlert[]>({
    queryKey: ['dashboard-alerts'],
    queryFn: async () => (await api.get('/dashboard/alerts')).data,
  });

  const alertCounts = useMemo(() => {
    const c = { total: alerts.length, error: 0, warning: 0, info: 0 };
    alerts.forEach((a) => (c[a.severity] += 1));
    return c;
  }, [alerts]);

  const todayLabel = useMemo(() => {
    try {
      return new Intl.DateTimeFormat('sq', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(new Date());
    } catch {
      return '';
    }
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Paneli</h1>
          <p className="mt-1 text-sm text-slate-500">Pasqyrë e shpejtë e aktivitetit të autoshkollës.</p>
        </div>
        {todayLabel && (
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{todayLabel}</p>
        )}
      </header>

      {/* Alerts banner (single compact strip, links to /dashboard/alarmet) */}
      <AlertsBanner counts={alertCounts} loading={alertsLoading} />

      {/* Primary KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statsLoading ? (
          <>
            <KpiSkeleton /><KpiSkeleton /><KpiSkeleton /><KpiSkeleton />
          </>
        ) : (
          <>
            <KpiCard
              icon={Users}
              tone="blue"
              label="Kandidatët Total"
              value={String(stats?.totalCandidates ?? 0)}
              footer={
                <span className="text-xs text-slate-500">
                  <span className="font-medium text-emerald-600">{stats?.activeCandidates ?? 0}</span> aktivë
                  <span className="px-1.5 text-slate-300">•</span>
                  <span className="text-slate-500">{stats?.archivedCandidates ?? 0} arkivuar</span>
                </span>
              }
            />
            <KpiCard
              icon={UserCheck}
              tone="emerald"
              label="Kandidatët Aktivë"
              value={String(stats?.activeCandidates ?? 0)}
              footer={
                <TrendPill value={stats?.activeCandidatesTrend ?? 0} suffix=" këtë muaj" />
              }
            />
            <KpiCard
              icon={TrendingUp}
              tone="violet"
              label="Të Ardhurat"
              value={formatCurrency(stats?.totalRevenue ?? 0)}
              footer={
                <span className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span>{formatCurrency(stats?.monthlyRevenue ?? 0)} këtë muaj</span>
                  {(stats?.monthlyRevenueTrend ?? 0) !== 0 && (
                    <TrendPill value={stats?.monthlyRevenueTrend ?? 0} />
                  )}
                </span>
              }
            />
            <KpiCard
              icon={CreditCard}
              tone="amber"
              label="Pagesat në Pritje"
              value={formatCurrency(stats?.pendingPayments ?? 0)}
              footer={<span className="text-xs text-slate-500">borxh i kandidatëve aktivë</span>}
            />
          </>
        )}
      </div>

      {/* Secondary mini-stats — compact strip */}
      <div className="grid gap-3 sm:grid-cols-3">
        {statsLoading ? (
          <>
            <Skeleton className="h-[68px] rounded-xl" />
            <Skeleton className="h-[68px] rounded-xl" />
            <Skeleton className="h-[68px] rounded-xl" />
          </>
        ) : (
          <>
            <MiniStat icon={Clock} tone="sky" label="Orë praktike sot" value={String(stats?.practicalHoursToday ?? 0)} suffix="orë të planifikuara" />
            <MiniStat icon={Wallet} tone="rose" label="Borxhi instruktorëve" value={formatCurrency(stats?.instructorTotalDebt ?? 0)} suffix="total i papaguar" />
            <MiniStat icon={Archive} tone="slate" label="Arkivuar" value={String(stats?.archivedCandidates ?? 0)} suffix="kandidatë të përfunduar" />
          </>
        )}
      </div>

      {/* 3-column activity grid */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* Category breakdown */}
        <SectionCard
          title="Kandidatët sipas Kategorisë"
          action={<Link href="/dashboard/kandidatet" className="text-xs font-semibold text-primary-600 hover:text-primary-700">Shiko të gjithë</Link>}
        >
          {categoriesLoading ? (
            <Stack count={4} />
          ) : categories && categories.length ? (
            <CategoryList items={categories} />
          ) : (
            <EmptyMessage>Nuk ka të dhëna për kategoritë</EmptyMessage>
          )}
        </SectionCard>

        {/* Recent candidates */}
        <SectionCard
          title="Kandidatët e Fundit"
          action={<Link href="/dashboard/kandidatet" className="text-xs font-semibold text-primary-600 hover:text-primary-700">Shiko të gjithë</Link>}
        >
          {statsLoading ? (
            <Stack count={5} />
          ) : stats?.recentCandidates && stats.recentCandidates.length ? (
            <div className="-mx-1 space-y-1">
              {stats.recentCandidates.map((c) => (
                <Link
                  key={c.id}
                  href={`/dashboard/kandidatet/${c.id}`}
                  className="group flex items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-slate-50"
                >
                  <Avatar name={c.fullName} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">{c.fullName}</p>
                    <p className="text-[11px] text-slate-500">
                      {c.registrationDate ? formatDate(c.registrationDate) : '—'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {c.categoryCode && <CategoryPill code={c.categoryCode} />}
                    {c.isArchived && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">Arkivuar</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyMessage icon={UserPlus}>Nuk ka kandidatë të regjistruar</EmptyMessage>
          )}
        </SectionCard>

        {/* Today's schedule */}
        <SectionCard
          title="Mësimet Sot"
          action={<Link href="/dashboard/kalendari" className="text-xs font-semibold text-primary-600 hover:text-primary-700">Kalendari</Link>}
        >
          {scheduleLoading ? (
            <Stack count={4} />
          ) : schedule && schedule.length ? (
            <div className="-mx-1 space-y-1">
              {schedule.map((lesson) => (
                <div
                  key={lesson.id}
                  className="flex items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-slate-50"
                >
                  <TimePill from={lesson.startTime} to={lesson.endTime} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {lesson.candidate ? `${lesson.candidate.firstName} ${lesson.candidate.lastName}` : '—'}
                    </p>
                    <p className="truncate text-[11px] text-slate-500">
                      {lesson.instructor ? `${lesson.instructor.firstName} ${lesson.instructor.lastName}` : '—'}
                    </p>
                  </div>
                  <StatusBadge status={lesson.status} />
                </div>
              ))}
            </div>
          ) : (
            <EmptyMessage icon={Calendar}>Nuk ka mësime të planifikuara për sot</EmptyMessage>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Building blocks
   ──────────────────────────────────────────────────────────────────────────── */

const TONE: Record<string, { bg: string; fg: string; ring: string; dot: string }> = {
  blue:    { bg: 'bg-blue-50',    fg: 'text-blue-600',    ring: 'ring-blue-200',    dot: 'bg-blue-500' },
  emerald: { bg: 'bg-emerald-50', fg: 'text-emerald-600', ring: 'ring-emerald-200', dot: 'bg-emerald-500' },
  violet:  { bg: 'bg-violet-50',  fg: 'text-violet-600',  ring: 'ring-violet-200',  dot: 'bg-violet-500' },
  amber:   { bg: 'bg-amber-50',   fg: 'text-amber-600',   ring: 'ring-amber-200',   dot: 'bg-amber-500' },
  sky:     { bg: 'bg-sky-50',     fg: 'text-sky-600',     ring: 'ring-sky-200',     dot: 'bg-sky-500' },
  rose:    { bg: 'bg-rose-50',    fg: 'text-rose-600',    ring: 'ring-rose-200',    dot: 'bg-rose-500' },
  slate:   { bg: 'bg-slate-100',  fg: 'text-slate-600',   ring: 'ring-slate-200',   dot: 'bg-slate-500' },
};

function KpiCard({
  icon: Icon,
  tone,
  label,
  value,
  footer,
}: {
  icon: LucideIcon;
  tone: keyof typeof TONE;
  label: string;
  value: string;
  footer?: React.ReactNode;
}) {
  const t = TONE[tone];
  return (
    <Card className="group relative overflow-hidden border-slate-200 p-5 transition hover:shadow-md">
      <div className="flex items-start justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
        <span className={cn('grid h-9 w-9 place-items-center rounded-lg ring-1 ring-inset', t.bg, t.fg, t.ring)}>
          <Icon className="h-[18px] w-[18px]" />
        </span>
      </div>
      <div className="mt-3 text-[28px] font-bold tracking-tight text-slate-900 leading-none">{value}</div>
      {footer && <div className="mt-3">{footer}</div>}
    </Card>
  );
}

function KpiSkeleton() {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-9 w-9 rounded-lg" />
      </div>
      <Skeleton className="mt-3 h-7 w-24" />
      <Skeleton className="mt-3 h-3 w-32" />
    </Card>
  );
}

function MiniStat({
  icon: Icon,
  tone,
  label,
  value,
  suffix,
}: {
  icon: LucideIcon;
  tone: keyof typeof TONE;
  label: string;
  value: string;
  suffix: string;
}) {
  const t = TONE[tone];
  return (
    <Card className="flex items-center gap-3 border-slate-200 p-4">
      <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-lg ring-1 ring-inset', t.bg, t.fg, t.ring)}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
        <p className="mt-0.5 truncate text-base font-bold text-slate-900">
          {value} <span className="text-[11px] font-normal text-slate-400">· {suffix}</span>
        </p>
      </div>
    </Card>
  );
}

function TrendPill({ value, suffix }: { value: number; suffix?: string }) {
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

function AlertsBanner({ counts, loading }: { counts: { total: number; error: number; warning: number; info: number }; loading: boolean }) {
  if (loading) return <Skeleton className="h-[60px] w-full rounded-xl" />;
  if (counts.total === 0) {
    return (
      <Card className="flex items-center justify-between border-emerald-200 bg-emerald-50/60 p-4">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-100 text-emerald-700">
            <AlertTriangle className="h-[18px] w-[18px]" />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-900">Asnjë alarm aktiv</p>
            <p className="text-xs text-slate-500">Të gjitha pagesat dhe dokumentet janë në rregull.</p>
          </div>
        </div>
      </Card>
    );
  }

  const tone = counts.error > 0 ? TONE.rose : TONE.amber;

  return (
    <Link
      href="/dashboard/alarmet"
      className="group block"
      aria-label={`${counts.total} alarme aktive — shih të gjitha`}
    >
      <Card className="flex items-center gap-4 border-slate-200 p-4 transition group-hover:border-slate-300 group-hover:shadow-md">
        <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-lg ring-1 ring-inset', tone.bg, tone.fg, tone.ring)}>
          <AlertTriangle className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900">
            {counts.total} {counts.total === 1 ? 'alarm aktiv' : 'alarme aktive'}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-slate-600">
            {counts.error > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                <span><span className="font-semibold text-rose-700">{counts.error}</span> kritike</span>
              </span>
            )}
            {counts.warning > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                <span><span className="font-semibold text-amber-700">{counts.warning}</span> paralajmërime</span>
              </span>
            )}
            {counts.info > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
                <span><span className="font-semibold text-sky-700">{counts.info}</span> informuese</span>
              </span>
            )}
          </div>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-slate-600 transition group-hover:text-primary-600">
          Shih të gjitha
          <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
        </span>
      </Card>
    </Link>
  );
}

function SectionCard({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="overflow-hidden border-slate-200">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
        <h2 className="text-[13px] font-semibold tracking-tight text-slate-900">{title}</h2>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </Card>
  );
}

function CategoryList({ items }: { items: CategoryBreakdown[] }) {
  const max = Math.max(...items.map((c) => c.count), 1);
  return (
    <ul className="space-y-2.5">
      {items.map((cat) => {
        const pct = (cat.count / max) * 100;
        return (
          <li key={cat.category} className="flex items-center gap-3">
            <span className="w-12 shrink-0 text-[12px] font-semibold text-slate-700">{cat.category}</span>
            <div className="relative h-7 flex-1 overflow-hidden rounded-md bg-slate-100">
              <div
                className="absolute inset-y-0 left-0 rounded-md bg-gradient-to-r from-primary-500 to-primary-600 transition-[width] duration-700"
                style={{ width: `${Math.max(pct, 6)}%` }}
              />
              <span className="absolute inset-y-0 right-2 flex items-center text-[11px] font-semibold text-slate-700">
                {cat.count}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function Avatar({ name }: { name: string }) {
  const initials = useMemo(() => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    const a = parts[0]?.[0] ?? '';
    const b = parts[parts.length - 1]?.[0] ?? '';
    return (a + (parts.length > 1 ? b : '')).toUpperCase();
  }, [name]);

  // Deterministic tone from the name so the same person always gets the same colour
  const tone = useMemo(() => {
    const palette: (keyof typeof TONE)[] = ['blue', 'emerald', 'violet', 'amber', 'sky', 'rose'];
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
    return palette[h % palette.length];
  }, [name]);

  const t = TONE[tone];
  return (
    <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-full text-[12px] font-bold ring-1 ring-inset', t.bg, t.fg, t.ring)}>
      {initials}
    </span>
  );
}

function CategoryPill({ code }: { code: string }) {
  return (
    <span className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[10.5px] font-bold tracking-wider text-slate-700">
      {code}
    </span>
  );
}

function TimePill({ from, to }: { from: string; to: string }) {
  return (
    <div className="flex h-12 w-[78px] shrink-0 flex-col items-center justify-center rounded-lg bg-primary-50 text-primary-700">
      <span className="text-[12px] font-bold leading-none">{from}</span>
      <span className="mt-0.5 text-[10px] font-medium leading-none text-primary-600/80">→ {to}</span>
    </div>
  );
}

function Stack({ count }: { count: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-9 w-full rounded-md" />
      ))}
    </div>
  );
}

function EmptyMessage({ children, icon: Icon }: { children: React.ReactNode; icon?: LucideIcon }) {
  return (
    <div className="flex flex-col items-center gap-2 py-8 text-center">
      {Icon && (
        <span className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-400">
          <Icon className="h-4 w-4" />
        </span>
      )}
      <p className="text-sm text-slate-500">{children}</p>
    </div>
  );
}
