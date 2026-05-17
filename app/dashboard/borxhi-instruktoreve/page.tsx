'use client';

import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import Link from 'next/link';
import {
  Wallet,
  TrendingDown,
  TrendingUp,
  CreditCard,
} from 'lucide-react';
import api from '@/lib/api';
import { formatCurrency, getDebtColor } from '@/lib/utils';
import type {
  Instructor,
  Candidate,
  InstructorDebtSummary,
  InstructorPayment,
} from '@/lib/types';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

export default function BorxhiInstruktorevePage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Payment dialog
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState<PaymentFormData>(emptyPaymentForm);

  // --- Data Fetching ---

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

  // Fetch instructors for the payment dialog
  const { data: instructorsData } = useQuery({
    queryKey: ['instructors-active'],
    queryFn: async () => {
      const res = await api.get('/instructors', { params: { active: true } });
      const data = res.data ?? res;
      return (Array.isArray(data) ? data : data.data ?? []) as Instructor[];
    },
    enabled: paymentDialogOpen,
  });

  // Fetch candidates for the selected instructor
  const { data: instructorCandidatesData } = useQuery({
    queryKey: ['instructor-candidates', paymentForm.instructorId],
    queryFn: async () => {
      const res = await api.get(
        `/instructors/${paymentForm.instructorId}/candidates`
      );
      return res.data as Candidate[];
    },
    enabled: !!paymentForm.instructorId,
  });

  const instructors = instructorsData ?? [];
  const instructorCandidates = instructorCandidatesData ?? [];

  // --- Aggregate summary ---

  const totalOwed = useMemo(
    () => debtSummaries.reduce((sum, d) => sum + d.totalAmountOwed, 0),
    [debtSummaries]
  );

  const totalPaid = useMemo(
    () => debtSummaries.reduce((sum, d) => sum + d.totalAmountPaid, 0),
    [debtSummaries]
  );

  const totalBalance = useMemo(
    () => debtSummaries.reduce((sum, d) => sum + d.outstandingBalance, 0),
    [debtSummaries]
  );

  // --- Mutations ---

  const recordPayment = useMutation({
    mutationFn: (data: {
      instructorId: string;
      payload: Record<string, unknown>;
    }) => api.post(`/instructors/${data.instructorId}/payments`, data.payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instructor-debt'] });
      closePaymentDialog();
    },
  });

  // --- Handlers ---

  const openPaymentDialog = useCallback(
    (instructorId?: string) => {
      setPaymentForm({
        ...emptyPaymentForm,
        instructorId: instructorId ?? '',
      });
      setPaymentDialogOpen(true);
    },
    []
  );

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

  // --- Table Columns ---

  const columns = useMemo<ColumnDef<InstructorDebtSummary, unknown>[]>(
    () => [
      {
        id: 'instructor',
        header: 'Instruktori',
        cell: ({ row }) => (
          <Link
            href={`/dashboard/instruktoret/${row.original.instructorId}`}
            className="font-medium text-primary hover:underline"
          >
            {row.original.instructorName}
          </Link>
        ),
      },
      {
        accessorKey: 'totalCandidates',
        header: 'Nr. Kandidatëve',
        cell: ({ row }) => row.original.totalCandidates,
      },
      {
        accessorKey: 'totalAmountOwed',
        header: 'Shuma Totale',
        cell: ({ row }) => (
          <span className="font-medium">
            {formatCurrency(row.original.totalAmountOwed)}
          </span>
        ),
      },
      {
        accessorKey: 'totalAmountPaid',
        header: 'E Paguar',
        cell: ({ row }) => formatCurrency(row.original.totalAmountPaid),
      },
      {
        accessorKey: 'outstandingBalance',
        header: 'Bilanci',
        cell: ({ row }) => {
          const balance = row.original.outstandingBalance;
          return (
            <span className={`font-semibold ${getDebtColor(balance)}`}>
              {formatCurrency(balance)}
            </span>
          );
        },
      },
      {
        id: 'status',
        header: 'Statusi',
        cell: ({ row }) => {
          const balance = row.original.outstandingBalance;
          const paid = row.original.totalAmountPaid;
          let status = 'unpaid';
          if (balance <= 0) status = 'paid';
          else if (paid > 0) status = 'partial';
          return <StatusBadge status={status} />;
        },
      },
      {
        id: 'actions',
        header: 'Veprimet',
        cell: ({ row }) => (
          <Button
            variant="outline"
            size="sm"
            onClick={() => openPaymentDialog(row.original.instructorId)}
          >
            <CreditCard className="mr-2 h-4 w-4" />
            Paguaj
          </Button>
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

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Borxhi</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(totalBalance)}
            </div>
            <p className="text-xs text-muted-foreground">
              Borxhi i pa-paguar
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total i Paguar
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalPaid)}
            </div>
            <p className="text-xs text-muted-foreground">
              Shuma e paguar deri tani
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bilanci</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalOwed)}
            </div>
            <p className="text-xs text-muted-foreground">
              Shuma totale e faturuar
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Row */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1.5">
          <Label>Statusi</Label>
          <Select
            value={statusFilter}
            onValueChange={(val) => {
              setStatusFilter(val);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Të gjithë" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Të gjithë</SelectItem>
              <SelectItem value="paid">Paguar</SelectItem>
              <SelectItem value="partial">Pjesërisht</SelectItem>
              <SelectItem value="unpaid">Papaguar</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={debtSummaries}
        isLoading={isLoading}
        searchPlaceholder="Kërko instruktorën..."
        searchValue={search}
        onSearch={(val) => {
          setSearch(val);
          setPage(1);
        }}
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
                  setPaymentForm((f) => ({
                    ...f,
                    instructorId: val,
                    candidateId: '',
                  }))
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
                onValueChange={(val) =>
                  setPaymentForm((f) => ({ ...f, candidateId: val }))
                }
                disabled={!paymentForm.instructorId}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      paymentForm.instructorId
                        ? 'Zgjedh kandidatin'
                        : 'Zgjedh instruktorin së pari'
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
                onChange={(e) =>
                  setPaymentForm((f) => ({ ...f, amount: e.target.value }))
                }
                placeholder="0.00"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Metoda e pagesës</Label>
              <Select
                value={paymentForm.paymentMethod}
                onValueChange={(val) =>
                  setPaymentForm((f) => ({ ...f, paymentMethod: val }))
                }
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
                onChange={(e) =>
                  setPaymentForm((f) => ({ ...f, remarks: e.target.value }))
                }
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
