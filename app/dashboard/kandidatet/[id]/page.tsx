'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '@/lib/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/shared/StatusBadge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ArrowLeft,
  Save,
  CheckCircle,
  Plus,
  Printer,
  FileText,
  Pencil,
  Trash2,
  ShieldCheck,
  Calendar as CalendarIcon,
  ClipboardCheck,
  XCircle,
  MoreHorizontal,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDate, formatCurrency, getDebtColor } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import type {
  Candidate,
  Category,
  Instructor,
  Vehicle,
  Country,
  Municipality,
  Place,
  TheoryHourSession,
  PracticalHourSession,
  LessonChapter,
  Payment,
  AuditLog,
  Verification,
  Exam,
  ExamEligibility,
  SupplementaryRegistration,
} from '@/lib/types';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';

// --- Zod schemas ---
const personalInfoSchema = z.object({
  firstName: z.string().min(1, 'Emri eshte i detyrueshem'),
  lastName: z.string().min(1, 'Mbiemri eshte i detyrueshem'),
  parentName: z.string().optional(),
  personalNumber: z.string().min(1, 'Nr. personal eshte i detyrueshem'),
  dateOfBirth: z.string().optional(),
  gender: z.enum(['M', 'F']).optional().nullable(),
  phone: z.string().optional(),
  email: z.string().email('Email jo valid').optional().or(z.literal('')),
  birthCountryId: z.string().optional(),
  birthMunicipalityId: z.string().optional(),
  birthPlaceId: z.string().optional(),
  residenceMunicipalityId: z.string().optional(),
  residencePlaceId: z.string().optional(),
  categoryId: z.string().min(1, 'Kategoria eshte e detyrueshme'),
  instructorId: z.string().optional(),
  lecturerId: z.string().optional(),
  vehicleId: z.string().optional(),
  isAutomatic: z.boolean(),
  price: z.number().min(0),
  medicalCertificate: z.boolean(),
  medicalCertificateNumber: z.string().optional(),
  medicalCertificateDate: z.string().optional(),
  protocolNumber: z.string().optional(),
  redCrossCertificate: z.boolean(),
  idCardCopy: z.boolean(),
  comments: z.string().optional(),
});

type PersonalInfoForm = z.infer<typeof personalInfoSchema>;

const paymentSchema = z.object({
  amount: z.number().min(0.01, 'Shuma duhet te jete me e madhe se 0'),
  paymentMethod: z.string().optional(),
  paymentDate: z.string().min(1, 'Data eshte e detyrueshme'),
  remarks: z.string().optional(),
});

type PaymentForm = z.infer<typeof paymentSchema>;

const practicalHourSchema = z.object({
  dateRealized: z.string().min(1, 'Data eshte e detyrueshme'),
  timeRealized: z.string().min(1, 'Ora eshte e detyrueshme'),
  hoursCount: z.number().min(1, 'Numri i oreve duhet te jete me i madh se 0'),
  pricePerHour: z.number().min(0),
  instructorId: z.string().optional(),
  chapterTopics: z.string().optional(),
  remarks: z.string().optional(),
});

type PracticalHourForm = z.infer<typeof practicalHourSchema>;

const examSchema = z.object({
  examType: z.enum(['theory', 'practical'], { required_error: 'Lloji i provimit eshte i detyrueshem' }),
  examDate: z.string().min(1, 'Data eshte e detyrueshme'),
  score: z.number().nullable().optional(),
  result: z.enum(['scheduled', 'passed', 'failed', 'cancelled']).default('scheduled'),
  examinerName: z.string().optional(),
  examLocation: z.string().optional(),
  notes: z.string().optional(),
});

type ExamFormData = z.infer<typeof examSchema>;

// --- Main component (loader wrapper) ---
export default function CandidateDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const candidateId = params?.id as string;

  const { data: candidate, isLoading: candidateLoading } = useQuery<Candidate>({
    queryKey: ['candidate', candidateId],
    queryFn: async () => {
      const res = await api.get(`/candidates/${candidateId}`);
      return res.data;
    },
  });

  if (candidateLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="py-12 text-center">
        <p className="text-lg text-muted-foreground">Kandidati nuk u gjet</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/dashboard/kandidatet')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Kthehu te lista
        </Button>
      </div>
    );
  }

  return <CandidateDetailContent key={String(candidate.id)} candidate={candidate} />;
}

