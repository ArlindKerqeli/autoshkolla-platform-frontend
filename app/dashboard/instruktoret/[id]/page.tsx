'use client';

import { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  CreditCard,
  Users,
  Clock,
  FileText,
} from 'lucide-react';

import api from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

// --- Types ---

interface Instructor {
  id: string;
  code: string;
  firstName: string;
  lastName: string;
  personalNumber: string;
  email: string | null;
  phone: string | null;
  position: 'instructor' | 'lecturer' | 'both';
  licenseInfo: string | null;
  costPerCandidate: number;
  isActive: boolean;
  createdAt: string;
}

interface AssignedCandidate {
  id: string;
  code: string;
  firstName: string;
  lastName: string;
  categoryCode: string;
  status: string;
  theoryHoursCompleted: number;
  practicalHoursCompleted: number;
  totalTheoryHours: number;
  totalPracticalHours: number;
  registrationDate: string;
}

interface DebtSummary {
  totalOwed: number;
  totalPaid: number;
  balance: number;
  candidateCount: number;
  costPerCandidate: number;
}

interface InstructorPayment {
  id: string;
  candidateId: string;
  candidateName: string;
  amount: number;
  method: string;
  remarks: string | null;
  paidAt: string;
  createdAt: string;
}

// --- Position Labels ---

const POSITION_LABELS: Record<string, string> = {
  instructor: 'Instruktor',
  lecturer: 'Ligjerues',
  both: 'Te dyja',
};

// --- Payment Form Schema ---

