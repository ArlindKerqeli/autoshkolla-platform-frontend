'use client';

import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { useRouter } from 'next/navigation';
import {
  Building2,
  Users,
  GraduationCap,
  Plus,
  Pencil,
  ChevronDown,
  ChevronRight,
  UserCog,
  AlertTriangle,
} from 'lucide-react';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';
import type { Tenant, User, GlobalStats } from '@/lib/types';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface TenantFormData {
  name: string;
  slug: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  isActive?: boolean;
}

interface UserFormData {
  fullName: string;
  email: string;
  password: string;
  role: string;
  isActive?: boolean;
}

const emptyTenantForm: TenantFormData = {
  name: '',
  slug: '',
  contactEmail: '',
  contactPhone: '',
  address: '',
};

const emptyUserForm: UserFormData = {
  fullName: '',
  email: '',
  password: '',
  role: 'administrator',
};

const ROLE_LABELS: Record<string, string> = {
  administrator: 'Administrator',
  instructor: 'Instruktor',
  lecturer: 'Ligjerues',
};

export default function SuperAdminPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [expandedTenant, setExpandedTenant] = useState<string | null>(null);

  // Tenant dialog states
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [impersonateOpen, setImpersonateOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [impersonateUser, setImpersonateUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<TenantFormData>(emptyTenantForm);

  // User dialog states
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [editUserOpen, setEditUserOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userFormData, setUserFormData] = useState<UserFormData>(emptyUserForm);

  // Fetch global stats
  const { data: stats } = useQuery({
    queryKey: ['superadmin-stats'],
    queryFn: async () => {
      const res = await api.get('/superadmin/stats');
      return res.data as GlobalStats;
    },
  });

  // Fetch tenants
  const { data: tenantsData, isLoading } = useQuery({
    queryKey: ['superadmin-tenants', search, page, pageSize],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, perPage: pageSize };
      if (search) params.search = search;
      const res = await api.get('/superadmin/tenants', { params });
      return res as unknown as { data: Tenant[]; pagination?: { page: number; totalPages: number; total: number; perPage: number } };
    },
  });

  const tenants = tenantsData?.data ?? [];
  const pagination = tenantsData?.pagination;

  // Fetch users for expanded tenant
  const { data: tenantUsers } = useQuery({
    queryKey: ['superadmin-tenant-users', expandedTenant],
    queryFn: async () => {
      const res = await api.get(`/superadmin/tenants/${expandedTenant}/users`);
      const response = res as unknown as { data: User[] };
      return response.data;
    },
    enabled: !!expandedTenant,
  });

  // Mutations
  const createTenant = useMutation({
    mutationFn: (data: TenantFormData) => api.post('/superadmin/tenants', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin-tenants'] });
      queryClient.invalidateQueries({ queryKey: ['superadmin-stats'] });
      setAddOpen(false);
      setFormData(emptyTenantForm);
      toast({ title: 'Tenanti u shtua me sukses' });
    },
    onError: (err: { message: string }) => {
      toast({ title: 'Gabim', description: err.message, variant: 'destructive' });
    },
  });

  const updateTenant = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TenantFormData> }) =>
      api.put(`/superadmin/tenants/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin-tenants'] });
      setEditOpen(false);
      setSelectedTenant(null);
      toast({ title: 'Tenanti u përditësua me sukses' });
    },
    onError: (err: { message: string }) => {
      toast({ title: 'Gabim', description: err.message, variant: 'destructive' });
    },
  });

  const impersonate = useMutation({
    mutationFn: (userId: string) =>
      api.post('/superadmin/impersonate', { userId }),
    onSuccess: (res) => {
      const data = (res as unknown as { data: { accessToken: string } }).data;
      localStorage.setItem('accessToken', data.accessToken);
      setImpersonateOpen(false);
      toast({ title: `Po imitoni përdoruesin: ${impersonateUser?.fullName}` });
      router.push('/dashboard');
    },
    onError: (err: { message: string }) => {
      toast({ title: 'Gabim', description: err.message, variant: 'destructive' });
    },
  });

  const createUser = useMutation({
    mutationFn: (data: UserFormData) =>
      api.post(`/superadmin/tenants/${expandedTenant}/users`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin-tenant-users', expandedTenant] });
      queryClient.invalidateQueries({ queryKey: ['superadmin-stats'] });
      setAddUserOpen(false);
      setUserFormData(emptyUserForm);
      toast({ title: 'Perdoruesi u shtua me sukses' });
    },
    onError: (err: { message: string }) => {
      toast({ title: 'Gabim', description: err.message, variant: 'destructive' });
    },
  });

  const updateUser = useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: Partial<UserFormData> }) =>
      api.put(`/superadmin/tenants/${expandedTenant}/users/${userId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin-tenant-users', expandedTenant] });
      setEditUserOpen(false);
      setSelectedUser(null);
      toast({ title: 'Perdoruesi u perditesua me sukses' });
    },
    onError: (err: { message: string }) => {
      toast({ title: 'Gabim', description: err.message, variant: 'destructive' });
    },
  });

  const openEditUser = useCallback((u: User) => {
    setSelectedUser(u);
    setUserFormData({
      fullName: u.fullName,
      email: u.email ?? '',
      password: '',
      role: u.role,
      isActive: u.isActive,
    });
    setEditUserOpen(true);
  }, []);

  const openEdit = useCallback((tenant: Tenant) => {
    setSelectedTenant(tenant);
    setFormData({
      name: tenant.name,
      slug: tenant.slug,
      contactEmail: tenant.email ?? '',
      contactPhone: tenant.phone ?? '',
      address: tenant.address ?? '',
      isActive: tenant.isActive,
    });
    setEditOpen(true);
  }, []);

  const toggleExpand = useCallback((tenantId: string) => {
    setExpandedTenant((prev) => (prev === tenantId ? null : tenantId));
  }, []);

  const columns = useMemo<ColumnDef<Tenant, unknown>[]>(
    () => [
      {
        id: 'expand',
        header: '',
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => toggleExpand(row.original.id)}
          >
            {expandedTenant === row.original.id ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        ),
      },
      {
        accessorKey: 'name',
        header: 'Emri',
        cell: ({ row }) => (
          <span className="font-medium">{row.original.name}</span>
        ),
      },
      {
        accessorKey: 'slug',
        header: 'Slug',
        cell: ({ row }) => (
          <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">
            {row.original.slug}
          </code>
        ),
      },
      {
        accessorKey: 'email',
        header: 'Email',
        cell: ({ row }) => row.original.email ?? '-',
      },
      {
        accessorKey: 'phone',
        header: 'Telefoni',
        cell: ({ row }) => row.original.phone ?? '-',
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
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                Veprimet
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openEdit(row.original)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edito
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [expandedTenant, openEdit, toggleExpand]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Menaxhimi i Tenantëve"
        description="Administrimi i të gjitha autoshkollave"
      >
        <Button onClick={() => { setFormData(emptyTenantForm); setAddOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          Shto Tenant
        </Button>
      </PageHeader>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tenantë</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalTenants ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tenantë Aktivë</CardTitle>
            <Building2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeTenants ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Përdorues</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalUsers ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Kandidatë</CardTitle>
            <GraduationCap className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalCandidates ?? 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tenants Table */}
      <DataTable
        columns={columns}
        data={tenants}
        isLoading={isLoading}
        searchPlaceholder="Kërko tenantën..."
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

      {/* Expanded tenant users */}
      {expandedTenant && tenantUsers && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">
              Përdoruesit e Tenantit
            </CardTitle>
            <Button
              size="sm"
              onClick={() => {
                setUserFormData(emptyUserForm);
                setAddUserOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Shto Përdorues
            </Button>
          </CardHeader>
          <CardContent>
            {tenantUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nuk ka përdorues për këtë tenant.
              </p>
            ) : (
              <div className="divide-y rounded-md border">
                {tenantUsers.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="text-sm font-medium">{u.fullName}</p>
                        <p className="text-xs text-muted-foreground">
                          {u.email ?? u.username} &middot;{' '}
                          <Badge variant="outline" className="ml-1">
                            {ROLE_LABELS[u.role] ?? u.role}
                          </Badge>
                          {' '}&middot;{' '}
                          <Badge
                            variant={u.isActive ? 'success' : 'muted'}
                            className="ml-1"
                          >
                            {u.isActive ? 'Aktiv' : 'Joaktiv'}
                          </Badge>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditUser(u)}
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Edito
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setImpersonateUser(u);
                          setImpersonateOpen(true);
                        }}
                      >
                        <UserCog className="mr-2 h-4 w-4" />
                        Imito
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add Tenant Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Shto Tenant</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createTenant.mutate(formData);
            }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label htmlFor="t-name">Emri</Label>
              <Input
                id="t-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-slug">Slug</Label>
              <Input
                id="t-slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-email">Email</Label>
              <Input
                id="t-email"
                type="email"
                value={formData.contactEmail}
                onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-phone">Telefoni</Label>
              <Input
                id="t-phone"
                value={formData.contactPhone}
                onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-address">Adresa</Label>
              <Input
                id="t-address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                Anulo
              </Button>
              <Button type="submit" disabled={createTenant.isPending}>
                {createTenant.isPending ? 'Duke ruajtur...' : 'Ruaj'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Tenant Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edito Tenantin</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!selectedTenant) return;
              updateTenant.mutate({ id: selectedTenant.id, data: formData });
            }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label htmlFor="te-name">Emri</Label>
              <Input
                id="te-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="te-slug">Slug</Label>
              <Input
                id="te-slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="te-email">Email</Label>
              <Input
                id="te-email"
                type="email"
                value={formData.contactEmail}
                onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="te-phone">Telefoni</Label>
              <Input
                id="te-phone"
                value={formData.contactPhone}
                onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="te-address">Adresa</Label>
              <Input
                id="te-address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="te-active"
                checked={formData.isActive ?? true}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label htmlFor="te-active">Aktiv</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                Anulo
              </Button>
              <Button type="submit" disabled={updateTenant.isPending}>
                {updateTenant.isPending ? 'Duke përditësuar...' : 'Ruaj'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add User Dialog */}
      <Dialog open={addUserOpen} onOpenChange={setAddUserOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Shto Përdorues</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createUser.mutate(userFormData);
            }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label htmlFor="u-name">Emri i plotë</Label>
              <Input
                id="u-name"
                value={userFormData.fullName}
                onChange={(e) => setUserFormData({ ...userFormData, fullName: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="u-email">Email</Label>
              <Input
                id="u-email"
                type="email"
                value={userFormData.email}
                onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="u-password">Fjalëkalimi</Label>
              <Input
                id="u-password"
                type="password"
                value={userFormData.password}
                onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="u-role">Roli</Label>
              <Select
                value={userFormData.role}
                onValueChange={(val) => setUserFormData({ ...userFormData, role: val })}
              >
                <SelectTrigger id="u-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddUserOpen(false)}>
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
      <Dialog open={editUserOpen} onOpenChange={setEditUserOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edito Përdoruesin</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!selectedUser) return;
              const data: Record<string, string | boolean | undefined> = {
                fullName: userFormData.fullName,
                email: userFormData.email,
                role: userFormData.role,
                isActive: userFormData.isActive,
              };
              if (userFormData.password) {
                data.password = userFormData.password;
              }
              updateUser.mutate({ userId: selectedUser.id, data });
            }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label htmlFor="ue-name">Emri i plotë</Label>
              <Input
                id="ue-name"
                value={userFormData.fullName}
                onChange={(e) => setUserFormData({ ...userFormData, fullName: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ue-email">Email</Label>
              <Input
                id="ue-email"
                type="email"
                value={userFormData.email}
                onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ue-password">Fjalëkalimi i ri (opsional)</Label>
              <Input
                id="ue-password"
                type="password"
                value={userFormData.password}
                onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                placeholder="Lini bosh per ta mbajtur te njejtin"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ue-role">Roli</Label>
              <Select
                value={userFormData.role}
                onValueChange={(val) => setUserFormData({ ...userFormData, role: val })}
              >
                <SelectTrigger id="ue-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="ue-active"
                checked={userFormData.isActive ?? true}
                onCheckedChange={(checked) => setUserFormData({ ...userFormData, isActive: checked })}
              />
              <Label htmlFor="ue-active">Aktiv</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditUserOpen(false)}>
                Anulo
              </Button>
              <Button type="submit" disabled={updateUser.isPending}>
                {updateUser.isPending ? 'Duke përditësuar...' : 'Ruaj'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Impersonate Confirmation */}
      <ConfirmDialog
        open={impersonateOpen}
        onOpenChange={setImpersonateOpen}
        title="Imito Përdoruesin"
        description={`Po imitoni përdoruesin: ${impersonateUser?.fullName}. Do të ridrejtoheni në panelin e tyre. A doni të vazhdoni?`}
        confirmText="Imito"
        onConfirm={() => {
          if (!impersonateUser) return;
          impersonate.mutate(impersonateUser.id);
        }}
      />
    </div>
  );
}
