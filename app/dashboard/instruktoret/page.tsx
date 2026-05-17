'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2, Eye, MoreHorizontal, AlertTriangle } from 'lucide-react';
import { differenceInDays, parseISO } from 'date-fns';
import Link from 'next/link';

import api from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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

// --- Validation Schema ---

const instructorSchema = z.object({
  firstName: z.string().min(1, 'Emri eshte i detyrueshem'),
  lastName: z.string().min(1, 'Mbiemri eshte i detyrueshem'),
  personalNumber: z.string().min(1, 'Numri personal eshte i detyrueshem'),
  email: z.string().email('Email i pavlefshem').or(z.literal('')).optional(),
  phone: z.string().optional(),
  position: z.enum(['instructor', 'lecturer', 'both']),
  licenseInfo: z.string().optional(),
  licenseExpiry: z.string().optional().or(z.literal('')),
  costPerCandidate: z.coerce.number().min(0, 'Vlere e pavlefshme'),
  isActive: z.boolean(),
  createLogin: z.boolean().optional(),
  loginEmail: z.string().email('Email i pavlefshem').optional().or(z.literal('')),
  loginPassword: z.string().min(6, 'Fjalekalimi duhet te kete se paku 6 karaktere').optional().or(z.literal('')),
});

type InstructorFormData = z.infer<typeof instructorSchema>;

// --- Position Labels ---

const POSITION_LABELS: Record<string, string> = {
  instructor: 'Instruktor',
  lecturer: 'Ligjerues',
  both: 'Te dyja',
};

const POSITION_VARIANTS: Record<string, 'info' | 'warning' | 'default'> = {
  instructor: 'info',
  lecturer: 'warning',
  both: 'default',
};

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

