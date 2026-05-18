'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  AlertTriangle,
  Car,
  FileText,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserCircle,
  Wrench,
  X,
} from 'lucide-react';
import { differenceInDays, parseISO } from 'date-fns';

import api from '@/lib/api';
import { cn, formatDate } from '@/lib/utils';
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

interface Vehicle {
  id: string;
  make: string;
  model: string;
  plateNumber: string;
  chassisNumber: string | null;
  registrationDate: string | null;
  registrationExpiry: string | null;
  technicalControlDate: string | null;
  insuranceExpiry: string | null;
  instructorId: string | null;
  instructorName: string | null;
  isActive: boolean;
  createdAt: string;
}

interface InstructorOption {
  id: string;
  firstName: string;
  lastName: string;
  code: string;
}

interface VehiclesResponse {
  data: Vehicle[];
  pagination?: {
    page: number;
    totalPages: number;
    totalItems: number;
    pageSize: number;
  };
}

const vehicleSchema = z.object({
  make: z.string().min(1, 'Marka është e detyrueshme'),
  model: z.string().min(1, 'Modeli është i detyrueshëm'),
  plateNumber: z.string().min(1, 'Targa është e detyrueshme'),
  chassisNumber: z.string().optional(),
  registrationDate: z.string().optional(),
  registrationExpiry: z.string().optional(),
  technicalControlDate: z.string().optional(),
  insuranceExpiry: z.string().optional(),
  instructorId: z.string().optional(),
});
type VehicleFormData = z.infer<typeof vehicleSchema>;

type DocStatus = 'ok' | 'expiring' | 'expired' | 'missing';

function classifyDoc(dateStr: string | null): DocStatus {
  if (!dateStr) return 'missing';
  const days = differenceInDays(parseISO(dateStr), new Date());
  if (days < 0) return 'expired';
  if (days <= 30) return 'expiring';
  return 'ok';
}

