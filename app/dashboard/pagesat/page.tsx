'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { format, subDays, startOfMonth, startOfWeek, startOfYear } from 'date-fns';
import {
  Banknote,
  Building2,
  Receipt,
  PlusCircle,
  Search,
  Calendar as CalendarIcon,
} from 'lucide-react';
import api from '@/lib/api';
import { formatDate, formatCurrency, cn } from '@/lib/utils';
import type { Payment, PaymentSummary, PaginatedResponse } from '@/lib/types';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { KpiCard } from '@/components/shared/KpiCard';
import { FilterChip } from '@/components/shared/FilterChip';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ExportButton } from '@/components/shared/ExportButton';

type RangePreset = 'today' | 'week' | 'month' | 'thirty' | 'year' | 'custom';

const PRESETS: { id: RangePreset; label: string }[] = [
  { id: 'today',  label: 'Sot' },
  { id: 'week',   label: 'Java' },
  { id: 'month',  label: 'Muaji' },
  { id: 'thirty', label: '30 ditë' },
  { id: 'year',   label: 'Viti' },
];

function rangeFor(preset: RangePreset): { startDate: string; endDate: string } {
  const today = new Date();
  const end = format(today, 'yyyy-MM-dd');
  let start = today;
  switch (preset) {
    case 'today':  start = today; break;
    case 'week':   start = startOfWeek(today, { weekStartsOn: 1 }); break;
    case 'month':  start = startOfMonth(today); break;
    case 'thirty': start = subDays(today, 29); break;
    case 'year':   start = startOfYear(today); break;
    case 'custom': return { startDate: end, endDate: end };
  }
  return { startDate: format(start, 'yyyy-MM-dd'), endDate: end };
}

const METHOD_LABELS: Record<string, string> = {
  cash: 'Para të gatshme',
  bank: 'Bankë',
  other: 'Tjetër',
};

