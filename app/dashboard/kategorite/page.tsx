'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2, MoreHorizontal, CheckCircle2, XCircle } from 'lucide-react';

import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';

// --- Types ---

interface Category {
  id: string;
  code: string;
  description: string;
  theoryHours: number;
  practicalHours: number;
  price: number;
  contractPrice: number;
  verificationText: string | null;
  verificationCode: string | null;
  isLicensed: boolean;
  isActive: boolean;
  createdAt: string;
}

interface CategoriesResponse {
  data: Category[];
  pagination?: {
    page: number;
    totalPages: number;
    totalItems: number;
    pageSize: number;
  };
}

// --- Validation Schema ---

const categorySchema = z.object({
  code: z.string().min(1, 'Kodi eshte i detyrueshem'),
  description: z.string().min(1, 'Pershkrimi eshte i detyrueshem'),
  theoryHours: z.coerce.number().int().min(0, 'Vlere e pavlefshme'),
  practicalHours: z.coerce.number().int().min(0, 'Vlere e pavlefshme'),
  price: z.coerce.number().min(0, 'Vlere e pavlefshme'),
  contractPrice: z.coerce.number().min(0, 'Vlere e pavlefshme'),
  verificationText: z.string().optional(),
  verificationCode: z.string().optional(),
  isLicensed: z.boolean(),
  isActive: z.boolean(),
});

type CategoryFormData = z.infer<typeof categorySchema>;

// --- Page Component ---

