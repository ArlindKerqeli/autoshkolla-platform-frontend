'use client';

import { useCallback, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { format, startOfMonth, startOfWeek, startOfYear, subDays } from 'date-fns';
import {
  AlertTriangle,
  Award,
  Calendar as CalendarIcon,
  Check,
  ClipboardCheck,
  FileCheck,
  GraduationCap,
  Pencil,
  Plus,
  Search,
  Target,
  Trash2,
  UserCircle,
  X,
  XCircle,
} from 'lucide-react';
import api from '@/lib/api';
import { cn, formatDate } from '@/lib/utils';
import type { Candidate, Exam, ExamEligibility } from '@/lib/types';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ExportButton } from '@/components/shared/ExportButton';
import { KpiCard } from '@/components/shared/KpiCard';
import { FilterChip } from '@/components/shared/FilterChip';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
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
import { useToast } from '@/hooks/use-toast';

/* ──────────────────────────────────────────────────────────────────────────
   Constants & helpers
   ────────────────────────────────────────────────────────────────────────── */

type RangePreset = 'today' | 'week' | 'month' | 'thirty' | 'year' | 'all' | 'custom';

const PRESETS: { id: RangePreset; label: string }[] = [
  { id: 'all',    label: 'Të gjitha' },
  { id: 'today',  label: 'Sot' },
  { id: 'week',   label: 'Java' },
  { id: 'month',  label: 'Muaji' },
  { id: 'thirty', label: '30 ditë' },
  { id: 'year',   label: 'Viti' },
];

function rangeFor(preset: RangePreset): { dateFrom: string; dateTo: string } {
  const today = new Date();
  const end = format(today, 'yyyy-MM-dd');
  if (preset === 'all' || preset === 'custom') return { dateFrom: '', dateTo: '' };
  let start = today;
  switch (preset) {
    case 'today':  start = today; break;
    case 'week':   start = startOfWeek(today, { weekStartsOn: 1 }); break;
    case 'month':  start = startOfMonth(today); break;
    case 'thirty': start = subDays(today, 29); break;
    case 'year':   start = startOfYear(today); break;
  }
  return { dateFrom: format(start, 'yyyy-MM-dd'), dateTo: end };
}

const RESULT_LABEL: Record<Exam['result'], string> = {
  scheduled: 'E planifikuar',
  passed: 'Kaluar',
  failed: 'Dështuar',
  cancelled: 'Anuluar',
};

const RESULT_STYLES: Record<Exam['result'], { bg: string; fg: string; ring: string; dot: string }> = {
  scheduled: { bg: 'bg-amber-50', fg: 'text-amber-700', ring: 'ring-amber-200', dot: 'bg-amber-500' },
  passed:    { bg: 'bg-emerald-50', fg: 'text-emerald-700', ring: 'ring-emerald-200', dot: 'bg-emerald-500' },
  failed:    { bg: 'bg-rose-50', fg: 'text-rose-700', ring: 'ring-rose-200', dot: 'bg-rose-500' },
  cancelled: { bg: 'bg-slate-100', fg: 'text-slate-600', ring: 'ring-slate-200', dot: 'bg-slate-400' },
};

const EXAM_TYPE_LABEL: Record<Exam['examType'], string> = {
  theory: 'Teorik',
  practical: 'Praktik',
};

interface ExamFormData {
  candidateId: string;
  examType: 'theory' | 'practical';
  examDate: string;
  score: string;
  result: Exam['result'];
  examinerName: string;
  examLocation: string;
  notes: string;
}

const emptyForm: ExamFormData = {
  candidateId: '',
  examType: 'theory',
  examDate: format(new Date(), 'yyyy-MM-dd'),
  score: '',
  result: 'scheduled',
  examinerName: '',
  examLocation: '',
  notes: '',
};

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

/* ──────────────────────────────────────────────────────────────────────────
   Page
   ────────────────────────────────────────────────────────────────────────── */