export default function PagesatPage() {
  const initial = rangeFor('month');
  const [preset, setPreset] = useState<RangePreset>('month');
  const [startDate, setStartDate] = useState(initial.startDate);
  const [endDate, setEndDate] = useState(initial.endDate);
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const applyPreset = (p: RangePreset) => {
    setPreset(p);
    if (p !== 'custom') {
      const r = rangeFor(p);
      setStartDate(r.startDate);
      setEndDate(r.endDate);
    }
    setPage(1);
  };

  /* ── Data ─────────────────────────────────────────────────────────────── */

  const { data: summary } = useQuery({
    queryKey: ['payments-summary', startDate, endDate],
    queryFn: async () => {
      const res = await api.get('/payments/summary', {
        params: { startDate, endDate },
      });
      return res.data as PaymentSummary;
    },
  });

  const { data: paymentsData, isLoading } = useQuery({
    queryKey: ['payments', startDate, endDate, methodFilter, search, page, pageSize],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        startDate,
        endDate,
        page,
        perPage: pageSize,
      };
      if (methodFilter !== 'all') params.paymentMethod = methodFilter;
      if (search) params.search = search;
      const res = await api.get('/payments', { params });
      return res as unknown as PaginatedResponse<Payment>;
    },
  });

  const payments = paymentsData?.data ?? [];
  const pagination = paymentsData?.pagination;

  const total = summary?.totalAmount ?? 0;
  const byMethod = summary?.totalByMethod ?? {};
  const cash = byMethod.cash ?? 0;
  const bank = byMethod.bank ?? 0;
  const other = byMethod.other ?? 0;
  const supplementary = summary?.totalSupplementary ?? 0;

  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

  /* ── Columns ──────────────────────────────────────────────────────────── */

  const columns = useMemo<ColumnDef<Payment, unknown>[]>(
    () => [
      {
        accessorKey: 'paymentDate',
        header: 'Data',
        cell: ({ row }) => (
          <span className="tabular-nums text-slate-700">{formatDate(row.original.paymentDate)}</span>
        ),
      },
      {
        id: 'candidate',
        header: 'Kandidati',
        cell: ({ row }) => {
          const c = row.original.candidate;
          return c ? (
            <span className="font-medium text-slate-900">{c.firstName} {c.lastName}</span>
          ) : (
            <span className="text-slate-400">—</span>
          );
        },
      },
      {
        accessorKey: 'amount',
        header: 'Shuma',
        cell: ({ row }) => (
          <span className="font-semibold tabular-nums text-slate-900">
            {formatCurrency(row.original.amount)}
          </span>
        ),
      },
      {
        accessorKey: 'paymentMethod',
        header: 'Metoda',
        cell: ({ row }) => <MethodPill method={row.original.paymentMethod ?? ''} />,
      },
      {
        id: 'receivedBy',
        header: 'Pranuar nga',
        cell: ({ row }) => row.original.receivedBy?.fullName ?? <span className="text-slate-400">—</span>,
      },
      {
        id: 'type',
        header: 'Lloji',
        cell: ({ row }) =>
          row.original.isSupplementary ? (
            <Badge variant="info">Plotësuese</Badge>
          ) : (
            <Badge variant="muted">Standarde</Badge>
          ),
      },
      {
        accessorKey: 'remarks',
        header: 'Vërejtje',
        cell: ({ row }) => (
          <span className="block max-w-[200px] truncate text-sm text-slate-500">
            {row.original.remarks || '—'}
          </span>
        ),
      },
    ],
    []
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Pagesat" description="Pasqyra e të gjitha pagesave të kandidatëve">
        <ExportButton
          resource="payments"
          params={{
            startDate,
            endDate,
            ...(methodFilter !== 'all' ? { payment_method: methodFilter } : {}),
            ...(search ? { search } : {}),
          }}
        />
      </PageHeader>

      {/* Date range presets + custom range */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 lg:flex-row lg:items-center">
        <span className="hidden items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 lg:inline-flex">
          <CalendarIcon className="h-3.5 w-3.5" /> Periudha
        </span>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          {PRESETS.map((p) => (
            <FilterChip
              key={p.id}
              label={p.label}
              active={preset === p.id}
              onClick={() => applyPreset(p.id)}
            />
          ))}
          <FilterChip
            label="Periudhë…"
            active={preset === 'custom'}
            onClick={() => setPreset('custom')}
          />
        </div>
        <div
          className={cn(
            'flex items-center gap-2 transition-opacity lg:ml-auto',
            preset === 'custom' ? 'opacity-100' : 'opacity-60'
          )}
        >
          <Input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setPreset('custom');
              setPage(1);
            }}
            className="w-[150px]"
          />
          <span className="text-slate-400">→</span>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setPreset('custom');
              setPage(1);
            }}
            className="w-[150px]"
          />
        </div>
      </div>

      {/* KPI tiles */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={Banknote}
          tone="emerald"
          label="Total i Mbledhur"
          value={formatCurrency(total)}
          footer={<span className="text-xs text-slate-500">{summary?.count ?? 0} pagesa gjithsej</span>}
        />
        <KpiCard
          icon={Banknote}
          tone="amber"
          label="Para të gatshme"
          value={formatCurrency(cash)}
          footer={<MiniBar pct={pct(cash)} tone="amber" />}
        />
        <KpiCard
          icon={Building2}
          tone="blue"
          label="Bankë"
          value={formatCurrency(bank)}
          footer={<MiniBar pct={pct(bank)} tone="blue" />}
        />
        <KpiCard
          icon={PlusCircle}
          tone="violet"
          label="Plotësuese"
          value={formatCurrency(supplementary)}
          footer={
            <span className="text-xs text-slate-500">
              {total > 0 ? Math.round((supplementary / total) * 100) : 0}% e totalit
            </span>
          }
        />
      </div>

      {/* Method distribution bar — only if there's data */}
      {total > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Shpërndarja sipas metodës
            </h2>
            <span className="text-xs text-slate-500">{formatCurrency(total)} gjithsej</span>
          </div>
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
            {cash > 0 && (
              <div
                className="bg-amber-500"
                style={{ width: `${(cash / total) * 100}%` }}
                title={`Para të gatshme: ${formatCurrency(cash)}`}
              />
            )}
            {bank > 0 && (
              <div
                className="bg-blue-500"
                style={{ width: `${(bank / total) * 100}%` }}
                title={`Bankë: ${formatCurrency(bank)}`}
              />
            )}
            {other > 0 && (
              <div
                className="bg-slate-400"
                style={{ width: `${(other / total) * 100}%` }}
                title={`Tjetër: ${formatCurrency(other)}`}
              />
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[12px]">
            <LegendDot color="bg-amber-500" label={`Para të gatshme · ${formatCurrency(cash)} (${pct(cash)}%)`} />
            <LegendDot color="bg-blue-500"  label={`Bankë · ${formatCurrency(bank)} (${pct(bank)}%)`} />
            {other > 0 && <LegendDot color="bg-slate-400" label={`Tjetër · ${formatCurrency(other)} (${pct(other)}%)`} />}
          </div>
        </div>
      )}

      {/* Toolbar: method chips + search */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Kërko kandidatin…"
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          <FilterChip label="Të gjitha"         active={methodFilter === 'all'}   onClick={() => { setMethodFilter('all'); setPage(1); }} />
          <FilterChip label="Para të gatshme"   active={methodFilter === 'cash'}  onClick={() => { setMethodFilter('cash'); setPage(1); }} />
          <FilterChip label="Bankë"             active={methodFilter === 'bank'}  onClick={() => { setMethodFilter('bank'); setPage(1); }} />
          <FilterChip label="Tjetër"            active={methodFilter === 'other'} onClick={() => { setMethodFilter('other'); setPage(1); }} />
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={payments}
        isLoading={isLoading}
        pagination={
          pagination
            ? {
                page: pagination.page,
                totalPages: pagination.totalPages,
                totalItems: pagination.total,
                pageSize: pagination.perPage,
                onPageChange: setPage,
                onPageSizeChange: (size) => {
                  setPageSize(size);
                  setPage(1);
                },
              }
            : undefined
        }
      />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

function MethodPill({ method }: { method: string }) {
  const tone =
    method === 'cash'
      ? 'bg-amber-50 text-amber-700 ring-amber-200'
      : method === 'bank'
        ? 'bg-blue-50 text-blue-700 ring-blue-200'
        : 'bg-slate-100 text-slate-700 ring-slate-200';
  const Icon = method === 'bank' ? Building2 : method === 'cash' ? Banknote : Receipt;
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11.5px] font-medium ring-1 ring-inset', tone)}>
      <Icon className="h-3 w-3" />
      {METHOD_LABELS[method] ?? method ?? '—'}
    </span>
  );
}

function MiniBar({ pct, tone }: { pct: number; tone: 'amber' | 'blue' }) {
  const color = tone === 'amber' ? 'bg-amber-500' : 'bg-blue-500';
  return (
    <div className="flex items-center gap-2">
      <div className="h-1 flex-1 overflow-hidden rounded-full bg-slate-100">
        <div className={cn('h-full rounded-full', color)} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
      </div>
      <span className="text-[11px] font-semibold tabular-nums text-slate-500">{pct}%</span>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn('h-2 w-2 rounded-full', color)} />
      <span className="text-slate-700">{label}</span>
    </span>
  );
}
