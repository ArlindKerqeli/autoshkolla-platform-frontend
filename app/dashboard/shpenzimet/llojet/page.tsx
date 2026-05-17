'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Pencil, Plus, Tag, Trash2 } from 'lucide-react';
import api from '@/lib/api';
import type { ExpenseType } from '@/lib/types';
import { PageHeader } from '@/components/shared/PageHeader';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface TypeForm {
  name: string;
  isActive: boolean;
}
const empty: TypeForm = { name: '', isActive: true };

export default function ShpenzimetLlojetPage() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ExpenseType | null>(null);
  const [form, setForm] = useState<TypeForm>(empty);
  const [deleteTarget, setDeleteTarget] = useState<ExpenseType | null>(null);

  const { data: typesData, isLoading } = useQuery({
    queryKey: ['expense-types'],
    queryFn: async () => {
      const res = await api.get('/expense-types');
      let list: unknown = res;
      for (let i = 0; i < 3; i += 1) {
        if (Array.isArray(list)) break;
        if (list && typeof list === 'object' && 'data' in list) {
          list = (list as { data: unknown }).data;
        } else break;
      }
      return (Array.isArray(list) ? list : []) as ExpenseType[];
    },
  });
  const types = Array.isArray(typesData) ? typesData : [];

  const create = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post('/expense-types', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-types'] });
      closeForm();
    },
  });
  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.put(`/expense-types/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-types'] });
      closeForm();
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/expense-types/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-types'] });
      setDeleteTarget(null);
    },
  });

  const openNew = useCallback(() => {
    setEditing(null);
    setForm(empty);
    setFormOpen(true);
  }, []);

  const openEdit = useCallback((t: ExpenseType) => {
    setEditing(t);
    setForm({ name: t.name, isActive: t.isActive });
    setFormOpen(true);
  }, []);

  const closeForm = useCallback(() => {
    setFormOpen(false);
    setEditing(null);
    setForm(empty);
  }, []);

  const submit = useCallback(() => {
    const payload = { name: form.name.trim(), isActive: form.isActive };
    if (editing) update.mutate({ id: editing.id, data: payload });
    else create.mutate(payload);
  }, [form, editing, create, update]);

  const submitting = create.isPending || update.isPending;
  const activeCount = types.filter((t) => t.isActive).length;

  return (
    <div className="space-y-6">
      {/* Breadcrumb back link */}
      <Link
        href="/dashboard/shpenzimet"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-900"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Shpenzimet
      </Link>

      <PageHeader
        title="Llojet e Shpenzimeve"
        description="Menaxhoni kategoritë e shpenzimeve të autoshkollës"
      >
        <Button onClick={openNew}>
          <Plus className="mr-2 h-4 w-4" />
          Shto Lloj
        </Button>
      </PageHeader>

      {/* Stat strip */}
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white p-4">
        <span className="grid h-10 w-10 place-items-center rounded-lg bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200">
          <Tag className="h-5 w-5" />
        </span>
        <div className="text-sm text-slate-700">
          <span className="font-bold text-slate-900">{types.length}</span> lloje gjithsej
          <span className="px-2 text-slate-300">•</span>
          <span className="font-bold text-emerald-700">{activeCount}</span> aktiv
          {activeCount < types.length && (
            <>
              <span className="px-2 text-slate-300">•</span>
              <span className="font-bold text-slate-500">{types.length - activeCount}</span> joaktiv
            </>
          )}
        </div>
      </div>

      {/* Types list */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : types.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-14 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-slate-400">
              <Tag className="h-6 w-6" />
            </span>
            <div>
              <h3 className="text-base font-semibold text-slate-900">Asnjë lloj i krijuar ende</h3>
              <p className="mt-1 max-w-sm text-sm text-slate-500">
                Krijoni një lloj shpenzimi për të kategorizuar shpenzimet tuaja.
              </p>
            </div>
            <Button size="sm" onClick={openNew}>
              <Plus className="mr-2 h-4 w-4" />
              Krijo llojin e parë
            </Button>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {types.map((t) => (
              <li key={t.id} className="flex items-center gap-3 px-4 py-3 transition hover:bg-slate-50">
                <span
                  className={
                    t.isActive
                      ? 'h-2 w-2 shrink-0 rounded-full bg-emerald-500'
                      : 'h-2 w-2 shrink-0 rounded-full bg-slate-300'
                  }
                  aria-hidden
                />
                <span className="flex-1 truncate text-sm font-medium text-slate-900">{t.name}</span>
                <Badge variant={t.isActive ? 'success' : 'muted'}>
                  {t.isActive ? 'Aktiv' : 'Joaktiv'}
                </Badge>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => openEdit(t)}
                    aria-label={`Edito ${t.name}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-rose-600 hover:text-rose-700"
                    onClick={() => setDeleteTarget(t)}
                    aria-label={`Fshi ${t.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Add/Edit dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edito Llojin' : 'Shto Lloj të Ri'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="type-name">Emri</Label>
              <Input
                id="type-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Karburant, Mirëmbajtje, Sigurim…"
                autoFocus
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2.5">
              <div>
                <Label htmlFor="type-active" className="cursor-pointer">Aktiv</Label>
                <p className="text-[11px] text-slate-500">
                  Llojet jo-aktive nuk shfaqen kur regjistroni shpenzime të reja.
                </p>
              </div>
              <Switch
                id="type-active"
                checked={form.isActive}
                onCheckedChange={(val) => setForm((f) => ({ ...f, isActive: val }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeForm}>Anulo</Button>
            <Button onClick={submit} disabled={submitting || !form.name.trim()}>
              {submitting ? 'Duke ruajtur…' : 'Ruaj'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Fshi Llojin e Shpenzimit"
        description={`A jeni të sigurt që doni ta fshini llojin "${deleteTarget?.name ?? ''}"? Ky veprim nuk mund të kthehet.`}
        confirmText="Fshi"
        cancelText="Anulo"
        variant="destructive"
        onConfirm={() => deleteTarget && remove.mutate(deleteTarget.id)}
      />
    </div>
  );
}
