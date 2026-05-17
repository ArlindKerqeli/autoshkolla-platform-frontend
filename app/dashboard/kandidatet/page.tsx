'use client';

import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { DataTable } from '@/components/shared/DataTable';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import Link from 'next/link';
import { Plus, Eye, Edit, Archive, MoreHorizontal, Trash2, X, CheckSquare } from 'lucide-react';
import { formatCurrency, getDebtColor } from '@/lib/utils';
import { ExportButton } from '@/components/shared/ExportButton';
import { toast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import type { Candidate, Category, Instructor, PaginatedResponse } from '@/lib/types';

export default function CandidatesPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<string>('all');
  const [instructorId, setInstructorId] = useState<string>('all');
  const [archived, setArchived] = useState<string>('false');

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Confirmation dialog state
  const [deleteTarget, setDeleteTarget] = useState<Candidate | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<{ candidate: Candidate; isArchived: boolean } | null>(null);
  const [bulkConfirm, setBulkConfirm] = useState<'archive' | 'unarchive' | null>(null);

  // Fetch candidates
  const { data: candidatesRes, isLoading } = useQuery<PaginatedResponse<Candidate>>({
    queryKey: ['candidates', page, pageSize, search, categoryId, instructorId, archived],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(pageSize),
        archived,
      });
      if (search) params.set('search', search);
      if (categoryId && categoryId !== 'all') params.set('category_id', categoryId);
      if (instructorId && instructorId !== 'all') params.set('instructor_id', instructorId);
      const res = await api.get(`/candidates?${params.toString()}`);
      return res as unknown as PaginatedResponse<Candidate>;
    },
  });

  // Fetch categories for filter
  const { data: categoriesRes } = useQuery<Category[]>({
    queryKey: ['categories-list'],
    queryFn: async () => {
      const res = await api.get('/categories');
      return res.data;
    },
  });

  // Fetch instructors for filter
  const { data: instructorsRes } = useQuery<Instructor[]>({
    queryKey: ['instructors-list'],
    queryFn: async () => {
      const res = await api.get('/instructors');
      return res.data;
    },
  });

  const candidates = candidatesRes?.data ?? [];
  const pagination = candidatesRes?.pagination;
  const categories = categoriesRes ?? [];
  const instructors = instructorsRes ?? [];

  // Selection helpers
  const allPageIds = useMemo(() => candidates.map((c) => c.id), [candidates]);
  const allPageSelected = allPageIds.length > 0 && allPageIds.every((id) => selectedIds.has(id));
  const somePageSelected = allPageIds.some((id) => selectedIds.has(id));

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        // Deselect all on this page
        allPageIds.forEach((id) => next.delete(id));
      } else {
        // Select all on this page
        allPageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }, [allPageIds, allPageSelected]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // Mutations
  const archiveCandidate = useMutation({
    mutationFn: async ({ id, isArchived }: { id: string; isArchived: boolean }) => {
      if (isArchived) {
        await api.put(`/candidates/${id}`, { isArchived: false });
      } else {
        await api.post(`/candidates/${id}/archive`);
      }
    },
    onSuccess: (_, { isArchived }) => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      toast({
        title: isArchived ? 'Kandidati u aktivizua' : 'Kandidati u arkivua',
        description: isArchived ? 'Kandidati u aktivizua me sukses.' : 'Kandidati u arkivua me sukses.',
      });
    },
    onError: () => {
      toast({
        title: 'Gabim',
        description: 'Ka ndodhur nje gabim. Ju lutem provoni perseri.',
        variant: 'destructive',
      });
    },
  });

  const bulkArchive = useMutation({
    mutationFn: async (candidateIds: string[]) => {
      const res = await api.post('/candidates/bulk-archive', { candidateIds });
      return res;
    },
    onSuccess: (res: { data: { count: number } }) => {
      const count = res?.data?.count ?? selectedIds.size;
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      clearSelection();
      toast({
        title: 'U arkivuan me sukses',
        description: `${count} kandidate u arkivuan me sukses.`,
      });
    },
    onError: () => {
      toast({
        title: 'Gabim',
        description: 'Ka ndodhur nje gabim gjate arkivimit. Ju lutem provoni perseri.',
        variant: 'destructive',
      });
    },
  });

  const bulkUnarchive = useMutation({
    mutationFn: async (candidateIds: string[]) => {
      const res = await api.post('/candidates/bulk-unarchive', { candidateIds });
      return res;
    },
    onSuccess: (res: { data: { count: number } }) => {
      const count = res?.data?.count ?? selectedIds.size;
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      clearSelection();
      toast({
        title: 'U aktivizuan me sukses',
        description: `${count} kandidate u aktivizuan me sukses.`,
      });
    },
    onError: () => {
      toast({
        title: 'Gabim',
        description: 'Ka ndodhur nje gabim gjate aktivizimit. Ju lutem provoni perseri.',
        variant: 'destructive',
      });
    },
  });

  const deleteCandidate = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/candidates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      toast({
        title: 'Kandidati u fshi',
        description: 'Kandidati u fshi me sukses.',
      });
    },
    onError: () => {
      toast({
        title: 'Gabim',
        description: 'Ka ndodhur nje gabim gjate fshirjes. Ju lutem provoni perseri.',
        variant: 'destructive',
      });
    },
  });

  const columns: ColumnDef<Candidate, unknown>[] = useMemo(
    () => [
      {
        id: 'select',
        header: () => (
          <Checkbox
            checked={allPageSelected}
            onCheckedChange={toggleSelectAll}
            aria-label="Zgjedh te gjithe"
            className={somePageSelected && !allPageSelected ? 'data-[state=unchecked]:bg-primary/20' : ''}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={selectedIds.has(row.original.id)}
            onCheckedChange={() => toggleSelect(row.original.id)}
            aria-label={`Zgjedh ${row.original.firstName} ${row.original.lastName}`}
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: 'protocolNumber',
        header: 'Nr. Regjistrit',
        cell: ({ row }) => (
          <Link
            href={`/dashboard/kandidatet/${row.original.id}`}
            className="font-medium text-blue-600 hover:underline"
          >
            {row.original.protocolNumber || '-'}
          </Link>
        ),
      },
      {
        id: 'emri',
        header: 'Emri',
        cell: ({ row }) => (
          <Link
            href={`/dashboard/kandidatet/${row.original.id}`}
            className="font-medium text-blue-600 hover:underline"
          >
            {row.original.firstName} {row.original.lastName}
          </Link>
        ),
      },
      {
        accessorKey: 'personalNumber',
        header: 'Nr. Personal',
      },
      {
        id: 'kategoria',
        header: 'Kategoria',
        cell: ({ row }) => {
          const code = row.original.categoryCode ?? row.original.category?.code;
          return code ? (
            <span className="inline-flex items-center rounded bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
              {code}
            </span>
          ) : (
            <span className="text-muted-foreground">-</span>
          );
        },
      },
      {
        id: 'instruktori',
        header: 'Instruktori',
        cell: ({ row }) => {
          const name = row.original.instructorName
            ?? (row.original.instructor
              ? `${row.original.instructor.firstName} ${row.original.instructor.lastName}`
              : null);
          return name || <span className="text-muted-foreground">-</span>;
        },
      },
      {
        accessorKey: 'price',
        header: 'Cmimi',
        cell: ({ row }) => formatCurrency(row.original.price),
      },
      {
        accessorKey: 'amountPaid',
        header: 'Paguar',
        cell: ({ row }) => formatCurrency(row.original.amountPaid),
      },
      {
        id: 'borxhi',
        header: 'Borxhi',
        cell: ({ row }) => {
          const debt = row.original.price - row.original.amountPaid;
          return (
            <span className={`font-medium ${getDebtColor(debt)}`}>
              {formatCurrency(debt)}
            </span>
          );
        },
      },
      {
        id: 'statusi',
        header: 'Statusi',
        cell: ({ row }) => (
          <StatusBadge status={row.original.isArchived ? 'archived' : 'active'} />
        ),
      },
      {
        id: 'veprimet',
        header: 'Veprimet',
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/dashboard/kandidatet/${row.original.id}`}>
                  <Eye className="mr-2 h-4 w-4" />
                  Shiko
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/dashboard/kandidatet/${row.original.id}?tab=personal`}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edito
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setArchiveTarget({ candidate: row.original, isArchived: row.original.isArchived })}
              >
                <Archive className="mr-2 h-4 w-4" />
                {row.original.isArchived ? 'Aktivizo' : 'Arkivo'}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-red-600"
                onClick={() => setDeleteTarget(row.original)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Fshi
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [selectedIds, allPageSelected, somePageSelected, toggleSelect, toggleSelectAll]
  );

  const isViewingArchived = archived === 'true';
  const isViewingActive = archived === 'false';

  return (
    <div className="space-y-5">
      <PageHeader title="Kandidatet" description="Menaxhimi i kandidateve te autoshkolles">
        <ExportButton
          resource="candidates"
          params={{
            search,
            archived: String(archived),
            ...(categoryId !== 'all' ? { category_id: categoryId } : {}),
            ...(instructorId !== 'all' ? { instructor_id: instructorId } : {}),
          }}
        />
        <Button asChild size="sm">
          <Link href="/dashboard/kandidatet/regjistro">
            <Plus className="mr-2 h-4 w-4" />
            Regjistro Kandidat
          </Link>
        </Button>
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={categoryId} onValueChange={(val) => { setCategoryId(val); setPage(1); }}>
          <SelectTrigger className="h-9 w-[180px] border-slate-200 text-sm">
            <SelectValue placeholder="Kategoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Te gjitha kategorite</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.code} - {cat.description ?? cat.code}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={instructorId} onValueChange={(val) => { setInstructorId(val); setPage(1); }}>
          <SelectTrigger className="h-9 w-[200px] border-slate-200 text-sm">
            <SelectValue placeholder="Instruktori" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Te gjithe instruktoret</SelectItem>
            {instructors.map((inst) => (
              <SelectItem key={inst.id} value={inst.id}>
                {inst.firstName} {inst.lastName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={archived} onValueChange={(val) => { setArchived(val); setPage(1); clearSelection(); }}>
          <SelectTrigger className="h-9 w-[140px] border-slate-200 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="false">Aktiv</SelectItem>
            <SelectItem value="true">Arkivuar</SelectItem>
            <SelectItem value="all">Te gjithe</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={candidates}
        isLoading={isLoading}
        searchPlaceholder="Kerko (emri, nr. regjistrit, nr. personal, telefoni)..."
        onSearch={(val) => { setSearch(val); setPage(1); }}
        searchValue={search}
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

      {/* Floating bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-5 py-3 shadow-lg">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <CheckSquare className="h-4 w-4 text-blue-600" />
              <span>{selectedIds.size} kandidate te zgjedhur</span>
            </div>
            <div className="h-5 w-px bg-slate-200" />
            {isViewingActive && (
              <Button
                size="sm"
                variant="outline"
                className="border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:text-amber-800"
                onClick={() => setBulkConfirm('archive')}
                disabled={bulkArchive.isPending}
              >
                <Archive className="mr-2 h-4 w-4" />
                Arkivo
              </Button>
            )}
            {isViewingArchived && (
              <Button
                size="sm"
                variant="outline"
                className="border-green-200 bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800"
                onClick={() => setBulkConfirm('unarchive')}
                disabled={bulkUnarchive.isPending}
              >
                <Archive className="mr-2 h-4 w-4" />
                Aktivizo
              </Button>
            )}
            {/* When viewing "all", show both buttons */}
            {archived === 'all' && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:text-amber-800"
                  onClick={() => setBulkConfirm('archive')}
                  disabled={bulkArchive.isPending}
                >
                  <Archive className="mr-2 h-4 w-4" />
                  Arkivo
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-green-200 bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800"
                  onClick={() => setBulkConfirm('unarchive')}
                  disabled={bulkUnarchive.isPending}
                >
                  <Archive className="mr-2 h-4 w-4" />
                  Aktivizo
                </Button>
              </>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="text-slate-500 hover:text-slate-700"
              onClick={clearSelection}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Fshi Kandidatin</AlertDialogTitle>
            <AlertDialogDescription>
              A jeni te sigurte qe deshironi te fshini kandidatin{' '}
              <span className="font-medium text-foreground">
                {deleteTarget?.firstName} {deleteTarget?.lastName}
              </span>
              ? Ky veprim nuk mund te kthehet mbrapsht.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anulo</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (deleteTarget) {
                  deleteCandidate.mutate(deleteTarget.id);
                  setDeleteTarget(null);
                }
              }}
            >
              Fshi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Archive/Activate confirmation dialog (single candidate) */}
      <AlertDialog open={!!archiveTarget} onOpenChange={(open) => { if (!open) setArchiveTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {archiveTarget?.isArchived ? 'Aktivizo Kandidatin' : 'Arkivo Kandidatin'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              A jeni te sigurte qe deshironi te{' '}
              {archiveTarget?.isArchived ? 'aktivizoni' : 'arkivoni'} kandidatin{' '}
              <span className="font-medium text-foreground">
                {archiveTarget?.candidate.firstName} {archiveTarget?.candidate.lastName}
              </span>
              ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anulo</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (archiveTarget) {
                  archiveCandidate.mutate({
                    id: archiveTarget.candidate.id,
                    isArchived: archiveTarget.isArchived,
                  });
                  setArchiveTarget(null);
                }
              }}
            >
              {archiveTarget?.isArchived ? 'Aktivizo' : 'Arkivo'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk archive/unarchive confirmation dialog */}
      <AlertDialog open={!!bulkConfirm} onOpenChange={(open) => { if (!open) setBulkConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {bulkConfirm === 'archive' ? 'Arkivo Kandidatet' : 'Aktivizo Kandidatet'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              A jeni te sigurte qe deshironi te{' '}
              {bulkConfirm === 'archive' ? 'arkivoni' : 'aktivizoni'}{' '}
              <span className="font-medium text-foreground">{selectedIds.size}</span>{' '}
              kandidate te zgjedhur?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anulo</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const ids = Array.from(selectedIds);
                if (bulkConfirm === 'archive') {
                  bulkArchive.mutate(ids);
                } else {
                  bulkUnarchive.mutate(ids);
                }
                setBulkConfirm(null);
              }}
            >
              {bulkConfirm === 'archive' ? 'Arkivo' : 'Aktivizo'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
