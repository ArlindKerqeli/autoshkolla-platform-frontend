'use client';

import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import {
  ClipboardCheck,
  Plus,
  Pencil,
  Trash2,
  Search,
  X,
  UserCircle,
  FileCheck,
} from 'lucide-react';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';
import type { Candidate, Exam, ExamEligibility } from '@/lib/types';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ExportButton } from '@/components/shared/ExportButton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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

// --- Types ---

interface ExamFormData {
  candidateId: string;
  examType: 'theory' | 'practical';
  examDate: string;
  score: string;
  result: 'scheduled' | 'passed' | 'failed' | 'cancelled';
  examinerName: string;
  examLocation: string;
  notes: string;
}

const emptyForm: ExamFormData = {
  candidateId: '',
  examType: 'theory',
  examDate: '',
  score: '',
  result: 'scheduled',
  examinerName: '',
  examLocation: '',
  notes: '',
};

// --- Result badge helpers ---

const RESULT_VARIANT: Record<string, 'warning' | 'success' | 'error' | 'muted'> = {
  scheduled: 'warning',
  passed: 'success',
  failed: 'error',
  cancelled: 'muted',
};

const RESULT_LABEL: Record<string, string> = {
  scheduled: 'E planifikuar',
  passed: 'Kaluar',
  failed: 'Deshtuar',
  cancelled: 'Anuluar',
};

const EXAM_TYPE_LABEL: Record<string, string> = {
  theory: 'Teorik',
  practical: 'Praktik',
};

// --- Component ---

