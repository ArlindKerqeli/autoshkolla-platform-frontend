'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import api from '@/lib/api';
import type { Candidate, PaginatedResponse } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { Users } from 'lucide-react';

function getPaymentStatus(candidate: Candidate): string {
  if (candidate.amountPaid >= candidate.price) return 'paid';
  if (candidate.amountPaid > 0) return 'partial';
  return 'unpaid';
}

function PracticalProgressBar({
  realized,
  total,
}: {
  realized: number;
  total: number;
}) {
  const percentage = total > 0 ? Math.min((realized / total) * 100, 100) : 0;

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden min-w-[80px]">
        <div
          className="h-full rounded-full bg-blue-500 transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {realized}/{total}
      </span>
    </div>
  );
}

const columns: ColumnDef<Candidate, unknown>[] = [
  {
    accessorKey: 'name',
    header: 'Emri',
    cell: ({ row }) => {
      const candidate = row.original;
      return (
        <span className="font-medium text-gray-900">
          {candidate.firstName} {candidate.lastName}
        </span>
      );
    },
  },
  {
    accessorKey: 'category',
    header: 'Kategoria',
    cell: ({ row }) => {
      const candidate = row.original;
      return (
        <span className="text-sm text-gray-600">
          {candidate.category?.code ?? '-'}
        </span>
      );
    },
  },
  {
    accessorKey: 'phone',
    header: 'Telefoni',
    cell: ({ row }) => (
      <span className="text-sm text-gray-600">
        {row.original.phone || '-'}
      </span>
    ),
  },
  {
    accessorKey: 'registrationDate',
    header: 'Data e Regjistrimit',
    cell: ({ row }) => (
      <span className="text-sm text-gray-600">
        {formatDate(row.original.registrationDate)}
      </span>
    ),
  },
  {
    accessorKey: 'practicalProgress',
    header: 'Progresi i Orave Praktike',
    cell: ({ row }) => {
      const candidate = row.original;
      return (
        <PracticalProgressBar
          realized={candidate.practicalHoursRealized}
          total={candidate.practicalHours}
        />
      );
    },
  },
  {
    accessorKey: 'paymentStatus',
    header: 'Statusi i Pageses',
    cell: ({ row }) => {
      const status = getPaymentStatus(row.original);
      return <StatusBadge status={status} />;
    },
  },
];

export default function InstructorCandidatesPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const { data, isLoading } = useQuery<PaginatedResponse<Candidate>>({
    queryKey: ['instructor-candidates', search, page, pageSize],
    queryFn: () =>
      api.get('/instructor/candidates', {
        params: { search, page, per_page: pageSize },
      }),
  });

  const candidates = data?.data ?? [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kandidatet e Mi"
        description="Lista e kandidateve te caktuar per ju"
      />

      {!isLoading && candidates.length === 0 && !search ? (
        <EmptyState
          icon={Users}
          title="Nuk keni kandidate te caktuar"
          description="Aktualisht nuk keni asnje kandidat te caktuar nga administratori."
        />
      ) : (
        <DataTable
          columns={columns}
          data={candidates}
          isLoading={isLoading}
          searchPlaceholder="Kerko sipas emrit..."
          onSearch={setSearch}
          searchValue={search}
          pagination={
            pagination
              ? {
                  page: pagination.page,
                  totalPages: pagination.totalPages,
                  totalItems: pagination.total,
                  pageSize: pagination.perPage,
                  onPageChange: setPage,
                  onPageSizeChange: setPageSize,
                }
              : undefined
          }
        />
      )}
    </div>
  );
}
