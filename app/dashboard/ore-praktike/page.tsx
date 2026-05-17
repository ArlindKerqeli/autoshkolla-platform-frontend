'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Banknote,
  Calendar as CalendarIcon,
  Car,
  Clock,
  Edit2,
  Gauge,
  ListOrdered,
  Plus,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  UserCircle,
} from 'lucide-react';
import api from '@/lib/api';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import type {
  Category,
  Instructor,
  LessonChapter,
  PracticalHourSession,
} from '@/lib/types';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ExportButton } from '@/components/shared/ExportButton';
import { CandidatePicker, type PickerCandidate } from '@/components/shared/CandidatePicker';
import { KpiCard } from '@/components/shared/KpiCard';
import { FilterChip } from '@/components/shared/FilterChip';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

interface SessionFormData {
  dateRealized: string;
  timeRealized: string;
  instructorId: string;
  hoursCount: number;
  pricePerHour: number;
  chapterTopics: string;
  remarks: string;
  isPaid: boolean;
}

const emptyForm: SessionFormData = {
  dateRealized: new Date().toISOString().split('T')[0],
  timeRealized: '',
  instructorId: '',
  hoursCount: 1,
  pricePerHour: 0,
  chapterTopics: '',
  remarks: '',
  isPaid: false,
};

interface ChapterFormData {
  categoryId: string;
  chapterTopics: string;
  hoursCount: number;
}