export default function InstruktoretPage() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [positionFilter, setPositionFilter] = useState<string>('all');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingInstructor, setEditingInstructor] = useState<Instructor | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingInstructor, setDeletingInstructor] = useState<Instructor | null>(null);

  // --- Data Fetching ---

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

  const instructors = instructorsData?.data ?? [];
  const pagination = instructorsData?.pagination;

  // --- Mutations ---

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

  // --- Form ---

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
    // Build clean payload matching backend schema
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
      // Generate code from name initials + timestamp
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

  // --- Table Columns ---

  const columns: ColumnDef<Instructor>[] = useMemo(
    () => [
      {
        accessorKey: 'code',
        header: 'Kodi',
        cell: ({ row }) => (
          <span className="font-mono text-sm">{row.original.code}</span>
        ),
      },
      {
        id: 'emri',
        header: 'Emri',
        cell: ({ row }) => (
          <Link
            href={`/dashboard/instruktoret/${row.original.id}`}
            className="font-medium text-blue-600 hover:underline"
          >
            {row.original.firstName} {row.original.lastName}
          </Link>
        ),
      },
      {
        accessorKey: 'position',
        header: 'Pozita',
        cell: ({ row }) => (
          <Badge variant={POSITION_VARIANTS[row.original.position] ?? 'default'}>
            {POSITION_LABELS[row.original.position] ?? row.original.position}
          </Badge>
        ),
      },
      {
        accessorKey: 'phone',
        header: 'Telefoni',
        cell: ({ row }) => row.original.phone || '-',
      },
      {
        accessorKey: 'email',
        header: 'Email',
        cell: ({ row }) => row.original.email || '-',
      },
      {
        accessorKey: 'licenseExpiry',
        header: 'Licenca Skadon',
        cell: ({ row }) => <ExpiryCell dateStr={row.original.licenseExpiry} />,
      },
      {
        accessorKey: 'totalHoursCompleted',
        header: 'Ore te Realizuara',
        cell: ({ row }) => row.original.totalHoursCompleted ?? 0,
      },
      {
        accessorKey: 'vehicleName',
        header: 'Automjeti',
        cell: ({ row }) => row.original.vehicleName || '-',
      },
      {
        accessorKey: 'activeCandidates',
        header: 'Kliente Aktive',
        cell: ({ row }) => row.original.activeCandidates ?? 0,
      },
      {
        accessorKey: 'totalDebt',
        header: 'Borxhi',
        cell: ({ row }) => {
          const debt = row.original.totalDebt ?? 0;
          const color =
            debt <= 0 ? 'text-green-600' : debt < 100 ? 'text-amber-600' : 'text-red-600';
          return <span className={color}>{formatCurrency(debt)}</span>;
        },
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
      <PageHeader title="Instruktoret" description="Menaxho instruktoret dhe ligjeruesit">
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

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={positionFilter} onValueChange={setPositionFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Pozita" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Te gjitha</SelectItem>
            <SelectItem value="instructor">Instruktor</SelectItem>
            <SelectItem value="lecturer">Ligjerues</SelectItem>
            <SelectItem value="both">Te dyja</SelectItem>
          </SelectContent>
        </Select>

        <Select value={activeFilter} onValueChange={setActiveFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Statusi" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Te gjitha</SelectItem>
            <SelectItem value="active">Aktiv</SelectItem>
            <SelectItem value="inactive">Joaktiv</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={instructors}
        isLoading={isLoading}
        searchPlaceholder="Kerko instruktor..."
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
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {editingInstructor ? 'Edito Instruktorin' : 'Shto Instruktor te Ri'}
            </DialogTitle>
            <DialogDescription>
              {editingInstructor
                ? 'Ndrysho te dhenat e instruktorit.'
                : 'Ploteso te dhenat per te shtuar nje instruktor te ri.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Emri *</Label>
                <Input id="firstName" {...form.register('firstName')} />
                {form.formState.errors.firstName && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.firstName.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Mbiemri *</Label>
                <Input id="lastName" {...form.register('lastName')} />
                {form.formState.errors.lastName && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.lastName.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="personalNumber">Numri Personal *</Label>
              <Input id="personalNumber" {...form.register('personalNumber')} />
              {form.formState.errors.personalNumber && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.personalNumber.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...form.register('email')} />
                {form.formState.errors.email && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefoni</Label>
                <Input id="phone" {...form.register('phone')} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="position">Pozita *</Label>
              <Controller
                control={form.control}
                name="position"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Zgjidh poziten" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="instructor">Instruktor</SelectItem>
                      <SelectItem value="lecturer">Ligjerues</SelectItem>
                      <SelectItem value="both">Te dyja</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="licenseInfo">Informata per Licencen</Label>
                <Input id="licenseInfo" {...form.register('licenseInfo')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="licenseExpiry">Licenca Skadon</Label>
                <Input
                  id="licenseExpiry"
                  type="date"
                  {...form.register('licenseExpiry')}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="costPerCandidate">Kosto per Kandidat (EUR)</Label>
              <Input
                id="costPerCandidate"
                type="number"
                step="0.01"
                {...form.register('costPerCandidate')}
              />
              {form.formState.errors.costPerCandidate && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.costPerCandidate.message}
                </p>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Controller
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <Switch
                    id="isActive"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
              <Label htmlFor="isActive">Aktiv</Label>
            </div>

            {/* Create Login Section */}
            {!editingInstructor && (
              <div className="rounded-lg border p-4 space-y-4">
                <div className="flex items-center gap-3">
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
                  <Label htmlFor="createLogin">Krijo llogari per kyqje</Label>
                </div>
                {createLogin && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="loginEmail">Email per kyqje</Label>
                      <Input
                        id="loginEmail"
                        type="email"
                        {...form.register('loginEmail')}
                      />
                      {form.formState.errors.loginEmail && (
                        <p className="text-sm text-destructive">
                          {form.formState.errors.loginEmail.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="loginPassword">Fjalekalimi</Label>
                      <Input
                        id="loginPassword"
                        type="password"
                        {...form.register('loginPassword')}
                      />
                      {form.formState.errors.loginPassword && (
                        <p className="text-sm text-destructive">
                          {form.formState.errors.loginPassword.message}
                        </p>
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
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending
                  ? 'Duke ruajtur...'
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
        description={`A jeni te sigurt qe deshironi te fshini instruktorin "${deletingInstructor?.firstName} ${deletingInstructor?.lastName}"? Ky veprim nuk mund te kthehet mbrapa.`}
        confirmText="Fshi"
        cancelText="Anulo"
        variant="destructive"
        onConfirm={() => {
          if (deletingInstructor) {
            deleteMutation.mutate(deletingInstructor.id);
          }
        }}
      />
    </div>
  );
}