export default function ProvimetPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [resultFilter, setResultFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Dialog state
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [isRecordingResult, setIsRecordingResult] = useState(false);
  const [deletingExam, setDeletingExam] = useState<Exam | null>(null);
  const [formData, setFormData] = useState<ExamFormData>(emptyForm);

  // Candidate search in create dialog
  const [candidateSearch, setCandidateSearch] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);

  // Eligibility
  const [eligibility, setEligibility] = useState<ExamEligibility | null>(null);
  const [eligibilityLoading, setEligibilityLoading] = useState(false);

  // --- Queries ---

  const { data: exams, isLoading: examsLoading } = useQuery({
    queryKey: ['exams', search, typeFilter, resultFilter, dateFrom, dateTo],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (typeFilter !== 'all') params.examType = typeFilter;
      if (resultFilter !== 'all') params.result = resultFilter;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      const res = await api.get('/exams', { params });
      const response = res as unknown as { data: Exam[] };
      return response.data;
    },
  });

  // Candidate search for create dialog
  const { data: candidateResults } = useQuery({
    queryKey: ['candidate-search-exams', candidateSearch],
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

  // --- Fetch eligibility ---

  const fetchEligibility = useCallback(async (candidateId: string) => {
    setEligibilityLoading(true);
    try {
      const res = await api.get(`/candidates/${candidateId}/exam-eligibility`);
      const response = res as unknown as { data: ExamEligibility };
      setEligibility(response.data);
    } catch {
      setEligibility(null);
    } finally {
      setEligibilityLoading(false);
    }
  }, []);

  // --- Mutations ---

  const createExam = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post('/exams', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exams'] });
      closeForm();
      toast({ title: 'Provimi u planifikua me sukses' });
    },
    onError: (err: { message: string }) => {
      toast({ title: 'Gabim', description: err.message, variant: 'destructive' });
    },
  });

  const updateExam = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.put(`/exams/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exams'] });
      closeForm();
      toast({ title: 'Rezultati u regjistrua me sukses' });
    },
    onError: (err: { message: string }) => {
      toast({ title: 'Gabim', description: err.message, variant: 'destructive' });
    },
  });

  const deleteExam = useMutation({
    mutationFn: (id: string) => api.delete(`/exams/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exams'] });
      setDeleteOpen(false);
      setDeletingExam(null);
      toast({ title: 'Provimi u fshi me sukses' });
    },
    onError: (err: { message: string }) => {
      toast({ title: 'Gabim', description: err.message, variant: 'destructive' });
    },
  });

  // --- Form helpers ---

  const closeForm = useCallback(() => {
    setFormOpen(false);
    setEditingExam(null);
    setIsRecordingResult(false);
    setSelectedCandidate(null);
    setCandidateSearch('');
    setEligibility(null);
    setFormData(emptyForm);
  }, []);

  const openCreate = useCallback(() => {
    setEditingExam(null);
    setIsRecordingResult(false);
    setFormData(emptyForm);
    setSelectedCandidate(null);
    setCandidateSearch('');
    setEligibility(null);
    setFormOpen(true);
  }, []);

  const openEdit = useCallback((exam: Exam) => {
    setEditingExam(exam);
    setIsRecordingResult(false);
    setFormData({
      candidateId: exam.candidateId,
      examType: exam.examType,
      examDate: exam.examDate ?? '',
      score: exam.score != null ? String(exam.score) : '',
      result: exam.result,
      examinerName: exam.examinerName ?? '',
      examLocation: exam.examLocation ?? '',
      notes: exam.notes ?? '',
    });
    setFormOpen(true);
  }, []);

  const openRecordResult = useCallback((exam: Exam) => {
    setEditingExam(exam);
    setIsRecordingResult(true);
    setFormData({
      candidateId: exam.candidateId,
      examType: exam.examType,
      examDate: exam.examDate ?? '',
      score: exam.score != null ? String(exam.score) : '',
      result: exam.result,
      examinerName: exam.examinerName ?? '',
      examLocation: exam.examLocation ?? '',
      notes: exam.notes ?? '',
    });
    setFormOpen(true);
  }, []);

  const handleSelectCandidate = useCallback(
    (candidate: Candidate) => {
      setSelectedCandidate(candidate);
      setCandidateSearch('');
      setFormData((prev) => ({ ...prev, candidateId: candidate.id }));
      fetchEligibility(candidate.id);
    },
    [fetchEligibility]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Record<string, unknown> = {
      examType: formData.examType,
      examDate: formData.examDate,
      result: formData.result,
      examinerName: formData.examinerName || null,
      examLocation: formData.examLocation || null,
      notes: formData.notes || null,
      score: formData.score ? Number(formData.score) : null,
    };

    if (editingExam) {
      updateExam.mutate({ id: editingExam.id, data: payload });
    } else {
      payload.candidateId = formData.candidateId;
      createExam.mutate(payload);
    }
  };

  // --- Check if exam type is eligible ---

  const isTypeEligible = (type: 'theory' | 'practical'): boolean => {
    if (!eligibility) return true;
    return type === 'theory' ? eligibility.theoryEligible : eligibility.practicalEligible;
  };

  const getTypeReason = (type: 'theory' | 'practical'): string => {
    if (!eligibility) return '';
    return type === 'theory' ? eligibility.theoryReason : eligibility.practicalReason;
  };

  // --- Columns ---

  const columns = useMemo<ColumnDef<Exam, unknown>[]>(
    () => [
      {
        id: 'candidateName',
        header: 'Kandidati',
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.candidateName ?? '-'}</p>
            {row.original.candidateCode && (
              <p className="text-xs text-muted-foreground">{row.original.candidateCode}</p>
            )}
          </div>
        ),
      },
      {
        id: 'examType',
        header: 'Lloji',
        cell: ({ row }) => (
          <Badge variant="outline" className={row.original.examType === 'theory' ? 'border-blue-300 text-blue-700' : 'border-orange-300 text-orange-700'}>
            {EXAM_TYPE_LABEL[row.original.examType] ?? row.original.examType}
          </Badge>
        ),
      },
      {
        id: 'examDate',
        header: 'Data',
        cell: ({ row }) =>
          row.original.examDate ? formatDate(row.original.examDate) : '-',
      },
      {
        id: 'attemptNumber',
        header: 'Tentativa',
        cell: ({ row }) => row.original.attemptNumber,
      },
      {
        id: 'score',
        header: 'Piket',
        cell: ({ row }) => (row.original.score != null ? row.original.score : '-'),
      },
      {
        id: 'result',
        header: 'Rezultati',
        cell: ({ row }) => (
          <Badge variant={RESULT_VARIANT[row.original.result] ?? 'muted'}>
            {RESULT_LABEL[row.original.result] ?? row.original.result}
          </Badge>
        ),
      },
      {
        id: 'actions',
        header: 'Veprimet',
        cell: ({ row }) => {
          const exam = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  Veprimet
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => openEdit(exam)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edito
                </DropdownMenuItem>
                {exam.result === 'scheduled' && (
                  <DropdownMenuItem onClick={() => openRecordResult(exam)}>
                    <FileCheck className="mr-2 h-4 w-4" />
                    Regjistro Rezultatin
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => {
                    setDeletingExam(exam);
                    setDeleteOpen(true);
                  }}
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
    [openEdit, openRecordResult]
  );

  // --- Determine dialog title ---
  const dialogTitle = editingExam
    ? isRecordingResult
      ? 'Regjistro Rezultatin'
      : 'Edito Provimin'
    : 'Planifiko Provim';

  return (
    <div className="space-y-6">
      <PageHeader title="Provimet" description="Menaxhimi i provimeve te kandidateve">
        <ExportButton resource="exams" />
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Planifiko Provim
        </Button>
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Kerko me emrin e kandidatit..."
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Lloji" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Te gjitha</SelectItem>
            <SelectItem value="theory">Teorik</SelectItem>
            <SelectItem value="practical">Praktik</SelectItem>
          </SelectContent>
        </Select>
        <Select value={resultFilter} onValueChange={setResultFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Rezultati" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Te gjitha</SelectItem>
            <SelectItem value="scheduled">E planifikuar</SelectItem>
            <SelectItem value="passed">Kaluar</SelectItem>
            <SelectItem value="failed">Deshtuar</SelectItem>
            <SelectItem value="cancelled">Anuluar</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-[150px]"
            placeholder="Nga"
          />
          <span className="text-sm text-muted-foreground">-</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-[150px]"
            placeholder="Deri"
          />
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={exams ?? []}
        isLoading={examsLoading}
      />

      {/* Create / Edit / Record Result Dialog */}
      <Dialog open={formOpen} onOpenChange={(open) => !open && closeForm()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Candidate selector — only for create */}
            {!editingExam && (
              <div className="space-y-1.5">
                <Label>Kandidati</Label>
                {selectedCandidate ? (
                  <div className="flex items-center gap-3 rounded-md border p-3">
                    <UserCircle className="h-8 w-8 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="font-medium">
                        {selectedCandidate.firstName} {selectedCandidate.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {selectedCandidate.code}
                        {selectedCandidate.category && <> &middot; {selectedCandidate.category.code}</>}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedCandidate(null);
                        setCandidateSearch('');
                        setEligibility(null);
                        setFormData((prev) => ({ ...prev, candidateId: '' }));
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={candidateSearch}
                      onChange={(e) => setCandidateSearch(e.target.value)}
                      placeholder="Kerko kandidatin me emer ose kod..."
                      className="pl-9"
                    />
                    {candidateResults && candidateResults.length > 0 && (
                      <div className="absolute z-10 mt-1 w-full rounded-md border bg-white shadow-lg max-h-48 overflow-y-auto">
                        {candidateResults.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50"
                            onClick={() => handleSelectCandidate(c)}
                          >
                            <UserCircle className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">
                                {c.firstName} {c.lastName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {c.code}
                                {c.category && <> &middot; {c.category.code}</>}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Eligibility status */}
                {eligibilityLoading && (
                  <p className="text-sm text-muted-foreground">Duke kontrolluar kushtet...</p>
                )}
                {eligibility && (
                  <div className="rounded-md border p-3 space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span>Provimi Teorik:</span>
                      {eligibility.theoryEligible ? (
                        <Badge variant="success">I ploteson kushtet</Badge>
                      ) : (
                        <Badge variant="error">Nuk i ploteson kushtet</Badge>
                      )}
                    </div>
                    {!eligibility.theoryEligible && (
                      <p className="text-xs text-red-600">{eligibility.theoryReason}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <span>Provimi Praktik:</span>
                      {eligibility.practicalEligible ? (
                        <Badge variant="success">I ploteson kushtet</Badge>
                      ) : (
                        <Badge variant="error">Nuk i ploteson kushtet</Badge>
                      )}
                    </div>
                    {!eligibility.practicalEligible && (
                      <p className="text-xs text-red-600">{eligibility.practicalReason}</p>
                    )}
                    <div className="text-xs text-muted-foreground pt-1 border-t">
                      <p>
                        Ore teorike: {eligibility.theoryHoursRealized}/{eligibility.theoryHoursNeeded}
                        {eligibility.theoryExamPassed && ' (provimi teorik i kaluar)'}
                      </p>
                      <p>
                        Ore praktike: {eligibility.practicalHoursRealized}/{eligibility.practicalHoursNeeded}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* For recording result or editing — show candidate info read-only */}
            {editingExam && (
              <div className="rounded-md bg-gray-50 p-3">
                <p className="text-sm font-medium">
                  {editingExam.candidateName ?? 'Kandidati'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {EXAM_TYPE_LABEL[editingExam.examType]} &middot; Tentativa {editingExam.attemptNumber}
                </p>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Exam type — only for create */}
              {!editingExam && (
                <div className="space-y-1.5">
                  <Label>Lloji i Provimit</Label>
                  <Select
                    value={formData.examType}
                    onValueChange={(val) =>
                      setFormData((prev) => ({
                        ...prev,
                        examType: val as 'theory' | 'practical',
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Zgjidhni" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem
                        value="theory"
                        disabled={!!eligibility && !isTypeEligible('theory')}
                      >
                        Teorik
                        {eligibility && !isTypeEligible('theory') && ' (nuk ploteson kushtet)'}
                      </SelectItem>
                      <SelectItem
                        value="practical"
                        disabled={!!eligibility && !isTypeEligible('practical')}
                      >
                        Praktik
                        {eligibility && !isTypeEligible('practical') && ' (nuk ploteson kushtet)'}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {eligibility && !isTypeEligible(formData.examType) && (
                    <p className="text-xs text-red-600">
                      {getTypeReason(formData.examType)}
                    </p>
                  )}
                </div>
              )}

              {/* Exam date */}
              <div className="space-y-1.5">
                <Label htmlFor="exam-date">Data e Provimit</Label>
                <Input
                  id="exam-date"
                  type="date"
                  value={formData.examDate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, examDate: e.target.value }))}
                  required
                />
              </div>

              {/* Score */}
              <div className="space-y-1.5">
                <Label htmlFor="exam-score">Piket</Label>
                <Input
                  id="exam-score"
                  type="number"
                  min={0}
                  max={100}
                  value={formData.score}
                  onChange={(e) => setFormData((prev) => ({ ...prev, score: e.target.value }))}
                  placeholder="p.sh. 85"
                />
              </div>

              {/* Result */}
              <div className="space-y-1.5">
                <Label>Rezultati</Label>
                <Select
                  value={formData.result}
                  onValueChange={(val) =>
                    setFormData((prev) => ({
                      ...prev,
                      result: val as ExamFormData['result'],
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Zgjidhni" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">E planifikuar</SelectItem>
                    <SelectItem value="passed">Kaluar</SelectItem>
                    <SelectItem value="failed">Deshtuar</SelectItem>
                    <SelectItem value="cancelled">Anuluar</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Examiner name */}
              <div className="space-y-1.5">
                <Label htmlFor="exam-examiner">Ekzaminuesi</Label>
                <Input
                  id="exam-examiner"
                  value={formData.examinerName}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, examinerName: e.target.value }))
                  }
                  placeholder="Emri i ekzaminuesit"
                />
              </div>

              {/* Exam location */}
              <div className="space-y-1.5">
                <Label htmlFor="exam-location">Vendi</Label>
                <Input
                  id="exam-location"
                  value={formData.examLocation}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, examLocation: e.target.value }))
                  }
                  placeholder="Vendndodhja e provimit"
                />
              </div>
            </div>

            {/* Notes — full width */}
            <div className="space-y-1.5">
              <Label htmlFor="exam-notes">Shenime</Label>
              <Textarea
                id="exam-notes"
                value={formData.notes}
                onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Shenime shtese..."
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeForm}>
                Anulo
              </Button>
              <Button
                type="submit"
                disabled={
                  createExam.isPending ||
                  updateExam.isPending ||
                  (!editingExam && !formData.candidateId) ||
                  !formData.examDate
                }
              >
                {createExam.isPending || updateExam.isPending ? 'Duke ruajtur...' : 'Ruaj'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Fshi Provimin"
        description="A jeni te sigurt qe doni te fshini kete provim? Ky veprim nuk mund te kthehet."
        confirmText="Fshi"
        variant="destructive"
        onConfirm={() => {
          if (!deletingExam) return;
          deleteExam.mutate(deletingExam.id);
        }}
      />
    </div>
  );
}