const emptyChapterForm: ChapterFormData = {
  categoryId: '',
  chapterTopics: '',
  hoursCount: 2,
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

export default function PracticalHoursPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('sessions');

  /* ── Sessions tab state ──────────────────────────────────────────────── */
  const [selectedCandidate, setSelectedCandidate] = useState<PickerCandidate | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<SessionFormData>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  /* ── Chapters tab state ──────────────────────────────────────────────── */
  const [chapterCategoryFilter, setChapterCategoryFilter] = useState<string>('all');
  const [isChapterFormOpen, setIsChapterFormOpen] = useState(false);
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [chapterForm, setChapterForm] = useState<ChapterFormData>(emptyChapterForm);
  const [deleteChapterTarget, setDeleteChapterTarget] = useState<string | null>(null);

  /* ── Queries ─────────────────────────────────────────────────────────── */
  const { data: categoriesData } = useQuery({
    queryKey: ['categories-active'],
    queryFn: async () =>
      unwrapList<Category>(
        await api.get('/categories', { params: { isActive: true, limit: 100 } })
      ),
  });
  const categories = Array.isArray(categoriesData) ? categoriesData : [];

  const { data: sessionsData, isLoading: isLoadingSessions } = useQuery({
    queryKey: ['practical-hours', selectedCandidate?.id],
    queryFn: async () =>
      unwrapList<PracticalHourSession>(
        await api.get('/practical-hours', { params: { candidateId: selectedCandidate!.id } })
      ),
    enabled: !!selectedCandidate,
  });
  const sessions = Array.isArray(sessionsData) ? sessionsData : [];

  const { data: instructorsData } = useQuery({
    queryKey: ['instructors-active-list'],
    queryFn: async () =>
      unwrapList<Instructor>(
        await api.get('/instructors', { params: { isActive: true, limit: 100 } })
      ),
  });
  const instructors = Array.isArray(instructorsData) ? instructorsData : [];

  const { data: chaptersData, isLoading: isLoadingChapters } = useQuery({
    queryKey: ['lesson-chapters', 'practical', chapterCategoryFilter],
    queryFn: async () => {
      const params: Record<string, string> = { chapterType: 'practical' };
      if (chapterCategoryFilter !== 'all') params.categoryId = chapterCategoryFilter;
      return unwrapList<LessonChapter>(await api.get('/lesson-chapters', { params }));
    },
  });
  const chapters = Array.isArray(chaptersData) ? chaptersData : [];

  /* ── Metrics ─────────────────────────────────────────────────────────── */
  const metrics = useMemo(() => {
    let hoursRealized = 0;
    let totalPrice = 0;
    let paidSessions = 0;
    let unpaidSessions = 0;
    sessions.forEach((s) => {
      hoursRealized += s.hoursCount;
      totalPrice += s.hoursCount * s.pricePerHour;
      if (s.isPaid) paidSessions += 1;
      else unpaidSessions += 1;
    });
    const target = selectedCandidate?.practicalHours ?? 0;
    const remaining = Math.max(0, target - hoursRealized);
    const pct = target > 0 ? Math.min(100, Math.round((hoursRealized / target) * 100)) : 0;
    return { hoursRealized, target, remaining, pct, totalPrice, paidSessions, unpaidSessions };
  }, [sessions, selectedCandidate]);

  /* ── Mutations ───────────────────────────────────────────────────────── */
  const createMutation = useMutation({
    mutationFn: (data: SessionFormData & { candidateId: string }) =>
      api.post('/practical-hours', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['practical-hours', selectedCandidate?.id] });
      setIsFormOpen(false);
      setFormData(emptyForm);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (params: { id: string; data: SessionFormData }) =>
      api.put(`/practical-hours/${params.id}`, params.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['practical-hours', selectedCandidate?.id] });
      setIsFormOpen(false);
      setEditingId(null);
      setFormData(emptyForm);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/practical-hours/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['practical-hours', selectedCandidate?.id] });
      setDeleteTarget(null);
    },
  });

  const createChapterMutation = useMutation({
    mutationFn: (data: ChapterFormData) =>
      api.post('/lesson-chapters', { ...data, chapterType: 'practical' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lesson-chapters', 'practical'] });
      setIsChapterFormOpen(false);
      setChapterForm(emptyChapterForm);
    },
  });

  const updateChapterMutation = useMutation({
    mutationFn: (params: { id: string; data: Partial<ChapterFormData> }) =>
      api.put(`/lesson-chapters/${params.id}`, params.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lesson-chapters', 'practical'] });
      setIsChapterFormOpen(false);
      setEditingChapterId(null);
      setChapterForm(emptyChapterForm);
    },
  });

  const deleteChapterMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/lesson-chapters/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lesson-chapters', 'practical'] });
      setDeleteChapterTarget(null);
    },
  });

  /* ── Handlers ────────────────────────────────────────────────────────── */
  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (session: PracticalHourSession) => {
    setEditingId(session.id);
    setFormData({
      dateRealized: session.dateRealized,
      timeRealized: session.timeRealized || '',
      instructorId: session.instructorId || '',
      hoursCount: session.hoursCount,
      pricePerHour: session.pricePerHour,
      chapterTopics: session.chapterTopics || '',
      remarks: session.remarks || '',
      isPaid: session.isPaid,
    });
    setIsFormOpen(true);
  };

  const handleSubmit = () => {
    if (!selectedCandidate) return;
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: formData });
    } else {
      createMutation.mutate({ ...formData, candidateId: selectedCandidate.id });
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const handleOpenAddChapter = () => {
    setEditingChapterId(null);
    setChapterForm(emptyChapterForm);
    setIsChapterFormOpen(true);
  };

  const handleOpenEditChapter = (chapter: LessonChapter) => {
    setEditingChapterId(chapter.id);
    setChapterForm({
      categoryId: chapter.categoryId,
      chapterTopics: chapter.chapterTopics,
      hoursCount: chapter.hoursCount,
    });
    setIsChapterFormOpen(true);
  };

  const handleSubmitChapter = () => {
    if (editingChapterId) {
      updateChapterMutation.mutate({
        id: editingChapterId,
        data: { chapterTopics: chapterForm.chapterTopics, hoursCount: chapterForm.hoursCount },
      });
    } else {
      createChapterMutation.mutate(chapterForm);
    }
  };

  const isSavingChapter = createChapterMutation.isPending || updateChapterMutation.isPending;

  return (
    <div className="space-y-6">
      <PageHeader title="Orët Praktike" description="Menaxhoni orët praktike dhe kapitujt mësimorë">
        <ExportButton
          resource="practical-hours"
          params={selectedCandidate ? { candidate_id: selectedCandidate.id } : {}}
          disabled={!selectedCandidate}
        />
      </PageHeader>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="sessions" className="gap-1.5">
            <Car className="h-4 w-4" />
            Sesionet
          </TabsTrigger>
          <TabsTrigger value="chapters" className="gap-1.5">
            <ListOrdered className="h-4 w-4" />
            Kapitujt Mësimorë
          </TabsTrigger>
        </TabsList>

        {/* ═════ Sessions tab ═════ */}
        <TabsContent value="sessions" className="mt-4 space-y-5">
          <CandidatePicker
            selected={selectedCandidate}
            onSelect={setSelectedCandidate}
            onClear={() => setSelectedCandidate(null)}
            subtitle="Kërkoni me emër ose kod, ose zgjidhni një nga kandidatët e fundit për të parë orët praktike."
            placeholder="Kërko kandidatin (emër, mbiemër, kod, numër personal)…"
          />

          {selectedCandidate ? (
            <>
              {/* KPI strip */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <KpiCard
                  icon={Gauge}
                  tone="sky"
                  label="Orë të realizuara"
                  value={String(metrics.hoursRealized)}
                  footer={
                    <span className="text-xs text-slate-500">nga {metrics.target} orë cak</span>
                  }
                />
                <KpiCard
                  icon={Target}
                  tone={metrics.remaining > 0 ? 'amber' : 'emerald'}
                  label="Të mbetura"
                  value={String(metrics.remaining)}
                  footer={
                    <span className="text-xs text-slate-500">
                      {metrics.remaining === 0 ? 'Caku u arrit ✓' : `${metrics.remaining} orë deri në cak`}
                    </span>
                  }
                />
                <KpiCard
                  icon={TrendingUp}
                  tone={metrics.pct === 100 ? 'emerald' : metrics.pct >= 50 ? 'sky' : 'amber'}
                  label="Progresi"
                  value={`${metrics.pct}%`}
                  footer={<ProgressBar pct={metrics.pct} />}
                />
                <KpiCard
                  icon={Banknote}
                  tone="violet"
                  label="Sasia totale"
                  value={formatCurrency(metrics.totalPrice)}
                  footer={
                    <span className="text-xs text-slate-500">
                      <span className="font-semibold text-emerald-700">{metrics.paidSessions}</span> paguar
                      <span className="px-1.5 text-slate-300">•</span>
                      <span className="font-semibold text-rose-700">{metrics.unpaidSessions}</span> papaguar
                    </span>
                  }
                />
              </div>

              {/* Sessions card */}
              <Card className="overflow-hidden">
                <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                  <h2 className="inline-flex items-center gap-2 text-[13px] font-semibold tracking-tight text-slate-900">
                    <Car className="h-4 w-4 text-slate-400" />
                    Sesionet Praktike
                    {!isLoadingSessions && (
                      <span className="ml-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-slate-100 px-1.5 text-[11px] font-semibold text-slate-600">
                        {sessions.length}
                      </span>
                    )}
                  </h2>
                  <Button size="sm" onClick={handleOpenAdd}>
                    <Plus className="mr-1.5 h-4 w-4" />
                    Shto Sesion
                  </Button>
                </div>
                <div className="p-4">
                  {isLoadingSessions ? (
                    <LoadingSkeleton variant="table" rows={6} columns={8} />
                  ) : sessions.length === 0 ? (
                    <EmptyState
                      icon={Car}
                      title="Nuk ka sesione praktike"
                      description="Shtoni sesionin e parë praktik për këtë kandidat."
                      action={
                        <Button onClick={handleOpenAdd}>
                          <Plus className="mr-1.5 h-4 w-4" />
                          Shto Sesion
                        </Button>
                      }
                    />
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {sessions.map((s) => (
                        <PracticalSessionRow
                          key={s.id}
                          session={s}
                          onEdit={() => handleOpenEdit(s)}
                          onDelete={() => setDeleteTarget(s.id)}
                        />
                      ))}
                    </ul>
                  )}
                </div>
              </Card>
            </>
          ) : (
            <Card className="flex flex-col items-center gap-3 py-12 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-slate-400">
                <Sparkles className="h-6 w-6" />
              </span>
              <div>
                <h3 className="text-base font-semibold text-slate-900">Zgjidhni një kandidat</h3>
                <p className="mt-1 max-w-md text-sm text-slate-500">
                  Pasi të zgjidhni një kandidat më lart, do të shihni orët praktike të realizuara, progresin
                  ndaj cakut dhe statusin e pagesave për secilin sesion.
                </p>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* ═════ Chapters tab ═════ */}
        <TabsContent value="chapters" className="mt-4 space-y-5">
          <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 lg:flex-row lg:items-center">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
              <span className="mr-1 hidden text-[11px] font-medium uppercase tracking-wider text-slate-400 sm:inline">
                Kategoria
              </span>
              <FilterChip
                label="Të gjitha"
                active={chapterCategoryFilter === 'all'}
                onClick={() => setChapterCategoryFilter('all')}
              />
              {categories.map((cat) => (
                <FilterChip
                  key={cat.id}
                  label={cat.code}
                  active={chapterCategoryFilter === cat.id}
                  onClick={() =>
                    setChapterCategoryFilter(chapterCategoryFilter === cat.id ? 'all' : cat.id)
                  }
                />
              ))}
            </div>
            <Button size="sm" onClick={handleOpenAddChapter} className="lg:ml-auto">
              <Plus className="mr-1.5 h-4 w-4" />
              Shto kapitull
            </Button>
          </div>

          <Card className="overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-3.5">
              <h2 className="inline-flex items-center gap-2 text-[13px] font-semibold tracking-tight text-slate-900">
                <ListOrdered className="h-4 w-4 text-slate-400" />
                Plani i Kapitujve — Praktike
                {!isLoadingChapters && (
                  <span className="ml-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-slate-100 px-1.5 text-[11px] font-semibold text-slate-600">
                    {chapters.length}
                  </span>
                )}
              </h2>
            </div>
            <div className="p-4">
              {isLoadingChapters ? (
                <LoadingSkeleton variant="table" rows={6} columns={5} />
              ) : chapters.length === 0 ? (
                <EmptyState
                  icon={ListOrdered}
                  title="Nuk ka kapituj mësimorë"
                  description="Shtoni kapituj mësimorë praktikë për kategoritë."
                  action={
                    <Button onClick={handleOpenAddChapter}>
                      <Plus className="mr-1.5 h-4 w-4" />
                      Shto kapitull
                    </Button>
                  }
                />
              ) : (
                <ul className="divide-y divide-slate-100">
                  {chapters.map((ch) => (
                    <ChapterRow
                      key={ch.id}
                      chapter={ch}
                      onEdit={() => handleOpenEditChapter(ch)}
                      onDelete={() => setDeleteChapterTarget(ch.id)}
                    />
                  ))}
                </ul>
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Session Dialog */}
      <Dialog open={isFormOpen} onOpenChange={(open) => !open && setIsFormOpen(false)}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edito Sesionin' : 'Shto Sesion Praktik'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Data</Label>
                <Input
                  type="date"
                  value={formData.dateRealized}
                  onChange={(e) => setFormData((p) => ({ ...p, dateRealized: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Ora</Label>
                <Input
                  type="time"
                  value={formData.timeRealized}
                  onChange={(e) => setFormData((p) => ({ ...p, timeRealized: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Instruktori</Label>
              <Select
                value={formData.instructorId || ''}
                onValueChange={(val) => setFormData((p) => ({ ...p, instructorId: val }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Zgjidhni instruktorin…" />
                </SelectTrigger>
                <SelectContent>
                  {instructors.map((inst) => (
                    <SelectItem key={inst.id} value={inst.id}>
                      {inst.firstName} {inst.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Numri i orëve</Label>
                <Input
                  type="number"
                  min={1}
                  max={8}
                  value={formData.hoursCount}
                  onChange={(e) => setFormData((p) => ({ ...p, hoursCount: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Çmimi për orë (€)</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.5}
                  value={formData.pricePerHour}
                  onChange={(e) => setFormData((p) => ({ ...p, pricePerHour: Number(e.target.value) }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Kapitulli / Tema</Label>
              <Input
                value={formData.chapterTopics}
                onChange={(e) => setFormData((p) => ({ ...p, chapterTopics: e.target.value }))}
                placeholder="p.sh. 1.1, 2.1"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Vërejtje</Label>
              <Textarea
                value={formData.remarks}
                onChange={(e) => setFormData((p) => ({ ...p, remarks: e.target.value }))}
                placeholder="Vërejtje opsionale…"
                rows={3}
              />
            </div>
            <label
              htmlFor="isPaid"
              className="flex cursor-pointer items-center justify-between rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2.5"
            >
              <div>
                <span className="text-sm font-medium text-slate-900">Paguar</span>
                <p className="text-[11px] text-slate-500">Shëno nëse instruktori e ka paguar këtë sesion.</p>
              </div>
              <Checkbox
                id="isPaid"
                checked={formData.isPaid}
                onCheckedChange={(checked) => setFormData((p) => ({ ...p, isPaid: !!checked }))}
              />
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>Anulo</Button>
            <Button onClick={handleSubmit} disabled={isSaving}>
              {isSaving ? 'Duke ruajtur…' : editingId ? 'Ruaj' : 'Shto'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Fshi sesionin"
        description="A jeni të sigurt që doni ta fshini këtë sesion praktik? Ky veprim nuk mund të kthehet."
        confirmText="Fshi"
        variant="destructive"
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
      />

      {/* Add/Edit Chapter Dialog */}
      <Dialog open={isChapterFormOpen} onOpenChange={(open) => !open && setIsChapterFormOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingChapterId ? 'Edito Kapitullin' : 'Shto Kapitull Praktik'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Kategoria</Label>
              <Select
                value={chapterForm.categoryId}
                onValueChange={(val) => setChapterForm((p) => ({ ...p, categoryId: val }))}
                disabled={!!editingChapterId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Zgjidh kategorinë" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.code}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Kapitujt e orës mësimore</Label>
              <Textarea
                value={chapterForm.chapterTopics}
                onChange={(e) => setChapterForm((p) => ({ ...p, chapterTopics: e.target.value }))}
                placeholder="p.sh. 1.1, 2.1"
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Numri i orëve</Label>
              <Input
                type="number"
                min={1}
                max={8}
                value={chapterForm.hoursCount}
                onChange={(e) => setChapterForm((p) => ({ ...p, hoursCount: Number(e.target.value) }))}
                className="w-32"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsChapterFormOpen(false)}>Anulo</Button>
            <Button
              onClick={handleSubmitChapter}
              disabled={isSavingChapter || (!editingChapterId && !chapterForm.categoryId)}
            >
              {isSavingChapter ? 'Duke ruajtur…' : 'Ruaj'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteChapterTarget}
        onOpenChange={(open) => !open && setDeleteChapterTarget(null)}
        title="Fshi kapitullin"
        description="A jeni të sigurt që doni ta fshini këtë kapitull? Numrat e sesioneve do të rinumërohen."
        confirmText="Fshi"
        variant="destructive"
        onConfirm={() => deleteChapterTarget && deleteChapterMutation.mutate(deleteChapterTarget)}
      />
    </div>
  );
}

/* ───────────────────────────────────────────────────────────────────────── */

function ProgressBar({ pct }: { pct: number }) {
  const color = pct === 100 ? 'bg-emerald-500' : pct >= 50 ? 'bg-sky-500' : 'bg-amber-500';
  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-slate-100">
      <div
        className={cn('h-full rounded-full transition-[width] duration-500', color)}
        style={{ width: `${Math.max(2, Math.min(100, pct))}%` }}
      />
    </div>
  );
}

function PracticalSessionRow({
  session,
  onEdit,
  onDelete,
}: {
  session: PracticalHourSession;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <li className="flex items-center gap-3 px-1 py-2.5 transition hover:bg-slate-50/60">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200">
        <Car className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 text-[12px] font-semibold tabular-nums text-slate-900">
            <CalendarIcon className="h-3 w-3 text-slate-400" />
            {formatDate(session.dateRealized)}
          </span>
          {session.timeRealized && (
            <>
              <span className="text-slate-300">·</span>
              <span className="inline-flex items-center gap-1 text-[11.5px] tabular-nums text-slate-600">
                <Clock className="h-3 w-3 text-slate-400" />
                {session.timeRealized}
              </span>
            </>
          )}
          <span className="text-slate-300">·</span>
          <span className="text-[12px] font-medium text-slate-700">{session.hoursCount} orë</span>
          <span className="text-slate-300">·</span>
          <span className="text-[12px] font-semibold tabular-nums text-slate-900">
            {formatCurrency(session.hoursCount * session.pricePerHour)}
          </span>
          <span className="text-[11px] text-slate-400">
            ({formatCurrency(session.pricePerHour)}/orë)
          </span>
        </div>
        <p className="mt-0.5 inline-flex flex-wrap items-center gap-2 text-[11.5px] text-slate-500">
          {session.instructor && (
            <span className="inline-flex items-center gap-1">
              <UserCircle className="h-3 w-3 text-slate-400" />
              {session.instructor.firstName} {session.instructor.lastName}
            </span>
          )}
          {session.chapterTopics && (
            <>
              <span className="text-slate-300">·</span>
              <span className="truncate">Kapitull: {session.chapterTopics}</span>
            </>
          )}
          {session.remarks && (
            <>
              <span className="text-slate-300">·</span>
              <span className="truncate italic">“{session.remarks}”</span>
            </>
          )}
        </p>
      </div>
      <div className="flex items-center gap-1">
        {session.isPaid ? (
          <Badge variant="success">Paguar</Badge>
        ) : (
          <Badge variant="error">Papaguar</Badge>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onEdit}
          aria-label="Edito sesionin"
        >
          <Edit2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-rose-600 hover:text-rose-700"
          onClick={onDelete}
          aria-label="Fshi sesionin"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </li>
  );
}

function ChapterRow({
  chapter,
  onEdit,
  onDelete,
}: {
  chapter: LessonChapter;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <li className="flex items-center gap-3 px-1 py-2.5 transition hover:bg-slate-50/60">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100 text-[12px] font-bold text-slate-700 ring-1 ring-inset ring-slate-200">
        {chapter.sessionNumber}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-900">{chapter.chapterTopics}</p>
        <p className="mt-0.5 inline-flex items-center gap-2 text-[11.5px] text-slate-500">
          <span className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[10.5px] font-bold tracking-wider text-slate-700">
            {chapter.categoryCode}
          </span>
          <span className="text-slate-300">·</span>
          <span>{chapter.hoursCount} orë</span>
        </p>
      </div>
      {!chapter.isActive && <Badge variant="muted" className="mr-1">Joaktiv</Badge>}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onEdit}
          aria-label="Edito kapitullin"
        >
          <Edit2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-rose-600 hover:text-rose-700"
          onClick={onDelete}
          aria-label="Fshi kapitullin"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </li>
  );
}
