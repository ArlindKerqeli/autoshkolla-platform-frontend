'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/shared/StatusBadge';
import {
  Users,
  UserCheck,
  Archive,
  TrendingUp,
  Clock,
  Wallet,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  CreditCard,
  UserPlus,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import Link from 'next/link';
import type {
  DashboardStats,
  CategoryBreakdown,
  DashboardAlert,
  ScheduledLesson,
} from '@/lib/types';

function getAlertLink(alert: DashboardAlert): string | null {
  switch (alert.type) {
    case 'expiring_registration':
    case 'expiring_technical_control':
    case 'expiring_insurance':
      return '/dashboard/automjetet';
    case 'expiring_instructor_license':
      return '/dashboard/instruktoret';
    case 'overdue_payment':
      return alert.entityId ? `/dashboard/kandidatet/${alert.entityId}` : null;
    default:
      return null;
  }
}

function TrendIndicator({ value, suffix }: { value: number; suffix?: string }) {
  if (value === 0) return null;
  const isPositive = value > 0;
  return (
    <span
      className={`flex items-center gap-0.5 text-xs font-medium ${
        isPositive ? 'text-green-600' : 'text-red-600'
      }`}
    >
      {isPositive ? (
        <ArrowUp className="h-3 w-3" />
      ) : (
        <ArrowDown className="h-3 w-3" />
      )}
      {Math.abs(value)}
      {suffix || '%'}
    </span>
  );
}

function MetricCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-8 rounded" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-24" />
        <Skeleton className="mt-2 h-3 w-16" />
      </CardContent>
    </Card>
  );
}

