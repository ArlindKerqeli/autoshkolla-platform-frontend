'use client';

import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import Link from 'next/link';
import {
  Wallet,
  CreditCard,
  Banknote,
  AlertTriangle,
  Users,
  ArrowRight,
  Search,
} from 'lucide-react';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import type {
  Instructor,
  Candidate,
  InstructorDebtSummary,
} from '@/lib/types';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ExportButton } from '@/components/shared/ExportButton';

interface PaymentFormData {
  instructorId: string;
  candidateId: string;
  amount: string;
  paymentMethod: string;
  remarks: string;
}

const emptyPaymentForm: PaymentFormData = {
  instructorId: '',
  candidateId: '',
  amount: '',
  paymentMethod: 'cash',
  remarks: '',
};

type StatusFilter = 'all' | 'paid' | 'partial' | 'unpaid';

function statusOf(d: InstructorDebtSummary): Exclude<StatusFilter, 'all'> {
  if (d.outstandingBalance <= 0) return 'paid';
  if (d.totalAmountPaid > 0) return 'partial';
  return 'unpaid';
}

export default function BorxhiInstruktorevePage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState<PaymentFormData>(emptyPaymentForm);

  /* ── Data ─────────────────────────────────────────────────────────────── */

  const { data: debtData, isLoading } = useQuery({
    queryKey: ['instructor-debt', statusFilter, search, page, pageSize],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, perPage: pageSize };
      if (statusFilter !== 'all') params.status = statusFilter;
      if (search) params.search = search;
      const res = await api.get('/instructors/debt-summaries', { params });
      return (res.data ?? res) as InstructorDebtSummary[];
    },
  });
  const debtSummaries = debtData ?? [];

  const { data: instructorsData } = useQuery({
    queryKey: ['instructors-active'],
    queryFn: async () => {
      const res = await api.get('/instructors', { params: { active: true } });
      const data = res.data ?? res;
      return (Array.isArray(data) ? data : data.data ?? []) as Instructor[];
    },
    enabled: paymentDialogOpen,
  });

  const { data: instructorCandidatesData } = useQuery({
    queryKey: ['instructor-candidates', paymentForm.instructorId],
    queryFn: async () => {
      const res = await api.get(`/instructors/${paymentForm.instructorId}/candidates`);
      return res.data as Candidate[];
    },
    enabled: !!paymentForm.instructorId,
  });

  const instructors = instructorsData ?? [];
  const instructorCandidates = instructorCandidatesData ?? [];

  /* ── Aggregates ───────────────────────────────────────────────────────── */

  const aggregates = useMemo(() => {
    let owed = 0;
    let paid = 0;
    let balance = 0;
    let withDebtCount = 0;
    debtSummaries.forEach((d) => {
      owed += d.totalAmountOwed;
      paid += d.totalAmountPaid;
      balance += d.outstandingBalance;
      if (d.outstandingBalance > 0) withDebtCount += 1;
    });
    return { owed, paid, balance, withDebtCount, total: debtSummaries.length };
  }, [debtSummaries]);

  const statusCounts = useMemo(() => {
    const c = { all: debtSummaries.length, paid: 0, partial: 0, unpaid: 0 };
    debtSummaries.forEach((d) => {
      c[statusOf(d)] += 1;
    });
    return c;
  }, [debtSummaries]);

  const topDebtors = useMemo(() => {
    return [...debtSummaries]
      .filter((d) => d.outstandingBalance > 0)
      .sort((a, b) => b.outstandingBalance - a.outstandingBalance)
      .slice(0, 3);
  }, [debtSummaries]);

  /* ── Mutations ────────────────────────────────────────────────────────── */

  const recordPayment = useMutation({
    mutationFn: (data: { instructorId: string; payload: Record<string, unknown> }) =>
      api.post(`/instructors/${data.instructorId}/payments`, data.payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instructor-debt'] });
      closePaymentDialog();
    },
  });

  const openPaymentDialog = useCallback((instructorId?: string) => {
    setPaymentForm({ ...emptyPaymentForm, instructorId: instructorId ?? '' });
    setPaymentDialogOpen(true);
  }, []);

  const closePaymentDialog = useCallback(() => {
    setPaymentDialogOpen(false);
    setPaymentForm(emptyPaymentForm);
  }, []);

  const handlePaymentSubmit = useCallback(() => {
    recordPayment.mutate({
      instructorId: paymentForm.instructorId,
      payload: {
        candidateId: paymentForm.candidateId,
        amount: parseFloat(paymentForm.amount),
        paymentMethod: paymentForm.paymentMethod,
        remarks: paymentForm.remarks || undefined,
      },
    });
  }, [paymentForm, recordPayment]);

  /* ── Table columns ────────────────────────────────────────────────────── */

  const columns = useMemo<ColumnDef<InstructorDebtSummary, unknown>[]>(
    () => [
      {
        id: 'instructor',
        header: 'Instruktori',
        cell: ({ row }) => (
          <Link
            href={`/dashboard/instruktoret/${row.original.instructorId}`}
            className="font-medium text-slate-900 hover:text-primary-600 hover:underline"
          >
            {row.original.instructorName}
          </Link>
        ),
      },
      {
        accessorKey: 'totalCandidates',
        header: 'Kandidatë',
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-1.5 text-slate-700">
            <Users className="h-3.5 w-3.5 text-slate-400" />
            <span className="tabular-nums">{row.original.totalCandidates}</span>
          </span>
        ),
      },
      {
        accessorKey: 'totalAmountOwed',
        header: 'Faturuar',
        cell: ({ row }) => (
          <span className="tabular-nums font-medium text-slate-700">
            {formatCurrency(row.original.totalAmountOwed)}
          </span>
        ),
      },
      {
        accessorKey: 'totalAmountPaid',
        header: 'E Paguar',
        cell: ({ row }) => (
          <span className="tabular-nums text-emerald-700">{formatCurrency(row.original.totalAmountPaid)}</span>
        ),
      },
      {
        id: 'progress',
        header: 'Progresi',
        cell: ({ row }) => {
          const pct =
            row.original.totalAmountOwed > 0
              ? (row.original.totalAmountPaid / row.original.totalAmountOwed) * 100
              : 100;
          const pctClamped = Math.min(100, Math.max(0, pct));
          return (
            <div className="flex items-center gap-2">
              <div className="relative h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`absolute inset-y-0 left-0 rounded-full ${
                    pctClamped >= 100 ? 'bg-emerald-500' : pctClamped > 0 ? 'bg-amber-500' : 'bg-rose-500'
                  }`}
                  style={{ width: `${pctClamped}%` }}
                />
              </div>
              <span className="text-[11px] font-semibold tabular-nums text-slate-500">
                {Math.round(pctClamped)}%
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: 'outstandingBalance',
        header: 'Bilanci',
        cell: ({ row }) => {
          const b = row.original.outstandingBalance;
          const cls = b > 0 ? 'text-rose-700' : 'text-emerald-700';
          return <span className={`tabular-nums font-bold ${cls}`}>{formatCurrency(b)}</span>;
        },
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) =>
          row.original.outstandingBalance > 0 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => openPaymentDialog(row.original.instructorId)}
              className="h-8"
            >
              <CreditCard className="mr-1.5 h-3.5 w-3.5" />
              Paguaj
            </Button>
          ) : (
            <span className="text-[11px] font-medium uppercase tracking-wider text-emerald-700">Paguar</span>
          ),
      },
    ],
    [openPaymentDialog]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Borxhi i Instruktorëve"
        description="Pasqyra e borxhit të instruktorëve ndaj autoshkollës"
      >
        <ExportButton
          resource="instructor-debt"
          params={{
            ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
            ...(search ? { search } : {}),
          }}
        />
        <Button onClick={() => openPaymentDialog()}>
          <CreditCard className="mr-2 h-4 w-4" />
          Regjistro Pagesë
        </Button>
      </PageHeader>

      {/* KPI tiles */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={Banknote}
          tone="slate"
          label="Total i Faturuar"
          value={formatCurrency(aggregates.owed)}
          footer={<span className="text-xs text-slate-500">Shuma totale e ngarkuar</span>}
        />
        <KpiCard
          icon={CreditCard}
          tone="emerald"
          label="E Paguar"
          value={formatCurrency(aggregates.paid)}
          footer={
            <span className="text-xs text-slate-500">
              {aggregates.owed > 0 ? Math.round((aggregates.paid / aggregates.owed) * 100) : 100}% e totalit
            </span>
          }
        />
        <KpiCard
          icon={Wallet}
          tone={aggregates.balance > 0 ? 'rose' : 'emerald'}
          label="Borxhi Aktiv"
          value={formatCurrency(aggregates.balance)}
          footer={<span className="text-xs text-slate-500">Pa paguar deri tani</span>}
        />
        <KpiCard
          icon={AlertTriangle}
          tone={aggregates.withDebtCount > 0 ? 'amber' : 'slate'}
          label="Me Borxh"
          value={String(aggregates.withDebtCount)}
          footer={
            <span className="text-xs text-slate-500">
              prej {aggregates.total} {aggregates.total === 1 ? 'instruktor' : 'instruktorëve'}
            </span>
          }
        />
      </div>

      {/* Top debtors callout */}
      {!isLoading && topDebtors.length > 0 && (
        <section>
          <div className="mb-2 flex items-center gap-2 px-1">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
              Borxhi më i lartë
            </h2>
            <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-50 px-1.5 text-[11px] font-semibold text-rose-700">
              Top {topDebtors.length}
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {topDebtors.map((d, i) => (
              <TopDebtorCard
                key={d.instructorId}
                rank={i + 1}
                debt={d}
                onPay={() => openPaymentDialog(d.instructorId)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Toolbar: search + status filter chips */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Kërko instruktorin…"
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          <FilterChip label="Të gjithë"     active={statusFilter === 'all'}     count={statusCounts.all}     onClick={() => { setStatusFilter('all'); setPage(1); }} />
          <FilterChip label="Papaguar"      active={statusFilter === 'unpaid'}  count={statusCounts.unpaid}  onClick={() => { setStatusFilter('unpaid'); setPage(1); }} />
          <FilterChip label="Pjesërisht"    active={statusFilter === 'partial'} count={statusCounts.partial} onClick={() => { setStatusFilter('partial'); setPage(1); }} />
          <FilterChip label="Paguar"        active={statusFilter === 'paid'}    count={statusCounts.paid}    onClick={() => { setStatusFilter('paid'); setPage(1); }} />
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={debtSummaries}
        isLoading={isLoading}
      />

      {/* Record Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Regjistro Pagesë</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label>Instruktori</Label>
              <Select
                value={paymentForm.instructorId || ''}
                onValueChange={(val) =>
                  setPaymentForm((f) => ({ ...f, instructorId: val, candidateId: '' }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Zgjedh instruktorin" />
                </SelectTrigger>
                <SelectContent>
                  {instructors.map((inst) => (
                    <SelectItem key={inst.id} value={inst.id}>
                      {inst.firstName} {inst.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Kandidati</Label>
              <Select
                value={paymentForm.candidateId || ''}
                onValueChange={(val) => setPaymentForm((f) => ({ ...f, candidateId: val }))}
                disabled={!paymentForm.instructorId}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      paymentForm.instructorId ? 'Zgjedh kandidatin' : 'Zgjedh instruktorin së pari'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {instructorCandidates.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.firstName} {c.lastName} ({c.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="payment-amount">Shuma (&euro;)</Label>
              <Input
                id="payment-amount"
                type="number"
                min="0"
                step="0.01"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm((f) => ({ ...f, amount: e.target.value }))}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Metoda e pagesës</Label>
              <Select
                value={paymentForm.paymentMethod}
                onValueChange={(val) => setPaymentForm((f) => ({ ...f, paymentMethod: val }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Para të gatshme</SelectItem>
                  <SelectItem value="bank">Bankë</SelectItem>
                  <SelectItem value="other">Tjetër</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="payment-remarks">Vërejtje</Label>
              <Textarea
                id="payment-remarks"
                value={paymentForm.remarks}
                onChange={(e) => setPaymentForm((f) => ({ ...f, remarks: e.target.value }))}
                placeholder="Shënime shtesë..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closePaymentDialog}>
              Anulo
            </Button>
            <Button
              onClick={handlePaymentSubmit}
              disabled={
                recordPayment.isPending ||
                !paymentForm.instructorId ||
                !paymentForm.candidateId ||
                !paymentForm.amount
              }
            >
              {recordPayment.isPending ? 'Duke ruajtur...' : 'Regjistro'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

function TopDebtorCard({
  rank,
  debt,
  onPay,
}: {
  rank: number;
  debt: InstructorDebtSummary;
  onPay: () => void;
}) {
  const pct =
    debt.totalAmountOwed > 0 ? (debt.totalAmountPaid / debt.totalAmountOwed) * 100 : 100;

  return (
    <Card className="relative flex flex-col gap-3 overflow-hidden p-4 transition hover:border-slate-300 hover:shadow-md">
      <span className="absolute right-3 top-3 inline-flex h-5 min-w-[22px] items-center justify-center rounded-full bg-rose-50 px-1.5 text-[10px] font-bold text-rose-700 ring-1 ring-inset ring-rose-200">
        #{rank}
      </span>
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-rose-50 text-rose-600 ring-1 ring-inset ring-rose-200">
          <Wallet className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <Link
            href={`/dashboard/instruktoret/${debt.instructorId}`}
            className="block truncate text-sm font-semibold text-slate-900 hover:text-primary-600"
          >
            {debt.instructorName}
          </Link>
          <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-slate-500">
            <Users className="h-3 w-3" />
            {debt.totalCandidates} kandidatë
          </p>
        </div>
      </div>
      <div>
        <div className="flex items-baseline justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Bilanci</span>
          <span className="text-lg font-bold tabular-nums text-rose-700">
            {formatCurrency(debt.outstandingBalance)}
          </span>
        </div>
        <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-amber-500"
            style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
          />
        </div>
        <p className="mt-1 text-[10.5px] text-slate-500">
          {formatCurrency(debt.totalAmountPaid)} të paguara nga {formatCurrency(debt.totalAmountOwed)}
        </p>
      </div>
      <Button onClick={onPay} variant="outline" size="sm" className="mt-1 w-full">
        <CreditCard className="mr-1.5 h-3.5 w-3.5" />
        Regjistro pagesë
        <ArrowRight className="ml-auto h-3.5 w-3.5" />
      </Button>
    </Card>
  );
}
