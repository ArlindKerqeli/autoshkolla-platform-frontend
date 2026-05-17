'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { Banknote, CreditCard, Building2, PlusCircle } from 'lucide-react';
import api from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/utils';
import type {
  Payment,
  PaymentSummary,
  PaginatedResponse,
} from '@/lib/types';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ExportButton } from '@/components/shared/ExportButton';

function getDefaultDateRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    startDate: format(start, 'yyyy-MM-dd'),
    endDate: format(now, 'yyyy-MM-dd'),
  };
}

export default function PagesatPage() {
  const defaults = getDefaultDateRange();
  const [startDate, setStartDate] = useState(defaults.startDate);
  const [endDate, setEndDate] = useState(defaults.endDate);
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Fetch payment summary
  const { data: summary } = useQuery({
    queryKey: ['payments-summary', startDate, endDate],
    queryFn: async () => {
      const res = await api.get('/payments/summary', {
        params: { startDate, endDate },
      });
      return res.data as PaymentSummary;
    },
  });

  // Fetch payments list
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

  const columns = useMemo<ColumnDef<Payment, unknown>[]>(
    () => [
      {
        accessorKey: 'paymentDate',
        header: 'Data',
        cell: ({ row }) => formatDate(row.original.paymentDate),
      },
      {
        id: 'candidate',
        header: 'Kandidati',
        cell: ({ row }) => {
          const c = row.original.candidate;
          return c ? `${c.firstName} ${c.lastName}` : '-';
        },
      },
      {
        accessorKey: 'amount',
        header: 'Shuma',
        cell: ({ row }) => (
          <span className="font-medium">{formatCurrency(row.original.amount)}</span>
        ),
      },
      {
        accessorKey: 'paymentMethod',
        header: 'Metoda',
        cell: ({ row }) => {
          const method = row.original.paymentMethod;
          const labels: Record<string, string> = {
            cash: 'Para të gatshme',
            bank: 'Bankë',
            other: 'Tjetër',
          };
          return labels[method ?? ''] ?? method ?? '-';
        },
      },
      {
        id: 'receivedBy',
        header: 'Pranuar nga',
        cell: ({ row }) => row.original.receivedBy?.fullName ?? '-',
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
          <span className="max-w-[200px] truncate block text-sm text-muted-foreground">
            {row.original.remarks || '-'}
          </span>
        ),
      },
    ],
    []
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pagesat"
        description="Pasqyra e të gjitha pagesave të kandidatëve"
      >
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

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total i Mbledhur
            </CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(summary?.totalAmount ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {summary?.count ?? 0} pagesa gjithsej
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Dorëzuar me Para
            </CardTitle>
            <Banknote className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(summary?.totalByMethod?.cash ?? 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Dorëzuar me Bankë
            </CardTitle>
            <Building2 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(summary?.totalByMethod?.bank ?? 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Plotësuese
            </CardTitle>
            <PlusCircle className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(summary?.totalSupplementary ?? 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="startDate">Nga data</Label>
          <Input
            id="startDate"
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setPage(1);
            }}
            className="w-[160px]"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="endDate">Deri më</Label>
          <Input
            id="endDate"
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setPage(1);
            }}
            className="w-[160px]"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Metoda</Label>
          <Select
            value={methodFilter}
            onValueChange={(val) => {
              setMethodFilter(val);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Të gjitha" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Të gjitha</SelectItem>
              <SelectItem value="cash">Para të gatshme</SelectItem>
              <SelectItem value="bank">Bankë</SelectItem>
              <SelectItem value="other">Tjetër</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={payments}
        isLoading={isLoading}
        searchPlaceholder="Kërko kandidatën..."
        searchValue={search}
        onSearch={(val) => {
          setSearch(val);
          setPage(1);
        }}
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