function CategoryBar({
  category,
  count,
  maxCount,
}: {
  category: string;
  count: number;
  maxCount: number;
}) {
  const widthPercent = maxCount > 0 ? (count / maxCount) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-16 shrink-0 text-sm font-medium text-gray-700">
        {category}
      </span>
      <div className="flex-1">
        <div className="h-6 w-full rounded-full bg-gray-100">
          <div
            className="flex h-6 items-center rounded-full bg-blue-500 px-2 text-xs font-medium text-white transition-all"
            style={{ width: `${Math.max(widthPercent, 8)}%` }}
          >
            {count}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const res = await api.get('/dashboard/stats');
      return res.data;
    },
  });

  const { data: categories, isLoading: categoriesLoading } = useQuery<
    CategoryBreakdown[]
  >({
    queryKey: ['dashboard-categories'],
    queryFn: async () => {
      const res = await api.get('/dashboard/category-breakdown');
      return res.data;
    },
  });

  const { data: schedule, isLoading: scheduleLoading } = useQuery<
    ScheduledLesson[]
  >({
    queryKey: ['dashboard-schedule'],
    queryFn: async () => {
      const res = await api.get('/dashboard/today-schedule');
      return res.data;
    },
  });

  const { data: alerts, isLoading: alertsLoading } = useQuery<
    DashboardAlert[]
  >({
    queryKey: ['dashboard-alerts'],
    queryFn: async () => {
      const res = await api.get('/dashboard/alerts');
      return res.data;
    },
  });

  const maxCategoryCount = categories
    ? Math.max(...categories.map((c) => c.count), 1)
    : 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Paneli
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pasqyra e aktivitetit te autoshkolles
        </p>
      </div>

      {/* Primary Metric Cards Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statsLoading ? (
          <>
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
          </>
        ) : (
          <>
            <Card className="border-l-4 border-l-blue-500">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Kandidatet Total
                </CardTitle>
                <div className="rounded-md bg-blue-50 p-2">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {stats?.totalCandidates ?? 0}
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="text-green-600 font-medium">
                    {stats?.activeCandidates ?? 0} aktiv
                  </span>
                  <span>|</span>
                  <span className="text-gray-500">
                    {stats?.archivedCandidates ?? 0} arkivuar
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Kandidatet Aktive
                </CardTitle>
                <div className="rounded-md bg-green-50 p-2">
                  <UserCheck className="h-5 w-5 text-green-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {stats?.activeCandidates ?? 0}
                </div>
                <div className="mt-1">
                  <TrendIndicator
                    value={stats?.activeCandidatesTrend ?? 0}
                    suffix=" kete muaj"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-emerald-500">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Te Ardhurat (Total)
                </CardTitle>
                <div className="rounded-md bg-emerald-50 p-2">
                  <TrendingUp className="h-5 w-5 text-emerald-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {formatCurrency(stats?.totalRevenue ?? 0)}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {formatCurrency(stats?.monthlyRevenue ?? 0)} kete muaj
                  {(stats?.monthlyRevenueTrend ?? 0) !== 0 && (
                    <TrendIndicator value={stats?.monthlyRevenueTrend ?? 0} />
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-amber-500">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Pagesat ne Pritje
                </CardTitle>
                <div className="rounded-md bg-amber-50 p-2">
                  <CreditCard className="h-5 w-5 text-amber-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {formatCurrency(stats?.pendingPayments ?? 0)}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  borxh i kandidateve aktiv
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Secondary Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statsLoading ? (
          <>
            <MetricCardSkeleton />
            <MetricCardSkeleton />
          </>
        ) : (
          <>
            <Card className="border-l-4 border-l-purple-500">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Oret Praktike Sot
                </CardTitle>
                <div className="rounded-md bg-purple-50 p-2">
                  <Clock className="h-5 w-5 text-purple-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {stats?.practicalHoursToday ?? 0}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  ore te planifikuara
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-orange-500">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Borxhi i Instruktoreve
                </CardTitle>
                <div className="rounded-md bg-orange-50 p-2">
                  <Wallet className="h-5 w-5 text-orange-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {formatCurrency(stats?.instructorTotalDebt ?? 0)}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  total papaguar
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-gray-400">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Kandidatet e Arkivuar
                </CardTitle>
                <div className="rounded-md bg-gray-100 p-2">
                  <Archive className="h-5 w-5 text-gray-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {stats?.archivedCandidates ?? 0}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  te perfunduar
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Three-column layout: Category Breakdown + Recent Candidates + Today's Schedule */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Kandidatet sipas Kategorise
            </CardTitle>
          </CardHeader>
          <CardContent>
            {categoriesLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-6 w-full" />
                ))}
              </div>
            ) : categories && categories.length > 0 ? (
              <div className="space-y-3">
                {categories.map((cat) => (
                  <CategoryBar
                    key={cat.category}
                    category={cat.category}
                    count={cat.count}
                    maxCount={maxCategoryCount}
                  />
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nuk ka te dhena per kategorite
              </p>
            )}
          </CardContent>
        </Card>

        {/* Recent Candidates */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Kandidatet e Fundit</CardTitle>
            <Link
              href="/dashboard/kandidatet"
              className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
            >
              Shiko te gjithe
            </Link>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : stats?.recentCandidates && stats.recentCandidates.length > 0 ? (
              <div className="space-y-3">
                {stats.recentCandidates.map((candidate) => (
                  <Link
                    key={candidate.id}
                    href={`/dashboard/kandidatet/${candidate.id}`}
                    className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                        <UserPlus className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {candidate.fullName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {candidate.registrationDate
                            ? formatDate(candidate.registrationDate)
                            : '-'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {candidate.categoryCode && (
                        <Badge variant="secondary" className="text-xs">
                          {candidate.categoryCode}
                        </Badge>
                      )}
                      {candidate.isArchived && (
                        <Badge variant="muted" className="text-xs">
                          Arkivuar
                        </Badge>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nuk ka kandidate te regjistruar
              </p>
            )}
          </CardContent>
        </Card>

        {/* Today's Schedule */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Mesimet Sot</CardTitle>
            <Link
              href="/dashboard/kalendari"
              className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
            >
              Kalendari
            </Link>
          </CardHeader>
          <CardContent>
            {scheduleLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : schedule && schedule.length > 0 ? (
              <div className="space-y-2">
                {schedule.map((lesson) => (
                  <div
                    key={lesson.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {lesson.startTime} - {lesson.endTime}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {lesson.candidate
                          ? `${lesson.candidate.firstName} ${lesson.candidate.lastName}`
                          : '-'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {lesson.instructor
                          ? `${lesson.instructor.firstName} ${lesson.instructor.lastName}`
                          : '-'}
                      </span>
                      <StatusBadge status={lesson.status} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nuk ka mesime te planifikuara per sot
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Alarmet
          </CardTitle>
        </CardHeader>
        <CardContent>
          {alertsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : alerts && alerts.length > 0 ? (
            <div className="space-y-2">
              {alerts.map((alert, idx) => {
                const link = getAlertLink(alert);
                const content = (
                  <div
                    className={`flex items-start gap-3 rounded-lg border p-3 ${
                      alert.severity === 'error'
                        ? 'border-red-200 bg-red-50'
                        : alert.severity === 'warning'
                          ? 'border-amber-200 bg-amber-50'
                          : 'border-blue-200 bg-blue-50'
                    } ${link ? 'cursor-pointer transition-colors hover:opacity-80' : ''}`}
                  >
                    <AlertTriangle
                      className={`mt-0.5 h-4 w-4 shrink-0 ${
                        alert.severity === 'error'
                          ? 'text-red-500'
                          : alert.severity === 'warning'
                            ? 'text-amber-500'
                            : 'text-blue-500'
                      }`}
                    />
                    <span className="flex-1 text-sm">{alert.message}</span>
                    {link && (
                      <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    )}
                  </div>
                );
                return link ? (
                  <Link
                    key={`${alert.type}-${alert.entityId}-${idx}`}
                    href={link}
                  >
                    {content}
                  </Link>
                ) : (
                  <div key={`${alert.type}-${alert.entityId}-${idx}`}>
                    {content}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nuk ka alarme aktive
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