// --- Detail content (only mounts when candidate is loaded) ---
function CandidateDetailContent({ candidate: initialCandidate }: { candidate: Candidate }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const candidateId = String(initialCandidate.id);

  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [practicalDialogOpen, setPracticalDialogOpen] = useState(false);
  const [selectedBirthMunicipalityId, setSelectedBirthMunicipalityId] = useState<string>('');
  const [selectedResidenceMunicipalityId, setSelectedResidenceMunicipalityId] = useState<string>('');

  const { data: candidate } = useQuery<Candidate>({
    queryKey: ['candidate', candidateId],
    queryFn: async () => {
      const res = await api.get(`/candidates/${candidateId}`);
      return res.data;
    },
    initialData: initialCandidate,
  });

  // Reference data
  const { data: categories } = useQuery<Category[]>({
    queryKey: ['categories-list'],
    queryFn: async () => {
      const res = await api.get('/categories');
      return res.data;
    },
  });

  const { data: instructors } = useQuery<Instructor[]>({
    queryKey: ['instructors-list'],
    queryFn: async () => {
      const res = await api.get('/instructors');
      return res.data;
    },
  });

  const { data: vehicles } = useQuery<Vehicle[]>({
    queryKey: ['vehicles-list'],
    queryFn: async () => {
      const res = await api.get('/vehicles');
      return res.data;
    },
  });

  const { data: countries } = useQuery<Country[]>({
    queryKey: ['countries'],
    queryFn: async () => {
      const res = await api.get('/locations/countries');
      return res.data;
    },
  });

  const { data: birthMunicipalities } = useQuery<Municipality[]>({
    queryKey: ['municipalities', candidate?.birthCountryId],
    queryFn: async () => {
      const res = await api.get(`/locations/municipalities?country_id=${candidate?.birthCountryId}`);
      return res.data;
    },
    enabled: !!candidate?.birthCountryId,
  });

  const activeBirthMunicipalityId = selectedBirthMunicipalityId || candidate?.birthMunicipalityId;
  const { data: birthPlaces } = useQuery<Place[]>({
    queryKey: ['places', activeBirthMunicipalityId],
    queryFn: async () => {
      const res = await api.get(`/locations/places?municipality_id=${activeBirthMunicipalityId}`);
      return res.data;
    },
    enabled: !!activeBirthMunicipalityId,
  });

  const { data: residenceMunicipalities } = useQuery<Municipality[]>({
    queryKey: ['residence-municipalities'],
    queryFn: async () => {
      // Default to Kosovo
      const kosovoId = countries?.find((c) => c.name === 'Kosovë' || c.code === 'KS')?.id;
      const cId = kosovoId || candidate?.birthCountryId;
      if (!cId) return [];
      const res = await api.get(`/locations/municipalities?country_id=${cId}`);
      return res.data;
    },
    enabled: !!countries,
  });

  const activeResidenceMunicipalityId = selectedResidenceMunicipalityId || candidate?.residenceMunicipalityId;
  const { data: residencePlaces } = useQuery<Place[]>({
    queryKey: ['residence-places', activeResidenceMunicipalityId],
    queryFn: async () => {
      const res = await api.get(`/locations/places?municipality_id=${activeResidenceMunicipalityId}`);
      return res.data;
    },
    enabled: !!activeResidenceMunicipalityId,
  });

  // Tab data
  const { data: theoryHours, isLoading: theoryLoading } = useQuery<TheoryHourSession[]>({
    queryKey: ['theory-hours', candidateId],
    queryFn: async () => {
      const res = await api.get(`/theory-hours?candidateId=${candidateId}`);
      return res.data;
    },
  });

  const { data: practicalHours, isLoading: practicalLoading } = useQuery<PracticalHourSession[]>({
    queryKey: ['practical-hours', candidateId],
    queryFn: async () => {
      const res = await api.get(`/practical-hours?candidateId=${candidateId}`);
      return res.data;
    },
  });

  const { data: theoryChapters } = useQuery<LessonChapter[]>({
    queryKey: ['lesson-chapters', 'theory', candidate?.categoryId],
    queryFn: async () => {
      const res = await api.get('/lesson-chapters', {
        params: { chapterType: 'theory', categoryId: candidate!.categoryId },
      });
      return res.data;
    },
    enabled: !!candidate?.categoryId,
  });

  const { data: practicalChapters } = useQuery<LessonChapter[]>({
    queryKey: ['lesson-chapters', 'practical', candidate?.categoryId],
    queryFn: async () => {
      const res = await api.get('/lesson-chapters', {
        params: { chapterType: 'practical', categoryId: candidate!.categoryId },
      });
      return res.data;
    },
    enabled: !!candidate?.categoryId,
  });

  const { data: payments, isLoading: paymentsLoading } = useQuery<Payment[]>({
    queryKey: ['payments', candidateId],
    queryFn: async () => {
      const res = await api.get(`/payments?candidateId=${candidateId}`);
      return res.data;
    },
  });

  const { data: auditLogs, isLoading: auditLoading } = useQuery<AuditLog[]>({
    queryKey: ['audit-logs', candidateId],
    queryFn: async () => {
      const res = await api.get(`/audit-logs?entityType=candidate&entityId=${candidateId}`);
      return res.data;
    },
  });

  // Verification data & state
  const { data: verifications, isLoading: verificationsLoading } = useQuery<Verification[]>({
    queryKey: ['verifications', candidateId],
    queryFn: async () => {
      const res = await api.get(`/verifications?candidateId=${candidateId}`);
      return res.data;
    },
  });

  const [verificationDialogOpen, setVerificationDialogOpen] = useState(false);
  const [editingVerification, setEditingVerification] = useState<Verification | null>(null);
  const [deleteVerificationOpen, setDeleteVerificationOpen] = useState(false);
  const [deletingVerificationId, setDeletingVerificationId] = useState<string | null>(null);
  const [verificationForm, setVerificationForm] = useState({
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
  });

  const openAddVerification = () => {
    setEditingVerification(null);
    setVerificationForm({
      categoryId: candidate?.categoryId ?? '',
      verificationDate: '',
      theoryHoursStart: '',
      theoryHoursEnd: '',
      practicalHoursStart: '',
      practicalHoursEnd: '',
      sequenceNumber: '',
      lecturerId: candidate?.lecturerId ?? '',
      instructorId: candidate?.instructorId ?? '',
      redCrossCert: candidate?.redCrossCertificate ?? false,
      idCardCopy: candidate?.idCardCopy ?? false,
    });
    setVerificationDialogOpen(true);
  };

  const openEditVerification = (v: Verification) => {
    setEditingVerification(v);
    setVerificationForm({
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
    setVerificationDialogOpen(true);
  };

  const createVerification = useMutation({
    mutationFn: async (data: typeof verificationForm & { candidateId: string }) =>
      api.post('/verifications', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['verifications', candidateId] });
      queryClient.invalidateQueries({ queryKey: ['candidate', candidateId] });
      setVerificationDialogOpen(false);
      toast({ title: 'Vërtetimi u shtua me sukses' });
    },
    onError: () => {
      toast({ title: 'Gabim', description: 'Ka ndodhur një gabim.', variant: 'destructive' });
    },
  });

  const updateVerification = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof verificationForm }) =>
      api.put(`/verifications/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['verifications', candidateId] });
      queryClient.invalidateQueries({ queryKey: ['candidate', candidateId] });
      setVerificationDialogOpen(false);
      setEditingVerification(null);
      toast({ title: 'Vërtetimi u përditësua me sukses' });
    },
    onError: () => {
      toast({ title: 'Gabim', description: 'Ka ndodhur një gabim.', variant: 'destructive' });
    },
  });

  const deleteVerificationMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/verifications/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['verifications', candidateId] });
      queryClient.invalidateQueries({ queryKey: ['candidate', candidateId] });
      setDeleteVerificationOpen(false);
      setDeletingVerificationId(null);
      toast({ title: 'Vërtetimi u fshi me sukses' });
    },
    onError: () => {
      toast({ title: 'Gabim', description: 'Ka ndodhur një gabim.', variant: 'destructive' });
    },
  });

  const handleVerificationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingVerification) {
      updateVerification.mutate({ id: editingVerification.id, data: verificationForm });
    } else {
      createVerification.mutate({ ...verificationForm, candidateId });
    }
  };

  // --- Exams state, queries, mutations ---
  const [examDialogOpen, setExamDialogOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [deleteExamOpen, setDeleteExamOpen] = useState(false);
  const [deletingExamId, setDeletingExamId] = useState<string | null>(null);

  const { data: exams, isLoading: examsLoading } = useQuery<Exam[]>({
    queryKey: ['exams', candidateId],
    queryFn: async () => {
      const res = await api.get('/exams', { params: { candidateId } });
      return res.data;
    },
  });

  const { data: examEligibility } = useQuery<ExamEligibility>({
    queryKey: ['exam-eligibility', candidateId],
    queryFn: async () => {
      const res = await api.get(`/candidates/${candidateId}/exam-eligibility`);
      return res.data;
    },
  });

  const examForm = useForm<ExamFormData>({
    resolver: zodResolver(examSchema),
    defaultValues: {
      examType: 'theory',
      examDate: new Date().toISOString().split('T')[0],
      score: null,
      result: 'scheduled',
      examinerName: '',
      examLocation: '',
      notes: '',
    },
  });

  const openAddExam = () => {
    setEditingExam(null);
    examForm.reset({
      examType: 'theory',
      examDate: new Date().toISOString().split('T')[0],
      score: null,
      result: 'scheduled',
      examinerName: '',
      examLocation: '',
      notes: '',
    });
    setExamDialogOpen(true);
  };

  const openEditExam = (exam: Exam) => {
    setEditingExam(exam);
    examForm.reset({
      examType: exam.examType,
      examDate: exam.examDate,
      score: exam.score ?? null,
      result: exam.result,
      examinerName: exam.examinerName ?? '',
      examLocation: exam.examLocation ?? '',
      notes: exam.notes ?? '',
    });
    setExamDialogOpen(true);
  };

  const createExam = useMutation({
    mutationFn: async (data: ExamFormData) => {
      await api.post('/exams', { ...data, candidateId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exams', candidateId] });
      queryClient.invalidateQueries({ queryKey: ['exam-eligibility', candidateId] });
      setExamDialogOpen(false);
      examForm.reset();
      toast({ title: 'Provimi u planifikua me sukses' });
    },
    onError: (err: { message?: string }) => {
      toast({ title: 'Gabim', description: err.message || 'Ka ndodhur nje gabim.', variant: 'destructive' });
    },
  });

  const updateExam = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ExamFormData }) => {
      await api.put(`/exams/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exams', candidateId] });
      queryClient.invalidateQueries({ queryKey: ['exam-eligibility', candidateId] });
      setExamDialogOpen(false);
      setEditingExam(null);
      examForm.reset();
      toast({ title: 'Provimi u perditesua me sukses' });
    },
    onError: (err: { message?: string }) => {
      toast({ title: 'Gabim', description: err.message || 'Ka ndodhur nje gabim.', variant: 'destructive' });
    },
  });

  const deleteExamMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/exams/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exams', candidateId] });
      queryClient.invalidateQueries({ queryKey: ['exam-eligibility', candidateId] });
      setDeleteExamOpen(false);
      setDeletingExamId(null);
      toast({ title: 'Provimi u fshi me sukses' });
    },
    onError: () => {
      toast({ title: 'Gabim', description: 'Ka ndodhur nje gabim.', variant: 'destructive' });
    },
  });

  const handleExamSubmit = examForm.handleSubmit((data) => {
    if (editingExam) {
      updateExam.mutate({ id: editingExam.id, data });
    } else {
      createExam.mutate(data);
    }
  });

  const getExamResultBadge = (result: Exam['result']) => {
    switch (result) {
      case 'scheduled':
        return <Badge variant="warning">E planifikuar</Badge>;
      case 'passed':
        return <Badge variant="success">Kaluar</Badge>;
      case 'failed':
        return <Badge variant="error">Deshtuar</Badge>;
      case 'cancelled':
        return <Badge variant="muted">Anuluar</Badge>;
      default:
        return <Badge variant="muted">{result}</Badge>;
    }
  };

  const getExamTypeBadge = (type: Exam['examType']) => {
    return type === 'theory' ? (
      <Badge variant="info">Teorik</Badge>
    ) : (
      <Badge className="border-transparent bg-orange-100 text-orange-800">Praktik</Badge>
    );
  };

  const lecturers = (instructors ?? []).filter((i) => i.position === 'lecturer' || i.position === 'both');
  const instructorsList = (instructors ?? []).filter((i) => i.position === 'instructor' || i.position === 'both');

  // Mutations
  const updateCandidate = useMutation({
    mutationFn: async (data: PersonalInfoForm) => {
      // Convert empty strings to null for optional fields, remove null optionals
      const cleaned: Record<string, unknown> = {};
      const requiredFields = new Set(['firstName', 'lastName', 'personalNumber', 'categoryId', 'price', 'isAutomatic']);
      for (const [key, value] of Object.entries(data)) {
        if (value === '' || value === null || value === undefined) {
          if (!requiredFields.has(key)) {
            cleaned[key] = null;
          }
        } else {
          cleaned[key] = value;
        }
      }
      await api.put(`/candidates/${candidateId}`, cleaned);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidate', candidateId] });
      toast({
        title: 'Te dhenat u ruajten',
        description: 'Te dhenat e kandidatit u perditesuan me sukses.',
      });
    },
    onError: () => {
      toast({
        title: 'Gabim',
        description: 'Ka ndodhur nje gabim gjate ruajtjes. Ju lutem provoni perseri.',
        variant: 'destructive',
      });
    },
  });

  const realizeTheorySession = useMutation({
    mutationFn: async (sessionId: string) => {
      await api.post(`/theory-hours/${sessionId}/realize`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['theory-hours', candidateId] });
      toast({ title: 'Ora u realizua', description: 'Ora teorike u realizua me sukses.' });
    },
    onError: () => {
      toast({ title: 'Gabim', description: 'Ka ndodhur nje gabim.', variant: 'destructive' });
    },
  });

  const bulkRealizeTheory = useMutation({
    mutationFn: async () => {
      const unrealized = theoryHours?.filter((s) => !s.isRealized).map((s) => s.id) ?? [];
      await Promise.all(unrealized.map((id) => api.post(`/theory-hours/${id}/realize`)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['theory-hours', candidateId] });
      toast({ title: 'Oret u realizuan', description: 'Te gjitha oret teorike u realizuan me sukses.' });
    },
    onError: () => {
      toast({ title: 'Gabim', description: 'Ka ndodhur nje gabim.', variant: 'destructive' });
    },
  });

  const generateTheorySessions = useMutation({
    mutationFn: async () => {
      await api.post('/theory-hours/generate', { candidateId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['theory-hours', candidateId] });
      toast({ title: 'Sesionet u gjeneruan', description: 'Sesionet e reja teorike u krijuan nga kapitujt mesimor.' });
    },
    onError: (error: unknown) => {
      const message = (error as { response?: { data?: { error?: string } } })?.response?.data?.error
        || 'Nuk ka kapituj mesimor te definuara per kete kategori.';
      toast({ title: 'Gabim', description: message, variant: 'destructive' });
    },
  });

  const generatePracticalSessions = useMutation({
    mutationFn: async () => {
      await api.post('/practical-hours/generate', { candidateId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['practical-hours', candidateId] });
      queryClient.invalidateQueries({ queryKey: ['candidate', candidateId] });
      toast({ title: 'Sesionet u gjeneruan', description: 'Sesionet praktike u krijuan nga kapitujt mesimor.' });
    },
    onError: () => {
      toast({ title: 'Gabim', description: 'Nuk ka kapituj mesimor te definuara per kete kategori.', variant: 'destructive' });
    },
  });

  const addPayment = useMutation({
    mutationFn: async (data: PaymentForm) => {
      await api.post('/payments', { ...data, candidateId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments', candidateId] });
      queryClient.invalidateQueries({ queryKey: ['candidate', candidateId] });
      setPaymentDialogOpen(false);
      toast({ title: 'Pagesa u shtua', description: 'Pagesa u regjistrua me sukses.' });
    },
    onError: () => {
      toast({ title: 'Gabim', description: 'Ka ndodhur nje gabim gjate shtimit te pageses.', variant: 'destructive' });
    },
  });

  const addPracticalHour = useMutation({
    mutationFn: async (data: PracticalHourForm) => {
      await api.post('/practical-hours', { ...data, candidateId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['practical-hours', candidateId] });
      queryClient.invalidateQueries({ queryKey: ['candidate', candidateId] });
      setPracticalDialogOpen(false);
      practicalForm.reset();
      toast({ title: 'Ora praktike u shtua', description: 'Ora praktike u regjistrua me sukses.' });
    },
    onError: () => {
      toast({ title: 'Gabim', description: 'Ka ndodhur nje gabim gjate shtimit te ores praktike.', variant: 'destructive' });
    },
  });

  // Forms — candidate is always defined here (parent handles loading)
  const personalForm = useForm<PersonalInfoForm>({
    resolver: zodResolver(personalInfoSchema),
    defaultValues: {
      firstName: initialCandidate.firstName,
      lastName: initialCandidate.lastName,
      parentName: initialCandidate.parentName ?? '',
      personalNumber: initialCandidate.personalNumber,
      dateOfBirth: initialCandidate.dateOfBirth ?? '',
      gender: (initialCandidate.gender as 'M' | 'F') || undefined,
      phone: initialCandidate.phone ?? '',
      email: initialCandidate.email ?? '',
      birthCountryId: initialCandidate.birthCountryId ?? '',
      birthMunicipalityId: initialCandidate.birthMunicipalityId ?? '',
      birthPlaceId: initialCandidate.birthPlaceId ?? '',
      residenceMunicipalityId: initialCandidate.residenceMunicipalityId ?? '',
      residencePlaceId: initialCandidate.residencePlaceId ?? '',
      categoryId: initialCandidate.categoryId,
      instructorId: initialCandidate.instructorId ?? '',
      lecturerId: initialCandidate.lecturerId ?? '',
      vehicleId: initialCandidate.vehicleId ?? '',
      isAutomatic: initialCandidate.isAutomatic ?? false,
      price: initialCandidate.price ?? 0,
      medicalCertificate: initialCandidate.medicalCertificate ?? false,
      medicalCertificateNumber: initialCandidate.medicalCertificateNumber ?? '',
      medicalCertificateDate: initialCandidate.medicalCertificateDate ?? '',
      protocolNumber: initialCandidate.protocolNumber ?? '',
      redCrossCertificate: initialCandidate.redCrossCertificate ?? false,
      idCardCopy: initialCandidate.idCardCopy ?? false,
      comments: initialCandidate.comments ?? '',
    },
  });

  useEffect(() => {
    if (candidate && candidate !== initialCandidate) {
      personalForm.reset({
        firstName: candidate.firstName,
        lastName: candidate.lastName,
        parentName: candidate.parentName ?? '',
        personalNumber: candidate.personalNumber,
        dateOfBirth: candidate.dateOfBirth ?? '',
        gender: (candidate.gender as 'M' | 'F') || undefined,
        phone: candidate.phone ?? '',
        email: candidate.email ?? '',
        birthCountryId: candidate.birthCountryId ?? '',
        birthMunicipalityId: candidate.birthMunicipalityId ?? '',
        birthPlaceId: candidate.birthPlaceId ?? '',
        residenceMunicipalityId: candidate.residenceMunicipalityId ?? '',
        residencePlaceId: candidate.residencePlaceId ?? '',
        categoryId: candidate.categoryId,
        instructorId: candidate.instructorId ?? '',
        lecturerId: candidate.lecturerId ?? '',
        vehicleId: candidate.vehicleId ?? '',
        isAutomatic: candidate.isAutomatic ?? false,
        price: candidate.price ?? 0,
        medicalCertificate: candidate.medicalCertificate ?? false,
        medicalCertificateNumber: candidate.medicalCertificateNumber ?? '',
        medicalCertificateDate: candidate.medicalCertificateDate ?? '',
        protocolNumber: candidate.protocolNumber ?? '',
        redCrossCertificate: candidate.redCrossCertificate ?? false,
        idCardCopy: candidate.idCardCopy ?? false,
        comments: candidate.comments ?? '',
      });
    }
  }, [candidate]); // eslint-disable-line react-hooks/exhaustive-deps

  const paymentForm = useForm<PaymentForm>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: 0,
      paymentMethod: 'cash',
      paymentDate: new Date().toISOString().split('T')[0],
      remarks: '',
    },
  });

  const practicalForm = useForm<PracticalHourForm>({
    resolver: zodResolver(practicalHourSchema),
    defaultValues: {
      dateRealized: new Date().toISOString().split('T')[0],
      timeRealized: '',
      hoursCount: 1,
      pricePerHour: 0,
      instructorId: '',
      chapterTopics: '',
      remarks: '',
    },
  });

  const debt = (candidate?.price ?? 0) - (candidate?.amountPaid ?? 0);
  const totalPaid = payments?.reduce((sum, p) => sum + p.amount, 0) ?? candidate.amountPaid;
  const totalTheoryRealized = theoryHours?.filter((s) => s.isRealized).length ?? 0;
  const totalPracticalRealized = practicalHours?.reduce((sum, p) => sum + p.hoursCount, 0) ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" className="h-9 w-9 border-slate-300" onClick={() => router.push('/dashboard/kandidatet')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-semibold text-slate-900">
                {candidate.firstName} {candidate.lastName}
              </h1>
              <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 ring-1 ring-blue-200/60">
                {candidate.category?.code ?? '-'}
              </span>
              <StatusBadge status={candidate.isArchived ? 'archived' : 'active'} />
            </div>
            <p className="mt-0.5 text-sm text-slate-500">
              Nr. Regjistrit: {candidate.protocolNumber || '-'} | Nr. Personal: {candidate.personalNumber}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="personal" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="personal">Te Dhenat Personale</TabsTrigger>
          <TabsTrigger value="theory">Oret Teorike</TabsTrigger>
          <TabsTrigger value="practical">Oret Praktike</TabsTrigger>
          <TabsTrigger value="payments">Pagesat</TabsTrigger>
          <TabsTrigger value="documents">Dokumentet</TabsTrigger>
          <TabsTrigger value="exams">Provimet</TabsTrigger>
          <TabsTrigger value="supplementary">Regjistrime te Tjera</TabsTrigger>
          <TabsTrigger value="history">Historiku</TabsTrigger>
        </TabsList>

        {/* Tab 1: Personal Info */}
        <TabsContent value="personal">
          <Card>
            <CardHeader>
              <CardTitle>Te Dhenat Personale</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={personalForm.handleSubmit((data) => updateCandidate.mutate(data))}
                className="space-y-6"
              >
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Left - Personal */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 pb-1 border-b border-slate-200">Informata Personale</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">Emri</Label>
                        <Input id="firstName" {...personalForm.register('firstName')} />
                        {personalForm.formState.errors.firstName && (
                          <p className="text-xs text-red-500">{personalForm.formState.errors.firstName.message}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Mbiemri</Label>
                        <Input id="lastName" {...personalForm.register('lastName')} />
                        {personalForm.formState.errors.lastName && (
                          <p className="text-xs text-red-500">{personalForm.formState.errors.lastName.message}</p>
                        )}
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="parentName">Emri i prindit</Label>
                        <Input id="parentName" {...personalForm.register('parentName')} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="personalNumber">Nr. Personal</Label>
                        <Input id="personalNumber" {...personalForm.register('personalNumber')} />
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="dateOfBirth">Datelindja</Label>
                        <Input id="dateOfBirth" type="date" {...personalForm.register('dateOfBirth')} />
                      </div>
                      <div className="space-y-2">
                        <Label>Gjinia</Label>
                        <div className="flex items-center gap-4 pt-2">
                          <label className="flex items-center gap-2">
                            <input
                              type="radio"
                              value="M"
                              {...personalForm.register('gender')}
                              className="text-blue-600"
                            />
                            <span className="text-sm">Mashkull</span>
                          </label>
                          <label className="flex items-center gap-2">
                            <input
                              type="radio"
                              value="F"
                              {...personalForm.register('gender')}
                              className="text-blue-600"
                            />
                            <span className="text-sm">Femer</span>
                          </label>
                        </div>
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="phone">Telefoni</Label>
                        <Input id="phone" {...personalForm.register('phone')} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" {...personalForm.register('email')} />
                      </div>
                    </div>
                  </div>

                  {/* Right - Location + Training */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 pb-1 border-b border-slate-200">Vendndodhja</h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Shteti i lindjes</Label>
                        <Select
                          value={personalForm.watch('birthCountryId') || ''}
                          onValueChange={(val) => personalForm.setValue('birthCountryId', val, { shouldDirty: true })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Zgjedh shtetin" />
                          </SelectTrigger>
                          <SelectContent>
                            {countries?.map((c) => (
                              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Komuna e lindjes</Label>
                          <Select
                            value={personalForm.watch('birthMunicipalityId') || ''}
                            onValueChange={(val) => {
                              personalForm.setValue('birthMunicipalityId', val, { shouldDirty: true });
                              personalForm.setValue('birthPlaceId', '', { shouldDirty: true });
                              setSelectedBirthMunicipalityId(val);
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Zgjedh komunen" />
                            </SelectTrigger>
                            <SelectContent>
                              {birthMunicipalities?.map((m) => (
                                <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Vendlindja</Label>
                          <Select
                            value={personalForm.watch('birthPlaceId') || ''}
                            onValueChange={(val) => personalForm.setValue('birthPlaceId', val, { shouldDirty: true })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Zgjedh vendin" />
                            </SelectTrigger>
                            <SelectContent>
                              {birthPlaces?.map((p) => (
                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Komuna e banimit</Label>
                          <Select
                            value={personalForm.watch('residenceMunicipalityId') || ''}
                            onValueChange={(val) => {
                              personalForm.setValue('residenceMunicipalityId', val, { shouldDirty: true });
                              personalForm.setValue('residencePlaceId', '', { shouldDirty: true });
                              setSelectedResidenceMunicipalityId(val);
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Zgjedh komunen" />
                            </SelectTrigger>
                            <SelectContent>
                              {residenceMunicipalities?.map((m) => (
                                <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Vendbanimi</Label>
                          <Select
                            value={personalForm.watch('residencePlaceId') || ''}
                            onValueChange={(val) => personalForm.setValue('residencePlaceId', val, { shouldDirty: true })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Zgjedh vendin" />
                            </SelectTrigger>
                            <SelectContent>
                              {residencePlaces?.map((p) => (
                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    <h3 className="pt-4 text-sm font-semibold uppercase tracking-wide text-slate-500 pb-1 border-b border-slate-200">Trajnimi</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Kategoria</Label>
                        <Select
                          value={personalForm.watch('categoryId') || ''}
                          onValueChange={(val) => personalForm.setValue('categoryId', val, { shouldDirty: true })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Zgjedh kategorine" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories?.map((c) => (
                              <SelectItem key={c.id} value={c.id}>{c.code}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Instruktori</Label>
                        <Select
                          value={personalForm.watch('instructorId') || ''}
                          onValueChange={(val) => personalForm.setValue('instructorId', val, { shouldDirty: true })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Zgjedh instruktorin" />
                          </SelectTrigger>
                          <SelectContent>
                            {instructors?.filter((i) => i.position === 'instructor' || i.position === 'both').map((i) => (
                              <SelectItem key={i.id} value={i.id}>
                                {i.firstName} {i.lastName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Ligjeruesi</Label>
                        <Select
                          value={personalForm.watch('lecturerId') || ''}
                          onValueChange={(val) => personalForm.setValue('lecturerId', val, { shouldDirty: true })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Zgjedh ligjeruesin" />
                          </SelectTrigger>
                          <SelectContent>
                            {instructors?.filter((i) => i.position === 'lecturer' || i.position === 'both').map((i) => (
                              <SelectItem key={i.id} value={i.id}>
                                {i.firstName} {i.lastName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Automjeti</Label>
                        <Select
                          value={personalForm.watch('vehicleId') || ''}
                          onValueChange={(val) => personalForm.setValue('vehicleId', val, { shouldDirty: true })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Zgjedh automjetin" />
                          </SelectTrigger>
                          <SelectContent>
                            {vehicles?.map((v) => (
                              <SelectItem key={v.id} value={v.id}>
                                {v.make} {v.model ?? ''} - {v.plateNumber}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="space-y-2">
                        <Label htmlFor="price">Çmimi (€)</Label>
                        <Input
                          id="price"
                          type="number"
                          min="0"
                          step="0.01"
                          {...personalForm.register('price', { valueAsNumber: true })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="protocolNumber">Nr. Regjistrit</Label>
                        <Input id="protocolNumber" {...personalForm.register('protocolNumber')} />
                      </div>
                      <div className="space-y-2">
                        <Label>Transmisioni</Label>
                        <div className="flex items-center gap-4 pt-2">
                          <label className="flex items-center gap-2">
                            <input
                              type="radio"
                              checked={!personalForm.watch('isAutomatic')}
                              onChange={() => personalForm.setValue('isAutomatic', false)}
                              className="text-blue-600"
                            />
                            <span className="text-sm">Manual</span>
                          </label>
                          <label className="flex items-center gap-2">
                            <input
                              type="radio"
                              checked={personalForm.watch('isAutomatic')}
                              onChange={() => personalForm.setValue('isAutomatic', true)}
                              className="text-blue-600"
                            />
                            <span className="text-sm">Automatik</span>
                          </label>
                        </div>
                      </div>
                    </div>

                    <h3 className="pt-4 text-sm font-semibold uppercase tracking-wide text-slate-500 pb-1 border-b border-slate-200">Dokumentet</h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="medicalCertificate"
                          checked={personalForm.watch('medicalCertificate')}
                          onCheckedChange={(val) => personalForm.setValue('medicalCertificate', !!val)}
                        />
                        <Label htmlFor="medicalCertificate">Certifikata mjekesore</Label>
                      </div>
                      {personalForm.watch('medicalCertificate') && (
                        <div className="grid gap-4 pl-6 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="medicalCertificateNumber">Nr. certifikates</Label>
                            <Input id="medicalCertificateNumber" {...personalForm.register('medicalCertificateNumber')} />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="medicalCertificateDate">Data</Label>
                            <Input id="medicalCertificateDate" type="date" {...personalForm.register('medicalCertificateDate')} />
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="redCrossCertificate"
                          checked={personalForm.watch('redCrossCertificate')}
                          onCheckedChange={(val) => personalForm.setValue('redCrossCertificate', !!val)}
                        />
                        <Label htmlFor="redCrossCertificate">Certifikata e Kryqit te Kuq</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="idCardCopy"
                          checked={personalForm.watch('idCardCopy')}
                          onCheckedChange={(val) => personalForm.setValue('idCardCopy', !!val)}
                        />
                        <Label htmlFor="idCardCopy">Kopja e leternjoftimit</Label>
                      </div>
                    </div>
                  </div>
                </div>

                {Object.keys(personalForm.formState.errors).length > 0 && (
                  <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                    Ju lutem korrigjoni fushat e shenuara me te kuqe para se te ruani.
                  </div>
                )}
                <div className="flex justify-end border-t pt-4">
                  <Button type="submit" disabled={updateCandidate.isPending}>
                    <Save className="mr-2 h-4 w-4" />
                    {updateCandidate.isPending ? 'Duke ruajtur...' : 'Ruaj'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Theory Hours */}
        <TabsContent value="theory">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Oret Teorike</CardTitle>
              <div className="flex items-center gap-2">
                {theoryChapters && theoryChapters.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => generateTheorySessions.mutate()}
                    disabled={generateTheorySessions.isPending}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Gjenero Sesionet
                  </Button>
                )}
                {theoryHours && theoryHours.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => bulkRealizeTheory.mutate()}
                    disabled={bulkRealizeTheory.isPending || !theoryHours.some((s) => !s.isRealized)}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Realizo te gjitha
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {/* Summary */}
              <div className="mb-4 flex items-center gap-6 rounded-lg bg-gray-50 p-4">
                <div>
                  <p className="text-sm text-muted-foreground">Realizuara</p>
                  <p className="text-xl font-bold">{totalTheoryRealized}</p>
                </div>
                <div className="text-2xl text-muted-foreground">/</div>
                <div>
                  <p className="text-sm text-muted-foreground">Te nevojshme</p>
                  <p className="text-xl font-bold">{candidate.theoryHours}</p>
                </div>
              </div>

              {theoryLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : theoryHours && theoryHours.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nr</TableHead>
                        <TableHead>Kapitulli</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Ora</TableHead>
                        <TableHead>Ore</TableHead>
                        <TableHead>Realizuar</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {theoryHours.map((session) => (
                        <TableRow key={session.id}>
                          <TableCell className="font-medium">{session.sessionNumber}</TableCell>
                          <TableCell>{session.chapterTopics}</TableCell>
                          <TableCell>{session.dateRealized ? formatDate(session.dateRealized) : '-'}</TableCell>
                          <TableCell>{session.timeFrom} - {session.timeTo}</TableCell>
                          <TableCell>{session.hoursCount}</TableCell>
                          <TableCell>
                            <StatusBadge status={session.isRealized ? 'completed' : 'pending'} />
                          </TableCell>
                          <TableCell>
                            {!session.isRealized && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => realizeTheorySession.mutate(session.id)}
                                disabled={realizeTheorySession.isPending}
                              >
                                Realizo
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="py-8 text-center">
                  <p className="text-sm text-muted-foreground mb-3">
                    Nuk ka ore teorike te regjistruara
                  </p>
                  {theoryChapters && theoryChapters.length > 0 && (
                    <Button
                      size="sm"
                      onClick={() => generateTheorySessions.mutate()}
                      disabled={generateTheorySessions.isPending}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Gjenero nga Kapitujt Mesimor
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Practical Hours */}
        <TabsContent value="practical">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Oret Praktike</CardTitle>
              <div className="flex items-center gap-2">
                {practicalChapters && practicalChapters.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => generatePracticalSessions.mutate()}
                    disabled={generatePracticalSessions.isPending}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Gjenero Sesionet
                  </Button>
                )}
                <Button size="sm" onClick={() => setPracticalDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Shto ore
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Summary */}
              <div className="mb-4 flex items-center gap-6 rounded-lg bg-gray-50 p-4">
                <div>
                  <p className="text-sm text-muted-foreground">Realizuara</p>
                  <p className="text-xl font-bold">{totalPracticalRealized}</p>
                </div>
                <div className="text-2xl text-muted-foreground">/</div>
                <div>
                  <p className="text-sm text-muted-foreground">Te nevojshme</p>
                  <p className="text-xl font-bold">{candidate.practicalHours}</p>
                </div>
              </div>

              {practicalLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : practicalHours && practicalHours.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Ora</TableHead>
                        <TableHead>Instruktori</TableHead>
                        <TableHead>Kapitulli</TableHead>
                        <TableHead>Ore</TableHead>
                        <TableHead>Cmimi</TableHead>
                        <TableHead>Paguar</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {practicalHours.map((session) => (
                        <TableRow key={session.id}>
                          <TableCell>{formatDate(session.dateRealized)}</TableCell>
                          <TableCell>{session.timeRealized}</TableCell>
                          <TableCell>
                            {session.instructor
                              ? `${session.instructor.firstName} ${session.instructor.lastName}`
                              : '-'}
                          </TableCell>
                          <TableCell>{session.chapterTopics || '-'}</TableCell>
                          <TableCell>{session.hoursCount}</TableCell>
                          <TableCell>{formatCurrency(session.pricePerHour * session.hoursCount)}</TableCell>
                          <TableCell>
                            <StatusBadge status={session.isPaid ? 'paid' : 'unpaid'} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="py-8 text-center">
                  <p className="text-sm text-muted-foreground mb-3">
                    Nuk ka ore praktike te regjistruara
                  </p>
                  {practicalChapters && practicalChapters.length > 0 && (
                    <Button
                      size="sm"
                      onClick={() => generatePracticalSessions.mutate()}
                      disabled={generatePracticalSessions.isPending}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Gjenero nga Kapitujt Mesimor
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Add Practical Hour Dialog */}
          <Dialog open={practicalDialogOpen} onOpenChange={setPracticalDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Shto Ore Praktike</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={practicalForm.handleSubmit((data) => addPracticalHour.mutate(data))}
                className="space-y-4"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="ph-date">Data</Label>
                    <Input id="ph-date" type="date" {...practicalForm.register('dateRealized')} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ph-time">Ora</Label>
                    <Input id="ph-time" type="time" {...practicalForm.register('timeRealized')} />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="ph-hours">Numri i oreve</Label>
                    <Input
                      id="ph-hours"
                      type="number"
                      min={1}
                      {...practicalForm.register('hoursCount', { valueAsNumber: true })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ph-price">Cmimi per ore</Label>
                    <Input
                      id="ph-price"
                      type="number"
                      step="0.01"
                      {...practicalForm.register('pricePerHour', { valueAsNumber: true })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Instruktori</Label>
                  <Select
                    value={practicalForm.watch('instructorId') || ''}
                    onValueChange={(val) => practicalForm.setValue('instructorId', val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Zgjedh instruktorin" />
                    </SelectTrigger>
                    <SelectContent>
                      {instructors?.filter((i) => i.position === 'instructor' || i.position === 'both').map((i) => (
                        <SelectItem key={i.id} value={i.id}>
                          {i.firstName} {i.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Kapitulli/Tema</Label>
                  <Select
                    value={practicalForm.watch('chapterTopics') || '__none__'}
                    onValueChange={(val) => practicalForm.setValue('chapterTopics', val === '__none__' ? '' : val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Zgjedh kapitullin (opsional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">-- Asnje --</SelectItem>
                      {practicalChapters?.map((ch) => (
                        <SelectItem key={ch.id} value={ch.chapterTopics}>
                          {ch.sessionNumber}. {ch.chapterTopics}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ph-remarks">Verejtje</Label>
                  <Input id="ph-remarks" {...practicalForm.register('remarks')} />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setPracticalDialogOpen(false)}>
                    Anulo
                  </Button>
                  <Button type="submit" disabled={addPracticalHour.isPending}>
                    {addPracticalHour.isPending ? 'Duke ruajtur...' : 'Ruaj'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Tab 4: Payments */}
        <TabsContent value="payments">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Pagesat</CardTitle>
              <Button size="sm" onClick={() => setPaymentDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Shto pagese
              </Button>
            </CardHeader>
            <CardContent>
              {/* Summary Cards */}
              <div className="mb-6 grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg border bg-gray-50 p-4">
                  <p className="text-sm text-muted-foreground">Cmimi total</p>
                  <p className="text-xl font-bold">{formatCurrency(candidate.price)}</p>
                </div>
                <div className="rounded-lg border bg-green-50 p-4">
                  <p className="text-sm text-muted-foreground">Paguar</p>
                  <p className="text-xl font-bold text-green-700">{formatCurrency(totalPaid)}</p>
                </div>
                <div className="rounded-lg border bg-red-50 p-4">
                  <p className="text-sm text-muted-foreground">Borxhi</p>
                  <p className={`text-xl font-bold ${getDebtColor(debt)}`}>
                    {formatCurrency(debt)}
                  </p>
                </div>
              </div>

              {paymentsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : payments && payments.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Shuma</TableHead>
                        <TableHead>Metoda</TableHead>
                        <TableHead>Pranuar nga</TableHead>
                        <TableHead>Verejtje</TableHead>
                        <TableHead className="w-[100px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>{formatDate(payment.paymentDate)}</TableCell>
                          <TableCell className="font-medium">{formatCurrency(payment.amount)}</TableCell>
                          <TableCell>{payment.paymentMethod ?? '-'}</TableCell>
                          <TableCell>
                            {payment.receivedBy ? payment.receivedBy.fullName : '-'}
                          </TableCell>
                          <TableCell className="text-muted-foreground">{payment.remarks ?? '-'}</TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={async () => {
                                try {
                                  const token = localStorage.getItem('accessToken');
                                  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002/api/v1';
                                  const response = await fetch(
                                    `${baseUrl}/print/invoice/${candidateId}/payment/${payment.id}`,
                                    { headers: { Authorization: `Bearer ${token}` } }
                                  );
                                  if (!response.ok) throw new Error(`HTTP ${response.status}`);
                                  const blob = await response.blob();
                                  const url = URL.createObjectURL(blob);
                                  window.open(url, '_blank');
                                } catch (err) {
                                  console.error('PDF error:', err);
                                  toast({
                                    title: 'Gabim',
                                    description: 'Fatura nuk mund te gjenerohet.',
                                    variant: 'destructive',
                                  });
                                }
                              }}
                            >
                              <Printer className="mr-1 h-4 w-4" />
                              Faturë
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Nuk ka pagesa te regjistruara
                </p>
              )}
            </CardContent>
          </Card>

          {/* Add Payment Dialog */}
          <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Shto Pagese</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={paymentForm.handleSubmit((data) => addPayment.mutate(data))}
                className="space-y-4"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="pay-amount">Shuma</Label>
                    <Input
                      id="pay-amount"
                      type="number"
                      step="0.01"
                      {...paymentForm.register('amount', { valueAsNumber: true })}
                    />
                    {paymentForm.formState.errors.amount && (
                      <p className="text-xs text-red-500">{paymentForm.formState.errors.amount.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pay-date">Data</Label>
                    <Input id="pay-date" type="date" {...paymentForm.register('paymentDate')} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Metoda e pageses</Label>
                  <Select
                    value={paymentForm.watch('paymentMethod') || 'cash'}
                    onValueChange={(val) => paymentForm.setValue('paymentMethod', val)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Para ne dore</SelectItem>
                      <SelectItem value="bank_transfer">Transfer bankar</SelectItem>
                      <SelectItem value="card">Kartele</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pay-remarks">Verejtje</Label>
                  <Input id="pay-remarks" {...paymentForm.register('remarks')} />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setPaymentDialogOpen(false)}>
                    Anulo
                  </Button>
                  <Button type="submit" disabled={addPayment.isPending}>
                    {addPayment.isPending ? 'Duke ruajtur...' : 'Paguaj'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Tab 5: Documents */}
        <TabsContent value="documents" className="space-y-4">
          {/* Vërtetimi Section */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-blue-600" />
                Vërtetimi
              </CardTitle>
              <Button size="sm" onClick={openAddVerification}>
                <Plus className="mr-1.5 h-4 w-4" />
                Shto Vërtetim
              </Button>
            </CardHeader>
            <CardContent>
              {verificationsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : verifications && verifications.length > 0 ? (
                <div className="space-y-3">
                  {verifications.map((v) => (
                    <div
                      key={v.id}
                      className="rounded-lg border p-4 hover:border-blue-200 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-semibold text-gray-900">
                              Kategoria: {v.category?.code ?? '-'}
                            </span>
                            {v.verificationDate && (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <CalendarIcon className="h-3 w-3" />
                                {formatDate(v.verificationDate)}
                              </span>
                            )}
                            {v.sequenceNumber && (
                              <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                                Nr: {v.sequenceNumber}
                              </span>
                            )}
                          </div>
                          <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2 text-sm text-gray-600">
                            <div>
                              <span className="text-xs font-medium text-gray-400 uppercase">Periudha Teorike</span>
                              <p>
                                {v.theoryHoursStart && v.theoryHoursEnd
                                  ? `${formatDate(v.theoryHoursStart)} — ${formatDate(v.theoryHoursEnd)}`
                                  : '—'}
                              </p>
                            </div>
                            <div>
                              <span className="text-xs font-medium text-gray-400 uppercase">Periudha Praktike</span>
                              <p>
                                {v.practicalHoursStart && v.practicalHoursEnd
                                  ? `${formatDate(v.practicalHoursStart)} — ${formatDate(v.practicalHoursEnd)}`
                                  : '—'}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 ml-4">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEditVerification(v)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-700"
                            onClick={() => {
                              setDeletingVerificationId(v.id);
                              setDeleteVerificationOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed bg-gray-50 p-6 text-center">
                  <ShieldCheck className="mx-auto h-8 w-8 text-gray-300" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    Nuk ka vërtetim të regjistruar
                  </p>
                  <Button size="sm" variant="outline" className="mt-3" onClick={openAddVerification}>
                    <Plus className="mr-1.5 h-4 w-4" />
                    Shto Vërtetim
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Printo Dokumentet */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Printer className="h-5 w-5 text-gray-500" />
                Printo Dokumentet
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  { label: 'Fatura', type: 'invoice' },
                  { label: 'Kontrata', type: 'contract' },
                  { label: 'Fletëparaqitja', type: 'registration-form' },
                  { label: 'Libreza', type: 'logbook' },
                  { label: 'Vërtetimi', type: 'certificate' },
                  { label: 'Testi', type: 'test-result' },
                ].map((doc) => (
                  <Button
                    key={doc.type}
                    variant="outline"
                    className="justify-start"
                    onClick={async () => {
                      try {
                        const token = localStorage.getItem('accessToken');
                        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002/api/v1';
                        const response = await fetch(`${baseUrl}/print/${doc.type}/${candidateId}`, {
                          headers: { Authorization: `Bearer ${token}` },
                        });
                        if (!response.ok) {
                          throw new Error(`HTTP ${response.status}`);
                        }
                        const blob = await response.blob();
                        const url = URL.createObjectURL(blob);
                        window.open(url, '_blank');
                      } catch (err) {
                        console.error('PDF error:', err);
                        alert('Dokumenti nuk është i gatshëm ende.');
                      }
                    }}
                  >
                    <Printer className="mr-2 h-4 w-4" />
                    {doc.label}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Dokumentet e Kandidatit */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-gray-500" />
                Dokumentet e Kandidatit
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <StatusBadge status={candidate.medicalCertificate ? 'completed' : 'pending'} />
                  <span className="text-sm">Certifikata mjekesore</span>
                  {candidate.medicalCertificateNumber && (
                    <span className="text-xs text-muted-foreground">
                      Nr: {candidate.medicalCertificateNumber}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={candidate.redCrossCertificate ? 'completed' : 'pending'} />
                  <span className="text-sm">Certifikata e Kryqit te Kuq</span>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={candidate.idCardCopy ? 'completed' : 'pending'} />
                  <span className="text-sm">Kopja e leternjoftimit</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Add/Edit Verification Dialog */}
          <Dialog open={verificationDialogOpen} onOpenChange={setVerificationDialogOpen}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {editingVerification ? 'Edito Vërtetimin' : 'Shto Vërtetim'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleVerificationSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Kategoria</Label>
                    <Select
                      value={verificationForm.categoryId || ''}
                      onValueChange={(val) => setVerificationForm({ ...verificationForm, categoryId: val })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Zgjidhni" />
                      </SelectTrigger>
                      <SelectContent>
                        {(categories ?? []).map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.code} {cat.description ? `- ${cat.description}` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Data e Vërtetimit</Label>
                    <Input
                      type="date"
                      value={verificationForm.verificationDate}
                      onChange={(e) => setVerificationForm({ ...verificationForm, verificationDate: e.target.value })}
                    />
                  </div>
                </div>

                <div className="rounded-lg border bg-blue-50/50 p-3 space-y-3">
                  <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Periudhat e Orëve</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Fillimi Orëve Teorike</Label>
                      <Input
                        type="date"
                        value={verificationForm.theoryHoursStart}
                        onChange={(e) => setVerificationForm({ ...verificationForm, theoryHoursStart: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Mbarimi Orëve Teorike</Label>
                      <Input
                        type="date"
                        value={verificationForm.theoryHoursEnd}
                        onChange={(e) => setVerificationForm({ ...verificationForm, theoryHoursEnd: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Fillimi Orëve Praktike</Label>
                      <Input
                        type="date"
                        value={verificationForm.practicalHoursStart}
                        onChange={(e) => setVerificationForm({ ...verificationForm, practicalHoursStart: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Mbarimi Orëve Praktike</Label>
                      <Input
                        type="date"
                        value={verificationForm.practicalHoursEnd}
                        onChange={(e) => setVerificationForm({ ...verificationForm, practicalHoursEnd: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Nr. Sekuencës</Label>
                    <Input
                      value={verificationForm.sequenceNumber}
                      onChange={(e) => setVerificationForm({ ...verificationForm, sequenceNumber: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Ligjeruesi</Label>
                    <Select
                      value={verificationForm.lecturerId || ''}
                      onValueChange={(val) => setVerificationForm({ ...verificationForm, lecturerId: val })}
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
                      value={verificationForm.instructorId || ''}
                      onValueChange={(val) => setVerificationForm({ ...verificationForm, instructorId: val })}
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
                      checked={verificationForm.redCrossCert}
                      onCheckedChange={(checked) =>
                        setVerificationForm({ ...verificationForm, redCrossCert: checked === true })
                      }
                    />
                    <Label htmlFor="v-redcross">Certifikata e Kryqit të Kuq</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="v-idcard"
                      checked={verificationForm.idCardCopy}
                      onCheckedChange={(checked) =>
                        setVerificationForm({ ...verificationForm, idCardCopy: checked === true })
                      }
                    />
                    <Label htmlFor="v-idcard">Kopja e letërnjoftimit</Label>
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setVerificationDialogOpen(false)}>
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

          {/* Delete Verification Confirmation */}
          <ConfirmDialog
            open={deleteVerificationOpen}
            onOpenChange={setDeleteVerificationOpen}
            title="Fshi Vërtetimin"
            description="A jeni të sigurt që doni të fshini këtë vërtetim? Ky veprim nuk mund të kthehet."
            confirmText="Fshi"
            variant="destructive"
            onConfirm={() => {
              if (deletingVerificationId) {
                deleteVerificationMutation.mutate(deletingVerificationId);
              }
            }}
          />
        </TabsContent>

        {/* Tab 6: Exams */}
        <TabsContent value="exams" className="space-y-4">
          {/* Eligibility Status Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5 text-blue-600" />
                Kushtet per Provim
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Theory eligibility */}
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  {examEligibility?.theoryEligible ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  <div>
                    <p className="font-medium">Provimi Teorik</p>
                    <p className="text-sm text-muted-foreground">
                      {examEligibility?.theoryHoursRealized ?? 0}/{examEligibility?.theoryHoursNeeded ?? 0} ore teorike te realizuara
                    </p>
                  </div>
                </div>
                <span className={`text-sm font-medium ${examEligibility?.theoryEligible ? 'text-green-600' : 'text-red-500'}`}>
                  {examEligibility?.theoryEligible
                    ? 'I ploteson kushtet'
                    : examEligibility?.theoryReason || 'Nuk i ploteson kushtet'}
                </span>
              </div>
              {/* Practical eligibility */}
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  {examEligibility?.practicalEligible ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  <div>
                    <p className="font-medium">Provimi Praktik</p>
                    <p className="text-sm text-muted-foreground">
                      {examEligibility?.practicalHoursRealized ?? 0}/{examEligibility?.practicalHoursNeeded ?? 0} ore praktike te realizuara
                      {examEligibility?.theoryExamPassed === false && ' | Provimi teorik: nuk ka kaluar'}
                      {examEligibility?.theoryExamPassed === true && ' | Provimi teorik: kaluar'}
                    </p>
                  </div>
                </div>
                <span className={`text-sm font-medium ${examEligibility?.practicalEligible ? 'text-green-600' : 'text-red-500'}`}>
                  {examEligibility?.practicalEligible
                    ? 'I ploteson kushtet'
                    : examEligibility?.practicalReason || 'Nuk i ploteson kushtet'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Exam History Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Historiku i Provimeve</CardTitle>
              <Button size="sm" onClick={openAddExam}>
                <Plus className="mr-2 h-4 w-4" />
                Planifiko Provim
              </Button>
            </CardHeader>
            <CardContent>
              {examsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : exams && exams.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Lloji</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Tentativa</TableHead>
                      <TableHead>Piket</TableHead>
                      <TableHead>Rezultati</TableHead>
                      <TableHead className="text-right">Veprimet</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {exams.map((exam) => (
                      <TableRow key={exam.id}>
                        <TableCell>{getExamTypeBadge(exam.examType)}</TableCell>
                        <TableCell>{formatDate(exam.examDate)}</TableCell>
                        <TableCell>{exam.attemptNumber}</TableCell>
                        <TableCell>{exam.score != null ? exam.score : '-'}</TableCell>
                        <TableCell>{getExamResultBadge(exam.result)}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {exam.result === 'scheduled' && (
                                <DropdownMenuItem onClick={() => openEditExam(exam)}>
                                  <ClipboardCheck className="mr-2 h-4 w-4" />
                                  Regjistro Rezultatin
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => openEditExam(exam)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Edito
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => {
                                  setDeletingExamId(exam.id);
                                  setDeleteExamOpen(true);
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Fshi
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Nuk ka provime te regjistruara per kete kandidat
                </p>
              )}
            </CardContent>
          </Card>

          {/* Exam Create/Edit Dialog */}
          <Dialog open={examDialogOpen} onOpenChange={setExamDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingExam ? 'Edito Provimin' : 'Planifiko Provim'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleExamSubmit} className="space-y-4">
                {editingExam && (
                  <div className="rounded-md bg-muted p-3 text-sm">
                    <p className="font-medium">{candidate.firstName} {candidate.lastName}</p>
                    <p className="text-muted-foreground">
                      {editingExam.examType === 'theory' ? 'Provimi Teorik' : 'Provimi Praktik'}
                    </p>
                  </div>
                )}
                {!editingExam && (
                  <div className="space-y-2">
                    <Label>Lloji i Provimit</Label>
                    <Select
                      value={examForm.watch('examType')}
                      onValueChange={(val: 'theory' | 'practical') => examForm.setValue('examType', val)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Zgjedh llojin" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem
                          value="theory"
                          disabled={examEligibility ? !examEligibility.theoryEligible : false}
                        >
                          Provimi Teorik {examEligibility && !examEligibility.theoryEligible ? '(nuk i ploteson kushtet)' : ''}
                        </SelectItem>
                        <SelectItem
                          value="practical"
                          disabled={examEligibility ? !examEligibility.practicalEligible : false}
                        >
                          Provimi Praktik {examEligibility && !examEligibility.practicalEligible ? '(nuk i ploteson kushtet)' : ''}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {examForm.formState.errors.examType && (
                      <p className="text-xs text-red-500">{examForm.formState.errors.examType.message}</p>
                    )}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="examDate">Data e Provimit</Label>
                  <Input id="examDate" type="date" {...examForm.register('examDate')} />
                  {examForm.formState.errors.examDate && (
                    <p className="text-xs text-red-500">{examForm.formState.errors.examDate.message}</p>
                  )}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="examinerName">Ekzaminuesi</Label>
                    <Input id="examinerName" {...examForm.register('examinerName')} placeholder="Emri i ekzaminuesit" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="examLocation">Vendi</Label>
                    <Input id="examLocation" {...examForm.register('examLocation')} placeholder="Vendi i provimit" />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="examScore">Piket</Label>
                    <Input
                      id="examScore"
                      type="number"
                      value={examForm.watch('score') ?? ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        examForm.setValue('score', val === '' ? null : Number(val));
                      }}
                      placeholder="Piket e marra"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Rezultati</Label>
                    <Select
                      value={examForm.watch('result')}
                      onValueChange={(val: 'scheduled' | 'passed' | 'failed' | 'cancelled') => examForm.setValue('result', val)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="scheduled">E planifikuar</SelectItem>
                        <SelectItem value="passed">Kaluar</SelectItem>
                        <SelectItem value="failed">Deshtuar</SelectItem>
                        <SelectItem value="cancelled">Anuluar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="examNotes">Shenime</Label>
                  <Input id="examNotes" {...examForm.register('notes')} placeholder="Shenime shtese" />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setExamDialogOpen(false)}>
                    Anulo
                  </Button>
                  <Button type="submit" disabled={createExam.isPending || updateExam.isPending}>
                    {(createExam.isPending || updateExam.isPending) ? 'Duke ruajtur...' : editingExam ? 'Ruaj' : 'Planifiko'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Exam Delete Confirm Dialog */}
          <ConfirmDialog
            open={deleteExamOpen}
            onOpenChange={setDeleteExamOpen}
            title="Fshi Provimin"
            description="A jeni te sigurt qe doni te fshini kete provim? Ky veprim nuk mund te kthehet."
            confirmText="Fshi"
            cancelText="Anulo"
            variant="destructive"
            onConfirm={() => {
              if (deletingExamId) {
                deleteExamMutation.mutate(deletingExamId);
              }
            }}
          />
        </TabsContent>

        {/* Tab 7: Supplementary Registrations */}
        <TabsContent value="supplementary">
          <Card>
            <CardHeader>
              <CardTitle>Regjistrime te Tjera</CardTitle>
            </CardHeader>
            <CardContent>
              {candidate?.supplementaryRegistrations && candidate.supplementaryRegistrations.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kategoria</TableHead>
                      <TableHead>Data e Regjistrimit</TableHead>
                      <TableHead>Nr. Regjistrit</TableHead>
                      <TableHead>Cmimi</TableHead>
                      <TableHead>Statusi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {candidate.supplementaryRegistrations.map((sr: SupplementaryRegistration) => (
                      <TableRow key={String(sr.id)}>
                        <TableCell className="font-medium">{sr.categoryCode ?? '-'}</TableCell>
                        <TableCell>{sr.registrationDate ? formatDate(sr.registrationDate) : '-'}</TableCell>
                        <TableCell>{'-'}</TableCell>
                        <TableCell>{sr.price != null ? formatCurrency(sr.price) : '-'}</TableCell>
                        <TableCell>
                          <Badge variant={sr.isAutomatic ? 'secondary' : 'default'}>
                            {sr.isAutomatic ? 'Automatik' : 'Manual'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Nuk ka regjistrime te tjera
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 8: History */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Historiku</CardTitle>
            </CardHeader>
            <CardContent>
              {auditLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : auditLogs && auditLogs.length > 0 ? (
                <div className="space-y-0">
                  {auditLogs.map((log, idx) => (
                    <div
                      key={log.id}
                      className="relative flex gap-4 pb-6"
                    >
                      {/* Timeline line */}
                      {idx < auditLogs.length - 1 && (
                        <div className="absolute left-[11px] top-6 h-full w-px bg-gray-200" />
                      )}
                      {/* Dot */}
                      <div className="relative z-10 mt-1.5 h-[10px] w-[10px] shrink-0 rounded-full border-2 border-blue-500 bg-white" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {log.user?.fullName ?? 'Sistem'}
                          </span>
                          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                            {log.action}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {formatDate(log.createdAt)}
                        </p>
                        {log.newValues && Object.keys(log.newValues).length > 0 && (
                          <div className="mt-1 rounded bg-gray-50 p-2 text-xs text-gray-600">
                            {Object.entries(log.newValues).map(([key, val]) => (
                              <div key={key}>
                                <span className="font-medium">{key}</span>: {String(val)}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Nuk ka ndryshime te regjistruara
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
