'use client';

import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { ScheduledLesson, Instructor, Candidate, Vehicle } from '@/lib/types';
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
  Plus,
  Check,
  X,
  Clock,
  User,
  Car,
  AlertTriangle,
} from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';

type CalendarView = 'day' | 'week' | 'month';

const VIEW_LABELS: Record<CalendarView, string> = {
  day: 'Dita',
  week: 'Java',
  month: 'Muaji',
};

interface LessonBlockProps {
  lesson: ScheduledLesson;
  onComplete: (id: string) => void;
  onNoShow: (id: string) => void;
  onCancel: (id: string) => void;
  isCompletePending: boolean;
  isNoShowPending: boolean;
}

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

const HOURS = Array.from({ length: 13 }, (_, i) => i + 8); // 08:00 - 20:00

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

interface LessonFormData {
  title: string;
  instructorId: string;
  candidateId: string;
  vehicleId: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  notes: string;
}

const emptyLessonForm: LessonFormData = {
  title: '',
  instructorId: '',
  candidateId: '',
  vehicleId: '',
  scheduledDate: '',
  startTime: '',
  endTime: '',
  notes: '',
};

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

function LessonBlock({
  lesson,
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
            <div className="flex items-center gap-2">
              <User className="h-3.5 w-3.5 text-gray-400" />
              <span className="text-gray-500">Instruktori:</span>
              <span>
                {lesson.instructor
                  ? `${lesson.instructor.firstName} ${lesson.instructor.lastName}`
                  : '-'}
              </span>
            </div>
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
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full h-8 text-red-600 hover:text-red-700"
                onClick={() => onCancel(lesson.id)}
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Anulo
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default function AdminCalendarPage() {
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>('week');
  const [instructorFilter, setInstructorFilter] = useState<string>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState<LessonFormData>(emptyLessonForm);
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);

  // Calculate date range for query
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
    // month
    const monthStart = getMonthStart(currentDate);
    const weekStart = getWeekStart(monthStart);
    const monthEnd = getMonthEnd(currentDate);
    const lastWeekEnd = getWeekEnd(monthEnd);
    return {
      dateFrom: formatDateParam(weekStart),
      dateTo: formatDateParam(lastWeekEnd),
    };
  }, [currentDate, view]);

  // Fetch lessons
  const { data: lessonsData } = useQuery<{ data: ScheduledLesson[] }>({
    queryKey: ['scheduled-lessons', dateRange, instructorFilter],
    queryFn: () =>
      api.get('/scheduled-lessons', {
        params: {
          date_from: dateRange.dateFrom,
          date_to: dateRange.dateTo,
          ...(instructorFilter !== 'all' ? { instructor_id: instructorFilter } : {}),
        },
      }),
  });

  const lessons = lessonsData?.data ?? [];

  // Fetch instructors
  const { data: instructorsData } = useQuery<{ data: Instructor[] }>({
    queryKey: ['instructors-active'],
    queryFn: () => api.get('/instructors', { params: { isActive: true, limit: 100 } }),
  });
  const instructors = instructorsData?.data ?? [];

  // Fetch candidates for form
  const { data: candidatesData } = useQuery<{ data: Candidate[] }>({
    queryKey: ['candidates-active'],
    queryFn: () => api.get('/candidates', { params: { isArchived: false, limit: 200 } }),
  });
  const candidatesList = candidatesData?.data ?? [];

  // Fetch vehicles for form
  const { data: vehiclesData } = useQuery<{ data: Vehicle[] }>({
    queryKey: ['vehicles-active'],
    queryFn: () => api.get('/vehicles', { params: { isActive: true, limit: 100 } }),
  });
  const vehicles = vehiclesData?.data ?? [];

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: LessonFormData) => {
      const payload: Record<string, string> = {
        instructorId: data.instructorId,
        scheduledDate: data.scheduledDate,
        startTime: data.startTime,
        endTime: data.endTime,
      };
      if (data.title) payload.title = data.title;
      if (data.candidateId) payload.candidateId = data.candidateId;
      if (data.vehicleId) payload.vehicleId = data.vehicleId;
      if (data.notes) payload.notes = data.notes;
      return api.post('/scheduled-lessons', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-lessons'] });
      setIsFormOpen(false);
      setFormData(emptyLessonForm);
    },
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => api.post(`/scheduled-lessons/${id}/complete`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-lessons'] });
    },
  });

  const noShowMutation = useMutation({
    mutationFn: (id: string) => api.post(`/scheduled-lessons/${id}/no-show`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-lessons'] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/scheduled-lessons/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-lessons'] });
      setCancelTarget(null);
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

  const handleSlotClick = (date: string, hour: number) => {
    setFormData({
      ...emptyLessonForm,
      scheduledDate: date,
      startTime: `${String(hour).padStart(2, '0')}:00`,
      endTime: `${String(hour + 1).padStart(2, '0')}:00`,
    });
    setIsFormOpen(true);
  };

  const handleCreateSubmit = () => {
    createMutation.mutate(formData);
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

  // Current date display
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

  // Week days for week view
  const weekDays = useMemo(() => {
    const start = getWeekStart(currentDate);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [currentDate]);

  // Month days for month view
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
      // Stop if we've passed the end of the month
      if (current.getMonth() !== currentDate.getMonth() && w >= 3) break;
    }
    return weeks;
  }, [currentDate]);

  return (
    <div className="space-y-6">
      <PageHeader title="Kalendari" description="Planifikoni dhe menaxhoni mesimet">
        <Button onClick={() => {
          setFormData({
            ...emptyLessonForm,
            scheduledDate: formatDateParam(currentDate),
            startTime: '09:00',
            endTime: '10:00',
          });
          setIsFormOpen(true);
        }}>
          <Plus className="h-4 w-4 mr-1.5" />
          Mesim i Ri
        </Button>
      </PageHeader>

      {/* Calendar Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3">
            {/* Row 1: Navigation + Date */}
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
              <h2 className="text-lg font-semibold text-gray-900 ml-2">
                {dateDisplay}
              </h2>
            </div>

            {/* Row 2: Filter + View toggles */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              {/* Instructor Filter */}
              <Select value={instructorFilter} onValueChange={setInstructorFilter}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Te gjithe instruktoret" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Te gjithe instruktoret</SelectItem>
                  {instructors.map((inst) => (
                    <SelectItem key={inst.id} value={inst.id}>
                      {inst.firstName} {inst.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* View Toggles */}
              <div className="flex rounded-md border">
                {(['day', 'week', 'month'] as CalendarView[]).map((v) => (
                  <button
                    key={v}
                    type="button"
                    className={cn(
                      'px-3 py-1.5 text-sm font-medium transition-colors',
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
                        handleSlotClick(formatDateParam(currentDate), hour);
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
                {/* Header row */}
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
                              handleSlotClick(formatDateParam(day), hour);
                            }
                          }}
                        >
                          {slotLessons.map((lesson) => (
                            <LessonBlock
                              key={lesson.id}
                              lesson={lesson}
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
                            handleSlotClick(formatDateParam(day), 9);
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
                              <PopoverContent className="w-64 p-3" align="start">
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
                                  <p className="text-gray-500">
                                    Instruktori:{' '}
                                    {lesson.instructor
                                      ? `${lesson.instructor.firstName} ${lesson.instructor.lastName}`
                                      : '-'}
                                  </p>
                                  {lesson.status === 'scheduled' && (
                                    <div className="space-y-1.5 pt-1">
                                      <div className="flex gap-2">
                                        {!isPersonalEvent(lesson) && (
                                          <Button
                                            size="sm"
                                            className="h-7 flex-1 text-xs"
                                            onClick={() =>
                                              completeMutation.mutate(lesson.id)
                                            }
                                          >
                                            Perfundo
                                          </Button>
                                        )}
                                        {!isPersonalEvent(lesson) && (
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-7 flex-1 text-xs text-amber-600 border-amber-200 hover:bg-amber-50"
                                            onClick={() =>
                                              noShowMutation.mutate(lesson.id)
                                            }
                                          >
                                            Nuk u paraqit
                                          </Button>
                                        )}
                                      </div>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-7 w-full text-xs text-red-600"
                                        onClick={() =>
                                          setCancelTarget(lesson.id)
                                        }
                                      >
                                        Anulo
                                      </Button>
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

      {/* Create Lesson Dialog */}
      <Dialog open={isFormOpen} onOpenChange={(open) => !open && setIsFormOpen(false)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Planifiko Mesim te Ri</DialogTitle>
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
              <Label>Instruktori</Label>
              <Select
                value={formData.instructorId || ''}
                onValueChange={(val) =>
                  setFormData((p) => ({ ...p, instructorId: val }))
                }
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
            <div className="space-y-2">
              <Label>Automjeti (opsionale)</Label>
              <Select
                value={formData.vehicleId || 'none'}
                onValueChange={(val) =>
                  setFormData((p) => ({ ...p, vehicleId: val === 'none' ? '' : val }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Zgjidhni automjetin..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Asnje</SelectItem>
                  {vehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.make} {v.model || ''} - {v.plateNumber}
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
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>
              Anulo
            </Button>
            <Button
              onClick={handleCreateSubmit}
              disabled={
                createMutation.isPending ||
                !formData.instructorId ||
                !formData.scheduledDate
              }
            >
              Planifiko
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation */}
      <ConfirmDialog
        open={!!cancelTarget}
        onOpenChange={(open) => !open && setCancelTarget(null)}
        title="Anulo mesimin"
        description="A jeni te sigurte qe deshironi te anuloni kete mesim? Ky veprim nuk mund te kthehet."
        confirmText="Anulo Mesimin"
        variant="destructive"
        onConfirm={() => cancelTarget && cancelMutation.mutate(cancelTarget)}
      />
    </div>
  );
}
