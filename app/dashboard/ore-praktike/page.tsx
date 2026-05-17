'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { PracticalHourSession, Instructor, LessonChapter, Category } from '@/lib/types';
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
import { Checkbox } from '@/components/ui/checkbox';
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
  Car,
  Plus,
  Search,
  User,
  Calendar,
  Edit2,
  Trash2,
  ListOrdered,
} from 'lucide-react';
import { cn, formatDate, formatCurrency } from '@/lib/utils';
import { ExportButton } from '@/components/shared/ExportButton';

interface CandidateSearchResult {
  id: string;
  firstName: string;
  lastName: string;
  personalNumber: string;
  code: string;
  category?: { code: string };
  registrationDate: string;
  practicalHours: number;
  practicalHoursRealized: number;
}

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

export default function PracticalHoursPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('sessions');

  // --- Sessions tab state ---
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateSearchResult | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<SessionFormData>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

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

  const { data: sessionsData, isLoading: isLoadingSessions } = useQuery<{ data: PracticalHourSession[] }>({
    queryKey: ['practical-hours', selectedCandidate?.id],
    queryFn: () => api.get('/practical-hours', { params: { candidateId: selectedCandidate!.id } }),
    enabled: !!selectedCandidate,
  });
  const sessions = sessionsData?.data ?? [];

  const { data: instructorsData } = useQuery<{ data: Instructor[] }>({
    queryKey: ['instructors-active'],
    queryFn: () => api.get('/instructors', { params: { isActive: true, limit: 100 } }),
  });
  const instructors = instructorsData?.data ?? [];

  const totalHoursRealized = useMemo(
    () => sessions.reduce((sum, s) => sum + s.hoursCount, 0),
    [sessions]
  );
  const totalPrice = useMemo(
    () => sessions.reduce((sum, s) => sum + s.hoursCount * s.pricePerHour, 0),
    [sessions]
  );
  const targetHours = selectedCandidate?.practicalHours ?? 0;
  const progressPct = targetHours > 0 ? Math.min(100, (totalHoursRealized / targetHours) * 100) : 0;

  // --- Chapters tab queries ---
  const { data: chaptersData, isLoading: isLoadingChapters } = useQuery<{ data: LessonChapter[] }>({
    queryKey: ['lesson-chapters', 'practical', chapterCategoryFilter],
    queryFn: () => {
      const params: Record<string, string> = { chapterType: 'practical' };
      if (chapterCategoryFilter !== 'all') params.categoryId = chapterCategoryFilter;
      return api.get('/lesson-chapters', { params });
    },
  });
  const chapters = chaptersData?.data ?? [];

  // --- Session mutations ---
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

  // --- Chapter mutations ---
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

  // --- Session handlers ---
  const handleSelectCandidate = (candidate: CandidateSearchResult) => {
    setSelectedCandidate(candidate);
    setSearchQuery('');
  };

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
        title="Oret Praktike"
        description="Menaxhoni oret praktike dhe kapitujt mesimore"
      >
        <ExportButton
          resource="practical-hours"
          params={{
            ...(selectedCandidate ? { candidate_id: selectedCandidate.id } : {}),
          }}
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
                                <Badge variant="outline" className="ml-2">{c.category.code}</Badge>
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
                      <div className="h-12 w-12 rounded-full bg-green-50 flex items-center justify-center">
                        <User className="h-6 w-6 text-green-600" />
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
                        </div>
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="text-sm text-gray-500">Progresi</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {totalHoursRealized}
                        <span className="text-base font-normal text-gray-400">/{targetHours} ore</span>
                      </p>
                      <div className="w-40 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all',
                            progressPct >= 100 ? 'bg-green-500' : 'bg-blue-500'
                          )}
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <Car className="h-4 w-4 text-gray-400" />
                      Sesionet Praktike
                    </CardTitle>
                    <div className="flex items-center gap-3">
                      <div className="text-sm text-gray-500">
                        Total cmimi:{' '}
                        <span className="font-semibold text-gray-900">{formatCurrency(totalPrice)}</span>
                      </div>
                      <Button size="sm" onClick={handleOpenAdd}>
                        <Plus className="h-4 w-4 mr-1.5" />
                        Shto Sesion
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoadingSessions ? (
                    <LoadingSkeleton variant="table" rows={5} columns={8} />
                  ) : sessions.length === 0 ? (
                    <EmptyState
                      icon={Car}
                      title="Nuk ka sesione praktike"
                      description="Shtoni sesionin e pare praktik per kete kandidat."
                      action={
                        <Button onClick={handleOpenAdd}>
                          <Plus className="h-4 w-4 mr-1.5" />
                          Shto Sesion
                        </Button>
                      }
                    />
                  ) : (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-28">Data</TableHead>
                            <TableHead className="w-20">Ora</TableHead>
                            <TableHead>Instruktori</TableHead>
                            <TableHead className="w-16 text-center">Ore</TableHead>
                            <TableHead className="w-24">Cmimi/Ore</TableHead>
                            <TableHead>Kapitulli</TableHead>
                            <TableHead className="w-24 text-center">Paguar</TableHead>
                            <TableHead>Verejtje</TableHead>
                            <TableHead className="w-24">Veprimet</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sessions.map((session) => (
                            <TableRow key={session.id}>
                              <TableCell>{formatDate(session.dateRealized)}</TableCell>
                              <TableCell>{session.timeRealized || '-'}</TableCell>
                              <TableCell>
                                {session.instructor
                                  ? `${session.instructor.firstName} ${session.instructor.lastName}`
                                  : '-'}
                              </TableCell>
                              <TableCell className="text-center">{session.hoursCount}</TableCell>
                              <TableCell>{formatCurrency(session.pricePerHour)}</TableCell>
                              <TableCell>{session.chapterTopics || '-'}</TableCell>
                              <TableCell className="text-center">
                                {session.isPaid ? (
                                  <Badge variant="success">Paguar</Badge>
                                ) : (
                                  <Badge variant="error">Papaguar</Badge>
                                )}
                              </TableCell>
                              <TableCell className="max-w-[200px] truncate">
                                {session.remarks || '-'}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => handleOpenEdit(session)}
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-red-500 hover:text-red-700"
                                    onClick={() => setDeleteTarget(session.id)}
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
            </>
          )}

          {!selectedCandidate && (
            <EmptyState
              icon={Car}
              title="Zgjidhni nje kandidat"
              description="Kerkoni dhe zgjidhni nje kandidat per te pare oret praktike."
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
                  Kapitujt Mesimor - Praktike
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
                <LoadingSkeleton variant="table" rows={8} columns={5} />
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

      {/* Add/Edit Session Dialog */}
      <Dialog open={isFormOpen} onOpenChange={(open) => !open && setIsFormOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Edito Sesionin' : 'Shto Sesion Praktik'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data</Label>
                <Input
                  type="date"
                  value={formData.dateRealized}
                  onChange={(e) => setFormData((p) => ({ ...p, dateRealized: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Ora</Label>
                <Input
                  type="time"
                  value={formData.timeRealized}
                  onChange={(e) => setFormData((p) => ({ ...p, timeRealized: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Instruktori</Label>
              <Select
                value={formData.instructorId || ''}
                onValueChange={(val) => setFormData((p) => ({ ...p, instructorId: val }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Zgjidhni instruktorin..." />
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
              <div className="space-y-2">
                <Label>Numri i oreve</Label>
                <Input
                  type="number"
                  min={1}
                  max={8}
                  value={formData.hoursCount}
                  onChange={(e) => setFormData((p) => ({ ...p, hoursCount: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Cmimi per ore</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.5}
                  value={formData.pricePerHour}
                  onChange={(e) => setFormData((p) => ({ ...p, pricePerHour: Number(e.target.value) }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Kapitulli/Tema</Label>
              <Input
                value={formData.chapterTopics}
                onChange={(e) => setFormData((p) => ({ ...p, chapterTopics: e.target.value }))}
                placeholder="p.sh. 1.1, 2.1"
              />
            </div>
            <div className="space-y-2">
              <Label>Verejtje</Label>
              <Textarea
                value={formData.remarks}
                onChange={(e) => setFormData((p) => ({ ...p, remarks: e.target.value }))}
                placeholder="Verejtje opsionale..."
                rows={3}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="isPaid"
                checked={formData.isPaid}
                onCheckedChange={(checked) => setFormData((p) => ({ ...p, isPaid: !!checked }))}
              />
              <Label htmlFor="isPaid" className="cursor-pointer">Paguar</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>Anulo</Button>
            <Button onClick={handleSubmit} disabled={isSaving}>
              {editingId ? 'Ruaj' : 'Shto'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Session Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Fshi sesionin"
        description="A jeni te sigurte qe deshironi te fshini kete sesion praktik? Ky veprim nuk mund te kthehet."
        confirmText="Fshi"
        variant="destructive"
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
      />

      {/* Add/Edit Chapter Dialog */}
      <Dialog open={isChapterFormOpen} onOpenChange={(open) => !open && setIsChapterFormOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingChapterId ? 'Edito Kapitullin' : 'Regjistrimi i ores Praktike'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-md bg-blue-50 p-3 text-sm font-medium text-blue-700">
              Informata per oren praktike
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
                placeholder="p.sh. 1.1, 2.1"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label className="font-semibold">Ora e planifikuar e realizimit</Label>
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">Numri i oreve</Label>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsChapterFormOpen(false)}>Anulo</Button>
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
