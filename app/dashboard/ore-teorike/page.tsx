'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Candidate, TheoryHourSession, LessonChapter, Category } from '@/lib/types';
import { PageHeader } from '@/components/shared/PageHeader';
import { SearchInput } from '@/components/shared/SearchInput';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  BookOpen,
  Check,
  CheckCheck,
  Search,
  User,
  Calendar,
  Clock,
  Edit2,
  Plus,
  Trash2,
  ListOrdered,
} from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import { ExportButton } from '@/components/shared/ExportButton';

interface CandidateSearchResult {
  id: string;
  firstName: string;
  lastName: string;
  personalNumber: string;
  code: string;
  category?: { code: string };
  registrationDate: string;
}

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

export default function TheoryHoursPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('sessions');

  // --- Sessions tab state ---
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateSearchResult | null>(null);
  const [editingSession, setEditingSession] = useState<TheoryHourSession | null>(null);
  const [editForm, setEditForm] = useState({
    chapterTopics: '',
    dateRealized: '',
    timeFrom: '',
    timeTo: '',
    hoursCount: 1,
  });

  // --- Chapters tab state ---
  const [chapterCategoryFilter, setChapterCategoryFilter] = useState<string>('all');
  const [isChapterFormOpen, setIsChapterFormOpen] = useState(false);
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [chapterForm, setChapterForm] = useState<ChapterFormData>(emptyChapterForm);
  const [deleteChapterTarget, setDeleteChapterTarget] = useState<string | null>(null);

  // --- Shared queries ---
  const { data: categoriesData } = useQuery<{ data: Category[] }>({
    queryKey: ['categories-active'],
    queryFn: () => api.get('/categories', { params: { isActive: true, limit: 100 } }),
  });
  const categories = categoriesData?.data ?? [];

  // --- Sessions tab queries ---
  const { data: candidatesData, isLoading: isSearching } = useQuery<{ data: CandidateSearchResult[] }>({
    queryKey: ['candidates-search', searchQuery],
    queryFn: () => api.get('/candidates', { params: { search: searchQuery, limit: 10, isArchived: false } }),
    enabled: searchQuery.length >= 2,
  });
  const candidates = candidatesData?.data ?? [];

  const { data: sessionsData, isLoading: isLoadingSessions } = useQuery<{ data: TheoryHourSession[] }>({
    queryKey: ['theory-hours', selectedCandidate?.id],
    queryFn: () => api.get('/theory-hours', { params: { candidateId: selectedCandidate!.id } }),
    enabled: !!selectedCandidate,
  });
  const sessions = sessionsData?.data ?? [];

  const realizedCount = useMemo(
    () => sessions.filter((s) => s.isRealized).length,
    [sessions]
  );
  const totalCount = sessions.length;

  // --- Chapters tab queries ---
  const { data: chaptersData, isLoading: isLoadingChapters } = useQuery<{ data: LessonChapter[] }>({
    queryKey: ['lesson-chapters', 'theory', chapterCategoryFilter],
    queryFn: () => {
      const params: Record<string, string> = { chapterType: 'theory' };
      if (chapterCategoryFilter !== 'all') params.categoryId = chapterCategoryFilter;
      return api.get('/lesson-chapters', { params });
    },
  });
  const chapters = chaptersData?.data ?? [];

  // --- Session mutations ---
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

  // --- Chapter mutations ---
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

  // --- Session handlers ---
  const handleSelectCandidate = (candidate: CandidateSearchResult) => {
    setSelectedCandidate(candidate);
    setSearchQuery('');
  };

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
    updateMutation.mutate({
      id: editingSession.id,
      data: editForm,
    });
  };

  // --- Chapter handlers ---
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
        title="Oret Teorike"
        description="Menaxhoni oret teorike dhe kapitujt mesimore"
      >
        <ExportButton
          resource="theory-hours"
          params={{
            ...(selectedCandidate ? { candidate_id: selectedCandidate.id } : {}),
          }}
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
            Kapitujt Mesimor
          </TabsTrigger>
        </TabsList>

        {/* ==================== Sessions Tab ==================== */}
        <TabsContent value="sessions" className="space-y-6 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Search className="h-4 w-4 text-gray-400" />
                Zgjidhni Kandidatin
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <SearchInput
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Kerko kandidatin (emri, mbiemri, numri personal)..."
                  className="max-w-lg"
                />
                {searchQuery.length >= 2 && (
                  <div className="absolute z-10 mt-1 w-full max-w-lg rounded-md border bg-white shadow-lg">
                    {isSearching ? (
                      <div className="p-4 text-sm text-gray-500">Duke kerkuar...</div>
                    ) : candidates.length === 0 ? (
                      <div className="p-4 text-sm text-gray-500">Nuk u gjet asnje kandidat</div>
                    ) : (
                      <ul className="max-h-60 overflow-auto py-1">
                        {candidates.map((c) => (
                          <li key={c.id}>
                            <button
                              type="button"
                              className="w-full px-4 py-2.5 text-left hover:bg-gray-50 flex items-center justify-between"
                              onClick={() => handleSelectCandidate(c)}
                            >
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {c.firstName} {c.lastName}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {c.personalNumber} | {c.code}
                                </p>
                              </div>
                              {c.category && (
                                <Badge variant="outline" className="ml-2">
                                  {c.category.code}
                                </Badge>
                              )}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {selectedCandidate && (
            <>
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center">
                        <User className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {selectedCandidate.firstName} {selectedCandidate.lastName}
                        </h3>
                        <div className="flex items-center gap-3 mt-0.5 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatDate(selectedCandidate.registrationDate)}
                          </span>
                          {selectedCandidate.category && (
                            <Badge variant="outline">{selectedCandidate.category.code}</Badge>
                          )}
                          <span>Kodi: {selectedCandidate.code}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Ore te realizuara</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {realizedCount}
                        <span className="text-base font-normal text-gray-400">/{totalCount}</span>
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-gray-400" />
                      Sesionet Teorike
                    </CardTitle>
                    {sessions.some((s) => !s.isRealized) && (
                      <Button
                        size="sm"
                        onClick={() => realizeAllMutation.mutate()}
                        disabled={realizeAllMutation.isPending}
                      >
                        <CheckCheck className="h-4 w-4 mr-1.5" />
                        Realizo te Gjitha
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoadingSessions ? (
                    <LoadingSkeleton variant="table" rows={8} columns={7} />
                  ) : sessions.length === 0 ? (
                    <EmptyState
                      icon={BookOpen}
                      title="Nuk ka sesione teorike"
                      description="Ky kandidat nuk ka sesione teorike te regjistruara."
                    />
                  ) : (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-14">Nr</TableHead>
                            <TableHead>Kapitulli/Tema</TableHead>
                            <TableHead className="w-28">Data</TableHead>
                            <TableHead className="w-24">Ora Fillimit</TableHead>
                            <TableHead className="w-24">Ora Mbarimit</TableHead>
                            <TableHead className="w-16 text-center">Ore</TableHead>
                            <TableHead className="w-28 text-center">Realizuar</TableHead>
                            <TableHead className="w-20">Veprimet</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sessions.map((session) => (
                            <TableRow key={session.id}>
                              <TableCell className="font-medium">{session.sessionNumber}</TableCell>
                              <TableCell>{session.chapterTopics || '-'}</TableCell>
                              <TableCell>
                                {session.dateRealized ? formatDate(session.dateRealized) : '-'}
                              </TableCell>
                              <TableCell>{session.timeFrom || '-'}</TableCell>
                              <TableCell>{session.timeTo || '-'}</TableCell>
                              <TableCell className="text-center">{session.hoursCount}</TableCell>
                              <TableCell className="text-center">
                                {session.isRealized ? (
                                  <Badge variant="success">Realizuar</Badge>
                                ) : (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs"
                                    onClick={() => realizeMutation.mutate(session.id)}
                                    disabled={realizeMutation.isPending}
                                  >
                                    <Check className="h-3.5 w-3.5 mr-1" />
                                    Realizo
                                  </Button>
                                )}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleEditSession(session)}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {!selectedCandidate && (
            <EmptyState
              icon={BookOpen}
              title="Zgjidhni nje kandidat"
              description="Kerkoni dhe zgjidhni nje kandidat per te pare oret teorike."
            />
          )}
        </TabsContent>

        {/* ==================== Chapters Tab ==================== */}
        <TabsContent value="chapters" className="space-y-6 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <ListOrdered className="h-4 w-4 text-gray-400" />
                  Kapitujt Mesimor - Teorike
                </CardTitle>
                <div className="flex items-center gap-3">
                  <Select value={chapterCategoryFilter} onValueChange={setChapterCategoryFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Kategoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Te gjitha</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.code}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" onClick={handleOpenAddChapter}>
                    <Plus className="h-4 w-4 mr-1.5" />
                    Registro
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingChapters ? (
                <LoadingSkeleton variant="table" rows={8} columns={7} />
              ) : chapters.length === 0 ? (
                <EmptyState
                  icon={ListOrdered}
                  title="Nuk ka kapituj mesimor"
                  description="Shtoni kapituj mesimor per kategorite."
                  action={
                    <Button onClick={handleOpenAddChapter}>
                      <Plus className="h-4 w-4 mr-1.5" />
                      Registro
                    </Button>
                  }
                />
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-14">#</TableHead>
                        <TableHead className="w-28">Kategoria</TableHead>
                        <TableHead>Kapitujt mesimor</TableHead>
                        <TableHead className="w-24">Ora nga</TableHead>
                        <TableHead className="w-24">Ora deri</TableHead>
                        <TableHead className="w-24">Numri i oreve</TableHead>
                        <TableHead className="w-20">Aktiv</TableHead>
                        <TableHead className="w-24">Veprimet</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {chapters.map((ch) => (
                        <TableRow key={ch.id}>
                          <TableCell className="font-medium">{ch.sessionNumber}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{ch.categoryCode}</Badge>
                          </TableCell>
                          <TableCell className="font-medium">{ch.chapterTopics}</TableCell>
                          <TableCell>{ch.timeFrom || '-'}</TableCell>
                          <TableCell>{ch.timeTo || '-'}</TableCell>
                          <TableCell>{ch.hoursCount}</TableCell>
                          <TableCell>
                            <Badge variant={ch.isActive ? 'success' : 'secondary'}>
                              {ch.isActive ? 'PO' : 'JO'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleOpenEditChapter(ch)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-500 hover:text-red-700"
                                onClick={() => setDeleteChapterTarget(ch.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Session Dialog */}
      <Dialog
        open={!!editingSession}
        onOpenChange={(open) => !open && setEditingSession(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edito Sesionin #{editingSession?.sessionNumber}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Kapitulli/Tema</Label>
              <Input
                value={editForm.chapterTopics}
                onChange={(e) => setEditForm((p) => ({ ...p, chapterTopics: e.target.value }))}
                placeholder="Tema e sesionit..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data</Label>
                <Input
                  type="date"
                  value={editForm.dateRealized}
                  onChange={(e) => setEditForm((p) => ({ ...p, dateRealized: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Ore</Label>
                <Input
                  type="number"
                  min={1}
                  max={8}
                  value={editForm.hoursCount}
                  onChange={(e) => setEditForm((p) => ({ ...p, hoursCount: Number(e.target.value) }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ora Fillimit</Label>
                <Input
                  type="time"
                  value={editForm.timeFrom}
                  onChange={(e) => setEditForm((p) => ({ ...p, timeFrom: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Ora Mbarimit</Label>
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
              Ruaj
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Chapter Dialog */}
      <Dialog open={isChapterFormOpen} onOpenChange={(open) => !open && setIsChapterFormOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingChapterId ? 'Edito Kapitullin' : 'Regjistrimi i ores Teorike'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-md bg-blue-50 p-3 text-sm font-medium text-blue-700">
              Informata per oren teorike
            </div>
            <div className="space-y-2">
              <Label>Kategoria</Label>
              <Select
                value={chapterForm.categoryId}
                onValueChange={(val) => setChapterForm((p) => ({ ...p, categoryId: val }))}
                disabled={!!editingChapterId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Zgjedh" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.code}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Kapijtujt e ores mesimore</Label>
              <Textarea
                value={chapterForm.chapterTopics}
                onChange={(e) => setChapterForm((p) => ({ ...p, chapterTopics: e.target.value }))}
                placeholder="p.sh. 1.1, 1.2, 1.3"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label className="font-semibold">Ora e planifikuar e realizimit</Label>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">Nga Ora</Label>
                  <Input
                    type="time"
                    value={chapterForm.timeFrom}
                    onChange={(e) => setChapterForm((p) => ({ ...p, timeFrom: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">Deri Ora</Label>
                  <Input
                    type="time"
                    value={chapterForm.timeTo}
                    onChange={(e) => setChapterForm((p) => ({ ...p, timeTo: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">Numri i oreve</Label>
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
              Ruaj
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Chapter Confirmation */}
      <ConfirmDialog
        open={!!deleteChapterTarget}
        onOpenChange={(open) => !open && setDeleteChapterTarget(null)}
        title="Fshi kapitullin"
        description="A jeni te sigurte qe deshironi te fshini kete kapitull? Numrat e sesioneve do te rinumerohen."
        confirmText="Fshi"
        variant="destructive"
        onConfirm={() => deleteChapterTarget && deleteChapterMutation.mutate(deleteChapterTarget)}
      />
    </div>
  );
}