const paymentSchema = z.object({
  candidateId: z.string().min(1, 'Zgjidh kandidatin'),
  amount: z.coerce.number().min(0.01, 'Shuma duhet te jete me e madhe se 0'),
  method: z.enum(['cash', 'bank_transfer', 'card']),
  remarks: z.string().optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Para ne dore',
  bank_transfer: 'Transfer bankar',
  card: 'Kartele',
};

// --- Page Component ---

export default function InstructorDetailPage() {
  const params = useParams<{ id: string }>();
  const instructorId = params?.id as string;
  const queryClient = useQueryClient();

  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  // --- Data Fetching ---

  const { data: instructor, isLoading: instructorLoading } = useQuery<Instructor>({
    queryKey: ['instructor', instructorId],
    queryFn: async () => {
      const res = await api.get(`/instructors/${instructorId}`);
      return (res as unknown as { data: Instructor }).data;
    },
  });

  const { data: candidatesData, isLoading: candidatesLoading } = useQuery<AssignedCandidate[]>({
    queryKey: ['instructor-candidates', instructorId],
    queryFn: async () => {
      const res = await api.get(`/instructors/${instructorId}/candidates`);
      return (res as unknown as { data: AssignedCandidate[] }).data;
    },
  });

  const { data: debtSummary, isLoading: debtLoading } = useQuery<DebtSummary>({
    queryKey: ['instructor-debt', instructorId],
    queryFn: async () => {
      const res = await api.get(`/instructors/${instructorId}/debt-summary`);
      return (res as unknown as { data: DebtSummary }).data;
    },
  });

  const { data: payments, isLoading: paymentsLoading } = useQuery<InstructorPayment[]>({
    queryKey: ['instructor-payments', instructorId],
    queryFn: async () => {
      const res = await api.get(`/instructors/${instructorId}/payments`);
      return (res as unknown as { data: InstructorPayment[] }).data;
    },
  });

  const candidates = candidatesData ?? [];
  const paymentsList = payments ?? [];

  // --- Payment Form ---

  const paymentForm = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      candidateId: '',
      amount: 0,
      method: 'cash',
      remarks: '',
    },
  });

  const paymentMutation = useMutation({
    mutationFn: (data: PaymentFormData) =>
      api.post(`/instructors/${instructorId}/payments`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instructor-payments', instructorId] });
      queryClient.invalidateQueries({ queryKey: ['instructor-debt', instructorId] });
      queryClient.invalidateQueries({ queryKey: ['instructors'] });
      setPaymentDialogOpen(false);
      paymentForm.reset();
    },
  });

  function handlePaymentSubmit(data: PaymentFormData) {
    paymentMutation.mutate(data);
  }

  // --- Candidate Columns ---

  const candidateColumns: ColumnDef<AssignedCandidate>[] = useMemo(
    () => [
      {
        accessorKey: 'code',
        header: 'Kodi',
        cell: ({ row }) => (
          <span className="font-mono text-sm">{row.original.code}</span>
        ),
      },
      {
        id: 'emri',
        header: 'Emri',
        cell: ({ row }) => (
          <span className="font-medium">
            {row.original.firstName} {row.original.lastName}
          </span>
        ),
      },
      {
        accessorKey: 'categoryCode',
        header: 'Kategoria',
        cell: ({ row }) => (
          <Badge variant="outline">{row.original.categoryCode}</Badge>
        ),
      },
      {
        id: 'teorike',
        header: 'Ore Teorike',
        cell: ({ row }) => (
          <span>
            {row.original.theoryHoursCompleted}/{row.original.totalTheoryHours}
          </span>
        ),
      },
      {
        id: 'praktike',
        header: 'Ore Praktike',
        cell: ({ row }) => (
          <span>
            {row.original.practicalHoursCompleted}/{row.original.totalPracticalHours}
          </span>
        ),
      },
      {
        accessorKey: 'registrationDate',
        header: 'Data e Regjistrimit',
        cell: ({ row }) => formatDate(row.original.registrationDate),
      },
      {
        accessorKey: 'status',
        header: 'Statusi',
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
    ],
    []
  );

  // --- Payment Columns ---

  const paymentColumns: ColumnDef<InstructorPayment>[] = useMemo(
    () => [
      {
        accessorKey: 'paidAt',
        header: 'Data',
        cell: ({ row }) => formatDate(row.original.paidAt),
      },
      {
        accessorKey: 'candidateName',
        header: 'Kandidati',
        cell: ({ row }) => row.original.candidateName,
      },
      {
        accessorKey: 'amount',
        header: 'Shuma',
        cell: ({ row }) => (
          <span className="font-medium text-green-600">
            {formatCurrency(row.original.amount)}
          </span>
        ),
      },
      {
        accessorKey: 'method',
        header: 'Metoda',
        cell: ({ row }) =>
          PAYMENT_METHOD_LABELS[row.original.method] ?? row.original.method,
      },
      {
        accessorKey: 'remarks',
        header: 'Shenime',
        cell: ({ row }) => row.original.remarks || '-',
      },
    ],
    []
  );

  // --- Loading State ---

  if (instructorLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  if (!instructor) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Instruktori nuk u gjet.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/instruktoret">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">
              {instructor.firstName} {instructor.lastName}
            </h1>
            <Badge variant="outline" className="font-mono">
              {instructor.code}
            </Badge>
            <Badge variant={instructor.position === 'instructor' ? 'info' : instructor.position === 'lecturer' ? 'warning' : 'default'}>
              {POSITION_LABELS[instructor.position]}
            </Badge>
            <StatusBadge status={instructor.isActive ? 'active' : 'inactive'} />
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Regjistruar me {formatDate(instructor.createdAt)}
          </p>
        </div>
      </div>

      {/* Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Informata Personale
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Numri Personal</p>
              <p className="font-medium">{instructor.personalNumber}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" /> Telefoni
              </p>
              <p className="font-medium">{instructor.phone || '-'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Mail className="h-3.5 w-3.5" /> Email
              </p>
              <p className="font-medium">{instructor.email || '-'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <FileText className="h-3.5 w-3.5" /> Licenca
              </p>
              <p className="font-medium">{instructor.licenseInfo || '-'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="kandidatet">
        <TabsList>
          <TabsTrigger value="kandidatet" className="flex items-center gap-1.5">
            <Users className="h-4 w-4" />
            Kandidatet e Caktuar
          </TabsTrigger>
          <TabsTrigger value="borxhi" className="flex items-center gap-1.5">
            <CreditCard className="h-4 w-4" />
            Borxhi
          </TabsTrigger>
        </TabsList>

        {/* Assigned Candidates Tab */}
        <TabsContent value="kandidatet" className="space-y-4">
          <DataTable
            columns={candidateColumns}
            data={candidates}
            isLoading={candidatesLoading}
            searchPlaceholder="Kerko kandidat..."
          />
        </TabsContent>

        {/* Debt Tab */}
        <TabsContent value="borxhi" className="space-y-6">
          {/* Debt Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground">Totali i Borxhit</div>
                <div className="text-2xl font-bold text-red-600">
                  {debtLoading ? (
                    <Skeleton className="h-8 w-24" />
                  ) : (
                    formatCurrency(debtSummary?.totalOwed ?? 0)
                  )}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground">Totali i Paguar</div>
                <div className="text-2xl font-bold text-green-600">
                  {debtLoading ? (
                    <Skeleton className="h-8 w-24" />
                  ) : (
                    formatCurrency(debtSummary?.totalPaid ?? 0)
                  )}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground">Bilanci</div>
                <div className="text-2xl font-bold">
                  {debtLoading ? (
                    <Skeleton className="h-8 w-24" />
                  ) : (
                    <span
                      className={
                        (debtSummary?.balance ?? 0) > 0
                          ? 'text-red-600'
                          : 'text-green-600'
                      }
                    >
                      {formatCurrency(debtSummary?.balance ?? 0)}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground">Kandidate</div>
                <div className="text-2xl font-bold">
                  {debtLoading ? (
                    <Skeleton className="h-8 w-24" />
                  ) : (
                    debtSummary?.candidateCount ?? 0
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  x {formatCurrency(debtSummary?.costPerCandidate ?? 65)} per kandidat
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Record Payment Button */}
          <div className="flex justify-end">
            <Button onClick={() => setPaymentDialogOpen(true)}>
              <CreditCard className="mr-2 h-4 w-4" />
              Regjistro Pagese
            </Button>
          </div>

          {/* Payments Table */}
          <DataTable
            columns={paymentColumns}
            data={paymentsList}
            isLoading={paymentsLoading}
          />
        </TabsContent>
      </Tabs>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Regjistro Pagese</DialogTitle>
            <DialogDescription>
              Regjistro nje pagese per instruktorin {instructor.firstName}{' '}
              {instructor.lastName}.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={paymentForm.handleSubmit(handlePaymentSubmit)}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="candidateId">Kandidati *</Label>
              <Controller
                control={paymentForm.control}
                name="candidateId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Zgjidh kandidatin" />
                    </SelectTrigger>
                    <SelectContent>
                      {candidates.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.firstName} {c.lastName} ({c.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {paymentForm.formState.errors.candidateId && (
                <p className="text-sm text-destructive">
                  {paymentForm.formState.errors.candidateId.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Shuma (EUR) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                {...paymentForm.register('amount')}
              />
              {paymentForm.formState.errors.amount && (
                <p className="text-sm text-destructive">
                  {paymentForm.formState.errors.amount.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="method">Metoda e Pageses *</Label>
              <Controller
                control={paymentForm.control}
                name="method"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Zgjidh metoden" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Para ne dore</SelectItem>
                      <SelectItem value="bank_transfer">Transfer bankar</SelectItem>
                      <SelectItem value="card">Kartele</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="remarks">Shenime</Label>
              <Textarea
                id="remarks"
                placeholder="Shenime shtese (opsionale)"
                {...paymentForm.register('remarks')}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setPaymentDialogOpen(false)}
              >
                Anulo
              </Button>
              <Button type="submit" disabled={paymentMutation.isPending}>
                {paymentMutation.isPending ? 'Duke ruajtur...' : 'Regjistro Pagesen'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
