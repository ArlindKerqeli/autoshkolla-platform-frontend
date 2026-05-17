'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import {
  Users,
  Calendar,
  Wallet,
  MessageSquare,
  Clock,
  ChevronRight,
} from 'lucide-react';
import type { InstructorDashboard } from '@/lib/types';
import Link from 'next/link';

const metricCards = [
  {
    title: 'Kandidatet Aktive',
    key: 'activeCandidates' as const,
    icon: Users,
    color: 'blue',
    href: '/instructor/kandidatet',
    format: (v: number) => String(v),
  },
  {
    title: 'Mesimet Sot',
    key: 'lessonsToday' as const,
    icon: Calendar,
    color: 'green',
    href: '/instructor/kalendari',
    format: (v: number) => String(v),
  },
  {
    title: 'Borxhi Total',
    key: 'outstandingDebt' as const,
    icon: Wallet,
    color: 'amber',
    href: '/instructor/borxhi',
    format: (v: number) => formatCurrency(v),
  },
  {
    title: 'Mesazhe te Palexuara',
    key: 'unreadMessages' as const,
    icon: MessageSquare,
    color: 'purple',
    href: '/instructor/mesazhet',
    format: (v: number) => String(v),
  },
] as const;

const colorMap: Record<string, { bg: string; icon: string; text: string }> = {
  blue: {
    bg: 'bg-blue-50',
    icon: 'text-blue-600',
    text: 'text-blue-700',
  },
  green: {
    bg: 'bg-green-50',
    icon: 'text-green-600',
    text: 'text-green-700',
  },
  amber: {
    bg: 'bg-amber-50',
    icon: 'text-amber-600',
    text: 'text-amber-700',
  },
  purple: {
    bg: 'bg-purple-50',
    icon: 'text-purple-600',
    text: 'text-purple-700',
  },
};

const statusLabels: Record<string, { label: string; className: string }> = {
  scheduled: {
    label: 'E planifikuar',
    className: 'bg-blue-100 text-blue-700',
  },
  completed: {
    label: 'E perfunduar',
    className: 'bg-green-100 text-green-700',
  },
  cancelled: {
    label: 'E anuluar',
    className: 'bg-red-100 text-red-700',
  },
  no_show: {
    label: 'Nuk u paraqit',
    className: 'bg-gray-100 text-gray-700',
  },
};

export default function InstructorDashboardPage() {
  const { data, isLoading } = useQuery<{ data: InstructorDashboard }>({
    queryKey: ['instructor-dashboard'],
    queryFn: () => api.get('/instructor/dashboard'),
  });

  const dashboard = data?.data;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-56" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64 rounded-lg" />
          <Skeleton className="h-64 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Paneli</h1>
        <p className="text-sm text-gray-500 mt-1">
          Permbledhje e aktivitetit tuaj
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map((metric) => {
          const colors = colorMap[metric.color];
          const value = dashboard?.[metric.key] ?? 0;

          return (
            <Link key={metric.key} href={metric.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div
                      className={cn(
                        'h-11 w-11 rounded-lg flex items-center justify-center',
                        colors.bg
                      )}
                    >
                      <metric.icon className={cn('h-5 w-5', colors.icon)} />
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-300" />
                  </div>
                  <div className="mt-3">
                    <p className={cn('text-2xl font-bold', colors.text)}>
                      {metric.format(value)}
                    </p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {metric.title}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Today's Schedule & Recent Messages */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Schedule */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-400" />
              Orari i Sotshm
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!dashboard?.upcomingLessons?.length ? (
              <div className="text-center py-8">
                <Calendar className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">
                  Nuk keni mesime te planifikuara per sot
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {dashboard.upcomingLessons.map((lesson) => (
                  <div
                    key={lesson.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-center min-w-[52px]">
                        <p className="text-sm font-semibold text-gray-900">
                          {lesson.startTime}
                        </p>
                        <p className="text-xs text-gray-400">
                          {lesson.endTime}
                        </p>
                      </div>
                      <div className="h-8 w-px bg-gray-200" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {lesson.candidate
                            ? `${lesson.candidate.firstName} ${lesson.candidate.lastName}`
                            : 'Kandidati'}
                        </p>
                        {lesson.vehicle && (
                          <p className="text-xs text-gray-500">
                            {lesson.vehicle.make}{' '}
                            {lesson.vehicle.model
                              ? `${lesson.vehicle.model} - `
                              : '- '}
                            {lesson.vehicle.plateNumber}
                          </p>
                        )}
                      </div>
                    </div>
                    <span
                      className={cn(
                        'text-xs font-medium px-2.5 py-1 rounded-full',
                        statusLabels[lesson.status]?.className ??
                          'bg-gray-100 text-gray-700'
                      )}
                    >
                      {statusLabels[lesson.status]?.label ?? lesson.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {(dashboard?.upcomingLessons?.length ?? 0) > 0 && (
              <Link
                href="/instructor/kalendari"
                className="block text-center text-sm text-blue-600 hover:text-blue-700 font-medium mt-4"
              >
                Shiko kalendarin e plote
              </Link>
            )}
          </CardContent>
        </Card>

        {/* Recent Messages */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-gray-400" />
              Mesazhet e Fundit
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!dashboard?.unreadMessages ? (
              <div className="text-center py-8">
                <MessageSquare className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">
                  Nuk keni mesazhe te reja
                </p>
              </div>
            ) : (
              <div className="text-center py-8">
                <MessageSquare className="h-10 w-10 text-purple-200 mx-auto mb-3" />
                <p className="text-sm text-gray-700 font-medium">
                  {dashboard.unreadMessages} mesazhe te palexuara
                </p>
                <Link
                  href="/instructor/mesazhet"
                  className="inline-block text-sm text-blue-600 hover:text-blue-700 font-medium mt-2"
                >
                  Shiko mesazhet
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