/** Worst of the 3 documents on a vehicle, ignoring missing dates. */
function worstDocOf(v: Vehicle): DocStatus {
  const statuses: DocStatus[] = [
    classifyDoc(v.registrationExpiry),
    classifyDoc(v.technicalControlDate),
    classifyDoc(v.insuranceExpiry),
  ];
  if (statuses.includes('expired')) return 'expired';
  if (statuses.includes('expiring')) return 'expiring';
  if (statuses.every((s) => s === 'missing')) return 'missing';
  return 'ok';
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

const PLATE_TONES = [
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
  return PLATE_TONES[h % PLATE_TONES.length];
}

/* ─────────────────────────────────────────────────────────────────────────
   Page
   ───────────────────────────────────────────────────────────────────────── */

export default function AutomjetetPage() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [docFilter, setDocFilter] = useState<'all' | DocStatus>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingVehicle, setDeletingVehicle] = useState<Vehicle | null>(null);

  /* ── Data ─────────────────────────────────────────────────────────────── */

  const { data: vehiclesData, isLoading } = useQuery<VehiclesResponse>({
    queryKey: ['vehicles', { search, activeFilter, page, pageSize }],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, pageSize };
      if (search) params.search = search;
      if (activeFilter !== 'all') params.isActive = activeFilter === 'active' ? 'true' : 'false';
      const res = await api.get('/vehicles', { params });
      return res as unknown as VehiclesResponse;
    },
  });

  const allVehicles = vehiclesData?.data ?? [];
  const pagination = vehiclesData?.pagination;

  // Client-side doc filter (backend doesn't expose this)
  const vehicles = useMemo(() => {
    if (docFilter === 'all') return allVehicles;
    return allVehicles.filter((v) => worstDocOf(v) === docFilter);
  }, [allVehicles, docFilter]);

  const { data: instructorOptionsRaw } = useQuery({
    queryKey: ['instructors-options'],
    queryFn: async () => {
      const res = await api.get('/instructors', {
        params: { pageSize: 200, isActive: 'true' },
      });
      return unwrapList<InstructorOption>(res);
    },
  });
  const instructorOptions = Array.isArray(instructorOptionsRaw) ? instructorOptionsRaw : [];

  /* ── Metrics ──────────────────────────────────────────────────────────── */

  const metrics = useMemo(() => {
    let active = 0;
    let inactive = 0;
    let withInstructor = 0;
    let withoutInstructor = 0;
    let expiredDocs = 0;
    let expiringDocs = 0;
    const vehicleDocCounts = { ok: 0, expiring: 0, expired: 0, missing: 0 };

    allVehicles.forEach((v) => {
      if (v.isActive) active += 1;
      else inactive += 1;
      if (v.instructorId) withInstructor += 1;
      else withoutInstructor += 1;
      [v.registrationExpiry, v.technicalControlDate, v.insuranceExpiry].forEach((d) => {
        const s = classifyDoc(d);
        if (s === 'expired') expiredDocs += 1;
        else if (s === 'expiring') expiringDocs += 1;
      });
      vehicleDocCounts[worstDocOf(v)] += 1;
    });

    return {
      total: allVehicles.length,
      active,
      inactive,
      withInstructor,
      withoutInstructor,
      expiredDocs,
      expiringDocs,
      docAlertVehicles: vehicleDocCounts.expired + vehicleDocCounts.expiring,
      vehicleDocCounts,
    };
  }, [allVehicles]);

  /* ── Mutations ────────────────────────────────────────────────────────── */

  const createMutation = useMutation({
    mutationFn: (data: VehicleFormData) => api.post('/vehicles', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      handleCloseDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: VehicleFormData }) =>
      api.put(`/vehicles/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      handleCloseDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/vehicles/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      setDeleteDialogOpen(false);
      setDeletingVehicle(null);
    },
  });

  /* ── Form ─────────────────────────────────────────────────────────────── */

  const form = useForm<VehicleFormData>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      make: '', model: '', plateNumber: '', chassisNumber: '',
      registrationDate: '', registrationExpiry: '',
      technicalControlDate: '', insuranceExpiry: '',
      instructorId: '',
    },
  });

  function handleOpenCreate() {
    setEditingVehicle(null);
    form.reset({
      make: '', model: '', plateNumber: '', chassisNumber: '',
      registrationDate: '', registrationExpiry: '',
      technicalControlDate: '', insuranceExpiry: '',
      instructorId: '',
    });
    setDialogOpen(true);
  }

  function handleOpenEdit(vehicle: Vehicle) {
    setEditingVehicle(vehicle);
    form.reset({
      make: vehicle.make,
      model: vehicle.model,
      plateNumber: vehicle.plateNumber,
      chassisNumber: vehicle.chassisNumber ?? '',
      registrationDate: vehicle.registrationDate?.split('T')[0] ?? '',
      registrationExpiry: vehicle.registrationExpiry?.split('T')[0] ?? '',
      technicalControlDate: vehicle.technicalControlDate?.split('T')[0] ?? '',
      insuranceExpiry: vehicle.insuranceExpiry?.split('T')[0] ?? '',
      instructorId: vehicle.instructorId ?? '',
    });
    setDialogOpen(true);
  }

  function handleCloseDialog() {
    setDialogOpen(false);
    setEditingVehicle(null);
    form.reset();
  }

  function handleSubmit(data: VehicleFormData) {
    const cleanData = {
      ...data,
      chassisNumber: data.chassisNumber || undefined,
      registrationDate: data.registrationDate || undefined,
      registrationExpiry: data.registrationExpiry || undefined,
      technicalControlDate: data.technicalControlDate || undefined,
      insuranceExpiry: data.insuranceExpiry || undefined,
      instructorId: data.instructorId || undefined,
    };
    if (editingVehicle) {
      updateMutation.mutate({ id: editingVehicle.id, data: cleanData });
    } else {
      createMutation.mutate(cleanData);
    }
  }

  function handleDelete(vehicle: Vehicle) {
    setDeletingVehicle(vehicle);
    setDeleteDialogOpen(true);
  }

  const clearFilters = () => {
    setActiveFilter('all');
    setDocFilter('all');
    setSearch('');
    setPage(1);
  };

  const anyFilterActive =
    activeFilter !== 'all' || docFilter !== 'all' || !!search;

  /* ── Columns ──────────────────────────────────────────────────────────── */

  const columns: ColumnDef<Vehicle>[] = useMemo(
    () => [
      {
        id: 'vehicle',
        header: 'Automjeti',
        cell: ({ row }) => {
          const v = row.original;
          return (
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  'grid h-9 w-9 shrink-0 place-items-center rounded-lg ring-1 ring-inset',
                  toneFor(v.plateNumber)
                )}
              >
                <Car className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-[13.5px] font-semibold text-slate-900">
                  {v.make} <span className="font-normal text-slate-600">{v.model}</span>
                </p>
                <p className="mt-0.5 inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold tracking-wider text-slate-700">
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 ring-1 ring-inset ring-slate-200">
                    {v.plateNumber}
                  </span>
                  {v.chassisNumber && (
                    <span className="truncate text-[10.5px] font-normal tracking-normal text-slate-400">
                      VIN: {v.chassisNumber}
                    </span>
                  )}
                </p>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'instructorName',
        header: 'Instruktori',
        cell: ({ row }) => {
          const name = row.original.instructorName;
          if (!name) {
            return (
              <span className="inline-flex items-center gap-1.5 text-[12px] text-slate-400">
                <UserCircle className="h-3.5 w-3.5" />
                I pacaktuar
              </span>
            );
          }
          return (
            <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-slate-700">
              <UserCircle className="h-3.5 w-3.5 text-slate-400" />
              {name}
            </span>
          );
        },
      },
      {
        accessorKey: 'registrationExpiry',
        header: 'Regjistrimi',
        cell: ({ row }) => <DocCell date={row.original.registrationExpiry} icon={FileText} />,
      },
      {
        accessorKey: 'technicalControlDate',
        header: 'Kontrolli Teknik',
        cell: ({ row }) => <DocCell date={row.original.technicalControlDate} icon={Wrench} />,
      },
      {
        accessorKey: 'insuranceExpiry',
        header: 'Sigurimi',
        cell: ({ row }) => <DocCell date={row.original.insuranceExpiry} icon={ShieldCheck} />,
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
      <PageHeader title="Automjetet" description="Menaxho automjetet e autoshkollës">
        <ExportButton resource="vehicles" params={search ? { search } : {}} />
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Shto Automjet
        </Button>
      </PageHeader>

      {/* Document expiry alert banner */}
      {metrics.docAlertVehicles > 0 && !isLoading && (
        <DocAlertBanner
          expiredVehicles={metrics.vehicleDocCounts.expired}
          expiringVehicles={metrics.vehicleDocCounts.expiring}
          active={docFilter}
          onJump={(status) => {
            setDocFilter(docFilter === status ? 'all' : status);
            setPage(1);
          }}
        />
      )}

      {/* KPI tiles */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={Car}
          tone="slate"
          label="Automjete gjithsej"
          value={String(metrics.total)}
          footer={
            <span className="text-xs text-slate-500">
              <span className="font-semibold text-emerald-700">{metrics.active}</span> aktive
              <span className="px-1.5 text-slate-300">•</span>
              <span className="text-slate-500">{metrics.inactive} joaktive</span>
            </span>
          }
        />
        <KpiCard
          icon={UserCircle}
          tone={metrics.withoutInstructor > 0 ? 'amber' : 'emerald'}
          label="Me instruktor"
          value={String(metrics.withInstructor)}
          footer={
            <span className="text-xs text-slate-500">
              {metrics.withoutInstructor > 0
                ? `${metrics.withoutInstructor} pa instruktor të caktuar`
                : 'Të gjitha të caktuara'}
            </span>
          }
        />
        <KpiCard
          icon={AlertTriangle}
          tone={metrics.docAlertVehicles > 0 ? 'amber' : 'emerald'}
          label="Automjete me probleme"
          value={String(metrics.docAlertVehicles)}
          footer={
            metrics.docAlertVehicles > 0 ? (
              <span className="text-xs text-slate-500">
                <span className="font-semibold text-rose-700">{metrics.vehicleDocCounts.expired}</span> me dok. të skaduara
                <span className="px-1.5 text-slate-300">•</span>
                <span className="font-semibold text-amber-700">{metrics.vehicleDocCounts.expiring}</span> së shpejti
              </span>
            ) : (
              <span className="text-xs text-emerald-600">Të gjitha në rregull</span>
            )
          }
        />
        <KpiCard
          icon={ShieldAlert}
          tone={metrics.expiredDocs + metrics.expiringDocs > 0 ? 'rose' : 'emerald'}
          label="Dokumente me probleme"
          value={String(metrics.expiredDocs + metrics.expiringDocs)}
          footer={
            <span className="text-xs text-slate-500">
              {metrics.expiredDocs > 0 || metrics.expiringDocs > 0 ? (
                <>
                  <span className="font-semibold text-rose-700">{metrics.expiredDocs}</span> skaduar
                  <span className="px-1.5 text-slate-300">•</span>
                  <span className="font-semibold text-amber-700">{metrics.expiringDocs}</span> së shpejti
                </>
              ) : (
                'Asnjë problem aktiv'
              )}
            </span>
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
            placeholder="Kërko automjet (marka, model, targa)…"
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          <span className="mr-1 hidden text-[11px] font-medium uppercase tracking-wider text-slate-400 sm:inline">Statusi</span>
          <FilterChip label="Të gjitha"  active={activeFilter === 'all'}      onClick={() => setActiveFilter('all')} />
          <FilterChip label="Aktiv"      count={metrics.active}   active={activeFilter === 'active'}   onClick={() => setActiveFilter(activeFilter === 'active' ? 'all' : 'active')} />
          <FilterChip label="Joaktiv"    count={metrics.inactive} active={activeFilter === 'inactive'} onClick={() => setActiveFilter(activeFilter === 'inactive' ? 'all' : 'inactive')} />
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

      {/* Document filter active strip */}
      {docFilter !== 'all' && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2 text-[12.5px] text-amber-900">
          <ShieldAlert className="h-4 w-4 text-amber-600" />
          <span className="font-medium">
            Po shfaqen vetëm automjetet me dokumente{' '}
            {docFilter === 'expired' && <strong>të skaduara</strong>}
            {docFilter === 'expiring' && <strong>që skadojnë në 30 ditë</strong>}
            {docFilter === 'ok' && <strong>në rregull</strong>}
            {docFilter === 'missing' && <strong>pa data</strong>}
          </span>
          <button
            type="button"
            onClick={() => setDocFilter('all')}
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
        data={vehicles}
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
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>{editingVehicle ? 'Edito Automjetin' : 'Shto Automjet të Ri'}</DialogTitle>
            <DialogDescription>
              {editingVehicle
                ? 'Ndrysho të dhënat e automjetit.'
                : 'Plotëso të dhënat për të shtuar një automjet të ri.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="make">Marka *</Label>
                <Input id="make" placeholder="p.sh. Volkswagen" {...form.register('make')} />
                {form.formState.errors.make && (
                  <p className="text-[11.5px] text-rose-600">{form.formState.errors.make.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="model">Modeli *</Label>
                <Input id="model" placeholder="p.sh. Golf 7" {...form.register('model')} />
                {form.formState.errors.model && (
                  <p className="text-[11.5px] text-rose-600">{form.formState.errors.model.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="plateNumber">Targa *</Label>
                <Input
                  id="plateNumber"
                  placeholder="p.sh. 01-123-AB"
                  className="font-mono"
                  {...form.register('plateNumber')}
                />
                {form.formState.errors.plateNumber && (
                  <p className="text-[11.5px] text-rose-600">{form.formState.errors.plateNumber.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="chassisNumber">Nr. shasie (VIN)</Label>
                <Input id="chassisNumber" className="font-mono" {...form.register('chassisNumber')} />
              </div>
            </div>

            <fieldset className="space-y-3 rounded-lg border border-slate-200 p-3">
              <legend className="px-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Dokumentet & datat
              </legend>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="registrationDate">Data e regjistrimit</Label>
                  <Input id="registrationDate" type="date" {...form.register('registrationDate')} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="registrationExpiry">Regjistrimi skadon</Label>
                  <Input id="registrationExpiry" type="date" {...form.register('registrationExpiry')} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="technicalControlDate">Kontrolli teknik</Label>
                  <Input id="technicalControlDate" type="date" {...form.register('technicalControlDate')} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="insuranceExpiry">Sigurimi skadon</Label>
                  <Input id="insuranceExpiry" type="date" {...form.register('insuranceExpiry')} />
                </div>
              </div>
            </fieldset>

            <div className="space-y-1.5">
              <Label htmlFor="instructorId">Instruktori</Label>
              <Controller
                control={form.control}
                name="instructorId"
                render={({ field }) => (
                  <Select
                    value={field.value || 'none'}
                    onValueChange={(val) => field.onChange(val === 'none' ? '' : val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Zgjidh instruktorin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Pa instruktor</SelectItem>
                      {instructorOptions.map((inst) => (
                        <SelectItem key={inst.id} value={inst.id}>
                          {inst.firstName} {inst.lastName} ({inst.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Anulo
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {createMutation.isPending || updateMutation.isPending
                  ? 'Duke ruajtur…'
                  : editingVehicle
                    ? 'Ruaj Ndryshimet'
                    : 'Shto Automjetin'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Fshi Automjetin"
        description={`A jeni të sigurt që doni ta fshini automjetin "${deletingVehicle?.make ?? ''} ${deletingVehicle?.model ?? ''}" me targë "${deletingVehicle?.plateNumber ?? ''}"? Ky veprim nuk mund të kthehet mbrapa.`}
        confirmText="Fshi"
        cancelText="Anulo"
        variant="destructive"
        onConfirm={() => {
          if (deletingVehicle) deleteMutation.mutate(deletingVehicle.id);
        }}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Pieces
   ───────────────────────────────────────────────────────────────────────── */

function DocCell({
  date,
  icon: Icon,
}: {
  date: string | null;
  icon: React.ComponentType<{ className?: string }>;
}) {
  if (!date) {
    return (
      <span className="inline-flex items-center gap-1 text-[11.5px] text-slate-400">
        <Icon className="h-3 w-3" />
        Pa datë
      </span>
    );
  }
  const status = classifyDoc(date);
  const days = differenceInDays(parseISO(date), new Date());

  if (status === 'ok') {
    return (
      <div className="space-y-0.5">
        <p className="inline-flex items-center gap-1 tabular-nums text-[12px] text-slate-700">
          <Icon className="h-3 w-3 text-slate-400" />
          {formatDate(date)}
        </p>
        <p className="text-[10.5px] text-slate-400">{days} ditë të mbetura</p>
      </div>
    );
  }

  if (status === 'expiring') {
    return (
      <div className="space-y-0.5">
        <p className="inline-flex items-center gap-1 tabular-nums text-[12px] font-semibold text-amber-700">
          <Icon className="h-3 w-3 text-amber-500" />
          {formatDate(date)}
        </p>
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
      <p className="inline-flex items-center gap-1 tabular-nums text-[12px] font-semibold text-rose-700">
        <Icon className="h-3 w-3 text-rose-500" />
        {formatDate(date)}
      </p>
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-1.5 py-0.5 text-[10.5px] font-semibold text-rose-700 ring-1 ring-inset ring-rose-200">
        <ShieldAlert className="h-2.5 w-2.5" />
        Skaduar ({Math.abs(days)} ditë më parë)
      </span>
    </div>
  );
}

function DocAlertBanner({
  expiredVehicles,
  expiringVehicles,
  active,
  onJump,
}: {
  expiredVehicles: number;
  expiringVehicles: number;
  active: 'all' | DocStatus;
  onJump: (status: DocStatus) => void;
}) {
  const tone = expiredVehicles > 0 ? 'rose' : 'amber';
  const Icon = expiredVehicles > 0 ? ShieldAlert : AlertTriangle;
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
          Dokumente që kërkojnë vëmendje
        </p>
        <p className="mt-0.5 text-[12.5px] text-slate-700">
          Disa automjete kanë regjistrim, kontroll teknik ose sigurim që po skadon ose që ka skaduar.
        </p>
      </div>
      <div className="flex items-center gap-1.5">
        {expiredVehicles > 0 && (
          <FilterChip
            label="Skaduar"
            count={expiredVehicles}
            active={active === 'expired'}
            onClick={() => onJump('expired')}
          />
        )}
        {expiringVehicles > 0 && (
          <FilterChip
            label="Skadojnë së shpejti"
            count={expiringVehicles}
            active={active === 'expiring'}
            onClick={() => onJump('expiring')}
          />
        )}
      </div>
    </Card>
  );
}
