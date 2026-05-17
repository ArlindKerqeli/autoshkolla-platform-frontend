'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2, MoreHorizontal, AlertTriangle } from 'lucide-react';
import { differenceInDays, parseISO } from 'date-fns';

import api from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
import { ExportButton } from '@/components/shared/ExportButton';

// --- Types ---

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

// --- Validation Schema ---

const vehicleSchema = z.object({
  make: z.string().min(1, 'Marka eshte e detyrueshme'),
  model: z.string().min(1, 'Modeli eshte i detyrueshem'),
  plateNumber: z.string().min(1, 'Targa eshte e detyrueshme'),
  chassisNumber: z.string().optional(),
  registrationDate: z.string().optional(),
  registrationExpiry: z.string().optional(),
  technicalControlDate: z.string().optional(),
  insuranceExpiry: z.string().optional(),
  instructorId: z.string().optional(),
});

type VehicleFormData = z.infer<typeof vehicleSchema>;

// --- Helpers ---

function isExpiringSoon(dateStr: string | null, thresholdDays = 30): boolean {
  if (!dateStr) return false;
  const days = differenceInDays(parseISO(dateStr), new Date());
  return days >= 0 && days <= thresholdDays;
}

function isExpired(dateStr: string | null): boolean {
  if (!dateStr) return false;
  return differenceInDays(parseISO(dateStr), new Date()) < 0;
}

function ExpiryCell({ dateStr }: { dateStr: string | null }) {
  if (!dateStr) return <span className="text-muted-foreground">-</span>;

  const expired = isExpired(dateStr);
  const expiring = isExpiringSoon(dateStr);

  return (
    <div className="flex items-center gap-1.5">
      <span className={expired ? 'text-red-600' : expiring ? 'text-amber-600' : ''}>
        {formatDate(dateStr)}
      </span>
      {expired && (
        <Badge variant="error" className="text-[10px] px-1.5 py-0">
          Skaduar
        </Badge>
      )}
      {!expired && expiring && (
        <Badge variant="warning" className="text-[10px] px-1.5 py-0">
          <AlertTriangle className="mr-0.5 h-3 w-3" />
          Skadon se shpejti
        </Badge>
      )}
    </div>
  );
}

// --- Page Component ---

