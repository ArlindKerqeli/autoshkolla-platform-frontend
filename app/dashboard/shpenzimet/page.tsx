'use client';

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { format, startOfMonth, startOfWeek, startOfYear, subDays } from 'date-fns';
import {
  Calendar as CalendarIcon,
  Car,
  Pencil,
  Plus,
  Receipt,
  Search,
  Settings2,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import api from '@/lib/api';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import type {
  Expense,
  ExpenseSummary,
  ExpenseType,
  PaginatedResponse,
  Vehicle,
} from '@/lib/types';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ExportButton } from '@/components/shared/ExportButton';
import { KpiCard } from '@/components/shared/KpiCard';
import { FilterChip } from '@/components/shared/FilterChip';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

/* ────────────────────────────────────────────────────────────────────────── */

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

function unwrapList<T>(raw: unknown): T[] {
  let list: unknown = raw;
  for (let i = 0; i < 3; i += 1) {
    if (Array.isArray(list)) break;
    if (list && typeof list === 'object' && 'data' in list) {
      list = (list as { data: unknown }).data;
    } else break;
  }
  return (Array.isArray(list) ? list : []) as T[];
}

interface ExpenseFormData {
  date: string;
  expenseTypeId: string;
  vehicleId: string;
  amount: string;
  description: string;
}

const emptyExpenseForm: ExpenseFormData = {
  date: format(new Date(), 'yyyy-MM-dd'),
  expenseTypeId: '',
  vehicleId: '',
  amount: '',
  description: '',
};

/* ────────────────────────────────────────────────────────────────────────── */