export default function KategoritePage() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);

  // --- Data Fetching ---

  const { data: categoriesData, isLoading } = useQuery<CategoriesResponse>({
    queryKey: ['categories', { search, page, pageSize }],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, pageSize };
      if (search) params.search = search;
      const res = await api.get('/categories', { params });
      return res as unknown as CategoriesResponse;
    },
  });

  const categories = categoriesData?.data ?? [];
  const pagination = categoriesData?.pagination;

  // --- Mutations ---

  const createMutation = useMutation({
    mutationFn: (data: CategoryFormData) => api.post('/categories', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      handleCloseDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CategoryFormData }) =>
      api.put(`/categories/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      handleCloseDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setDeleteDialogOpen(false);
      setDeletingCategory(null);
    },
  });

  // --- Form ---

  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      code: '',
      description: '',
      theoryHours: 0,
      practicalHours: 0,
      price: 0,
      contractPrice: 0,
      verificationText: '',
      verificationCode: '',
      isLicensed: false,
      isActive: true,
    },
  });

  function handleOpenCreate() {
    setEditingCategory(null);
    form.reset({
      code: '',
      description: '',
      theoryHours: 0,
      practicalHours: 0,
      price: 0,
      contractPrice: 0,
      verificationText: '',
      verificationCode: '',
      isLicensed: false,
      isActive: true,
    });
    setDialogOpen(true);
  }

  function handleOpenEdit(category: Category) {
    setEditingCategory(category);
    form.reset({
      code: category.code,
      description: category.description,
      theoryHours: category.theoryHours,
      practicalHours: category.practicalHours,
      price: category.price,
      contractPrice: category.contractPrice,
      verificationText: category.verificationText ?? '',
      verificationCode: category.verificationCode ?? '',
      isLicensed: category.isLicensed,
      isActive: category.isActive,
    });
    setDialogOpen(true);
  }

  function handleCloseDialog() {
    setDialogOpen(false);
    setEditingCategory(null);
    form.reset();
  }

  function handleSubmit(data: CategoryFormData) {
    const cleanData: Record<string, unknown> = {
      code: data.code,
      description: data.description || undefined,
      theoryHours: data.theoryHours,
      practicalHours: data.practicalHours,
      price: data.price,
      contractPrice: data.contractPrice || undefined,
      verificationText: data.verificationText || undefined,
      verificationCode: data.verificationCode || undefined,
      isLicensed: data.isLicensed,
    };

    if (editingCategory) {
      // Update can include isActive
      cleanData.isActive = data.isActive;
      updateMutation.mutate({ id: editingCategory.id, data: cleanData as CategoryFormData });
    } else {
      // Create doesn't accept isActive (defaults to true)
      createMutation.mutate(cleanData as CategoryFormData);
    }
  }

  function handleDelete(category: Category) {
    setDeletingCategory(category);
    setDeleteDialogOpen(true);
  }

  // --- Table Columns ---

  const columns: ColumnDef<Category>[] = useMemo(
    () => [
      {
        accessorKey: 'code',
        header: 'Kodi',
        cell: ({ row }) => (
          <span className="rounded bg-gray-100 px-2 py-1 font-mono font-bold text-sm">
            {row.original.code}
          </span>
        ),
      },
      {
        accessorKey: 'description',
        header: 'Pershkrimi',
        cell: ({ row }) => (
          <span className="font-medium">{row.original.description}</span>
        ),
      },
      {
        accessorKey: 'theoryHours',
        header: 'Ore Teorike',
        cell: ({ row }) => row.original.theoryHours,
      },
      {
        accessorKey: 'practicalHours',
        header: 'Ore Praktike',
        cell: ({ row }) => row.original.practicalHours,
      },
      {
        accessorKey: 'price',
        header: 'Cmimi',
        cell: ({ row }) => (
          <span className="font-medium">{formatCurrency(row.original.price)}</span>
        ),
      },
      {
        accessorKey: 'contractPrice',
        header: 'Cmimi i Kontrates',
        cell: ({ row }) => formatCurrency(row.original.contractPrice),
      },
      {
        accessorKey: 'isLicensed',
        header: 'E Licencuar',
        cell: ({ row }) =>
          row.original.isLicensed ? (
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          ) : (
            <XCircle className="h-5 w-5 text-gray-300" />
          ),
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
      <PageHeader title="Kategorite" description="Menaxho kategorite e patentes">
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Shto Kategori
        </Button>
      </PageHeader>

      <DataTable
        columns={columns}
        data={categories}
        isLoading={isLoading}
        searchPlaceholder="Kerko kategori..."
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
              {editingCategory ? 'Edito Kategorine' : 'Shto Kategori te Re'}
            </DialogTitle>
            <DialogDescription>
              {editingCategory
                ? 'Ndrysho te dhenat e kategorise.'
                : 'Ploteso te dhenat per te shtuar nje kategori te re.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">Kodi *</Label>
                <Input id="code" placeholder="p.sh. B, C, CE, D" {...form.register('code')} />
                {form.formState.errors.code && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.code.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Pershkrimi *</Label>
                <Input
                  id="description"
                  placeholder="p.sh. Kategoria B"
                  {...form.register('description')}
                />
                {form.formState.errors.description && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.description.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="theoryHours">Ore Teorike *</Label>
                <Input
                  id="theoryHours"
                  type="number"
                  min="0"
                  {...form.register('theoryHours')}
                />
                {form.formState.errors.theoryHours && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.theoryHours.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="practicalHours">Ore Praktike *</Label>
                <Input
                  id="practicalHours"
                  type="number"
                  min="0"
                  {...form.register('practicalHours')}
                />
                {form.formState.errors.practicalHours && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.practicalHours.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Cmimi (EUR) *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  {...form.register('price')}
                />
                {form.formState.errors.price && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.price.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="contractPrice">Cmimi i Kontrates (EUR) *</Label>
                <Input
                  id="contractPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  {...form.register('contractPrice')}
                />
                {form.formState.errors.contractPrice && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.contractPrice.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="verificationText">Teksti i Vertetimit</Label>
              <Textarea
                id="verificationText"
                placeholder="Teksti qe shfaqet ne vertetim (opsionale)"
                {...form.register('verificationText')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="verificationCode">Kodi i Vertetimit</Label>
              <Input
                id="verificationCode"
                placeholder="Kodi per vertetim (opsionale)"
                {...form.register('verificationCode')}
              />
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <Controller
                  control={form.control}
                  name="isLicensed"
                  render={({ field }) => (
                    <Switch
                      id="isLicensed"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
                <Label htmlFor="isLicensed">E Licencuar</Label>
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
                <Label htmlFor="isActive">Aktive</Label>
              </div>
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
                  : editingCategory
                    ? 'Ruaj Ndryshimet'
                    : 'Shto Kategorine'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Fshi Kategorine"
        description={`A jeni te sigurt qe deshironi te fshini kategorine "${deletingCategory?.code} - ${deletingCategory?.description}"? Ky veprim nuk mund te kthehet mbrapa.`}
        confirmText="Fshi"
        cancelText="Anulo"
        variant="destructive"
        onConfirm={() => {
          if (deletingCategory) {
            deleteMutation.mutate(deletingCategory.id);
          }
        }}
      />
    </div>
  );
}
