'use client';

import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { Plus, Pencil, Trash2, KeyRound, UserCheck, UserX } from 'lucide-react';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';
import type { User, PaginatedResponse } from '@/lib/types';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Badge } from '@/components/ui/badge';
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
import { useToast } from '@/hooks/use-toast';

type UserRole = 'administrator' | 'instructor' | 'lecturer';

const ROLE_LABELS: Record<UserRole, string> = {
  administrator: 'Administrator',
  instructor: 'Instruktor',
  lecturer: 'Ligjerues',
};

const ROLE_VARIANTS: Record<UserRole, 'default' | 'info' | 'warning'> = {
  administrator: 'default',
  instructor: 'info',
  lecturer: 'warning',
};

interface UserFormData {
  fullName: string;
  email: string;
  password?: string;
  role: UserRole;
  isActive?: boolean;
}

export default function PerdoruesitPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Dialog states
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [resetPwOpen, setResetPwOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toggleActiveOpen, setToggleActiveOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Form states
  const [formData, setFormData] = useState<UserFormData>({
    fullName: '',
    email: '',
    password: '',
    role: 'administrator',
  });
  const [newPassword, setNewPassword] = useState('');

  // Fetch users
  const { data: usersData, isLoading } = useQuery({
    queryKey: ['users', search, roleFilter, activeFilter, page, pageSize],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, perPage: pageSize };
      if (search) params.search = search;
      if (roleFilter !== 'all') params.role = roleFilter;
      if (activeFilter !== 'all') params.isActive = activeFilter === 'active' ? 1 : 0;
      const res = await api.get('/users', { params });
      return res as unknown as PaginatedResponse<User>;
    },
  });

  const users = usersData?.data ?? [];
  const pagination = usersData?.pagination;

  // Mutations
  const createUser = useMutation({
    mutationFn: (data: UserFormData) => api.post('/users', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setAddOpen(false);
      resetForm();
      toast({ title: 'Përdoruesi u shtua me sukses' });
    },
    onError: (err: { message: string }) => {
      toast({ title: 'Gabim', description: err.message, variant: 'destructive' });
    },
  });

  const updateUser = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<UserFormData> }) =>
      api.put(`/users/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setEditOpen(false);
      setSelectedUser(null);
      resetForm();
      toast({ title: 'Përdoruesi u përditësua me sukses' });
    },
    onError: (err: { message: string }) => {
      toast({ title: 'Gabim', description: err.message, variant: 'destructive' });
    },
  });

  const resetPassword = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      api.put(`/users/${id}/password`, { password }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setResetPwOpen(false);
      setSelectedUser(null);
      setNewPassword('');
      toast({ title: 'Fjalëkalimi u ndryshua me sukses' });
    },
    onError: (err: { message: string }) => {
      toast({ title: 'Gabim', description: err.message, variant: 'destructive' });
    },
  });

  const deleteUser = useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setDeleteOpen(false);
      setSelectedUser(null);
      toast({ title: 'Përdoruesi u fshi me sukses' });
    },
    onError: (err: { message: string }) => {
      toast({ title: 'Gabim', description: err.message, variant: 'destructive' });
    },
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.put(`/users/${id}`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setToggleActiveOpen(false);
      setSelectedUser(null);
      toast({ title: 'Statusi u ndryshua me sukses' });
    },
    onError: (err: { message: string }) => {
      toast({ title: 'Gabim', description: err.message, variant: 'destructive' });
    },
  });

  const resetForm = useCallback(() => {
    setFormData({ fullName: '', email: '', password: '', role: 'administrator' });
  }, []);

  const openEdit = useCallback((user: User) => {
    setSelectedUser(user);
    setFormData({
      fullName: user.fullName,
      email: user.email ?? '',
      role: user.role as UserRole,
      isActive: user.isActive,
    });
    setEditOpen(true);
  }, []);

  const openResetPw = useCallback((user: User) => {
    setSelectedUser(user);
    setNewPassword('');
    setResetPwOpen(true);
  }, []);

  const openDelete = useCallback((user: User) => {
    setSelectedUser(user);
    setDeleteOpen(true);
  }, []);

  const openToggleActive = useCallback((user: User) => {
    setSelectedUser(user);
    setToggleActiveOpen(true);
  }, []);

  const columns = useMemo<ColumnDef<User, unknown>[]>(
    () => [
      {
        accessorKey: 'fullName',
        header: 'Emri',
        cell: ({ row }) => (
          <span className="font-medium">{row.original.fullName}</span>
        ),
      },
      {
        accessorKey: 'email',
        header: 'Email',
        cell: ({ row }) => row.original.email ?? '-',
      },
      {
        accessorKey: 'role',
        header: 'Roli',
        cell: ({ row }) => {
          const role = row.original.role as UserRole;
          return (
            <Badge variant={ROLE_VARIANTS[role] ?? 'muted'}>
              {ROLE_LABELS[role] ?? role}
            </Badge>
          );
        },
      },
      {
        id: 'active',
        header: 'Aktiv',
        cell: ({ row }) => (
          <Badge variant={row.original.isActive ? 'success' : 'muted'}>
            {row.original.isActive ? 'Aktiv' : 'Joaktiv'}
          </Badge>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: 'Krijuar më',
        cell: ({ row }) => formatDate(row.original.createdAt),
      },
      {
        id: 'actions',
        header: 'Veprimet',
        cell: ({ row }) => {
          const user = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  Veprimet
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => openEdit(user)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edito
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openResetPw(user)}>
                  <KeyRound className="mr-2 h-4 w-4" />
                  Ndrysho fjalëkalimin
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openToggleActive(user)}>
                  {user.isActive ? (
                    <>
                      <UserX className="mr-2 h-4 w-4" />
                      Çaktivizo
                    </>
                  ) : (
                    <>
                      <UserCheck className="mr-2 h-4 w-4" />
                      Aktivizo
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => openDelete(user)}
                  className="text-red-600 focus:text-red-600"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Fshi
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [openEdit, openResetPw, openDelete, openToggleActive]
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Përdoruesit" description="Menaxhimi i përdoruesve të sistemit">
        <Button onClick={() => { resetForm(); setAddOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          Shto Përdorues
        </Button>
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1.5">
          <Label>Roli</Label>
          <Select
            value={roleFilter}
            onValueChange={(val) => { setRoleFilter(val); setPage(1); }}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Të gjitha" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Të gjitha</SelectItem>
              <SelectItem value="administrator">Administrator</SelectItem>
              <SelectItem value="instructor">Instruktor</SelectItem>
              <SelectItem value="lecturer">Ligjerues</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Statusi</Label>
          <Select
            value={activeFilter}
            onValueChange={(val) => { setActiveFilter(val); setPage(1); }}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Të gjitha" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Të gjitha</SelectItem>
              <SelectItem value="active">Aktiv</SelectItem>
              <SelectItem value="inactive">Joaktiv</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={users}
        isLoading={isLoading}
        searchPlaceholder="Kërko përdoruesin..."
        searchValue={search}
        onSearch={(val) => { setSearch(val); setPage(1); }}
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

      {/* Add User Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Shto Përdorues</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createUser.mutate(formData);
            }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label htmlFor="add-fullName">Emri i plotë</Label>
              <Input
                id="add-fullName"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-email">Email</Label>
              <Input
                id="add-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-password">Fjalëkalimi</Label>
              <Input
                id="add-password"
                type="password"
                value={formData.password ?? ''}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Roli</Label>
              <Select
                value={formData.role}
                onValueChange={(val) => setFormData({ ...formData, role: val as UserRole })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="administrator">Administrator</SelectItem>
                  <SelectItem value="instructor">Instruktor</SelectItem>
                  <SelectItem value="lecturer">Ligjerues</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                Anulo
              </Button>
              <Button type="submit" disabled={createUser.isPending}>
                {createUser.isPending ? 'Duke ruajtur...' : 'Ruaj'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edito Përdoruesin</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!selectedUser) return;
              const { password, ...data } = formData;
              updateUser.mutate({ id: selectedUser.id, data });
            }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label htmlFor="edit-fullName">Emri i plotë</Label>
              <Input
                id="edit-fullName"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Roli</Label>
              <Select
                value={formData.role}
                onValueChange={(val) => setFormData({ ...formData, role: val as UserRole })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="administrator">Administrator</SelectItem>
                  <SelectItem value="instructor">Instruktor</SelectItem>
                  <SelectItem value="lecturer">Ligjerues</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="edit-active"
                checked={formData.isActive ?? true}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label htmlFor="edit-active">Aktiv</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                Anulo
              </Button>
              <Button type="submit" disabled={updateUser.isPending}>
                {updateUser.isPending ? 'Duke ruajtur...' : 'Ruaj'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetPwOpen} onOpenChange={setResetPwOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ndrysho Fjalëkalimin</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!selectedUser) return;
              resetPassword.mutate({ id: selectedUser.id, password: newPassword });
            }}
            className="space-y-4"
          >
            <p className="text-sm text-muted-foreground">
              Ndryshoni fjalëkalimin për: <strong>{selectedUser?.fullName}</strong>
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="new-password">Fjalëkalimi i ri</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setResetPwOpen(false)}>
                Anulo
              </Button>
              <Button type="submit" disabled={resetPassword.isPending}>
                {resetPassword.isPending ? 'Duke ndryshuar...' : 'Ndrysho'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Toggle Active Confirmation */}
      <ConfirmDialog
        open={toggleActiveOpen}
        onOpenChange={setToggleActiveOpen}
        title={selectedUser?.isActive ? 'Çaktivizo Përdoruesin' : 'Aktivizo Përdoruesin'}
        description={
          selectedUser?.isActive
            ? `A jeni të sigurt që doni të çaktivizoni përdoruesin "${selectedUser?.fullName}"?`
            : `A jeni të sigurt që doni të aktivizoni përdoruesin "${selectedUser?.fullName}"?`
        }
        confirmText={selectedUser?.isActive ? 'Çaktivizo' : 'Aktivizo'}
        onConfirm={() => {
          if (!selectedUser) return;
          toggleActive.mutate({ id: selectedUser.id, isActive: !selectedUser.isActive });
        }}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Fshi Përdoruesin"
        description={`A jeni të sigurt që doni të fshini përdoruesin "${selectedUser?.fullName}"? Ky veprim nuk mund të kthehet.`}
        confirmText="Fshi"
        variant="destructive"
        onConfirm={() => {
          if (!selectedUser) return;
          deleteUser.mutate(selectedUser.id);
        }}
      />
    </div>
  );
}
