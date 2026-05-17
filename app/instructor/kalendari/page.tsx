'use client';

import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { ScheduledLesson, Candidate } from '@/lib/types';
import { PageHeader } from '@/components/shared/PageHeader';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  Car,
  Check,
  X,
  Plus,
  Pencil,
  AlertTriangle,
} from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

type CalendarView = 'day' | 'week' | 'month';

const VIEW_LABELS: Record<CalendarView, string> = {
  day: 'Dita',
  week: 'Java',
  month: 'Muaji',
};

const DAY_NAMES = ['Hen', 'Mar', 'Mer', 'Enj', 'Pre', 'Sht', 'Die'];
const DAY_NAMES_FULL = [
  'E Hene',
  'E Marte',
  'E Merkure',
  'E Enjte',
  'E Premte',
  'E Shtune',
  'E Diel',
];

const HOURS = Array.from({ length: 13 }, (_, i) => i + 8);

const STATUS_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  scheduled: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' },
  completed: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700' },
  cancelled: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-500' },
  no_show: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' },
};

const PERSONAL_EVENT_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  scheduled: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700' },
  completed: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700' },
  cancelled: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-500' },
  no_show: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' },
};

const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Planifikuar',
  completed: 'Perfunduar',
  cancelled: 'Anuluar',
  no_show: 'Munguar',
};

interface EventFormData {
  title: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  candidateId: string;
  notes: string;
}

interface EventFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  onSubmit: () => void;
  isPending: boolean;
  formData: EventFormData;
  setFormData: React.Dispatch<React.SetStateAction<EventFormData>>;
  candidatesList: Candidate[];
}

interface LessonBlockProps {
  lesson: ScheduledLesson;
  onEdit: (lesson: ScheduledLesson) => void;
  onComplete: (id: string) => void;
  onNoShow: (id: string) => void;
  onCancel: (id: string) => void;
  isCompletePending: boolean;
  isNoShowPending: boolean;
}

const emptyEventForm: EventFormData = {
  title: '',
  scheduledDate: '',
  startTime: '',
  endTime: '',
  candidateId: '',
  notes: '',
};

// Event Form Dialog - moved outside component to prevent re-renders
function EventFormDialog({
  open,
  onOpenChange,
  title,
  onSubmit,
  isPending,
  formData,
  setFormData,
  candidatesList,
}: EventFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Titulli</Label>
            <Input
              value={formData.title}
              onChange={(e) =>
                setFormData((p) => ({ ...p, title: e.target.value }))
              }
              placeholder="p.sh. Mesim praktik, Pushim, Takim..."
            />
          </div>
          <div className="space-y-2">
            <Label>Kandidati (opsional)</Label>
            <Select
              value={formData.candidateId || 'none'}
              onValueChange={(val) =>
                setFormData((p) => ({ ...p, candidateId: val === 'none' ? '' : val }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Zgjidhni kandidatin..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Asnje - Ngjarje personale</SelectItem>
                {candidatesList.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.firstName} {c.lastName} ({c.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Data</Label>
              <Input
                type="date"
                value={formData.scheduledDate}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, scheduledDate: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Ora e fillimit</Label>
              <Input
                type="time"
                value={formData.startTime}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, startTime: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Ora e perfundimit</Label>
              <Input
                type="time"
                value={formData.endTime}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, endTime: e.target.value }))
                }
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Shenime</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) =>
                setFormData((p) => ({ ...p, notes: e.target.value }))
              }
              placeholder="Shenime opsionale..."
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Anulo
          </Button>
          <Button
            onClick={onSubmit}
            disabled={
              isPending ||
              !formData.title ||
              !formData.scheduledDate ||
              !formData.startTime ||
              !formData.endTime
            }
          >
            Ruaj
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function isPersonalEvent(lesson: ScheduledLesson): boolean {
  return !lesson.candidateId && !lesson.candidate;
}

function getLessonColors(lesson: ScheduledLesson) {
  if (isPersonalEvent(lesson)) {
    return PERSONAL_EVENT_COLORS[lesson.status] || PERSONAL_EVENT_COLORS.scheduled;
  }
  return STATUS_COLORS[lesson.status] || STATUS_COLORS.scheduled;
}

function getLessonDisplayName(lesson: ScheduledLesson): string {
  if (lesson.candidate) {
    return `${lesson.candidate.firstName} ${lesson.candidate.lastName}`;
  }
  if (lesson.title) {
    return lesson.title;
  }
  return 'Ngjarje personale';
}

