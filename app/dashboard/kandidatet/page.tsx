'use client';

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import {
  Archive,
  ArrowUp,
  CheckSquare,
  CreditCard,
  Edit,
  Eye,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
  UserCheck,
  UserCircle,
  Users,
  X,
} from 'lucide-react';

import api from '@/lib/api';
import { cn, formatCurrency, getDebtColor } from '@/lib/utils';
import type {
  Candidate,
  Category,
  DashboardStats,
  Instructor,
  PaginatedResponse,
} from '@/lib/types';
import { DataTable } from '@/components/shared/DataTable';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ExportButton } from '@/components/shared/ExportButton';
import { KpiCard } from '@/components/shared/KpiCard';
import { FilterChip } from '@/components/shared/FilterChip';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
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
import { toast } from '@/hooks/use-toast';

/* ─────────────────────────────────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────────────────────────────────── */

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

const AVATAR_TONES = [
  'bg-blue-50 text-blue-700 ring-blue-200',
  'bg-emerald-50 text-emerald-700 ring-emerald-200',
  'bg-violet-50 text-violet-700 ring-violet-200',
  'bg-amber-50 text-amber-700 ring-amber-200',
  'bg-rose-50 text-rose-700 ring-rose-200',
  'bg-sky-50 text-sky-700 ring-sky-200',
];
function toneFor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i += 1) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_TONES[h % AVATAR_TONES.length];
}
function initialsOf(c: Pick<Candidate, 'firstName' | 'lastName'>) {
  return ((c.firstName?.[0] ?? '') + (c.lastName?.[0] ?? '')).toUpperCase() || '?';
}

type ArchivedFilter = 'active' | 'archived' | 'all';

/* ─────────────────────────────────────────────────────────────────────────
   Page
   ───────────────────────────────────────────────────────────────────────── */

