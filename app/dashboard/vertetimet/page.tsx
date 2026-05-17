'use client';

import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import {
  ShieldCheck,
  Plus,
  Pencil,
  Trash2,
  Search,
  X,
  UserCircle,
} from 'lucide-react';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';
import type {
  Candidate,
  Verification,
  Instructor,
  Category,
} from '@/lib/types';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { EmptyState } from '@/components/shared/EmptyState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

interface VerificationFormData {
  categoryId: string;
  verificationDate: string;
  theoryHoursStart: string;
  theoryHoursEnd: string;
  practicalHoursStart: string;
  practicalHoursEnd: string;
  sequenceNumber: string;
  lecturerId: string;
  instructorId: string;
  redCrossCert: boolean;
  idCardCopy: boolean;
}

const emptyForm: VerificationFormData = {
  categoryId: '',
  verificationDate: '',
  theoryHoursStart: '',
  theoryHoursEnd: '',
  practicalHoursStart: '',
  practicalHoursEnd: '',
  sequenceNumber: '',
  lecturerId: '',
  instructorId: '',
  redCrossCert: false,
  idCardCopy: false,
};

export default function VertetimetPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Candidate search
  const [candidateSearch, setCandidateSearch] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);

  // Dialog states
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingVerification, setEditingVerification] = useState<Verification | null>(null);
  const [deletingVerification, setDeletingVerification] = useState<Verification | null>(null);
  const [formData, setFormData] = useState<VerificationFormData>(emptyForm);

  // Search candidates
  const { data: candidateResults } = useQuery({
    queryKey: ['candidate-search', candidateSearch],
    queryFn: async () => {
      if (!candidateSearch || candidateSearch.length < 2) return [];
      const res = await api.get('/candidates', {
        params: { search: candidateSearch, perPage: 10 },
      });
      const response = res as unknown as { data: Candidate[] };
      return response.data;
    },
    enabled: candidateSearch.length >= 2 && !selectedCandidate,
  });

  // Fetch verifications for selected candidate
  const { data: verifications, isLoading: verificationsLoading } = useQuery({
    queryKey: ['verifications', selectedCandidate?.id],
    queryFn: async () => {
      const res = await api.get('/verifications', {
        params: { candidateId: selectedCandidate!.id },
      });
      const response = res as unknown as { data: Verification[] };
      return response.data;
    },
    enabled: !!selectedCandidate,
  });

  // Fetch instructors and categories for form selects
  const { data: instructors } = useQuery({
    queryKey: ['instructors-list'],
    queryFn: async () => {
      const res = await api.get('/instructors', { params: { perPage: 200 } });
      const response = res as unknown as { data: Instructor[] };
      return response.data;
    },
  });

  const { data: categories } = useQuery({
    queryKey: ['categories-list'],
    queryFn: async () => {
      const res = await api.get('/categories', { params: { perPage: 100 } });
      const response = res as unknown as { data: Category[] };
      return response.data;
    },
  });

  const lecturers = useMemo(
    () => (instructors ?? []).filter((i) => i.position === 'lecturer' || i.position === 'both'),
    [instructors]
  );

  const instructorsList = useMemo(
    () => (instructors ?? []).filter((i) => i.position === 'instructor' || i.position === 'both'),
    [instructors]
  );

  // Mutations
  const createVerification = useMutation({
    mutationFn: (data: VerificationFormData & { candidateId: string }) =>
      api.post('/verifications', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['verifications', selectedCandidate?.id] });
      setFormOpen(false);
      setEditingVerification(null);
      toast({ title: 'Vërtetimi u shtua me sukses' });
    },
    onError: (err: { message: string }) => {
      toast({ title: 'Gabim', description: err.message, variant: 'destructive' });
    },
  });

  const updateVerification = useMutation({
    mutationFn: ({ id, data }: { id: string; data: VerificationFormData }) =>
      api.put(`/verifications/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['verifications', selectedCandidate?.id] });
      setFormOpen(false);
      setEditingVerification(null);
      toast({ title: 'Vërtetimi u përditësua me sukses' });
    },
    onError: (err: { message: string }) => {
      toast({ title: 'Gabim', description: err.message, variant: 'destructive' });
    },
  });

  const deleteVerification = useMutation({
    mutationFn: (id: string) => api.delete(`/verifications/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['verifications', selectedCandidate?.id] });
      setDeleteOpen(false);
      setDeletingVerification(null);
      toast({ title: 'Vërtetimi u fshi me sukses' });
    },
    onError: (err: { message: string }) => {
      toast({ title: 'Gabim', description: err.message, variant: 'destructive' });
    },
  });

  const openAdd = useCallback(() => {
    setEditingVerification(null);
    setFormData({
      ...emptyForm,
      categoryId: selectedCandidate?.categoryId ?? '',
      instructorId: selectedCandidate?.instructorId ?? '',
      lecturerId: selectedCandidate?.lecturerId ?? '',
    });
    setFormOpen(true);
  }, [selectedCandidate]);

  const openEdit = useCallback((v: Verification) => {
    setEditingVerification(v);
    setFormData({
      categoryId: v.categoryId,
      verificationDate: v.verificationDate ?? '',
      theoryHoursStart: v.theoryHoursStart ?? '',
      theoryHoursEnd: v.theoryHoursEnd ?? '',
      practicalHoursStart: v.practicalHoursStart ?? '',
      practicalHoursEnd: v.practicalHoursEnd ?? '',
      sequenceNumber: v.sequenceNumber ?? '',
      lecturerId: v.lecturerId ?? '',
      instructorId: v.instructorId ?? '',
      redCrossCert: v.redCrossCert,
      idCardCopy: v.idCardCopy,
    });
    setFormOpen(true);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingVerification) {
      updateVerification.mutate({ id: editingVerification.id, data: formData });
    } else if (selectedCandidate) {
      createVerification.mutate({ ...formData, candidateId: selectedCandidate.id });
    }
  };

  const columns = useMemo<ColumnDef<Verification, unknown>[]>(
    () => [
      {
        id: 'verificationDate',
        header: 'Data',
        cell: ({ row }) =>
          row.original.verificationDate ? formatDate(row.original.verificationDate) : '-',
      },
      {
        id: 'category',
        header: 'Kategoria',
        cell: ({ row }) => row.original.category?.code ?? '-',
      },
      {
        id: 'theoryPeriod',
        header: 'Periudha Teorike',
        cell: ({ row }) => {
          const v = row.original;
          if (!v.theoryHoursStart || !v.theoryHoursEnd) return '-';
          return `${formatDate(v.theoryHoursStart)} - ${formatDate(v.theoryHoursEnd)}`;
        },
      },
      {
        id: 'practicalPeriod',
        header: 'Periudha Praktike',
        cell: ({ row }) => {
          const v = row.original;
          if (!v.practicalHoursStart || !v.practicalHoursEnd) return '-';
          return `${formatDate(v.practicalHoursStart)} - ${formatDate(v.practicalHoursEnd)}`;
        },
      },
      {
        accessorKey: 'sequenceNumber',
        header: 'Nr. Sekuencës',
        cell: ({ row }) => row.original.sequenceNumber ?? '-',
      },
      {
        id: 'actions',
        header: 'Veprimet',
        cell: ({ row }) => {
          const v = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  Veprimet
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => openEdit(v)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edito
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => { setDeletingVerification(v); setDeleteOpen(true); }}
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
    [openEdit]
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Vërtetimet" description="Menaxhimi i vërtetimeve të kandidatëve" />

      {/* Candidate Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Zgjidhni Kandidatin</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative max-w-md">
            {selectedCandidate ? (
              <div className="flex items-center gap-3 rounded-md border p-3">
                <UserCircle className="h-8 w-8 text-muted-foreground" />
                <div className="flex-1">
                  <p className="font-medium">
                    {selectedCandidate.firstName} {selectedCandidate.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedCandidate.code} &middot; {selectedCandidate.category?.code ?? ''}
                    {selectedCandidate.instructor && (
                      <> &middot; Instruktor: {selectedCandidate.instructor.firstName} {selectedCandidate.instructor.lastName}</>
                    )}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setSelectedCandidate(null);
                    setCandidateSearch('');
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={candidateSearch}
                    onChange={(e) => setCandidateSearch(e.target.value)}
                    placeholder="Kërko kandidatin me emër ose kod..."
                    className="pl-9"
                  />
                </div>
                {candidateResults && candidateResults.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full rounded-md border bg-white shadow-lg">
                    {candidateResults.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50"
                        onClick={() => {
                          setSelectedCandidate(c);
                          setCandidateSearch('');
                        }}
                      >
                        <UserCircle className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">
                            {c.firstName} {c.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {c.code} &middot; {c.category?.code ?? ''}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Verifications */}
      {selectedCandidate ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Vërtetimet</h2>
            <Button onClick={openAdd}>
              <Plus className="mr-2 h-4 w-4" />
              Shto Vërtetim
            </Button>
          </div>

          <DataTable
            columns={columns}
            data={verifications ?? []}
            isLoading={verificationsLoading}
          />
        </div>
      ) : (
        <EmptyState
          icon={ShieldCheck}
          title="Zgjidhni një kandidat"
          description="Kërkoni dhe zgjidhni një kandidat për të parë vërtetimet e tij/saj."
        />
      )}

      {/* Add / Edit Verification Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingVerification ? 'Edito Vërtetimin' : 'Shto Vërtetim'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Kategoria</Label>
                <Select
                  value={formData.categoryId || ''}
                  onValueChange={(val) => setFormData({ ...formData, categoryId: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Zgjidhni" />
                  </SelectTrigger>
                  <SelectContent>
                    {(categories ?? []).map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.code} - {cat.description ?? ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="v-date">Data e Vërtetimit</Label>
                <Input
                  id="v-date"
                  type="date"
                  value={formData.verificationDate}
                  onChange={(e) => setFormData({ ...formData, verificationDate: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="v-theory-start">Fillimi Orëve Teorike</Label>
                <Input
                  id="v-theory-start"
                  type="date"
                  value={formData.theoryHoursStart}
                  onChange={(e) => setFormData({ ...formData, theoryHoursStart: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="v-theory-end">Mbarimi Orëve Teorike</Label>
                <Input
                  id="v-theory-end"
                  type="date"
                  value={formData.theoryHoursEnd}
                  onChange={(e) => setFormData({ ...formData, theoryHoursEnd: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="v-pract-start">Fillimi Orëve Praktike</Label>
                <Input
                  id="v-pract-start"
                  type="date"
                  value={formData.practicalHoursStart}
                  onChange={(e) => setFormData({ ...formData, practicalHoursStart: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="v-pract-end">Mbarimi Orëve Praktike</Label>
                <Input
                  id="v-pract-end"
                  type="date"
                  value={formData.practicalHoursEnd}
                  onChange={(e) => setFormData({ ...formData, practicalHoursEnd: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="v-seq">Nr. Sekuencës</Label>
                <Input
                  id="v-seq"
                  value={formData.sequenceNumber}
                  onChange={(e) => setFormData({ ...formData, sequenceNumber: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Ligjeruesi</Label>
                <Select
                  value={formData.lecturerId || ''}
                  onValueChange={(val) => setFormData({ ...formData, lecturerId: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Zgjidhni" />
                  </SelectTrigger>
                  <SelectContent>
                    {lecturers.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.firstName} {l.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Instruktori</Label>
                <Select
                  value={formData.instructorId || ''}
                  onValueChange={(val) => setFormData({ ...formData, instructorId: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Zgjidhni" />
                  </SelectTrigger>
                  <SelectContent>
                    {instructorsList.map((i) => (
                      <SelectItem key={i.id} value={i.id}>
                        {i.firstName} {i.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="v-redcross"
                  checked={formData.redCrossCert}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, redCrossCert: checked === true })
                  }
                />
                <Label htmlFor="v-redcross">Certifikata e Kryqit të Kuq</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="v-idcard"
                  checked={formData.idCardCopy}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, idCardCopy: checked === true })
                  }
                />
                <Label htmlFor="v-idcard">Kopja e letërnjoftimit</Label>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                Anulo
              </Button>
              <Button
                type="submit"
                disabled={createVerification.isPending || updateVerification.isPending}
              >
                {createVerification.isPending || updateVerification.isPending
                  ? 'Duke ruajtur...'
                  : 'Ruaj'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Fshi Vërtetimin"
        description="A jeni të sigurt që doni të fshini këtë vërtetim? Ky veprim nuk mund të kthehet."
        confirmText="Fshi"
        variant="destructive"
        onConfirm={() => {
          if (!deletingVerification) return;
          deleteVerification.mutate(deletingVerification.id);
        }}
      />
    </div>
  );
}