function getLessonShortName(lesson: ScheduledLesson): string {
  if (lesson.candidate) {
    return `${lesson.candidate.firstName} ${lesson.candidate.lastName[0]}.`;
  }
  if (lesson.title) {
    return lesson.title;
  }
  return 'Personale';
}

// Lesson Block component - moved outside to prevent re-renders
function LessonBlock({
  lesson,
  onEdit,
  onComplete,
  onNoShow,
  onCancel,
  isCompletePending,
  isNoShowPending,
}: LessonBlockProps) {
  const colors = getLessonColors(lesson);
  const personal = isPersonalEvent(lesson);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'w-full text-left rounded-md border px-2 py-1 text-xs transition-colors hover:shadow-sm',
            colors.bg,
            colors.border,
            colors.text
          )}
        >
          <p className="font-medium truncate">
            {lesson.startTime} - {lesson.endTime}
          </p>
          <p className="truncate">
            {getLessonDisplayName(lesson)}
          </p>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge
                variant={
                  lesson.status === 'completed'
                    ? 'success'
                    : lesson.status === 'cancelled'
                    ? 'muted'
                    : lesson.status === 'no_show'
                    ? 'warning'
                    : 'info'
                }
              >
                {STATUS_LABELS[lesson.status] || lesson.status}
              </Badge>
              {personal && (
                <Badge variant="outline" className="text-purple-600 border-purple-300">
                  Personale
                </Badge>
              )}
            </div>
            <span className="text-xs text-gray-500">
              {formatDate(lesson.scheduledDate)}
            </span>
          </div>
          {lesson.title && (
            <p className="font-medium text-sm">{lesson.title}</p>
          )}
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-gray-400" />
              <span>
                {lesson.startTime} - {lesson.endTime}
              </span>
            </div>
            {lesson.candidate && (
              <div className="flex items-center gap-2">
                <User className="h-3.5 w-3.5 text-gray-400" />
                <span>
                  {lesson.candidate.firstName} {lesson.candidate.lastName}
                </span>
              </div>
            )}
            {lesson.vehicle && (
              <div className="flex items-center gap-2">
                <Car className="h-3.5 w-3.5 text-gray-400" />
                <span>
                  {lesson.vehicle.make} {lesson.vehicle.model || ''} -{' '}
                  {lesson.vehicle.plateNumber}
                </span>
              </div>
            )}
            {lesson.notes && (
              <p className="text-gray-500 italic">{lesson.notes}</p>
            )}
          </div>
          {lesson.status === 'scheduled' && (
            <div className="space-y-2 pt-1 border-t">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 h-8"
                  onClick={() => onEdit(lesson)}
                >
                  <Pencil className="h-3.5 w-3.5 mr-1" />
                  Edito
                </Button>
                {!personal && (
                  <Button
                    size="sm"
                    className="flex-1 h-8"
                    onClick={() => onComplete(lesson.id)}
                    disabled={isCompletePending}
                  >
                    <Check className="h-3.5 w-3.5 mr-1" />
                    Perfundo
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2">
                {!personal && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-8 text-amber-600 hover:text-amber-700 border-amber-200 hover:bg-amber-50"
                    onClick={() => onNoShow(lesson.id)}
                    disabled={isNoShowPending}
                  >
                    <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                    Nuk u paraqit
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-8 text-red-600 hover:text-red-700"
                  onClick={() => onCancel(lesson.id)}
                >
                  <X className="h-3.5 w-3.5 mr-1" />
                  Anulo
                </Button>
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Helper functions
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekEnd(date: Date): Date {
  const start = getWeekStart(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return end;
}

function getMonthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getMonthEnd(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function formatDateParam(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Parse "YYYY-MM-DD" as local date (not UTC) to avoid timezone shift
function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function parseHour(time: string): number {
  const [h] = time.split(':').map(Number);
  return h;
}

export default function InstructorCalendarPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>('week');
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingLesson, setEditingLesson] = useState<ScheduledLesson | null>(null);
  const [formData, setFormData] = useState<EventFormData>(emptyEventForm);

  // Calculate date range
  const dateRange = useMemo(() => {
    if (view === 'day') {
      return {
        dateFrom: formatDateParam(currentDate),
        dateTo: formatDateParam(currentDate),
      };
    }
    if (view === 'week') {
      return {
        dateFrom: formatDateParam(getWeekStart(currentDate)),
        dateTo: formatDateParam(getWeekEnd(currentDate)),
      };
    }
    const monthStart = getMonthStart(currentDate);
    const weekStart = getWeekStart(monthStart);
    const monthEnd = getMonthEnd(currentDate);
    const lastWeekEnd = getWeekEnd(monthEnd);
    return {
      dateFrom: formatDateParam(weekStart),
      dateTo: formatDateParam(lastWeekEnd),
    };
  }, [currentDate, view]);

  // Fetch lessons for instructor
  const { data: lessonsData } = useQuery<{ data: ScheduledLesson[] }>({
    queryKey: ['instructor-calendar', dateRange],
    queryFn: () =>
      api.get('/instructor/calendar', {
        params: {
          date_from: dateRange.dateFrom,
          date_to: dateRange.dateTo,
        },
      }),
  });

  const lessons = lessonsData?.data ?? [];

  // Fetch instructor's candidates for the dropdown
  const { data: myCandidates } = useQuery<{ data: Candidate[] }>({
    queryKey: ['instructor-my-candidates'],
    queryFn: async () => {
      const res = await api.get('/instructor/candidates');
      return res.data;
    },
  });

  const candidatesList = myCandidates?.data ?? [];

  // Mutations
  const completeMutation = useMutation({
    mutationFn: (id: string) => api.post(`/instructor/calendar/${id}/complete`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instructor-calendar'] });
      toast({ title: 'Mesimi u perfundua me sukses' });
    },
  });

  const noShowMutation = useMutation({
    mutationFn: (id: string) => api.post(`/instructor/calendar/${id}/no-show`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instructor-calendar'] });
      toast({ title: 'Mesimi u shenua si mungese' });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/instructor/calendar/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instructor-calendar'] });
      setCancelTarget(null);
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: {
      title: string;
      scheduledDate: string;
      startTime: string;
      endTime: string;
      notes?: string;
      candidateId?: string;
    }) => {
      const res = await api.post('/instructor/calendar', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instructor-calendar'] });
      setShowCreateDialog(false);
      setFormData(emptyEventForm);
      toast({ title: 'Ngjarja u shtua me sukses' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const res = await api.put(`/instructor/calendar/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instructor-calendar'] });
      setEditingLesson(null);
      setFormData(emptyEventForm);
      toast({ title: 'Ngjarja u perditesua me sukses' });
    },
  });

  // Navigation
  const navigateDate = useCallback(
    (direction: -1 | 0 | 1) => {
      if (direction === 0) {
        setCurrentDate(new Date());
        return;
      }
      const newDate = new Date(currentDate);
      if (view === 'day') newDate.setDate(newDate.getDate() + direction);
      else if (view === 'week') newDate.setDate(newDate.getDate() + direction * 7);
      else newDate.setMonth(newDate.getMonth() + direction);
      setCurrentDate(newDate);
    },
    [currentDate, view]
  );

  // Open create dialog with pre-filled date/time
  const openCreateDialog = useCallback(
    (date?: string, hour?: number) => {
      setFormData({
        ...emptyEventForm,
        scheduledDate: date || formatDateParam(currentDate),
        startTime: hour !== undefined ? `${String(hour).padStart(2, '0')}:00` : '09:00',
        endTime: hour !== undefined ? `${String(hour + 1).padStart(2, '0')}:00` : '10:00',
      });
      setShowCreateDialog(true);
    },
    [currentDate]
  );

  // Open edit dialog with existing lesson data
  const openEditDialog = useCallback((lesson: ScheduledLesson) => {
    setFormData({
      title: lesson.title || '',
      scheduledDate: lesson.scheduledDate,
      startTime: lesson.startTime,
      endTime: lesson.endTime,
      candidateId: lesson.candidateId || '',
      notes: lesson.notes || '',
    });
    setEditingLesson(lesson);
  }, []);

  // Submit create form
  const handleCreateSubmit = () => {
    const payload: {
      title: string;
      scheduledDate: string;
      startTime: string;
      endTime: string;
      notes?: string;
      candidateId?: string;
    } = {
      title: formData.title,
      scheduledDate: formData.scheduledDate,
      startTime: formData.startTime,
      endTime: formData.endTime,
    };
    if (formData.notes) payload.notes = formData.notes;
    if (formData.candidateId) payload.candidateId = formData.candidateId;
    createMutation.mutate(payload);
  };

  // Submit edit form
  const handleEditSubmit = () => {
    if (!editingLesson) return;
    const payload: Record<string, unknown> = {
      title: formData.title,
      scheduledDate: formData.scheduledDate,
      startTime: formData.startTime,
      endTime: formData.endTime,
      notes: formData.notes || undefined,
      candidateId: formData.candidateId || undefined,
    };
    updateMutation.mutate({ id: editingLesson.id, data: payload });
  };

  // Get lessons for a specific date
  const getLessonsForDate = useCallback(
    (date: Date) =>
      lessons.filter((l) => isSameDay(parseLocalDate(l.scheduledDate), date)),
    [lessons]
  );

  // Get lessons for a specific date and hour
  const getLessonsForSlot = useCallback(
    (date: Date, hour: number) =>
      lessons.filter((l) => {
        const lessonDate = parseLocalDate(l.scheduledDate);
        return isSameDay(lessonDate, date) && parseHour(l.startTime) === hour;
      }),
    [lessons]
  );

  // Date display
  const dateDisplay = useMemo(() => {
    const monthNames = [
      'Janar', 'Shkurt', 'Mars', 'Prill', 'Maj', 'Qershor',
      'Korrik', 'Gusht', 'Shtator', 'Tetor', 'Nentor', 'Dhjetor',
    ];
    if (view === 'day') {
      const dayIndex = (currentDate.getDay() + 6) % 7;
      return `${DAY_NAMES_FULL[dayIndex]}, ${currentDate.getDate()} ${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    }
    if (view === 'week') {
      const start = getWeekStart(currentDate);
      const end = getWeekEnd(currentDate);
      return `${start.getDate()} - ${end.getDate()} ${monthNames[end.getMonth()]} ${end.getFullYear()}`;
    }
    return `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  }, [currentDate, view]);

  // Week days
  const weekDays = useMemo(() => {
    const start = getWeekStart(currentDate);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [currentDate]);

  // Month weeks
  const monthWeeks = useMemo(() => {
    const monthStart = getMonthStart(currentDate);
    const calendarStart = getWeekStart(monthStart);
    const weeks: Date[][] = [];
    let current = new Date(calendarStart);
    for (let w = 0; w < 6; w++) {
      const week: Date[] = [];
      for (let d = 0; d < 7; d++) {
        week.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }
      weeks.push(week);
      if (current.getMonth() !== currentDate.getMonth() && w >= 3) break;
    }
    return weeks;
  }, [currentDate]);


  return (
    <div className="space-y-6">
      <PageHeader
        title="Kalendari Im"
        description="Shikoni dhe menaxhoni mesimet tuaja"
      >
        <Button onClick={() => openCreateDialog()}>
          <Plus className="h-4 w-4 mr-1.5" />
          Shto Ngjarje
        </Button>
      </PageHeader>

      {/* Calendar Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3">
            {/* Navigation and Date */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={() => navigateDate(-1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateDate(0)}
              >
                Sot
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={() => navigateDate(1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <h2 className="text-lg font-semibold text-gray-900 ml-2 truncate">
                {dateDisplay}
              </h2>
            </div>

            {/* View Toggles */}
            <div className="flex rounded-md border w-full sm:w-auto">
              {(['day', 'week', 'month'] as CalendarView[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  className={cn(
                    'flex-1 sm:flex-none px-3 py-1.5 text-sm font-medium transition-colors',
                    view === v
                      ? 'bg-primary text-primary-foreground'
                      : 'text-gray-600 hover:bg-gray-50',
                    v === 'day' && 'rounded-l-md',
                    v === 'month' && 'rounded-r-md'
                  )}
                  onClick={() => setView(v)}
                >
                  {VIEW_LABELS[v]}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar Grid */}
      <Card>
        <CardContent className="p-0">
          {/* DAY VIEW */}
          {view === 'day' && (
            <div className="divide-y">
              {HOURS.map((hour) => {
                const slotLessons = getLessonsForSlot(currentDate, hour);
                return (
                  <div
                    key={hour}
                    className="flex min-h-[64px] cursor-pointer hover:bg-gray-50/50 transition-colors"
                    onClick={() => {
                      if (slotLessons.length === 0) {
                        openCreateDialog(formatDateParam(currentDate), hour);
                      }
                    }}
                  >
                    <div className="w-16 sm:w-20 flex-shrink-0 px-2 sm:px-3 py-2 text-sm text-gray-500 font-medium border-r bg-gray-50/50">
                      {String(hour).padStart(2, '0')}:00
                    </div>
                    <div className="flex-1 p-1.5 space-y-1">
                      {slotLessons.map((lesson) => (
                        <LessonBlock
                          key={lesson.id}
                          lesson={lesson}
                          onEdit={openEditDialog}
                          onComplete={(id) => completeMutation.mutate(id)}
                          onNoShow={(id) => noShowMutation.mutate(id)}
                          onCancel={(id) => setCancelTarget(id)}
                          isCompletePending={completeMutation.isPending}
                          isNoShowPending={noShowMutation.isPending}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* WEEK VIEW */}
          {view === 'week' && (
            <div className="overflow-x-auto">
              <div className="min-w-[800px]">
                {/* Header */}
                <div className="grid grid-cols-[80px_repeat(7,1fr)] border-b">
                <div className="p-2 bg-gray-50/50 border-r" />
                {weekDays.map((day, i) => {
                  const isToday = isSameDay(day, new Date());
                  return (
                    <div
                      key={i}
                      className={cn(
                        'p-2 text-center border-r last:border-r-0',
                        isToday && 'bg-blue-50/50'
                      )}
                    >
                      <p className="text-xs text-gray-500 font-medium">
                        {DAY_NAMES[i]}
                      </p>
                      <p
                        className={cn(
                          'text-sm font-semibold mt-0.5',
                          isToday
                            ? 'text-blue-600 bg-blue-600 text-white rounded-full w-7 h-7 flex items-center justify-center mx-auto'
                            : 'text-gray-900'
                        )}
                      >
                        {day.getDate()}
                      </p>
                    </div>
                  );
                })}
              </div>
              {/* Time rows */}
              <div className="divide-y">
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    className="grid grid-cols-[80px_repeat(7,1fr)] min-h-[56px]"
                  >
                    <div className="px-3 py-1 text-xs text-gray-500 font-medium border-r bg-gray-50/50">
                      {String(hour).padStart(2, '0')}:00
                    </div>
                    {weekDays.map((day, di) => {
                      const slotLessons = getLessonsForSlot(day, hour);
                      return (
                        <div
                          key={di}
                          className={cn(
                            'p-0.5 border-r last:border-r-0 cursor-pointer hover:bg-gray-50/30 transition-colors',
                            isSameDay(day, new Date()) && 'bg-blue-50/20'
                          )}
                          onClick={() => {
                            if (slotLessons.length === 0) {
                              openCreateDialog(formatDateParam(day), hour);
                            }
                          }}
                        >
                          {slotLessons.map((lesson) => (
                            <LessonBlock
                              key={lesson.id}
                              lesson={lesson}
                              onEdit={openEditDialog}
                              onComplete={(id) => completeMutation.mutate(id)}
                              onNoShow={(id) => noShowMutation.mutate(id)}
                              onCancel={(id) => setCancelTarget(id)}
                              isCompletePending={completeMutation.isPending}
                              isNoShowPending={noShowMutation.isPending}
                            />
                          ))}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
              </div>
            </div>
          )}

          {/* MONTH VIEW */}
          {view === 'month' && (
            <div>
              {/* Header */}
              <div className="grid grid-cols-7 border-b">
                {DAY_NAMES.map((name) => (
                  <div
                    key={name}
                    className="p-2 text-center text-xs font-medium text-gray-500 bg-gray-50/50"
                  >
                    {name}
                  </div>
                ))}
              </div>
              {/* Weeks */}
              {monthWeeks.map((week, wi) => (
                <div key={wi} className="grid grid-cols-7 border-b last:border-b-0">
                  {week.map((day, di) => {
                    const isCurrentMonth =
                      day.getMonth() === currentDate.getMonth();
                    const isToday = isSameDay(day, new Date());
                    const dayLessons = getLessonsForDate(day);
                    return (
                      <div
                        key={di}
                        className={cn(
                          'min-h-[70px] sm:min-h-[100px] p-1.5 border-r last:border-r-0 cursor-pointer hover:bg-gray-50/30 transition-colors',
                          !isCurrentMonth && 'bg-gray-50/30',
                          isToday && 'bg-blue-50/30'
                        )}
                        onClick={() => {
                          if (dayLessons.length === 0) {
                            openCreateDialog(formatDateParam(day));
                          }
                        }}
                      >
                        <p
                          className={cn(
                            'text-sm font-medium mb-1',
                            isToday
                              ? 'text-blue-600'
                              : isCurrentMonth
                              ? 'text-gray-900'
                              : 'text-gray-300'
                          )}
                        >
                          {day.getDate()}
                        </p>
                        {dayLessons.slice(0, 3).map((lesson) => {
                          const colors = getLessonColors(lesson);
                          return (
                            <Popover key={lesson.id}>
                              <PopoverTrigger asChild>
                                <button
                                  type="button"
                                  className={cn(
                                    'w-full text-left rounded px-1 py-0.5 text-[10px] mb-0.5 truncate',
                                    colors.bg,
                                    colors.text
                                  )}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {lesson.startTime}{' '}
                                  {getLessonShortName(lesson)}
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-80 p-3" align="start">
                                <div className="space-y-2 text-sm">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1">
                                      <Badge
                                        variant={
                                          lesson.status === 'completed'
                                            ? 'success'
                                            : lesson.status === 'cancelled'
                                            ? 'muted'
                                            : lesson.status === 'no_show'
                                            ? 'warning'
                                            : 'info'
                                        }
                                      >
                                        {STATUS_LABELS[lesson.status]}
                                      </Badge>
                                      {isPersonalEvent(lesson) && (
                                        <Badge variant="outline" className="text-purple-600 border-purple-300 text-[10px]">
                                          Personale
                                        </Badge>
                                      )}
                                    </div>
                                    <span className="text-xs text-gray-500">
                                      {lesson.startTime}-{lesson.endTime}
                                    </span>
                                  </div>
                                  <p className="font-medium">
                                    {getLessonDisplayName(lesson)}
                                  </p>
                                  {lesson.vehicle && (
                                    <p className="text-gray-500">
                                      {lesson.vehicle.make}{' '}
                                      {lesson.vehicle.model || ''} -{' '}
                                      {lesson.vehicle.plateNumber}
                                    </p>
                                  )}
                                  {lesson.status === 'scheduled' && (
                                    <div className="space-y-2 pt-1 border-t">
                                      <div className="flex gap-2">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="h-8 flex-1 text-sm"
                                          onClick={() => openEditDialog(lesson)}
                                        >
                                          Edito
                                        </Button>
                                        {!isPersonalEvent(lesson) && (
                                          <Button
                                            size="sm"
                                            className="h-8 flex-1 text-sm"
                                            onClick={() =>
                                              completeMutation.mutate(lesson.id)
                                            }
                                          >
                                            Perfundo
                                          </Button>
                                        )}
                                      </div>
                                      <div className="flex gap-2">
                                        {!isPersonalEvent(lesson) && (
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-8 flex-1 text-sm text-amber-600 border-amber-200 hover:bg-amber-50"
                                            onClick={() =>
                                              noShowMutation.mutate(lesson.id)
                                            }
                                          >
                                            Nuk u paraqit
                                          </Button>
                                        )}
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="h-8 flex-1 text-sm text-red-600"
                                          onClick={() =>
                                            setCancelTarget(lesson.id)
                                          }
                                        >
                                          Anulo
                                        </Button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </PopoverContent>
                            </Popover>
                          );
                        })}
                        {dayLessons.length > 3 && (
                          <p className="text-[10px] text-gray-400 pl-1">
                            +{dayLessons.length - 3} me shume
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Event Dialog */}
      <EventFormDialog
        open={showCreateDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowCreateDialog(false);
            setFormData(emptyEventForm);
          }
        }}
        title="Shto Ngjarje"
        onSubmit={handleCreateSubmit}
        isPending={createMutation.isPending}
        formData={formData}
        setFormData={setFormData}
        candidatesList={candidatesList}
      />

      {/* Edit Event Dialog */}
      <EventFormDialog
        open={!!editingLesson}
        onOpenChange={(open) => {
          if (!open) {
            setEditingLesson(null);
            setFormData(emptyEventForm);
          }
        }}
        title="Edito Ngjarjen"
        onSubmit={handleEditSubmit}
        isPending={updateMutation.isPending}
        formData={formData}
        setFormData={setFormData}
        candidatesList={candidatesList}
      />

      {/* Cancel Confirmation */}
      <ConfirmDialog
        open={!!cancelTarget}
        onOpenChange={(open) => !open && setCancelTarget(null)}
        title="Anulo ngjarjen"
        description="A jeni te sigurte qe deshironi te anuloni kete ngjarje?"
        confirmText="Anulo Ngjarjen"
        variant="destructive"
        onConfirm={() => cancelTarget && cancelMutation.mutate(cancelTarget)}
      />
    </div>
  );
}
