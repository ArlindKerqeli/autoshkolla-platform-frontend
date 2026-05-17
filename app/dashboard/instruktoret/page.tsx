'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Eye,
  Mail,
  MoreHorizontal,
  Pencil,
  Phone,
  Plus,
  Search,
  ShieldAlert,
  Trash2,
  UserCheck,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { differenceInDays, parseISO } from 'date-fns';
import Link from 'next/link';

import api from '@/lib/api';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ExportButton } from '@/components/shared/ExportButton';
import { KpiCard } from '@/components/shared/KpiCard';
import { FilterChip } from '@/components/shared/FilterChip';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/* ─────────────────────────────────────────────────────────────────────────
   Types & helpers
   ───────────────────────────────────────────────────────────────────────── */

interface Instructor {
  id: string;
  code: string;
  firstName: string;
  lastName: string;
  personalNumber: string;
  email: string | null;
  phone: string | null;
  position: 'instructor' | 'lecturer' | 'both';
  licenseInfo: string | null;
  licenseExpiry: string | null;
  costPerCandidate: number;
  isActive: boolean;
  totalHoursCompleted: number;
  vehicleName: string | null;
  activeCandidates: number;
  totalDebt: number;
  userId: string | null;
  createdAt: string;
}

interface InstructorsResponse {
  data: Instructor[];
  pagination?: {
    page: number;
    totalPages: number;
    totalItems: number;
    pageSize: number;
  };
}

const instructorSchema = z.object({
  firstName: z.string().min(1, 'Emri është i detyrueshëm'),
  lastName: z.string().min(1, 'Mbiemri është i detyrueshëm'),
  personalNumber: z.string().min(1, 'Numri personal është i detyrueshëm'),
  email: z.string().email('Email i pavlefshëm').or(z.literal('')).optional(),
  phone: z.string().optional(),
  position: z.enum(['instructor', 'lecturer', 'both']),
  licenseInfo: z.string().optional(),
  licenseExpiry: z.string().optional().or(z.literal('')),
  costPerCandidate: z.coerce.number().min(0, 'Vlerë e pavlefshme'),
  isActive: z.boolean(),
  createLogin: z.boolean().optional(),
  loginEmail: z.string().email('Email i pavlefshëm').optional().or(z.literal('')),
  loginPassword: z
    .string()
    .min(6, 'Fjalëkalimi duhet të ketë së paku 6 karaktere')
    .optional()
    .or(z.literal('')),
});
type InstructorFormData = z.infer<typeof instructorSchema>;

const POSITION_LABELS: Record<string, string> = {
  instructor: 'Instruktor',
  lecturer: 'Ligjërues',
  both: 'Të dyja',
};

const POSITION_STYLES: Record<string, string> = {
  instructor: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  lecturer:   'bg-amber-50 text-amber-700 ring-amber-200',
  both:       'bg-violet-50 text-violet-700 ring-violet-200',
};

type LicenseStatus = 'ok' | 'expiring' | 'expired' | 'missing';

