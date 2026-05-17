'use client';

import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import {
  Plus,
  Pencil,
  Trash2,
  Receipt,
  Car,
  Tag,
  Settings2,
} from 'lucide-react';
import api from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/utils';
import type {
  Expense,
  ExpenseType,
  Vehicle,
  ExpenseSummary,
  PaginatedResponse,
} from '@/lib/types';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
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
import { Separator } from '@/components/ui/separator';
import { ExportButton } from '@/components/shared/ExportButton';

function getDefaultDateRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    startDate: format(start, 'yyyy-MM-dd'),
    endDate: format(now, 'yyyy-MM-dd'),
  };
}

interface ExpenseFormData {
  date: string;
  expenseTypeId: string;
  vehicleId: string;
  amount: string;
  description: string;
}

const emptyExpenseForm: ExpenseFormData = {
  date: format(new Date(), 'yyyy-MM-dd'),
  expenseTypeId: '',
  vehicleId: '',
  amount: '',
  description: '',
};

interface ExpenseTypeFormData {
  name: string;
  isActive: boolean;
}

const emptyTypeForm: ExpenseTypeFormData = {
  name: '',
  isActive: true,
};

export default function ShpenzimetPage() {
  const queryClient = useQueryClient();
  const defaults = getDefaultDateRange();
  const [startDate, setStartDate] = useState(defaults.startDate);
  const [endDate, setEndDate] = useState(defaults.endDate);
  const [vehicleFilter, setVehicleFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Expense form dialog
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [expenseForm, setExpenseForm] = useState<ExpenseFormData>(emptyExpenseForm);

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);

  // Expense types management
  const [typesDialogOpen, setTypesDialogOpen] = useState(false);
  const [typeFormOpen, setTypeFormOpen] = useState(false);
  const [editingType, setEditingType] = useState<ExpenseType | null>(null);
  const [typeForm, setTypeForm] = useState<ExpenseTypeFormData>(emptyTypeForm);
  const [deleteTypeTarget, setDeleteTypeTarget] = useState<ExpenseType | null>(null);

  // --- Data Fetching ---

  const { data: summary } = useQuery({
    queryKey: ['expenses-summary', startDate, endDate],
    queryFn: async () => {
      const res = await api.get('/expenses-summary', {
        params: { startDate, endDate },
      });
      return res.data as ExpenseSummary;
    },
  });

  const { data: expensesData, isLoading } = useQuery({
    queryKey: ['expenses', startDate, endDate, vehicleFilter, typeFilter, search, page, pageSize],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        startDate,
        endDate,
        page,
        perPage: pageSize,
      };
      if (vehicleFilter !== 'all') params.vehicleId = vehicleFilter;
      if (typeFilter !== 'all') params.expenseTypeId = typeFilter;
      if (search) params.search = search;
      const res = await api.get('/expenses', { params });
      return res as unknown as PaginatedResponse<Expense>;
    },
  });

  const { data: vehiclesData } = useQuery({
    queryKey: ['vehicles'],
    queryFn: async () => {
      const res = await api.get('/vehicles');
      return res.data as Vehicle[];
    },
  });

  const { data: expenseTypesData } = useQuery({
    queryKey: ['expense-types'],
    queryFn: async () => {
      const res = await api.get('/expense-types');
      return res.data as ExpenseType[];
    },
  });

  const vehicles = vehiclesData ?? [];
  const expenseTypes = expenseTypesData ?? [];
  const expenses = expensesData?.data ?? [];
  const pagination = expensesData?.pagination;

  // --- Mutations ---

  const createExpense = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post('/expenses', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expenses-summary'] });
      closeExpenseDialog();
    },
  });

  const updateExpense = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.put(`/expenses/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expenses-summary'] });
      closeExpenseDialog();
    },
  });

  const deleteExpense = useMutation({
    mutationFn: (id: string) => api.delete(`/expenses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expenses-summary'] });
      setDeleteTarget(null);
    },
  });

  const createExpenseType = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post('/expense-types', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-types'] });
      closeTypeForm();
    },
  });

  const updateExpenseType = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.put(`/expense-types/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-types'] });
      closeTypeForm();
    },
  });

  const deleteExpenseType = useMutation({
    mutationFn: (id: string) => api.delete(`/expense-types/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-types'] });
      setDeleteTypeTarget(null);
    },
  });

  // --- Handlers ---

  const openNewExpense = useCallback(() => {
    setEditingExpense(null);
    setExpenseForm(emptyExpenseForm);
    setExpenseDialogOpen(true);
  }, []);

  const openEditExpense = useCallback((expense: Expense) => {
    setEditingExpense(expense);
    setExpenseForm({
      date: expense.date,
      expenseTypeId: expense.expenseTypeId,
      vehicleId: expense.vehicleId ?? '',
      amount: String(expense.amount),
      description: expense.description ?? '',
    });
    setExpenseDialogOpen(true);
  }, []);

  const closeExpenseDialog = useCallback(() => {
    setExpenseDialogOpen(false);
    setEditingExpense(null);
    setExpenseForm(emptyExpenseForm);
  }, []);

  const handleExpenseSubmit = useCallback(() => {
    const payload: Record<string, unknown> = {
      date: expenseForm.date,
      expenseTypeId: expenseForm.expenseTypeId,
      amount: parseFloat(expenseForm.amount),
      description: expenseForm.description || undefined,
    };
    if (expenseForm.vehicleId) payload.vehicleId = expenseForm.vehicleId;

    if (editingExpense) {
      updateExpense.mutate({ id: editingExpense.id, data: payload });
    } else {
      createExpense.mutate(payload);
    }
  }, [expenseForm, editingExpense, createExpense, updateExpense]);

  const closeTypeForm = useCallback(() => {
    setTypeFormOpen(false);
    setEditingType(null);
    setTypeForm(emptyTypeForm);
  }, []);

  const openNewType = useCallback(() => {
    setEditingType(null);
    setTypeForm(emptyTypeForm);
    setTypeFormOpen(true);
  }, []);

  const openEditType = useCallback((t: ExpenseType) => {
    setEditingType(t);
    setTypeForm({ name: t.name, isActive: t.isActive });
    setTypeFormOpen(true);
  }, []);

  const handleTypeSubmit = useCallback(() => {
    const payload = { name: typeForm.name, isActive: typeForm.isActive };
    if (editingType) {
      updateExpenseType.mutate({ id: editingType.id, data: payload });
    } else {
      createExpenseType.mutate(payload);
    }
  }, [typeForm, editingType, createExpenseType, updateExpenseType]);

  // --- Top expense type & vehicle from summary ---
  const topExpenseType = useMemo(() => {
    if (!summary?.byType) return '-';
    const entries = Object.entries(summary.byType);
    if (entries.length === 0) return '-';
    entries.sort((a, b) => b[1] - a[1]);
    const [name, amount] = entries[0];
    return `${name} (${formatCurrency(amount)})`;
  }, [summary]);

  const topVehicle = useMemo(() => {
    if (!summary?.byVehicle) return '-';
    const entries = Object.entries(summary.byVehicle);
    if (entries.length === 0) return '-';
    entries.sort((a, b) => b[1] - a[1]);
    const [name, amount] = entries[0];
    return `${name} (${formatCurrency(amount)})`;
  }, [summary]);

  // --- Table Columns ---

  const columns = useMemo<ColumnDef<Expense, unknown>[]>(
    () => [
      {
        accessorKey: 'date',
        header: 'Data',
        cell: ({ row }) => formatDate(row.original.date),
      },
      {
        id: 'expenseType',
        header: 'Lloji',
        cell: ({ row }) => row.original.expenseType?.name ?? '-',
      },
      {
        id: 'vehicle',
        header: 'Automjeti',
        cell: ({ row }) => {
          const v = row.original.vehicle;
          return v ? `${v.make} ${v.model ?? ''} (${v.plateNumber})` : '-';
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
        accessorKey: 'description',
        header: 'Përshkrimi',
        cell: ({ row }) => (
          <span className="max-w-[200px] truncate block text-sm text-muted-foreground">
            {row.original.description || '-'}
          </span>
        ),
      },
      {
        id: 'actions',
        header: 'Veprimet',
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => openEditExpense(row.original)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive"
              onClick={() => setDeleteTarget(row.original)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    [openEditExpense]
  );

  const isExpenseSubmitting = createExpense.isPending || updateExpense.isPending;
  const isTypeSubmitting = createExpenseType.isPending || updateExpenseType.isPending;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Shpenzimet"
        description="Menaxhimi i shpenzimeve të autoshkollës"
      >
        <ExportButton
          resource="expenses"
          params={{
            startDate,
            endDate,
            ...(vehicleFilter !== 'all' ? { vehicle_id: vehicleFilter } : {}),
            ...(typeFilter !== 'all' ? { expense_type_id: typeFilter } : {}),
          }}
        />
        <Button variant="outline" onClick={() => setTypesDialogOpen(true)}>
          <Settings2 className="mr-2 h-4 w-4" />
          Llojet e Shpenzimeve
        </Button>
        <Button onClick={openNewExpense}>
          <Plus className="mr-2 h-4 w-4" />
          Shto Shpenzim
        </Button>
      </PageHeader>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Shpenzimeve
            </CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(summary?.totalAmount ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {summary?.totalCount ?? 0} shpenzime gjithsej
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Sipas Llojit
            </CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold truncate">{topExpenseType}</div>
            <p className="text-xs text-muted-foreground">
              Lloji më i lartë
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Sipas Automjetit
            </CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold truncate">{topVehicle}</div>
            <p className="text-xs text-muted-foreground">
              Automjeti më i shpenzuar
            </p>
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
          <Label>Automjeti</Label>
          <Select
            value={vehicleFilter}
            onValueChange={(val) => {
              setVehicleFilter(val);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Të gjithë" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Të gjithë</SelectItem>
              {vehicles.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.make} {v.model ?? ''} ({v.plateNumber})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Lloji</Label>
          <Select
            value={typeFilter}
            onValueChange={(val) => {
              setTypeFilter(val);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Të gjithë" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Të gjithë</SelectItem>
              {expenseTypes
                .filter((t) => t.isActive)
                .map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={expenses}
        isLoading={isLoading}
        searchPlaceholder="Kërko shpenzime..."
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

      {/* Add/Edit Expense Dialog */}
      <Dialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>
              {editingExpense ? 'Edito Shpenzimin' : 'Shto Shpenzim'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="expense-date">Data</Label>
              <Input
                id="expense-date"
                type="date"
                value={expenseForm.date}
                onChange={(e) =>
                  setExpenseForm((f) => ({ ...f, date: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Lloji i shpenzimit</Label>
              <Select
                value={expenseForm.expenseTypeId || ''}
                onValueChange={(val) =>
                  setExpenseForm((f) => ({ ...f, expenseTypeId: val }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Zgjedh llojin" />
                </SelectTrigger>
                <SelectContent>
                  {expenseTypes
                    .filter((t) => t.isActive)
                    .map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Automjeti (opsionale)</Label>
              <Select
                value={expenseForm.vehicleId || 'none'}
                onValueChange={(val) =>
                  setExpenseForm((f) => ({
                    ...f,
                    vehicleId: val === 'none' ? '' : val,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Zgjedh automjetin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Asnjë</SelectItem>
                  {vehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.make} {v.model ?? ''} ({v.plateNumber})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="expense-amount">Shuma (&euro;)</Label>
              <Input
                id="expense-amount"
                type="number"
                min="0"
                step="0.01"
                value={expenseForm.amount}
                onChange={(e) =>
                  setExpenseForm((f) => ({ ...f, amount: e.target.value }))
                }
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="expense-desc">Përshkrimi</Label>
              <Textarea
                id="expense-desc"
                value={expenseForm.description}
                onChange={(e) =>
                  setExpenseForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="Përshkrimi i shpenzimit..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeExpenseDialog}>
              Anulo
            </Button>
            <Button
              onClick={handleExpenseSubmit}
              disabled={
                isExpenseSubmitting ||
                !expenseForm.date ||
                !expenseForm.expenseTypeId ||
                !expenseForm.amount
              }
            >
              {isExpenseSubmitting ? 'Duke ruajtur...' : 'Ruaj'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Expense Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Fshi Shpenzimin"
        description="A jeni të sigurt që doni ta fshini këtë shpenzim? Ky veprim nuk mund të kthehet."
        confirmText="Fshi"
        cancelText="Anulo"
        variant="destructive"
        onConfirm={() => deleteTarget && deleteExpense.mutate(deleteTarget.id)}
      />

      {/* Expense Types Management Dialog */}
      <Dialog open={typesDialogOpen} onOpenChange={setTypesDialogOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Llojet e Shpenzimeve</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex justify-end">
              <Button size="sm" onClick={openNewType}>
                <Plus className="mr-2 h-4 w-4" />
                Shto Lloj
              </Button>
            </div>
            <div className="rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-2 text-left font-medium">Emri</th>
                    <th className="px-4 py-2 text-left font-medium">Statusi</th>
                    <th className="px-4 py-2 text-right font-medium">
                      Veprimet
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {expenseTypes.length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-4 py-6 text-center text-muted-foreground"
                      >
                        Nuk ka lloje të shpenzimeve.
                      </td>
                    </tr>
                  ) : (
                    expenseTypes.map((t) => (
                      <tr key={t.id} className="border-b last:border-0">
                        <td className="px-4 py-2">{t.name}</td>
                        <td className="px-4 py-2">
                          <Badge variant={t.isActive ? 'success' : 'muted'}>
                            {t.isActive ? 'Aktiv' : 'Joaktiv'}
                          </Badge>
                        </td>
                        <td className="px-4 py-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => openEditType(t)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive"
                              onClick={() => setDeleteTypeTarget(t)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Expense Type Dialog */}
      <Dialog open={typeFormOpen} onOpenChange={setTypeFormOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>
              {editingType ? 'Edito Llojin' : 'Shto Lloj të Re'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="type-name">Emri</Label>
              <Input
                id="type-name"
                value={typeForm.name}
                onChange={(e) =>
                  setTypeForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="Emri i llojit të shpenzimit"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="type-active">Aktiv</Label>
              <Switch
                id="type-active"
                checked={typeForm.isActive}
                onCheckedChange={(val) =>
                  setTypeForm((f) => ({ ...f, isActive: val }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeTypeForm}>
              Anulo
            </Button>
            <Button
              onClick={handleTypeSubmit}
              disabled={isTypeSubmitting || !typeForm.name.trim()}
            >
              {isTypeSubmitting ? 'Duke ruajtur...' : 'Ruaj'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Expense Type Confirm */}
      <ConfirmDialog
        open={!!deleteTypeTarget}
        onOpenChange={(open) => !open && setDeleteTypeTarget(null)}
        title="Fshi Llojin e Shpenzimit"
        description={`A jeni të sigurt që doni ta fshini llojin "${deleteTypeTarget?.name ?? ''}"?`}
        confirmText="Fshi"
        cancelText="Anulo"
        variant="destructive"
        onConfirm={() =>
          deleteTypeTarget && deleteExpenseType.mutate(deleteTypeTarget.id)
        }
      />
    </div>
  );
}
