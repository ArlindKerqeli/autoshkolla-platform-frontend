'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Building2,
  Users,
  GraduationCap,
  Activity,
  Archive,
  CheckCircle2,
} from 'lucide-react';
import api from '@/lib/api';
import type { GlobalStats, Tenant } from '@/lib/types';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export default function StatistikatPage() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['superadmin-stats'],
    queryFn: async () => {
      const res = await api.get('/superadmin/stats');
      return res.data as GlobalStats;
    },
  });

  const { data: tenantsData, isLoading: tenantsLoading } = useQuery({
    queryKey: ['superadmin-tenants-all'],
    queryFn: async () => {
      const res = await api.get('/superadmin/tenants', {
        params: { perPage: 100 },
      });
      return res as unknown as {
        data: (Tenant & { statistics?: { userCount: number; candidateCount: number } })[];
      };
    },
  });

  const tenants = tenantsData?.data ?? [];
  const isLoading = statsLoading || tenantsLoading;

  const inactiveTenants = (stats?.totalTenants ?? 0) - (stats?.activeTenants ?? 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Statistikat e Platformes"
        description="Pasqyra e pergjithshme e te dhenave te platformes"
      />

      {/* Main Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Total Tenante"
          value={stats?.totalTenants}
          icon={Building2}
          iconColor="text-blue-600"
          loading={isLoading}
        />
        <StatCard
          title="Tenante Aktive"
          value={stats?.activeTenants}
          icon={CheckCircle2}
          iconColor="text-green-600"
          loading={isLoading}
          subtitle={inactiveTenants > 0 ? `${inactiveTenants} joaktive` : undefined}
        />
        <StatCard
          title="Total Perdorues"
          value={stats?.totalUsers}
          icon={Users}
          iconColor="text-indigo-600"
          loading={isLoading}
        />
        <StatCard
          title="Total Kandidate"
          value={stats?.totalCandidates}
          icon={GraduationCap}
          iconColor="text-amber-600"
          loading={isLoading}
        />
        <StatCard
          title="Kandidate Aktive"
          value={stats?.activeCandidates}
          icon={Activity}
          iconColor="text-emerald-600"
          loading={isLoading}
        />
        <StatCard
          title="Kandidate te Arkivuara"
          value={stats?.archivedCandidates}
          icon={Archive}
          iconColor="text-gray-500"
          loading={isLoading}
        />
      </div>

      {/* Per-Tenant Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pasqyra sipas Tenanteve</CardTitle>
        </CardHeader>
        <CardContent>
          {tenantsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : tenants.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nuk ka tenante.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 pr-4 font-medium">Emri</th>
                    <th className="pb-3 pr-4 font-medium">Slug</th>
                    <th className="pb-3 pr-4 font-medium">Statusi</th>
                    <th className="pb-3 pr-4 font-medium">Krijuar me</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {tenants.map((tenant) => (
                    <tr key={tenant.id} className="hover:bg-gray-50">
                      <td className="py-3 pr-4 font-medium">{tenant.name}</td>
                      <td className="py-3 pr-4">
                        <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">
                          {tenant.slug}
                        </code>
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant={tenant.isActive ? 'success' : 'muted'}>
                          {tenant.isActive ? 'Aktiv' : 'Joaktiv'}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {new Date(tenant.createdAt).toLocaleDateString('sq-AL', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  iconColor,
  loading,
  subtitle,
}: {
  title: string;
  value: number | undefined;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  loading: boolean;
  subtitle?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${iconColor}`} />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <>
            <div className="text-2xl font-bold">{value ?? 0}</div>
            {subtitle && (
              <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