export default function CandidatesPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<string>('all');
  const [instructorId, setInstructorId] = useState<string>('all');
  const [archived, setArchived] = useState<ArchivedFilter>('active');

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<Candidate | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<{ candidate: Candidate; isArchived: boolean } | null>(null);
  const [bulkConfirm, setBulkConfirm] = useState<'archive' | 'unarchive' | null>(null);

  /* ── Data ─────────────────────────────────────────────────────────────── */

  const archivedParam = archived === 'all' ? 'all' : archived === 'active' ? 'false' : 'true';

  const { data: candidatesRes, isLoading } = useQuery<PaginatedResponse<Candidate>>({
    queryKey: ['candidates', page, pageSize, search, categoryId, instructorId, archivedParam],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(pageSize),
        archived: archivedParam,
      });
      if (search) params.set('search', search);
      if (categoryId && categoryId !== 'all') params.set('category_id', categoryId);
      if (instructorId && instructorId !== 'all') params.set('instructor_id', instructorId);
      const res = await api.get(`/candidates?${params.toString()}`);
      return res as unknown as PaginatedResponse<Candidate>;
    },
  });

  // Dashboard stats — used for the KPI strip. Shared cache with the dashboard.
  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => (await api.get('/dashboard/stats')).data,
  });

  const { data: categoriesRaw } = useQuery({
    queryKey: ['categories-list'],
    queryFn: async () => unwrapList<Category>(await api.get('/categories')),
  });

  const { data: instructorsRaw } = useQuery({
    queryKey: ['instructors-list'],
    queryFn: async () => unwrapList<Instructor>(await api.get('/instructors')),
  });

  const candidates = candidatesRes?.data ?? [];
  const pagination = candidatesRes?.pagination;
  const categories = Array.isArray(categoriesRaw) ? categoriesRaw : [];
  const instructors = Array.isArray(instructorsRaw) ? instructorsRaw : [];

  /* ── Selection ────────────────────────────────────────────────────────── */

  const allPageIds = useMemo(() => candidates.map((c) => c.id), [candidates]);
  const allPageSelected = allPageIds.length > 0 && allPageIds.every((id) => selectedIds.has(id));
  const somePageSelected = allPageIds.some((id) => selectedIds.has(id));

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        allPageIds.forEach((id) => next.delete(id));
      } else {
        allPageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }, [allPageIds, allPageSelected]);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  /* ── Mutations ────────────────────────────────────────────────────────── */

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
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast({
        title: isArchived ? 'Kandidati u aktivizua' : 'Kandidati u arkivua',
        description: isArchived ? 'Kandidati u aktivizua me sukses.' : 'Kandidati u arkivua me sukses.',
      });
    },
    onError: () => {
      toast({
        title: 'Gabim',
        description: 'Ka ndodhur një gabim. Ju lutem provoni përsëri.',
        variant: 'destructive',
      });
    },
  });

  const bulkArchive = useMutation({
    mutationFn: async (candidateIds: string[]) => api.post('/candidates/bulk-archive', { candidateIds }),
    onSuccess: (res: { data: { count: number } }) => {
      const count = res?.data?.count ?? selectedIds.size;
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      clearSelection();
      toast({
        title: 'U arkivuan me sukses',
        description: `${count} kandidatë u arkivuan me sukses.`,
      });
    },
    onError: () => {
      toast({
        title: 'Gabim',
        description: 'Ka ndodhur një gabim gjatë arkivimit.',
        variant: 'destructive',
      });
    },
  });

  const bulkUnarchive = useMutation({
    mutationFn: async (candidateIds: string[]) => api.post('/candidates/bulk-unarchive', { candidateIds }),
    onSuccess: (res: { data: { count: number } }) => {
      const count = res?.data?.count ?? selectedIds.size;
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      clearSelection();
      toast({
        title: 'U aktivizuan me sukses',
        description: `${count} kandidatë u aktivizuan me sukses.`,
      });
    },
    onError: () => {
      toast({
        title: 'Gabim',
        description: 'Ka ndodhur një gabim gjatë aktivizimit.',
        variant: 'destructive',
      });
    },
  });

  const deleteCandidate = useMutation({
    mutationFn: async (id: string) => api.delete(`/candidates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast({ title: 'Kandidati u fshi', description: 'Kandidati u fshi me sukses.' });
    },
    onError: () => {
      toast({
        title: 'Gabim',
        description: 'Ka ndodhur një gabim gjatë fshirjes.',
        variant: 'destructive',
      });
    },
  });

  /* ── Table columns ────────────────────────────────────────────────────── */

  const columns: ColumnDef<Candidate, unknown>[] = useMemo(
    () => [
      {
        id: 'select',
        header: () => (
          <Checkbox
            checked={allPageSelected || (somePageSelected && 'indeterminate')}
            onCheckedChange={toggleSelectAll}
            aria-label="Zgjedh të gjithë"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={selectedIds.has(row.original.id)}
            onCheckedChange={() => toggleSelect(row.original.id)}
            aria-label={`Zgjedh ${row.original.firstName} ${row.original.lastName}`}
            onClick={(e) => e.stopPropagation()}
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        id: 'candidate',
        header: 'Kandidati',
        cell: ({ row }) => {
          const c = row.original;
          return (
            <Link
              href={`/dashboard/kandidatet/${c.id}`}
              className="group flex items-center gap-3"
            >
              <span
                className={cn(
                  'grid h-9 w-9 shrink-0 place-items-center rounded-full text-[12px] font-bold ring-1 ring-inset',
                  toneFor(`${c.firstName} ${c.lastName}`)
                )}
              >
                {initialsOf(c)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-[13.5px] font-semibold text-slate-900 group-hover:text-primary-600">
                  {c.firstName} {c.lastName}
                </p>
                <p className="mt-0.5 inline-flex items-center gap-1.5 text-[11px] text-slate-500">
                  {c.protocolNumber && (
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wider text-slate-700">
                      #{c.protocolNumber}
                    </span>
                  )}
                  <span className="tabular-nums">{c.personalNumber}</span>
                </p>
              </div>
            </Link>
          );
        },
      },
      {
        id: 'kategoria',
        header: 'Kategoria',
        cell: ({ row }) => {
          const code = row.original.categoryCode ?? row.original.category?.code;
          return code ? (
            <span className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[10.5px] font-bold tracking-wider text-slate-700">
              {code}
            </span>
          ) : (
            <span className="text-slate-400">—</span>
          );
        },
      },
      {
        id: 'instructor',
        header: 'Instruktori',
        cell: ({ row }) => {
          const name =
            row.original.instructorName ??
            (row.original.instructor
              ? `${row.original.instructor.firstName} ${row.original.instructor.lastName}`
              : null);
          if (!name) return <span className="text-slate-400">—</span>;
          return (
            <span className="inline-flex items-center gap-1.5 text-[12px] text-slate-700">
              <UserCircle className="h-3.5 w-3.5 text-slate-400" />
              {name}
            </span>
          );
        },
      },
      {
        accessorKey: 'price',
        header: 'Çmimi',
        cell: ({ row }) => (
          <span className="tabular-nums text-slate-700">{formatCurrency(row.original.price)}</span>
        ),
      },
      {
        accessorKey: 'amountPaid',
        header: 'Paguar',
        cell: ({ row }) => (
          <span className="tabular-nums text-emerald-700">{formatCurrency(row.original.amountPaid)}</span>
        ),
      },
      {
        id: 'borxhi',
        header: 'Borxhi',
        cell: ({ row }) => {
          const debt = row.original.price - row.original.amountPaid;
          return (
            <span className={cn('font-semibold tabular-nums', getDebtColor(debt))}>
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
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
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
                onClick={() =>
                  setArchiveTarget({ candidate: row.original, isArchived: row.original.isArchived })
                }
              >
                <Archive className="mr-2 h-4 w-4" />
                {row.original.isArchived ? 'Aktivizo' : 'Arkivo'}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-rose-600 focus:text-rose-600"
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

  const isViewingArchived = archived === 'archived';
  const isViewingActive = archived === 'active';

  const clearFilters = () => {
    setCategoryId('all');
    setInstructorId('all');
    setArchived('active');
    setSearch('');
    setPage(1);
    clearSelection();
  };
  const anyFilterActive =
    categoryId !== 'all' || instructorId !== 'all' || archived !== 'active' || !!search;

  /* ── Render ───────────────────────────────────────────────────────────── */

  return (
    <div className="space-y-6">
      <PageHeader title="Kandidatët" description="Menaxhimi i kandidatëve të autoshkollës">
        <ExportButton
          resource="candidates"
          params={{
            search,
            archived: archivedParam,
            ...(categoryId !== 'all' ? { category_id: categoryId } : {}),
            ...(instructorId !== 'all' ? { instructor_id: instructorId } : {}),
          }}
        />
        <Button asChild>
          <Link href="/dashboard/kandidatet/regjistro">
            <Plus className="mr-2 h-4 w-4" />
            Regjistro Kandidat
          </Link>
        </Button>
      </PageHeader>

      {/* KPI tiles — clickable to filter */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={Users}
          tone="slate"
          label="Total Kandidatësh"
          value={String(stats?.totalCandidates ?? 0)}
          active={archived === 'all'}
          onClick={() => { setArchived('all'); setPage(1); clearSelection(); }}
          footer={<span className="text-xs text-slate-500">aktivë & arkivuar</span>}
        />
        <KpiCard
          icon={UserCheck}
          tone="emerald"
          label="Aktivë"
          value={String(stats?.activeCandidates ?? 0)}
          active={archived === 'active'}
          onClick={() => { setArchived('active'); setPage(1); clearSelection(); }}
          footer={
            stats?.activeCandidatesTrend ? (
              <span className="inline-flex items-center gap-1 text-xs">
                <span
                  className={cn(
                    'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-semibold',
                    stats.activeCandidatesTrend > 0
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-rose-50 text-rose-700'
                  )}
                >
                  <ArrowUp
                    className={cn(
                      'h-3 w-3',
                      stats.activeCandidatesTrend < 0 && 'rotate-180'
                    )}
                  />
                  {Math.abs(stats.activeCandidatesTrend)}
                </span>
                <span className="text-slate-500">këtë muaj</span>
              </span>
            ) : (
              <span className="text-xs text-slate-500">në procedurë</span>
            )
          }
        />
        <KpiCard
          icon={Archive}
          tone="slate"
          label="Arkivuar"
          value={String(stats?.archivedCandidates ?? 0)}
          active={archived === 'archived'}
          onClick={() => { setArchived('archived'); setPage(1); clearSelection(); }}
          footer={<span className="text-xs text-slate-500">të përfunduar</span>}
        />
        <KpiCard
          icon={CreditCard}
          tone={(stats?.pendingPayments ?? 0) > 0 ? 'amber' : 'emerald'}
          label="Borxh Aktiv"
          value={formatCurrency(stats?.pendingPayments ?? 0)}
          footer={<span className="text-xs text-slate-500">prej kandidatëve aktivë</span>}
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Kërko kandidat (emër, nr. regjistri, nr. personal, telefoni)…"
            className="pl-9"
          />
        </div>

        <Select
          value={categoryId}
          onValueChange={(val) => { setCategoryId(val); setPage(1); }}
        >
          <SelectTrigger className="w-full lg:w-[170px]">
            <SelectValue placeholder="Kategoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Të gjitha kategoritë</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.code}{cat.description ? ` · ${cat.description}` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={instructorId}
          onValueChange={(val) => { setInstructorId(val); setPage(1); }}
        >
          <SelectTrigger className="w-full lg:w-[190px]">
            <SelectValue placeholder="Instruktori" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Të gjithë instruktorët</SelectItem>
            {instructors.map((inst) => (
              <SelectItem key={inst.id} value={inst.id}>
                {inst.firstName} {inst.lastName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          <FilterChip label="Aktivë"      active={archived === 'active'}   onClick={() => { setArchived('active'); setPage(1); clearSelection(); }} />
          <FilterChip label="Arkivuar"    active={archived === 'archived'} onClick={() => { setArchived('archived'); setPage(1); clearSelection(); }} />
          <FilterChip label="Të gjithë"   active={archived === 'all'}      onClick={() => { setArchived('all'); setPage(1); clearSelection(); }} />
        </div>

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

      {/* Inline bulk-action strip — Linear-style, no longer floating */}
      {selectedIds.size > 0 && (
        <div className="flex flex-col gap-2 rounded-xl border border-primary-200 bg-primary-50/60 p-3 sm:flex-row sm:items-center">
          <div className="inline-flex items-center gap-2 text-sm font-semibold text-primary-900">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary-100 text-primary-700">
              <CheckSquare className="h-4 w-4" />
            </span>
            <span>
              {selectedIds.size} {selectedIds.size === 1 ? 'kandidat i zgjedhur' : 'kandidatë të zgjedhur'}
            </span>
          </div>
          <div className="flex flex-1 flex-wrap items-center gap-2 sm:ml-auto sm:justify-end">
            {(isViewingActive || archived === 'all') && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setBulkConfirm('archive')}
                disabled={bulkArchive.isPending}
                className="border-amber-200 bg-white text-amber-800 hover:bg-amber-50"
              >
                <Archive className="mr-1.5 h-3.5 w-3.5" />
                Arkivo
              </Button>
            )}
            {(isViewingArchived || archived === 'all') && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setBulkConfirm('unarchive')}
                disabled={bulkUnarchive.isPending}
                className="border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50"
              >
                <Archive className="mr-1.5 h-3.5 w-3.5" />
                Aktivizo
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={clearSelection}
              className="text-slate-600"
            >
              <X className="mr-1 h-3.5 w-3.5" />
              Pastro përzgjedhjen
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <DataTable
        columns={columns}
        data={candidates}
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

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Fshi Kandidatin</AlertDialogTitle>
            <AlertDialogDescription>
              A jeni të sigurt që doni ta fshini kandidatin{' '}
              <span className="font-semibold text-slate-900">
                {deleteTarget?.firstName} {deleteTarget?.lastName}
              </span>
              ? Ky veprim nuk mund të kthehet mbrapsht.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anulo</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700"
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

      {/* Archive/Activate confirmation (single) */}
      <AlertDialog open={!!archiveTarget} onOpenChange={(open) => { if (!open) setArchiveTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {archiveTarget?.isArchived ? 'Aktivizo Kandidatin' : 'Arkivo Kandidatin'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              A jeni të sigurt që doni ta{' '}
              {archiveTarget?.isArchived ? 'aktivizoni' : 'arkivoni'} kandidatin{' '}
              <span className="font-semibold text-slate-900">
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

      {/* Bulk confirm */}
      <AlertDialog open={!!bulkConfirm} onOpenChange={(open) => { if (!open) setBulkConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {bulkConfirm === 'archive' ? 'Arkivo Kandidatët' : 'Aktivizo Kandidatët'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              A jeni të sigurt që doni të{' '}
              {bulkConfirm === 'archive' ? 'arkivoni' : 'aktivizoni'}{' '}
              <span className="font-semibold text-slate-900">{selectedIds.size}</span>{' '}
              kandidatë të zgjedhur?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anulo</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const ids = Array.from(selectedIds);
                if (bulkConfirm === 'archive') bulkArchive.mutate(ids);
                else bulkUnarchive.mutate(ids);
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