export default function AutomjetetPage() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingVehicle, setDeletingVehicle] = useState<Vehicle | null>(null);

  // --- Data Fetching ---

  const { data: vehiclesData, isLoading } = useQuery<VehiclesResponse>({
    queryKey: ['vehicles', { search, page, pageSize }],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, pageSize };
      if (search) params.search = search;
      const res = await api.get('/vehicles', { params });
      return res as unknown as VehiclesResponse;
    },
  });

  const vehicles = vehiclesData?.data ?? [];
  const pagination = vehiclesData?.pagination;

  const { data: instructorOptions } = useQuery<InstructorOption[]>({
    queryKey: ['instructors-options'],
    queryFn: async () => {
      const res = await api.get('/instructors', {
        params: { pageSize: 200, isActive: 'true' },
      });
      return (res as unknown as { data: InstructorOption[] }).data;
    },
  });

  // --- Mutations ---

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

  // --- Form ---

  const form = useForm<VehicleFormData>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      make: '',
      model: '',
      plateNumber: '',
      chassisNumber: '',
      registrationDate: '',
      registrationExpiry: '',
      technicalControlDate: '',
      insuranceExpiry: '',
      instructorId: '',
    },
  });

  function handleOpenCreate() {
    setEditingVehicle(null);
    form.reset({
      make: '',
      model: '',
      plateNumber: '',
      chassisNumber: '',
      registrationDate: '',
      registrationExpiry: '',
      technicalControlDate: '',
      insuranceExpiry: '',
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
    // Clean empty strings to undefined
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

  // --- Table Columns ---

  const columns: ColumnDef<Vehicle>[] = useMemo(
    () => [
      {
        id: 'markaModeli',
        header: 'Marka / Modeli',
        cell: ({ row }) => (
          <div>
            <span className="font-medium">{row.original.make}</span>{' '}
            <span className="text-muted-foreground">{row.original.model}</span>
          </div>
        ),
      },
      {
        accessorKey: 'plateNumber',
        header: 'Targa',
        cell: ({ row }) => (
          <span className="font-mono font-medium">{row.original.plateNumber}</span>
        ),
      },
      {
        accessorKey: 'chassisNumber',
        header: 'Nr. Shasise',
        cell: ({ row }) => (
          <span className="font-mono text-sm">
            {row.original.chassisNumber || '-'}
          </span>
        ),
      },
      {
        accessorKey: 'instructorName',
        header: 'Instruktori',
        cell: ({ row }) => row.original.instructorName || '-',
      },
      {
        accessorKey: 'registrationExpiry',
        header: 'Regjistrimi Skadon',
        cell: ({ row }) => <ExpiryCell dateStr={row.original.registrationExpiry} />,
      },
      {
        accessorKey: 'technicalControlDate',
        header: 'Kontrolli Teknik',
        cell: ({ row }) => (
          <ExpiryCell dateStr={row.original.technicalControlDate} />
        ),
      },
      {
        accessorKey: 'insuranceExpiry',
        header: 'Sigurimi',
        cell: ({ row }) => <ExpiryCell dateStr={row.original.insuranceExpiry} />,
      },
      {
        accessorKey: 'isActive',
        header: 'Statusi',
        cell: ({ row }) => (
          <StatusBadge status={row.original.isActive ? 'active' : 'inactive'} />
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
              <DropdownMenuItem onClick={() => handleOpenEdit(row.original)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edito
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
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

  // --- Render ---

  return (
    <div className="space-y-6">
      <PageHeader title="Automjetet" description="Menaxho automjetet e autoshkolles">
        <ExportButton
          resource="vehicles"
          params={{
            ...(search ? { search } : {}),
          }}
        />
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Shto Automjet
        </Button>
      </PageHeader>

      <DataTable
        columns={columns}
        data={vehicles}
        isLoading={isLoading}
        searchPlaceholder="Kerko automjet..."
        onSearch={setSearch}
        searchValue={search}
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
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>
              {editingVehicle ? 'Edito Automjetin' : 'Shto Automjet te Ri'}
            </DialogTitle>
            <DialogDescription>
              {editingVehicle
                ? 'Ndrysho te dhenat e automjetit.'
                : 'Ploteso te dhenat per te shtuar nje automjet te ri.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="make">Marka *</Label>
                <Input id="make" placeholder="p.sh. Volkswagen" {...form.register('make')} />
                {form.formState.errors.make && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.make.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="model">Modeli *</Label>
                <Input id="model" placeholder="p.sh. Golf 7" {...form.register('model')} />
                {form.formState.errors.model && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.model.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="plateNumber">Targa *</Label>
                <Input
                  id="plateNumber"
                  placeholder="p.sh. 01-123-AB"
                  {...form.register('plateNumber')}
                />
                {form.formState.errors.plateNumber && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.plateNumber.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="chassisNumber">Nr. Shasise</Label>
                <Input id="chassisNumber" {...form.register('chassisNumber')} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="registrationDate">Data e Regjistrimit</Label>
                <Input
                  id="registrationDate"
                  type="date"
                  {...form.register('registrationDate')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="registrationExpiry">Regjistrimi Skadon</Label>
                <Input
                  id="registrationExpiry"
                  type="date"
                  {...form.register('registrationExpiry')}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="technicalControlDate">Kontrolli Teknik</Label>
                <Input
                  id="technicalControlDate"
                  type="date"
                  {...form.register('technicalControlDate')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="insuranceExpiry">Sigurimi Skadon</Label>
                <Input
                  id="insuranceExpiry"
                  type="date"
                  {...form.register('insuranceExpiry')}
                />
              </div>
            </div>

            <div className="space-y-2">
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
                      {(instructorOptions ?? []).map((inst) => (
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
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending
                  ? 'Duke ruajtur...'
                  : editingVehicle
                    ? 'Ruaj Ndryshimet'
                    : 'Shto Automjetin'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Fshi Automjetin"
        description={`A jeni te sigurt qe deshironi te fshini automjetin "${deletingVehicle?.make} ${deletingVehicle?.model}" me targe "${deletingVehicle?.plateNumber}"? Ky veprim nuk mund te kthehet mbrapa.`}
        confirmText="Fshi"
        cancelText="Anulo"
        variant="destructive"
        onConfirm={() => {
          if (deletingVehicle) {
            deleteMutation.mutate(deletingVehicle.id);
          }
        }}
      />
    </div>
  );
}