export default function ProvimetPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Filters
  const initial = rangeFor('month');
  const [preset, setPreset] = useState<RangePreset>('month');
  const [dateFrom, setDateFrom] = useState(initial.dateFrom);
  const [dateTo, setDateTo] = useState(initial.dateTo);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'theory' | 'practical'>('all');
  const [resultFilter, setResultFilter] = useState<'all' | Exam['result']>('all');

  const applyPreset = (p: RangePreset) => {
    setPreset(p);
    if (p !== 'custom') {
      const r = rangeFor(p);
      setDateFrom(r.dateFrom);
      setDateTo(r.dateTo);
    }
  };

  // Dialog state
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [isRecordingResult, setIsRecordingResult] = useState(false);
  const [deletingExam, setDeletingExam] = useState<Exam | null>(null);
  const [formData, setFormData] = useState<ExamFormData>(emptyForm);

  // Candidate search
  const [candidateSearch, setCandidateSearch] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);

  // Eligibility
  const [eligibility, setEligibility] = useState<ExamEligibility | null>(null);
  const [eligibilityLoading, setEligibilityLoading] = useState(false);

  /* ── Queries ──────────────────────────────────────────────────────────── */

  const { data: examsData, isLoading: examsLoading } = useQuery({
    queryKey: ['exams', search, typeFilter, resultFilter, dateFrom, dateTo],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (typeFilter !== 'all') params.examType = typeFilter;
      if (resultFilter !== 'all') params.result = resultFilter;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      const res = await api.get('/exams', { params });
      return unwrapList<Exam>(res);
    },
  });
  const exams = Array.isArray(examsData) ? examsData : [];

  const { data: candidateResultsData } = useQuery({
    queryKey: ['candidate-search-exams', candidateSearch],
    queryFn: async () => {
      if (!candidateSearch || candidateSearch.length < 2) return [];
      const res = await api.get('/candidates', {
        params: { search: candidateSearch, perPage: 10 },
      });
      return unwrapList<Candidate>(res);
    },
    enabled: candidateSearch.length >= 2 && !selectedCandidate,
  });
  const candidateResults = Array.isArray(candidateResultsData) ? candidateResultsData : [];

  /* ── KPI metrics from the filtered list ───────────────────────────────── */

  const metrics = useMemo(() => {
    let scheduled = 0;
    let passed = 0;
    let failed = 0;
    let cancelled = 0;
    let theory = 0;
    let practical = 0;
    exams.forEach((e) => {
      if (e.result === 'scheduled') scheduled += 1;
      else if (e.result === 'passed') passed += 1;
      else if (e.result === 'failed') failed += 1;
      else if (e.result === 'cancelled') cancelled += 1;
      if (e.examType === 'theory') theory += 1;
      else practical += 1;
    });
    const completed = passed + failed;
    const passRate = completed > 0 ? Math.round((passed / completed) * 100) : null;
    return { total: exams.length, scheduled, passed, failed, cancelled, theory, practical, passRate, completed };
  }, [exams]);

  /* ── Mutations ────────────────────────────────────────────────────────── */

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

  /* ── Eligibility ──────────────────────────────────────────────────────── */

  const fetchEligibility = useCallback(async (candidateId: string) => {
    setEligibilityLoading(true);
    try {
      const res = await api.get(`/candidates/${candidateId}/exam-eligibility`);
      const response = res as unknown as { data: ExamEligibility };
      setEligibility(response.data ?? (res as unknown as ExamEligibility));
    } catch {
      setEligibility(null);
    } finally {
      setEligibilityLoading(false);
    }
  }, []);

  const isTypeEligible = (type: 'theory' | 'practical') =>
    !eligibility ? true : type === 'theory' ? eligibility.theoryEligible : eligibility.practicalEligible;

  const getTypeReason = (type: 'theory' | 'practical') =>
    !eligibility ? '' : type === 'theory' ? eligibility.theoryReason : eligibility.practicalReason;

  /* ── Form lifecycle ───────────────────────────────────────────────────── */

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
      result: 'passed',
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

  // Pre-select the eligible type when eligibility loads
  useMemo(() => {
    if (!eligibility || editingExam) return;
    if (!isTypeEligible(formData.examType)) {
      const other = formData.examType === 'theory' ? 'practical' : 'theory';
      if (isTypeEligible(other)) {
        setFormData((prev) => ({ ...prev, examType: other }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eligibility]);

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

  /* ── Table columns ────────────────────────────────────────────────────── */

  const columns = useMemo<ColumnDef<Exam, unknown>[]>(
    () => [
      {
        id: 'candidate',
        header: 'Kandidati',
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate text-[13.5px] font-medium text-slate-900">
              {row.original.candidateName ?? '—'}
            </p>
            {row.original.candidateCode && (
              <p className="text-[11px] text-slate-500">{row.original.candidateCode}</p>
            )}
          </div>
        ),
      },
      {
        id: 'examType',
        header: 'Lloji',
        cell: ({ row }) => (
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11.5px] font-medium ring-1 ring-inset',
              row.original.examType === 'theory'
                ? 'bg-blue-50 text-blue-700 ring-blue-200'
                : 'bg-orange-50 text-orange-700 ring-orange-200'
            )}
          >
            {row.original.examType === 'theory' ? (
              <GraduationCap className="h-3 w-3" />
            ) : (
              <Award className="h-3 w-3" />
            )}
            {EXAM_TYPE_LABEL[row.original.examType]}
          </span>
        ),
      },
      {
        id: 'examDate',
        header: 'Data',
        cell: ({ row }) =>
          row.original.examDate ? (
            <span className="tabular-nums text-slate-700">{formatDate(row.original.examDate)}</span>
          ) : (
            <span className="text-slate-400">—</span>
          ),
      },
      {
        id: 'attemptNumber',
        header: 'Tentativa',
        cell: ({ row }) => (
          <span className="inline-flex h-5 min-w-[22px] items-center justify-center rounded-full bg-slate-100 px-1.5 text-[11px] font-bold tabular-nums text-slate-700">
            #{row.original.attemptNumber}
          </span>
        ),
      },
      {
        id: 'score',
        header: 'Pikët',
        cell: ({ row }) =>
          row.original.score != null ? (
            <span className="font-semibold tabular-nums text-slate-900">{row.original.score}</span>
          ) : (
            <span className="text-slate-400">—</span>
          ),
      },
      {
        id: 'result',
        header: 'Rezultati',
        cell: ({ row }) => {
          const s = RESULT_STYLES[row.original.result];
          return (
            <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold ring-1 ring-inset', s.bg, s.fg, s.ring)}>
              <span className={cn('h-1.5 w-1.5 rounded-full', s.dot)} />
              {RESULT_LABEL[row.original.result] ?? row.original.result}
            </span>
          );
        },
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const exam = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8">
                  Veprime
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {exam.result === 'scheduled' && (
                  <DropdownMenuItem onClick={() => openRecordResult(exam)}>
                    <FileCheck className="mr-2 h-4 w-4" />
                    Regjistro rezultatin
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => openEdit(exam)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edito
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setDeletingExam(exam);
                    setDeleteOpen(true);
                  }}
                  className="text-rose-600 focus:text-rose-600"
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

  const dialogTitle = editingExam
    ? isRecordingResult
      ? 'Regjistro Rezultatin'
      : 'Edito Provimin'
    : 'Planifiko Provim';

  const anyFilterActive = typeFilter !== 'all' || resultFilter !== 'all' || !!search;

  /* ── Render ───────────────────────────────────────────────────────────── */

  return (
    <div className="space-y-6">
      <PageHeader title="Provimet" description="Menaxhimi i provimeve të kandidatëve">
        <ExportButton resource="exams" />
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Planifiko Provim
        </Button>
      </PageHeader>

      {/* Date range presets toolbar */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 lg:flex-row lg:items-center">
        <span className="hidden items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 lg:inline-flex">
          <CalendarIcon className="h-3.5 w-3.5" /> Periudha
        </span>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          {PRESETS.map((p) => (
            <FilterChip key={p.id} label={p.label} active={preset === p.id} onClick={() => applyPreset(p.id)} />
          ))}
          <FilterChip label="Periudhë…" active={preset === 'custom'} onClick={() => setPreset('custom')} />
        </div>
        <div
          className={cn(
            'flex items-center gap-2 transition-opacity lg:ml-auto',
            preset === 'custom' ? 'opacity-100' : 'opacity-60'
          )}
        >
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPreset('custom'); }}
            className="w-[150px]"
          />
          <span className="text-slate-400">→</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPreset('custom'); }}
            className="w-[150px]"
          />
        </div>
      </div>

      {/* KPI tiles */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={ClipboardCheck}
          tone="slate"
          label="Total Provime"
          value={String(metrics.total)}
          footer={
            <span className="text-xs text-slate-500">
              {metrics.theory} teorik
              <span className="px-1.5 text-slate-300">•</span>
              {metrics.practical} praktik
            </span>
          }
        />
        <KpiCard
          icon={CalendarIcon}
          tone="amber"
          label="Të Planifikuara"
          value={String(metrics.scheduled)}
          footer={<span className="text-xs text-slate-500">në pritje për provim</span>}
        />
        <KpiCard
          icon={Award}
          tone="emerald"
          label="Kaluan"
          value={String(metrics.passed)}
          footer={
            metrics.failed > 0 ? (
              <span className="text-xs text-slate-500">
                <span className="font-semibold text-rose-700">{metrics.failed}</span> dështuan
              </span>
            ) : (
              <span className="text-xs text-emerald-600">Asnjë dështim</span>
            )
          }
        />
        <KpiCard
          icon={Target}
          tone={metrics.passRate == null ? 'slate' : metrics.passRate >= 70 ? 'emerald' : 'rose'}
          label="Norma e Kalimit"
          value={metrics.passRate == null ? '—' : `${metrics.passRate}%`}
          footer={
            metrics.passRate == null ? (
              <span className="text-xs text-slate-400">Asnjë provim i përfunduar</span>
            ) : (
              <PassRateBar pct={metrics.passRate} />
            )
          }
        />
      </div>

      {/* Filter toolbar */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Kërko me emrin e kandidatit…"
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          <span className="mr-1 hidden text-[11px] font-medium uppercase tracking-wider text-slate-400 sm:inline">Lloji</span>
          <FilterChip label="Të gjitha" active={typeFilter === 'all'}       onClick={() => setTypeFilter('all')} />
          <FilterChip label="Teorik"    active={typeFilter === 'theory'}    onClick={() => setTypeFilter(typeFilter === 'theory' ? 'all' : 'theory')} />
          <FilterChip label="Praktik"   active={typeFilter === 'practical'} onClick={() => setTypeFilter(typeFilter === 'practical' ? 'all' : 'practical')} />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          <span className="mr-1 hidden text-[11px] font-medium uppercase tracking-wider text-slate-400 sm:inline">Statusi</span>
          <FilterChip label="Të gjitha"     active={resultFilter === 'all'}        onClick={() => setResultFilter('all')} />
          <FilterChip label="Planifikuar"   count={metrics.scheduled} active={resultFilter === 'scheduled'}  onClick={() => setResultFilter(resultFilter === 'scheduled' ? 'all' : 'scheduled')} />
          <FilterChip label="Kaluan"        count={metrics.passed}    active={resultFilter === 'passed'}     onClick={() => setResultFilter(resultFilter === 'passed' ? 'all' : 'passed')} />
          <FilterChip label="Dështuan"      count={metrics.failed}    active={resultFilter === 'failed'}     onClick={() => setResultFilter(resultFilter === 'failed' ? 'all' : 'failed')} />
          {metrics.cancelled > 0 && (
            <FilterChip label="Anuluar"     count={metrics.cancelled} active={resultFilter === 'cancelled'}  onClick={() => setResultFilter(resultFilter === 'cancelled' ? 'all' : 'cancelled')} />
          )}
        </div>

        {anyFilterActive && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setTypeFilter('all'); setResultFilter('all'); setSearch(''); }}
            className="h-9 shrink-0 text-slate-600"
          >
            <X className="mr-1 h-3.5 w-3.5" />
            Pastro
          </Button>
        )}
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={exams}
        isLoading={examsLoading}
      />

      {/* Create / Edit / Record Result Dialog */}
      <Dialog open={formOpen} onOpenChange={(open) => !open && closeForm()}>
        <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Candidate selector — create only */}
            {!editingExam && (
              <div className="space-y-2">
                <Label>Kandidati</Label>
                {selectedCandidate ? (
                  <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-100 text-primary-700">
                      <UserCircle className="h-6 w-6" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {selectedCandidate.firstName} {selectedCandidate.lastName}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {selectedCandidate.code}
                        {selectedCandidate.category && <> · {selectedCandidate.category.code}</>}
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
                      aria-label="Hiq kandidatin"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      value={candidateSearch}
                      onChange={(e) => setCandidateSearch(e.target.value)}
                      placeholder="Kërko kandidatin me emër ose kod…"
                      className="pl-9"
                      autoFocus
                    />
                    {candidateResults.length > 0 && (
                      <div className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                        {candidateResults.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-slate-50"
                            onClick={() => handleSelectCandidate(c)}
                          >
                            <UserCircle className="h-5 w-5 text-slate-400" />
                            <div>
                              <p className="text-sm font-medium text-slate-900">{c.firstName} {c.lastName}</p>
                              <p className="text-[11px] text-slate-500">
                                {c.code}
                                {c.category && <> · {c.category.code}</>}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {eligibilityLoading && (
                  <p className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="h-3 w-3 animate-pulse rounded-full bg-slate-300" />
                    Duke kontrolluar kushtet…
                  </p>
                )}

                {eligibility && !eligibilityLoading && (
                  <EligibilityCard eligibility={eligibility} selectedType={formData.examType} />
                )}
              </div>
            )}

            {/* Read-only candidate banner when editing */}
            {editingExam && (
              <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-200 text-slate-600">
                  <UserCircle className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {editingExam.candidateName ?? 'Kandidati'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {EXAM_TYPE_LABEL[editingExam.examType]} · Tentativa #{editingExam.attemptNumber}
                  </p>
                </div>
              </div>
            )}

            {/* Exam type chips — only for create */}
            {!editingExam && (
              <div className="space-y-1.5">
                <Label>Lloji i Provimit</Label>
                <div className="flex flex-wrap gap-2">
                  <ExamTypeChip
                    type="theory"
                    selected={formData.examType === 'theory'}
                    disabled={!!eligibility && !isTypeEligible('theory')}
                    onSelect={() => setFormData((prev) => ({ ...prev, examType: 'theory' }))}
                  />
                  <ExamTypeChip
                    type="practical"
                    selected={formData.examType === 'practical'}
                    disabled={!!eligibility && !isTypeEligible('practical')}
                    onSelect={() => setFormData((prev) => ({ ...prev, examType: 'practical' }))}
                  />
                </div>
                {eligibility && !isTypeEligible(formData.examType) && (
                  <p className="flex items-start gap-1.5 text-[11.5px] text-rose-600">
                    <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                    {getTypeReason(formData.examType)}
                  </p>
                )}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
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

              <div className="space-y-1.5">
                <Label>Rezultati</Label>
                <Select
                  value={formData.result}
                  onValueChange={(val) => setFormData((prev) => ({ ...prev, result: val as ExamFormData['result'] }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Zgjidhni" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">E planifikuar</SelectItem>
                    <SelectItem value="passed">Kaluar</SelectItem>
                    <SelectItem value="failed">Dështuan</SelectItem>
                    <SelectItem value="cancelled">Anuluar</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="exam-score">Pikët</Label>
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

              <div className="space-y-1.5">
                <Label htmlFor="exam-examiner">Ekzaminuesi</Label>
                <Input
                  id="exam-examiner"
                  value={formData.examinerName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, examinerName: e.target.value }))}
                  placeholder="Emri i ekzaminuesit"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="exam-location">Vendi</Label>
                <Input
                  id="exam-location"
                  value={formData.examLocation}
                  onChange={(e) => setFormData((prev) => ({ ...prev, examLocation: e.target.value }))}
                  placeholder="Vendndodhja e provimit"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="exam-notes">Shënime</Label>
              <Textarea
                id="exam-notes"
                value={formData.notes}
                onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Shënime shtesë…"
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
                  !formData.examDate ||
                  (!editingExam && !!eligibility && !isTypeEligible(formData.examType))
                }
              >
                {createExam.isPending || updateExam.isPending ? 'Duke ruajtur…' : 'Ruaj'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Fshi Provimin"
        description="A jeni të sigurt që doni ta fshini këtë provim? Ky veprim nuk mund të kthehet."
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

/* ──────────────────────────────────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────────────────────────────────── */

function PassRateBar({ pct }: { pct: number }) {
  const tone = pct >= 70 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-rose-500';
  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-slate-100">
      <div className={cn('h-full rounded-full', tone)} style={{ width: `${Math.max(2, Math.min(100, pct))}%` }} />
    </div>
  );
}

function ExamTypeChip({
  type,
  selected,
  disabled,
  onSelect,
}: {
  type: 'theory' | 'practical';
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
}) {
  const Icon = type === 'theory' ? GraduationCap : Award;
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={cn(
        'group inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium transition',
        selected
          ? 'border-primary-600 bg-primary-50 text-primary-700 ring-2 ring-primary-600/15'
          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50',
        disabled && 'cursor-not-allowed opacity-50'
      )}
    >
      <Icon className="h-4 w-4" />
      {EXAM_TYPE_LABEL[type]}
      {disabled && <X className="ml-1 h-3.5 w-3.5 text-rose-500" />}
    </button>
  );
}

function EligibilityCard({
  eligibility,
  selectedType,
}: {
  eligibility: ExamEligibility;
  selectedType: 'theory' | 'practical';
}) {
  const theoryPct =
    eligibility.theoryHoursNeeded > 0
      ? Math.min(100, (eligibility.theoryHoursRealized / eligibility.theoryHoursNeeded) * 100)
      : 100;
  const practicalPct =
    eligibility.practicalHoursNeeded > 0
      ? Math.min(100, (eligibility.practicalHoursRealized / eligibility.practicalHoursNeeded) * 100)
      : 100;

  return (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        Kushtet për provim
      </h3>

      <EligibilityRow
        label="Provimi Teorik"
        icon={GraduationCap}
        eligible={eligibility.theoryEligible}
        highlighted={selectedType === 'theory'}
        reason={eligibility.theoryReason}
        progress={{ realized: eligibility.theoryHoursRealized, needed: eligibility.theoryHoursNeeded, pct: theoryPct, unit: 'orë teorike' }}
        extra={eligibility.theoryExamPassed ? '✓ Provimi teorik është kaluar tashmë' : null}
      />

      <EligibilityRow
        label="Provimi Praktik"
        icon={Award}
        eligible={eligibility.practicalEligible}
        highlighted={selectedType === 'practical'}
        reason={eligibility.practicalReason}
        progress={{ realized: eligibility.practicalHoursRealized, needed: eligibility.practicalHoursNeeded, pct: practicalPct, unit: 'orë praktike' }}
        extra={null}
      />
    </div>
  );
}

function EligibilityRow({
  label,
  icon: Icon,
  eligible,
  highlighted,
  reason,
  progress,
  extra,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  eligible: boolean;
  highlighted: boolean;
  reason: string;
  progress: { realized: number; needed: number; pct: number; unit: string };
  extra: string | null;
}) {
  return (
    <div
      className={cn(
        'rounded-lg border p-3 transition',
        highlighted ? 'border-primary-300 bg-primary-50/40' : 'border-slate-100'
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-2 text-[13px] font-semibold text-slate-900">
          <Icon className="h-4 w-4 text-slate-500" />
          {label}
        </span>
        {eligible ? (
          <Badge variant="success" className="gap-1">
            <Check className="h-3 w-3" /> Plotëson kushtet
          </Badge>
        ) : (
          <Badge variant="error" className="gap-1">
            <XCircle className="h-3 w-3" /> Nuk plotëson
          </Badge>
        )}
      </div>

      <div className="mt-2 flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
          <div
            className={cn(
              'h-full rounded-full transition-[width] duration-500',
              progress.pct >= 100 ? 'bg-emerald-500' : 'bg-amber-500'
            )}
            style={{ width: `${Math.max(2, progress.pct)}%` }}
          />
        </div>
        <span className="shrink-0 text-[11.5px] font-semibold tabular-nums text-slate-700">
          {progress.realized}/{progress.needed} {progress.unit}
        </span>
      </div>

      {extra && <p className="mt-1.5 text-[11.5px] text-emerald-700">{extra}</p>}
      {!eligible && reason && (
        <p className="mt-1.5 flex items-start gap-1.5 text-[11.5px] text-rose-600">
          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
          {reason}
        </p>
      )}
    </div>
  );
}
