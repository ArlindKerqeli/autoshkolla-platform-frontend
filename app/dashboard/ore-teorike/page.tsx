'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BookOpen,
  Calendar as CalendarIcon,
  Check,
  CheckCheck,
  Clock,
  Edit2,
  ListOrdered,
  Plus,
  Sparkles,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import api from '@/lib/api';
import { cn, formatDate } from '@/lib/utils';
import type {
  Category,
  LessonChapter,
  TheoryHourSession,
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

interface ChapterFormData {
  categoryId: string;
  chapterTopics: string;
  timeFrom: string;
  timeTo: string;
  hoursCount: number;
}

const emptyChapterForm: ChapterFormData = {
  categoryId: '',
  chapterTopics: '',
  timeFrom: '16:00',
  timeTo: '17:30',
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

export default function TheoryHoursPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('sessions');

  /* ── Sessions tab state ──────────────────────────────────────────────── */
  const [selectedCandidate, setSelectedCandidate] = useState<PickerCandidate | null>(null);
  const [editingSession, setEditingSession] = useState<TheoryHourSession | null>(null);
  const [editForm, setEditForm] = useState({
    chapterTopics: '',
    dateRealized: '',
    timeFrom: '',
    timeTo: '',
    hoursCount: 1,
  });

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
    queryKey: ['theory-hours', selectedCandidate?.id],
    queryFn: async () =>
      unwrapList<TheoryHourSession>(
        await api.get('/theory-hours', { params: { candidateId: selectedCandidate!.id } })
      ),
    enabled: !!selectedCandidate,
  });
  const sessions = Array.isArray(sessionsData) ? sessionsData : [];

  const { data: chaptersData, isLoading: isLoadingChapters } = useQuery({
    queryKey: ['lesson-chapters', 'theory', chapterCategoryFilter],
    queryFn: async () => {
      const params: Record<string, string> = { chapterType: 'theory' };
      if (chapterCategoryFilter !== 'all') params.categoryId = chapterCategoryFilter;
      return unwrapList<LessonChapter>(await api.get('/lesson-chapters', { params }));
    },
  });
  const chapters = Array.isArray(chaptersData) ? chaptersData : [];

  /* ── Metrics ─────────────────────────────────────────────────────────── */
  const metrics = useMemo(() => {
    const total = sessions.length;
    const realized = sessions.filter((s) => s.isRealized).length;
    const remaining = total - realized;
    const pct = total > 0 ? Math.round((realized / total) * 100) : 0;
    return { total, realized, remaining, pct };
  }, [sessions]);

  /* ── Mutations ───────────────────────────────────────────────────────── */
  const realizeMutation = useMutation({
    mutationFn: (sessionId: string) => api.post(`/theory-hours/${sessionId}/realize`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['theory-hours', selectedCandidate?.id] });
    },
  });

  const realizeAllMutation = useMutation({
    mutationFn: () =>
      Promise.all(
        sessions
          .filter((s) => !s.isRealized)
          .map((s) => api.post(`/theory-hours/${s.id}/realize`))
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['theory-hours', selectedCandidate?.id] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (params: { id: string; data: Record<string, unknown> }) =>
      api.put(`/theory-hours/${params.id}`, params.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['theory-hours', selectedCandidate?.id] });
      setEditingSession(null);
    },
  });

  const createChapterMutation = useMutation({
    mutationFn: (data: ChapterFormData) =>
      api.post('/lesson-chapters', { ...data, chapterType: 'theory' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lesson-chapters', 'theory'] });
      setIsChapterFormOpen(false);
      setChapterForm(emptyChapterForm);
    },
  });

  const updateChapterMutation = useMutation({
    mutationFn: (params: { id: string; data: Partial<ChapterFormData> }) =>
      api.put(`/lesson-chapters/${params.id}`, params.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lesson-chapters', 'theory'] });
      setIsChapterFormOpen(false);
      setEditingChapterId(null);
      setChapterForm(emptyChapterForm);
    },
  });

  const deleteChapterMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/lesson-chapters/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lesson-chapters', 'theory'] });
      setDeleteChapterTarget(null);
    },
  });

  /* ── Handlers ────────────────────────────────────────────────────────── */
  const handleEditSession = (session: TheoryHourSession) => {
    setEditingSession(session);
    setEditForm({
      chapterTopics: session.chapterTopics || '',
      dateRealized: session.dateRealized || '',
      timeFrom: session.timeFrom || '',
      timeTo: session.timeTo || '',
      hoursCount: session.hoursCount,
    });
  };

  const handleSaveEdit = () => {
    if (!editingSession) return;
    updateMutation.mutate({ id: editingSession.id, data: editForm });
  };

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
      timeFrom: chapter.timeFrom || '16:00',
      timeTo: chapter.timeTo || '17:30',
      hoursCount: chapter.hoursCount,
    });
    setIsChapterFormOpen(true);
  };

  const handleSubmitChapter = () => {
    if (editingChapterId) {
      updateChapterMutation.mutate({
        id: editingChapterId,
        data: {
          chapterTopics: chapterForm.chapterTopics,
          timeFrom: chapterForm.timeFrom,
          timeTo: chapterForm.timeTo,
          hoursCount: chapterForm.hoursCount,
        },
      });
    } else {
      createChapterMutation.mutate(chapterForm);
    }
  };

  const isSavingChapter = createChapterMutation.isPending || updateChapterMutation.isPending;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Orët Teorike"
        description="Menaxhoni orët teorike dhe kapitujt mësimorë"
      >
        <ExportButton
          resource="theory-hours"
          params={selectedCandidate ? { candidate_id: selectedCandidate.id } : {}}
          disabled={!selectedCandidate}
        />
      </PageHeader>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="sessions" className="gap-1.5">
            <BookOpen className="h-4 w-4" />
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
            subtitle="Kërkoni me emër ose kod, ose zgjidhni një nga kandidatët e fundit për të parë orët teorike."
            placeholder="Kërko kandidatin (emër, mbiemër, kod, numër personal)…"
          />

          {selectedCandidate ? (
            <>
              {/* KPI strip */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <KpiCard
                  icon={BookOpen}
                  tone="slate"
                  label="Sesione gjithsej"
                  value={String(metrics.total)}
                  footer={<span className="text-xs text-slate-500">të planifikuara në plan</span>}
                />
                <KpiCard
                  icon={CheckCheck}
                  tone="emerald"
                  label="Të realizuara"
                  value={String(metrics.realized)}
                  footer={
                    <span className="text-xs text-slate-500">
                      {metrics.total > 0 ? `${metrics.pct}% e planit` : '—'}
                    </span>
                  }
                />
                <KpiCard
                  icon={Clock}
                  tone={metrics.remaining > 0 ? 'amber' : 'emerald'}
                  label="Të mbetura"
                  value={String(metrics.remaining)}
                  footer={
                    <span className="text-xs text-slate-500">
                      {metrics.remaining === 0 ? 'Të gjitha të realizuara' : 'jo të realizuara ende'}
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
              </div>

              {/* Visual session-slot strip */}
              {metrics.total > 0 && <SlotStrip sessions={sessions} />}

              {/* Sessions table */}
              <Card className="overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
                  <h2 className="inline-flex items-center gap-2 text-[13px] font-semibold tracking-tight text-slate-900">
                    <BookOpen className="h-4 w-4 text-slate-400" />
                    Sesionet Teorike
                  </h2>
                  {metrics.remaining > 0 && (
                    <Button
                      size="sm"
                      onClick={() => realizeAllMutation.mutate()}
                      disabled={realizeAllMutation.isPending}
                    >
                      <CheckCheck className="mr-1.5 h-4 w-4" />
                      Realizo të gjitha ({metrics.remaining})
                    </Button>
                  )}
                </div>
                <div className="p-4">
                  {isLoadingSessions ? (
                    <LoadingSkeleton variant="table" rows={8} columns={7} />
                  ) : sessions.length === 0 ? (
                    <EmptyState
                      icon={BookOpen}
                      title="Nuk ka sesione teorike"
                      description="Ky kandidat nuk ka sesione teorike të regjistruara ende."
                    />
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {sessions.map((session) => (
                        <SessionRow
                          key={session.id}
                          session={session}
                          onRealize={() => realizeMutation.mutate(session.id)}
                          onEdit={() => handleEditSession(session)}
                          realizing={realizeMutation.isPending}
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
                  Pasi të zgjidhni një kandidat më lart, do të shihni 8 sesionet teorike të tyre, progresin
                  dhe statusin e secilit sesion.
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
                Plani i Kapitujve — Teorike
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
                  description="Shtoni kapituj mësimorë për çdo kategori për të krijuar planin teorik."
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

      {/* Edit Session Dialog */}
      <Dialog open={!!editingSession} onOpenChange={(open) => !open && setEditingSession(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edito Sesionin #{editingSession?.sessionNumber}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Kapitulli / Tema</Label>
              <Input
                value={editForm.chapterTopics}
                onChange={(e) => setEditForm((p) => ({ ...p, chapterTopics: e.target.value }))}
                placeholder="Tema e sesionit…"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Data</Label>
                <Input
                  type="date"
                  value={editForm.dateRealized}
                  onChange={(e) => setEditForm((p) => ({ ...p, dateRealized: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Numri i orëve</Label>
                <Input
                  type="number"
                  min={1}
                  max={8}
                  value={editForm.hoursCount}
                  onChange={(e) => setEditForm((p) => ({ ...p, hoursCount: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Ora e fillimit</Label>
                <Input
                  type="time"
                  value={editForm.timeFrom}
                  onChange={(e) => setEditForm((p) => ({ ...p, timeFrom: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Ora e mbarimit</Label>
                <Input
                  type="time"
                  value={editForm.timeTo}
                  onChange={(e) => setEditForm((p) => ({ ...p, timeTo: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSession(null)}>
              Anulo
            </Button>
            <Button onClick={handleSaveEdit} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Duke ruajtur…' : 'Ruaj'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Chapter Dialog */}
      <Dialog open={isChapterFormOpen} onOpenChange={(open) => !open && setIsChapterFormOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingChapterId ? 'Edito Kapitullin' : 'Shto Kapitull Teorik'}</DialogTitle>
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
                placeholder="p.sh. 1.1, 1.2, 1.3"
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="font-semibold">Ora e planifikuar e realizimit</Label>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-500">Nga ora</Label>
                  <Input
                    type="time"
                    value={chapterForm.timeFrom}
                    onChange={(e) => setChapterForm((p) => ({ ...p, timeFrom: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-500">Deri ora</Label>
                  <Input
                    type="time"
                    value={chapterForm.timeTo}
                    onChange={(e) => setChapterForm((p) => ({ ...p, timeTo: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-500">Numri i orëve</Label>
                  <Input
                    type="number"
                    min={1}
                    max={8}
                    value={chapterForm.hoursCount}
                    onChange={(e) => setChapterForm((p) => ({ ...p, hoursCount: Number(e.target.value) }))}
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsChapterFormOpen(false)}>
              Anulo
            </Button>
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

function SlotStrip({ sessions }: { sessions: TheoryHourSession[] }) {
  const ordered = [...sessions].sort((a, b) => a.sessionNumber - b.sessionNumber);
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Plani i sesioneve
        </h2>
        <span className="text-[11px] text-slate-400">
          {ordered.filter((s) => s.isRealized).length} nga {ordered.length} të realizuara
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {ordered.map((s) => (
          <div
            key={s.id}
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-semibold ring-1 ring-inset transition',
              s.isRealized
                ? 'bg-emerald-500 text-white ring-emerald-600'
                : 'bg-slate-50 text-slate-500 ring-slate-200'
            )}
            title={`Sesioni ${s.sessionNumber} · ${s.isRealized ? 'Realizuar' : 'Jo i realizuar'}${s.chapterTopics ? ' · ' + s.chapterTopics : ''}`}
          >
            {s.isRealized ? <Check className="h-4 w-4" /> : s.sessionNumber}
          </div>
        ))}
      </div>
    </div>
  );
}

function SessionRow({
  session,
  onRealize,
  onEdit,
  realizing,
}: {
  session: TheoryHourSession;
  onRealize: () => void;
  onEdit: () => void;
  realizing: boolean;
}) {
  return (
    <li className="flex items-center gap-3 px-1 py-2.5 transition hover:bg-slate-50/60">
      <span
        className={cn(
          'grid h-9 w-9 shrink-0 place-items-center rounded-full text-[12px] font-bold ring-1 ring-inset',
          session.isRealized
            ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
            : 'bg-slate-50 text-slate-600 ring-slate-200'
        )}
      >
        {session.isRealized ? <Check className="h-4 w-4" /> : session.sessionNumber}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-900">
          {session.chapterTopics || `Sesioni #${session.sessionNumber}`}
        </p>
        <p className="mt-0.5 inline-flex items-center gap-2 text-[11.5px] text-slate-500">
          {session.dateRealized ? (
            <>
              <CalendarIcon className="h-3 w-3 text-slate-400" />
              <span className="tabular-nums">{formatDate(session.dateRealized)}</span>
            </>
          ) : (
            <span className="text-slate-400">Pa datë</span>
          )}
          {(session.timeFrom || session.timeTo) && (
            <>
              <span className="text-slate-300">·</span>
              <Clock className="h-3 w-3 text-slate-400" />
              <span className="tabular-nums">{session.timeFrom || '?'} → {session.timeTo || '?'}</span>
            </>
          )}
          <span className="text-slate-300">·</span>
          <span>{session.hoursCount} orë</span>
        </p>
      </div>
      <div className="flex items-center gap-1">
        {session.isRealized ? (
          <Badge variant="success">Realizuar</Badge>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={onRealize}
            disabled={realizing}
          >
            <Check className="mr-1.5 h-3.5 w-3.5" />
            Realizo
          </Button>
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
          {(chapter.timeFrom || chapter.timeTo) && (
            <>
              <span className="text-slate-300">·</span>
              <Clock className="h-3 w-3 text-slate-400" />
              <span className="tabular-nums">{chapter.timeFrom || '?'} → {chapter.timeTo || '?'}</span>
            </>
          )}
          <span className="text-slate-300">·</span>
          <span>{chapter.hoursCount} orë</span>
        </p>
      </div>
      {!chapter.isActive && (
        <Badge variant="muted" className="mr-1">Joaktiv</Badge>
      )}
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