function classifyLicense(dateStr: string | null): LicenseStatus {
  if (!dateStr) return 'missing';
  const days = differenceInDays(parseISO(dateStr), new Date());
  if (days < 0) return 'expired';
  if (days <= 30) return 'expiring';
  return 'ok';
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

function initialsOf(i: { firstName: string; lastName: string }) {
  return ((i.firstName?.[0] ?? '') + (i.lastName?.[0] ?? '')).toUpperCase() || '?';
}

/* ─────────────────────────────────────────────────────────────────────────
   Page
   ───────────────────────────────────────────────────────────────────────── */

export default function InstruktoretPage() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [positionFilter, setPositionFilter] = useState<'all' | 'instructor' | 'lecturer' | 'both'>('all');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [licenseFilter, setLicenseFilter] = useState<'all' | LicenseStatus>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingInstructor, setEditingInstructor] = useState<Instructor | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingInstructor, setDeletingInstructor] = useState<Instructor | null>(null);

  /* ── Data ─────────────────────────────────────────────────────────────── */

  const { data: instructorsData, isLoading } = useQuery<InstructorsResponse>({
    queryKey: ['instructors', { search, positionFilter, activeFilter, page, pageSize }],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, pageSize };
      if (search) params.search = search;
      if (positionFilter !== 'all') params.position = positionFilter;
      if (activeFilter !== 'all') params.isActive = activeFilter === 'active' ? 'true' : 'false';
      const res = await api.get('/instructors', { params });
      return res as unknown as InstructorsResponse;
    },
  });

  const allInstructors = instructorsData?.data ?? [];
  const pagination = instructorsData?.pagination;

  // Client-side license filter (backend doesn't support this filter)
  const instructors = useMemo(() => {
    if (licenseFilter === 'all') return allInstructors;
    return allInstructors.filter((i) => classifyLicense(i.licenseExpiry) === licenseFilter);
  }, [allInstructors, licenseFilter]);

  /* ── Aggregates (computed from the current page of instructors) ───────── */

  const metrics = useMemo(() => {
    let activeCount = 0;
    let inactiveCount = 0;
    let totalCandidates = 0;
    let totalDebt = 0;
    let withCandidates = 0;
    const licenseCounts = { ok: 0, expiring: 0, expired: 0, missing: 0 };
    allInstructors.forEach((i) => {
      if (i.isActive) activeCount += 1;
      else inactiveCount += 1;
      totalCandidates += i.activeCandidates ?? 0;
      totalDebt += i.totalDebt ?? 0;
      if ((i.activeCandidates ?? 0) > 0) withCandidates += 1;
      licenseCounts[classifyLicense(i.licenseExpiry)] += 1;
    });
    return {
      total: allInstructors.length,
      active: activeCount,
      inactive: inactiveCount,
      totalCandidates,
      totalDebt,
      withCandidates,
      licenseCounts,
    };
  }, [allInstructors]);

  const licenseAlerts = metrics.licenseCounts.expired + metrics.licenseCounts.expiring;

  /* ── Mutations ────────────────────────────────────────────────────────── */

  const createMutation = useMutation({
    mutationFn: (data: InstructorFormData) => api.post('/instructors', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instructors'] });
      handleCloseDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: InstructorFormData }) =>
      api.put(`/instructors/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instructors'] });
      handleCloseDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/instructors/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instructors'] });
      setDeleteDialogOpen(false);
      setDeletingInstructor(null);
    },
  });

  /* ── Form ─────────────────────────────────────────────────────────────── */

  const form = useForm<InstructorFormData>({
    resolver: zodResolver(instructorSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      personalNumber: '',
      email: '',
      phone: '',
      position: 'instructor',
      licenseInfo: '',
      licenseExpiry: '',
      costPerCandidate: 65,
      isActive: true,
      createLogin: false,
      loginEmail: '',
      loginPassword: '',
    },
  });
  const createLogin = form.watch('createLogin');

  function handleOpenCreate() {
    setEditingInstructor(null);
    form.reset({
      firstName: '', lastName: '', personalNumber: '', email: '', phone: '',
      position: 'instructor', licenseInfo: '', licenseExpiry: '',
      costPerCandidate: 65, isActive: true, createLogin: false, loginEmail: '', loginPassword: '',
    });
    setDialogOpen(true);
  }

  function handleOpenEdit(instructor: Instructor) {
    setEditingInstructor(instructor);
    form.reset({
      firstName: instructor.firstName,
      lastName: instructor.lastName,
      personalNumber: instructor.personalNumber,
      email: instructor.email ?? '',
      phone: instructor.phone ?? '',
      position: instructor.position,
      licenseInfo: instructor.licenseInfo ?? '',
      licenseExpiry: instructor.licenseExpiry?.split('T')[0] ?? '',
      costPerCandidate: instructor.costPerCandidate,
      isActive: instructor.isActive,
      createLogin: false,
      loginEmail: '',
      loginPassword: '',
    });
    setDialogOpen(true);
  }

  function handleCloseDialog() {
    setDialogOpen(false);
    setEditingInstructor(null);
    form.reset();
  }

  function handleSubmit(data: InstructorFormData) {
    const payload: Record<string, unknown> = {
      firstName: data.firstName,
      lastName: data.lastName,
      personalNumber: data.personalNumber || undefined,
      email: data.email || undefined,
      phone: data.phone || undefined,
      position: data.position,
      licenseInfo: data.licenseInfo || undefined,
      licenseExpiry: data.licenseExpiry || undefined,
      costPerCandidate: data.costPerCandidate,
    };
    if (editingInstructor) {
      payload.isActive = data.isActive;
      if (data.loginPassword) payload.password = data.loginPassword;
      updateMutation.mutate({ id: editingInstructor.id, data: payload as InstructorFormData });
    } else {
      payload.code = `${data.firstName.substring(0, 2).toUpperCase()}${data.lastName.substring(0, 2).toUpperCase()}${Date.now().toString().slice(-4)}`;
      if (data.createLogin && data.loginEmail && data.loginPassword) {
        payload.email = data.loginEmail;
        payload.password = data.loginPassword;
      }
      createMutation.mutate(payload as InstructorFormData);
    }
  }

  function handleDelete(instructor: Instructor) {
    setDeletingInstructor(instructor);
    setDeleteDialogOpen(true);
  }

  const clearFilters = () => {
    setPositionFilter('all');
    setActiveFilter('all');
    setLicenseFilter('all');
    setSearch('');
    setPage(1);
  };

  const anyFilterActive =
    positionFilter !== 'all' || activeFilter !== 'all' || licenseFilter !== 'all' || !!search;

  /* ── Columns ──────────────────────────────────────────────────────────── */

  const columns: ColumnDef<Instructor>[] = useMemo(
    () => [
      {
        id: 'instructor',
        header: 'Instruktori',
        cell: ({ row }) => {
          const inst = row.original;
          return (
            <Link
              href={`/dashboard/instruktoret/${inst.id}`}
              className="group flex items-center gap-3"
            >
              <span
                className={cn(
                  'grid h-9 w-9 shrink-0 place-items-center rounded-full text-[12px] font-bold ring-1 ring-inset',
                  toneFor(`${inst.firstName} ${inst.lastName}`)
                )}
              >
                {initialsOf(inst)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-[13.5px] font-semibold text-slate-900 group-hover:text-primary-600">
                  {inst.firstName} {inst.lastName}
                </p>
                <p className="truncate font-mono text-[11px] text-slate-500">{inst.code}</p>
              </div>
            </Link>
          );
        },
      },
      {
        accessorKey: 'position',
        header: 'Pozita',
        cell: ({ row }) => (
          <span
            className={cn(
              'inline-flex items-center rounded-md px-2 py-0.5 text-[11.5px] font-medium ring-1 ring-inset',
              POSITION_STYLES[row.original.position]
            )}
          >
            {POSITION_LABELS[row.original.position] ?? row.original.position}
          </span>
        ),
      },
      {
        id: 'contact',
        header: 'Kontakti',
        cell: ({ row }) => {
          const inst = row.original;
          if (!inst.phone && !inst.email) {
            return <span className="text-slate-400">—</span>;
          }
          return (
            <div className="space-y-0.5 text-[12px] text-slate-700">
              {inst.phone && (
                <p className="inline-flex items-center gap-1.5">
                  <Phone className="h-3 w-3 text-slate-400" />
                  <span className="tabular-nums">{inst.phone}</span>
                </p>
              )}
              {inst.email && (
                <p className="inline-flex items-center gap-1.5 truncate">
                  <Mail className="h-3 w-3 text-slate-400" />
                  <span className="truncate text-slate-600">{inst.email}</span>
                </p>
              )}
            </div>
          );
        },
      },
      {
        id: 'license',
        header: 'Licenca',
        cell: ({ row }) => <LicenseCell expiry={row.original.licenseExpiry} />,
      },
      {
        id: 'workload',
        header: 'Ngarkesa',
        cell: ({ row }) => {
          const n = row.original.activeCandidates ?? 0;
          return (
            <div className="flex items-center gap-2">
              <span className="inline-flex h-6 min-w-[28px] items-center justify-center rounded-md bg-slate-100 px-1.5 text-[12px] font-bold tabular-nums text-slate-700">
                {n}
              </span>
              <span className="hidden text-[11px] text-slate-500 lg:inline">
                {n === 1 ? 'kandidat' : 'kandidatë'}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: 'totalDebt',
        header: 'Borxhi',
        cell: ({ row }) => {
          const debt = row.original.totalDebt ?? 0;
          if (debt <= 0) return <span className="text-[12px] font-medium text-emerald-700">€0.00</span>;
          const color = debt < 100 ? 'text-amber-700' : 'text-rose-700';
          return <span className={cn('font-semibold tabular-nums', color)}>{formatCurrency(debt)}</span>;
        },
      },
      {
        accessorKey: 'isActive',
        header: 'Statusi',
        cell: ({ row }) => <StatusBadge status={row.original.isActive ? 'active' : 'inactive'} />,
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/dashboard/instruktoret/${row.original.id}`}>
                  <Eye className="mr-2 h-4 w-4" />
                  Shiko
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleOpenEdit(row.original)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edito
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-rose-600 focus:text-rose-600"
                onClick={() => handleDelete(row.original)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Fshi
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    []
  );

  /* ── Render ───────────────────────────────────────────────────────────── */

  return (
    <div className="space-y-6">
      <PageHeader title="Instruktorët" description="Menaxho instruktorët dhe ligjëruesit">
        <ExportButton
          resource="instructors"
          params={{
            ...(positionFilter !== 'all' ? { position: positionFilter } : {}),
            ...(activeFilter !== 'all' ? { active: activeFilter === 'active' ? 'true' : 'false' } : {}),
          }}
        />
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Shto Instruktor
        </Button>
      </PageHeader>

      {/* License-expiry alert strip — only when there's something */}
      {licenseAlerts > 0 && !isLoading && (
        <LicenseAlertBanner
          expired={metrics.licenseCounts.expired}
          expiring={metrics.licenseCounts.expiring}
          active={licenseFilter}
          onJump={(status) => {
            setLicenseFilter(licenseFilter === status ? 'all' : status);
            setPage(1);
          }}
        />
      )}

      {/* KPI tiles */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={Users}
          tone="slate"
          label="Instruktorë gjithsej"
          value={String(metrics.total)}
          footer={
            <span className="text-xs text-slate-500">
              <span className="font-semibold text-emerald-700">{metrics.active}</span> aktivë
              <span className="px-1.5 text-slate-300">•</span>
              <span className="text-slate-500">{metrics.inactive} joaktivë</span>
            </span>
          }
        />
        <KpiCard
          icon={UserCheck}
          tone="emerald"
          label="Me kandidatë"
          value={String(metrics.withCandidates)}
          footer={
            <span className="text-xs text-slate-500">
              {metrics.totalCandidates} kandidatë aktivë gjithsej
            </span>
          }
        />
        <KpiCard
          icon={Wallet}
          tone={metrics.totalDebt > 0 ? 'rose' : 'emerald'}
          label="Borxh aktiv total"
          value={formatCurrency(metrics.totalDebt)}
          footer={
            <span className="text-xs text-slate-500">
              {metrics.totalDebt > 0 ? 'mbi të gjithë instruktorët' : 'gjithçka e paguar'}
            </span>
          }
        />
        <KpiCard
          icon={BadgeCheck}
          tone={licenseAlerts > 0 ? 'amber' : 'emerald'}
          label="Licenca me probleme"
          value={String(licenseAlerts)}
          footer={
            licenseAlerts > 0 ? (
              <span className="text-xs text-slate-500">
                <span className="font-semibold text-rose-700">{metrics.licenseCounts.expired}</span> skaduara
                <span className="px-1.5 text-slate-300">•</span>
                <span className="font-semibold text-amber-700">{metrics.licenseCounts.expiring}</span> së shpejti
              </span>
            ) : (
              <span className="text-xs text-emerald-600">Të gjitha në rregull</span>
            )
          }
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Kërko instruktor (emër, mbiemër, kod)…"
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          <span className="mr-1 hidden text-[11px] font-medium uppercase tracking-wider text-slate-400 sm:inline">Pozita</span>
          <FilterChip label="Të gjitha" active={positionFilter === 'all'}        onClick={() => setPositionFilter('all')} />
          <FilterChip label="Instruktor" active={positionFilter === 'instructor'} onClick={() => setPositionFilter(positionFilter === 'instructor' ? 'all' : 'instructor')} />
          <FilterChip label="Ligjërues"  active={positionFilter === 'lecturer'}   onClick={() => setPositionFilter(positionFilter === 'lecturer' ? 'all' : 'lecturer')} />
          <FilterChip label="Të dyja"    active={positionFilter === 'both'}       onClick={() => setPositionFilter(positionFilter === 'both' ? 'all' : 'both')} />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          <span className="mr-1 hidden text-[11px] font-medium uppercase tracking-wider text-slate-400 sm:inline">Statusi</span>
          <FilterChip label="Të gjithë" active={activeFilter === 'all'}      onClick={() => setActiveFilter('all')} />
          <FilterChip label="Aktiv"     count={metrics.active} active={activeFilter === 'active'}   onClick={() => setActiveFilter(activeFilter === 'active' ? 'all' : 'active')} />
          <FilterChip label="Joaktiv"   count={metrics.inactive} active={activeFilter === 'inactive'} onClick={() => setActiveFilter(activeFilter === 'inactive' ? 'all' : 'inactive')} />
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

      {/* License filter strip (inline below the toolbar, only when active) */}
      {licenseFilter !== 'all' && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2 text-[12.5px] text-amber-900">
          <ShieldAlert className="h-4 w-4 text-amber-600" />
          <span className="font-medium">
            Po shfaqen vetëm instruktorët me licenca{' '}
            {licenseFilter === 'expired' && <strong>të skaduara</strong>}
            {licenseFilter === 'expiring' && <strong>që skadojnë në 30 ditë</strong>}
            {licenseFilter === 'ok' && <strong>në rregull</strong>}
            {licenseFilter === 'missing' && <strong>pa datë skadimi</strong>}
          </span>
          <button
            type="button"
            onClick={() => setLicenseFilter('all')}
            className="ml-auto inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-[11px] font-medium text-slate-700 ring-1 ring-inset ring-slate-200 transition hover:bg-slate-50"
          >
            <X className="h-3 w-3" />
            Hiq filtrin
          </button>
        </div>
      )}

      {/* Table */}
      <DataTable
        columns={columns}
        data={instructors}
        isLoading={isLoading}
        pagination={
          pagination
            ? {
                page: pagination.page,
                totalPages: pagination.totalPages,
                totalItems: pagination.totalItems,
                pageSize: pagination.pageSize,
                onPageChange: setPage,
                onPageSizeChange: setPageSize,
              }
            : undefined
        }
      />

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingInstructor ? 'Edito Instruktorin' : 'Shto Instruktor të Ri'}</DialogTitle>
            <DialogDescription>
              {editingInstructor
                ? 'Ndrysho të dhënat e instruktorit.'
                : 'Plotëso të dhënat për të shtuar një instruktor të ri.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="firstName">Emri *</Label>
                <Input id="firstName" {...form.register('firstName')} />
                {form.formState.errors.firstName && (
                  <p className="text-[11.5px] text-rose-600">{form.formState.errors.firstName.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName">Mbiemri *</Label>
                <Input id="lastName" {...form.register('lastName')} />
                {form.formState.errors.lastName && (
                  <p className="text-[11.5px] text-rose-600">{form.formState.errors.lastName.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="personalNumber">Numri Personal *</Label>
              <Input id="personalNumber" {...form.register('personalNumber')} />
              {form.formState.errors.personalNumber && (
                <p className="text-[11.5px] text-rose-600">{form.formState.errors.personalNumber.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...form.register('email')} />
                {form.formState.errors.email && (
                  <p className="text-[11.5px] text-rose-600">{form.formState.errors.email.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Telefoni</Label>
                <Input id="phone" {...form.register('phone')} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="position">Pozita *</Label>
              <Controller
                control={form.control}
                name="position"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Zgjidh pozitën" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="instructor">Instruktor</SelectItem>
                      <SelectItem value="lecturer">Ligjërues</SelectItem>
                      <SelectItem value="both">Të dyja</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="licenseInfo">Informata për licencën</Label>
                <Input id="licenseInfo" {...form.register('licenseInfo')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="licenseExpiry">Licenca skadon</Label>
                <Input id="licenseExpiry" type="date" {...form.register('licenseExpiry')} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="costPerCandidate">Kosto për kandidat (€)</Label>
              <Input
                id="costPerCandidate"
                type="number"
                step="0.01"
                {...form.register('costPerCandidate')}
              />
              {form.formState.errors.costPerCandidate && (
                <p className="text-[11.5px] text-rose-600">{form.formState.errors.costPerCandidate.message}</p>
              )}
            </div>

            <label
              htmlFor="isActive"
              className="flex cursor-pointer items-center justify-between rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2.5"
            >
              <div>
                <span className="text-sm font-medium text-slate-900">Aktiv</span>
                <p className="text-[11px] text-slate-500">
                  Instruktorët jo-aktivë nuk shfaqen kur caktoni kandidatë të rinj.
                </p>
              </div>
              <Controller
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <Switch id="isActive" checked={field.value} onCheckedChange={field.onChange} />
                )}
              />
            </label>

            {/* Create Login Section */}
            {!editingInstructor && (
              <div className="space-y-3 rounded-lg border border-slate-200 p-4">
                <label
                  htmlFor="createLogin"
                  className="flex cursor-pointer items-center justify-between"
                >
                  <div>
                    <span className="text-sm font-medium text-slate-900">Krijo llogari për kyçje</span>
                    <p className="text-[11px] text-slate-500">
                      Instruktori do të mund të kyçet në portalin e instruktorit.
                    </p>
                  </div>
                  <Controller
                    control={form.control}
                    name="createLogin"
                    render={({ field }) => (
                      <Switch
                        id="createLogin"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                </label>
                {createLogin && (
                  <div className="grid grid-cols-2 gap-4 pt-1">
                    <div className="space-y-1.5">
                      <Label htmlFor="loginEmail">Email për kyçje</Label>
                      <Input id="loginEmail" type="email" {...form.register('loginEmail')} />
                      {form.formState.errors.loginEmail && (
                        <p className="text-[11.5px] text-rose-600">{form.formState.errors.loginEmail.message}</p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="loginPassword">Fjalëkalimi</Label>
                      <Input id="loginPassword" type="password" {...form.register('loginPassword')} />
                      {form.formState.errors.loginPassword && (
                        <p className="text-[11.5px] text-rose-600">{form.formState.errors.loginPassword.message}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Anulo
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {createMutation.isPending || updateMutation.isPending
                  ? 'Duke ruajtur…'
                  : editingInstructor
                    ? 'Ruaj Ndryshimet'
                    : 'Shto Instruktorin'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Fshi Instruktorin"
        description={`A jeni të sigurt që doni ta fshini instruktorin "${deletingInstructor?.firstName ?? ''} ${deletingInstructor?.lastName ?? ''}"? Ky veprim nuk mund të kthehet mbrapa.`}
        confirmText="Fshi"
        cancelText="Anulo"
        variant="destructive"
        onConfirm={() => {
          if (deletingInstructor) deleteMutation.mutate(deletingInstructor.id);
        }}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Pieces
   ───────────────────────────────────────────────────────────────────────── */

function LicenseCell({ expiry }: { expiry: string | null }) {
  if (!expiry) {
    return (
      <span className="inline-flex items-center gap-1 text-[11.5px] text-slate-400">
        Pa datë
      </span>
    );
  }
  const status = classifyLicense(expiry);
  const days = differenceInDays(parseISO(expiry), new Date());

  if (status === 'ok') {
    return (
      <div className="space-y-0.5">
        <p className="tabular-nums text-[12px] text-slate-700">{formatDate(expiry)}</p>
        <p className="text-[10.5px] text-slate-400">{days} ditë të mbetura</p>
      </div>
    );
  }

  if (status === 'expiring') {
    return (
      <div className="space-y-0.5">
        <p className="tabular-nums text-[12px] font-semibold text-amber-700">{formatDate(expiry)}</p>
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10.5px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-200">
          <AlertTriangle className="h-2.5 w-2.5" />
          {days === 0 ? 'Sot' : `${days} ditë të mbetura`}
        </span>
      </div>
    );
  }

  // expired
  return (
    <div className="space-y-0.5">
      <p className="tabular-nums text-[12px] font-semibold text-rose-700">{formatDate(expiry)}</p>
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-1.5 py-0.5 text-[10.5px] font-semibold text-rose-700 ring-1 ring-inset ring-rose-200">
        <ShieldAlert className="h-2.5 w-2.5" />
        Skaduar ({Math.abs(days)} ditë më parë)
      </span>
    </div>
  );
}

function LicenseAlertBanner({
  expired,
  expiring,
  active,
  onJump,
}: {
  expired: number;
  expiring: number;
  active: 'all' | LicenseStatus;
  onJump: (status: LicenseStatus) => void;
}) {
  const tone = expired > 0 ? 'rose' : 'amber';
  const Icon = expired > 0 ? ShieldAlert : AlertTriangle;
  const toneClasses =
    tone === 'rose'
      ? {
          bar: 'border-rose-200 bg-rose-50/60',
          icon: 'bg-rose-100 text-rose-700 ring-rose-200',
          title: 'text-rose-900',
        }
      : {
          bar: 'border-amber-200 bg-amber-50/60',
          icon: 'bg-amber-100 text-amber-700 ring-amber-200',
          title: 'text-amber-900',
        };

  return (
    <Card className={cn('flex flex-col gap-3 p-4 sm:flex-row sm:items-center', toneClasses.bar)}>
      <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-lg ring-1 ring-inset', toneClasses.icon)}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className={cn('text-sm font-semibold', toneClasses.title)}>
          Licenca që kërkojnë vëmendje
        </p>
        <p className="mt-0.5 text-[12.5px] text-slate-700">
          Disa instruktorë kanë licenca që po skadojnë ose që kanë skaduar — kontrolloji.
        </p>
      </div>
      <div className="flex items-center gap-1.5">
        {expired > 0 && (
          <FilterChip
            label="Skaduar"
            count={expired}
            active={active === 'expired'}
            onClick={() => onJump('expired')}
          />
        )}
        {expiring > 0 && (
          <FilterChip
            label="Skadojnë së shpejti"
            count={expiring}
            active={active === 'expiring'}
            onClick={() => onJump('expiring')}
          />
        )}
        <ArrowRight className="ml-1 hidden h-4 w-4 text-slate-400 sm:inline" />
      </div>
    </Card>
  );
}