export default function ShpenzimetPage() {
  const queryClient = useQueryClient();

  const initial = rangeFor('month');
  const [preset, setPreset] = useState<RangePreset>('month');
  const [startDate, setStartDate] = useState(initial.startDate);
  const [endDate, setEndDate] = useState(initial.endDate);

  const [vehicleFilter, setVehicleFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [expenseForm, setExpenseForm] = useState<ExpenseFormData>(emptyExpenseForm);
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);

  const applyPreset = (p: RangePreset) => {
    setPreset(p);
    if (p !== 'custom') {
      const r = rangeFor(p);
      setStartDate(r.startDate);
      setEndDate(r.endDate);
    }
    setPage(1);
  };

  const clearFilters = () => {
    setVehicleFilter('all');
    setTypeFilter('all');
    setSearch('');
    setPage(1);
  };

  /* ── Data ─────────────────────────────────────────────────────────────── */

  const { data: summary } = useQuery({
    queryKey: ['expenses-summary', startDate, endDate],
    queryFn: async () => {
      const res = await api.get('/expenses-summary', { params: { startDate, endDate } });
      return (res?.data ?? res) as ExpenseSummary;
    },
  });

  const { data: expensesData, isLoading } = useQuery({
    queryKey: ['expenses', startDate, endDate, vehicleFilter, typeFilter, search, page, pageSize],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        startDate,
        endDate,
        page,
        perPage: pageSize,
      };
      if (vehicleFilter !== 'all') params.vehicleId = vehicleFilter;
      if (typeFilter !== 'all') params.expenseTypeId = typeFilter;
      if (search) params.search = search;
      const res = await api.get('/expenses', { params });
      return res as unknown as PaginatedResponse<Expense>;
    },
  });

  const { data: vehiclesData } = useQuery({
    queryKey: ['vehicles'],
    queryFn: async () => unwrapList<Vehicle>(await api.get('/vehicles')),
  });

  const { data: expenseTypesData } = useQuery({
    queryKey: ['expense-types'],
    queryFn: async () => unwrapList<ExpenseType>(await api.get('/expense-types')),
  });

  const vehicles = Array.isArray(vehiclesData) ? vehiclesData : [];
  const expenseTypes = Array.isArray(expenseTypesData) ? expenseTypesData : [];
  const activeTypes = expenseTypes.filter((t) => t.isActive);
  const expenses = expensesData?.data ?? [];
  const pagination = expensesData?.pagination;

  /* ── Breakdowns ───────────────────────────────────────────────────────── */

  const topByType = useMemo(() => {
    const entries = Object.entries(summary?.byType ?? {});
    entries.sort((a, b) => b[1] - a[1]);
    return entries.slice(0, 5);
  }, [summary]);

  const topByVehicle = useMemo(() => {
    const entries = Object.entries(summary?.byVehicle ?? {});
    entries.sort((a, b) => b[1] - a[1]);
    return entries.slice(0, 5);
  }, [summary]);

  const total = summary?.totalAmount ?? 0;

  /* ── Mutations ────────────────────────────────────────────────────────── */

  const createExpense = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post('/expenses', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expenses-summary'] });
      closeExpenseDialog();
    },
  });

  const updateExpense = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.put(`/expenses/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expenses-summary'] });
      closeExpenseDialog();
    },
  });

  const deleteExpense = useMutation({
    mutationFn: (id: string) => api.delete(`/expenses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expenses-summary'] });
      setDeleteTarget(null);
    },
  });

  /* ── Handlers ─────────────────────────────────────────────────────────── */

  const openNewExpense = useCallback(() => {
    setEditingExpense(null);
    setExpenseForm(emptyExpenseForm);
    setExpenseDialogOpen(true);
  }, []);

  const openEditExpense = useCallback((expense: Expense) => {
    setEditingExpense(expense);
    setExpenseForm({
      date: expense.date,
      expenseTypeId: expense.expenseTypeId,
      vehicleId: expense.vehicleId ?? '',
      amount: String(expense.amount),
      description: expense.description ?? '',
    });
    setExpenseDialogOpen(true);
  }, []);

  const closeExpenseDialog = useCallback(() => {
    setExpenseDialogOpen(false);
    setEditingExpense(null);
    setExpenseForm(emptyExpenseForm);
  }, []);

  const handleExpenseSubmit = useCallback(() => {
    const payload: Record<string, unknown> = {
      date: expenseForm.date,
      expenseTypeId: expenseForm.expenseTypeId,
      amount: parseFloat(expenseForm.amount),
      description: expenseForm.description || undefined,
    };
    if (expenseForm.vehicleId) payload.vehicleId = expenseForm.vehicleId;
    if (editingExpense) {
      updateExpense.mutate({ id: editingExpense.id, data: payload });
    } else {
      createExpense.mutate(payload);
    }
  }, [expenseForm, editingExpense, createExpense, updateExpense]);

  const isExpenseSubmitting = createExpense.isPending || updateExpense.isPending;
  const anyFilterActive = vehicleFilter !== 'all' || typeFilter !== 'all' || !!search;

  /* ── Table ────────────────────────────────────────────────────────────── */

  const columns = useMemo<ColumnDef<Expense, unknown>[]>(
    () => [
      {
        accessorKey: 'date',
        header: 'Data',
        cell: ({ row }) => (
          <span className="tabular-nums text-slate-700">{formatDate(row.original.date)}</span>
        ),
      },
      {
        id: 'expenseType',
        header: 'Lloji',
        cell: ({ row }) =>
          row.original.expenseType?.name ? (
            <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-0.5 text-[11.5px] font-medium text-slate-700">
              <Tag className="h-3 w-3 text-slate-500" />
              {row.original.expenseType.name}
            </span>
          ) : (
            <span className="text-slate-400">—</span>
          ),
      },
      {
        id: 'vehicle',
        header: 'Automjeti',
        cell: ({ row }) => {
          const v = row.original.vehicle;
          return v ? (
            <span className="inline-flex items-center gap-1.5 text-slate-700">
              <Car className="h-3.5 w-3.5 text-slate-400" />
              <span className="truncate">
                {v.make} {v.model ?? ''} <span className="text-slate-400">·</span> {v.plateNumber}
              </span>
            </span>
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
        accessorKey: 'description',
        header: 'Përshkrimi',
        cell: ({ row }) => (
          <span className="block max-w-[260px] truncate text-sm text-slate-500">
            {row.original.description || '—'}
          </span>
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => openEditExpense(row.original)}
              aria-label="Edito"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-rose-600 hover:text-rose-700"
              onClick={() => setDeleteTarget(row.original)}
              aria-label="Fshi"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    [openEditExpense]
  );

  /* ── Render ───────────────────────────────────────────────────────────── */

  return (
    <div className="space-y-6">
      <PageHeader
        title="Shpenzimet"
        description="Menaxhimi i shpenzimeve të autoshkollës"
      >
        <ExportButton
          resource="expenses"
          params={{
            startDate,
            endDate,
            ...(vehicleFilter !== 'all' ? { vehicle_id: vehicleFilter } : {}),
            ...(typeFilter !== 'all' ? { expense_type_id: typeFilter } : {}),
          }}
        />
        <Link
          href="/dashboard/shpenzimet/llojet"
          className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          <Settings2 className="h-4 w-4" />
          Llojet
        </Link>
        <Button onClick={openNewExpense}>
          <Plus className="mr-2 h-4 w-4" />
          Shto Shpenzim
        </Button>
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
            onChange={(e) => { setStartDate(e.target.value); setPreset('custom'); setPage(1); }}
            className="w-[150px]"
          />
          <span className="text-slate-400">→</span>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => { setEndDate(e.target.value); setPreset('custom'); setPage(1); }}
            className="w-[150px]"
          />
        </div>
      </div>

      {/* KPI tiles */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={Receipt}
          tone="rose"
          label="Total Shpenzimeve"
          value={formatCurrency(total)}
          footer={<span className="text-xs text-slate-500">në periudhën e zgjedhur</span>}
        />
        <KpiCard
          icon={Receipt}
          tone="slate"
          label="Nr. Shpenzime"
          value={String(summary?.totalCount ?? 0)}
          footer={
            <span className="text-xs text-slate-500">
              {summary?.totalCount
                ? `Mesatarja ${formatCurrency(total / summary.totalCount)}/shpenzim`
                : 'Asnjë regjistrim'}
            </span>
          }
        />
        <KpiCard
          icon={Tag}
          tone="amber"
          label="Lloji më i lartë"
          value={topByType[0]?.[0] ?? '—'}
          footer={
            topByType[0] ? (
              <span className="text-xs text-slate-500">{formatCurrency(topByType[0][1])} · {Math.round((topByType[0][1] / (total || 1)) * 100)}% e totalit</span>
            ) : (
              <span className="text-xs text-slate-400">Asnjë lloj</span>
            )
          }
        />
        <KpiCard
          icon={Car}
          tone="blue"
          label="Automjeti më i shpenzuar"
          value={topByVehicle[0]?.[0] ?? '—'}
          footer={
            topByVehicle[0] ? (
              <span className="text-xs text-slate-500">{formatCurrency(topByVehicle[0][1])} · {Math.round((topByVehicle[0][1] / (total || 1)) * 100)}% e totalit</span>
            ) : (
              <span className="text-xs text-slate-400">Pa automjet</span>
            )
          }
        />
      </div>

      {/* Breakdown panels */}
      {(topByType.length > 0 || topByVehicle.length > 0) && (
        <div className="grid gap-5 lg:grid-cols-2">
          <BreakdownPanel
            title="Sipas Llojit"
            icon={Tag}
            items={topByType}
            total={total}
            tone="amber"
            isActive={(name) => {
              const t = expenseTypes.find((x) => x.name === name);
              return t ? typeFilter === t.id : false;
            }}
            onItemClick={(name) => {
              const t = expenseTypes.find((x) => x.name === name);
              if (!t) return;
              setTypeFilter(typeFilter === t.id ? 'all' : t.id);
              setPage(1);
            }}
          />
          <BreakdownPanel
            title="Sipas Automjetit"
            icon={Car}
            items={topByVehicle}
            total={total}
            tone="blue"
            isActive={(name) => {
              const v = vehicles.find((x) => labelForVehicle(x) === name);
              return v ? vehicleFilter === v.id : false;
            }}
            onItemClick={(name) => {
              const v = vehicles.find((x) => labelForVehicle(x) === name);
              if (!v) return;
              setVehicleFilter(vehicleFilter === v.id ? 'all' : v.id);
              setPage(1);
            }}
          />
        </div>
      )}

      {/* Filter toolbar */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Kërko në shpenzime…"
            className="pl-9"
          />
        </div>
        <Select
          value={vehicleFilter}
          onValueChange={(val) => { setVehicleFilter(val); setPage(1); }}
        >
          <SelectTrigger className="w-full lg:w-[200px]">
            <Car className="mr-1.5 h-3.5 w-3.5 text-slate-400" />
            <SelectValue placeholder="Të gjitha automjetet" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Të gjitha automjetet</SelectItem>
            {vehicles.map((v) => (
              <SelectItem key={v.id} value={v.id}>{labelForVehicle(v)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={typeFilter}
          onValueChange={(val) => { setTypeFilter(val); setPage(1); }}
        >
          <SelectTrigger className="w-full lg:w-[180px]">
            <Tag className="mr-1.5 h-3.5 w-3.5 text-slate-400" />
            <SelectValue placeholder="Të gjithë llojet" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Të gjithë llojet</SelectItem>
            {activeTypes.map((t) => (
              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {anyFilterActive && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-9 shrink-0 text-slate-600"
          >
            <X className="mr-1 h-3.5 w-3.5" />
            Pastro
          </Button>
        )}
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={expenses}
        isLoading={isLoading}
        pagination={
          pagination
            ? {
                page: pagination.page,
                totalPages: pagination.totalPages,
                totalItems: pagination.total,
                pageSize: pagination.perPage,
                onPageChange: setPage,
                onPageSizeChange: (size) => { setPageSize(size); setPage(1); },
              }
            : undefined
        }
      />

      {/* Add/Edit Expense Dialog */}
      <Dialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{editingExpense ? 'Edito Shpenzimin' : 'Shto Shpenzim'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="expense-date">Data</Label>
              <Input
                id="expense-date"
                type="date"
                value={expenseForm.date}
                onChange={(e) => setExpenseForm((f) => ({ ...f, date: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Lloji i shpenzimit</Label>
              <Select
                value={expenseForm.expenseTypeId || ''}
                onValueChange={(val) => setExpenseForm((f) => ({ ...f, expenseTypeId: val }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Zgjedh llojin" />
                </SelectTrigger>
                <SelectContent>
                  {activeTypes.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {activeTypes.length === 0 && (
                <p className="text-[11px] text-amber-600">
                  Nuk keni lloje aktive të shpenzimeve.{' '}
                  <Link href="/dashboard/shpenzimet/llojet" className="font-medium underline">
                    Krijoni një tani →
                  </Link>
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Automjeti (opsionale)</Label>
              <Select
                value={expenseForm.vehicleId || 'none'}
                onValueChange={(val) =>
                  setExpenseForm((f) => ({ ...f, vehicleId: val === 'none' ? '' : val }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Zgjedh automjetin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Asnjë</SelectItem>
                  {vehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>{labelForVehicle(v)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="expense-amount">Shuma (&euro;)</Label>
              <Input
                id="expense-amount"
                type="number"
                min="0"
                step="0.01"
                value={expenseForm.amount}
                onChange={(e) => setExpenseForm((f) => ({ ...f, amount: e.target.value }))}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="expense-desc">Përshkrimi</Label>
              <Textarea
                id="expense-desc"
                value={expenseForm.description}
                onChange={(e) => setExpenseForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Përshkrimi i shpenzimit…"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeExpenseDialog}>Anulo</Button>
            <Button
              onClick={handleExpenseSubmit}
              disabled={
                isExpenseSubmitting ||
                !expenseForm.date ||
                !expenseForm.expenseTypeId ||
                !expenseForm.amount
              }
            >
              {isExpenseSubmitting ? 'Duke ruajtur…' : 'Ruaj'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Fshi Shpenzimin"
        description="A jeni të sigurt që doni ta fshini këtë shpenzim? Ky veprim nuk mund të kthehet."
        confirmText="Fshi"
        cancelText="Anulo"
        variant="destructive"
        onConfirm={() => deleteTarget && deleteExpense.mutate(deleteTarget.id)}
      />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

function labelForVehicle(v: Vehicle) {
  return `${v.make}${v.model ? ' ' + v.model : ''} (${v.plateNumber})`;
}

function BreakdownPanel({
  title,
  icon: Icon,
  items,
  total,
  tone,
  isActive,
  onItemClick,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: [string, number][];
  total: number;
  tone: 'amber' | 'blue';
  isActive: (name: string) => boolean;
  onItemClick: (name: string) => void;
}) {
  const barColor = tone === 'amber' ? 'bg-amber-500' : 'bg-blue-500';

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
        <h2 className="inline-flex items-center gap-2 text-[13px] font-semibold tracking-tight text-slate-900">
          <Icon className="h-4 w-4 text-slate-400" />
          {title}
        </h2>
        <span className="text-[11px] uppercase tracking-wider text-slate-400">Top {items.length}</span>
      </div>
      <div className="p-4">
        {items.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">Nuk ka të dhëna</p>
        ) : (
          <ul className="space-y-2.5">
            {items.map(([name, amount]) => {
              const pct = total > 0 ? (amount / total) * 100 : 0;
              const active = isActive(name);
              return (
                <li key={name}>
                  <button
                    type="button"
                    onClick={() => onItemClick(name)}
                    className={cn(
                      'group flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left transition',
                      active ? 'bg-slate-100' : 'hover:bg-slate-50'
                    )}
                  >
                    <span
                      className={cn(
                        'min-w-0 flex-1 truncate text-[13px] font-medium',
                        active ? 'text-slate-900' : 'text-slate-700'
                      )}
                    >
                      {name}
                    </span>
                    <span className="tabular-nums text-[13px] font-semibold text-slate-900">
                      {formatCurrency(amount)}
                    </span>
                    <span className="w-10 shrink-0 text-right text-[10.5px] font-medium tabular-nums text-slate-400">
                      {Math.round(pct)}%
                    </span>
                  </button>
                  <div className="ml-2 mr-12 mt-0.5 h-1 overflow-hidden rounded-full bg-slate-100">
                    <div className={cn('h-full rounded-full', barColor)} style={{ width: `${Math.max(2, pct)}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Card>
  );
}
