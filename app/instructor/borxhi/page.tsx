'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { InstructorDebtSummary } from '@/lib/types';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Wallet, TrendingDown, CheckCircle2, CreditCard } from 'lucide-react';

interface DebtResponse {
  data: InstructorDebtSummary;
}

export default function InstructorDebtPage() {
  const { data, isLoading } = useQuery<DebtResponse>({
    queryKey: ['instructor-debt'],
    queryFn: () => api.get('/instructor/debt'),
  });

  const debt = data?.data;
  const totalOwed = debt?.totalAmountOwed ?? 0;
  const totalPaid = debt?.totalAmountPaid ?? 0;
  const balance = debt?.outstandingBalance ?? totalOwed - totalPaid;
  const payments = debt?.payments ?? [];
  const candidatePayments = payments;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-lg" />
        <Skeleton className="h-48 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Borxhi Im"
        description="Permbledhje e borxhit dhe pagesave tuaja"
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-lg flex items-center justify-center bg-red-50">
                <Wallet className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Borxhi Total</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(totalOwed)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-lg flex items-center justify-center bg-green-50">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total i Paguar</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(totalPaid)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'h-11 w-11 rounded-lg flex items-center justify-center',
                  balance > 0 ? 'bg-amber-50' : 'bg-green-50'
                )}
              >
                <TrendingDown
                  className={cn(
                    'h-5 w-5',
                    balance > 0 ? 'text-amber-600' : 'text-green-600'
                  )}
                />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Bilanci</p>
                <p
                  className={cn(
                    'text-2xl font-bold',
                    balance > 0 ? 'text-amber-600' : 'text-green-600'
                  )}
                >
                  {formatCurrency(balance)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Per-candidate breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Detajet sipas Kandidateve
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kandidati</TableHead>
                  <TableHead>Shuma</TableHead>
                  <TableHead>E Paguar</TableHead>
                  <TableHead>Statusi</TableHead>
                  <TableHead>Data e Pageses</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {candidatePayments.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-24 text-center text-muted-foreground"
                    >
                      Nuk ka te dhena per momentin.
                    </TableCell>
                  </TableRow>
                ) : (
                  candidatePayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">
                        {payment.candidate
                          ? `${payment.candidate.firstName} ${payment.candidate.lastName}`
                          : '-'}
                      </TableCell>
                      <TableCell>{formatCurrency(payment.amount)}</TableCell>
                      <TableCell>
                        {formatCurrency(payment.amountPaid)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={payment.status} />
                      </TableCell>
                      <TableCell>
                        {payment.paymentDate
                          ? formatDate(payment.paymentDate)
                          : '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-gray-400" />
            Historiku i Pagesave
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Shuma</TableHead>
                  <TableHead>Metoda</TableHead>
                  <TableHead>Kandidati</TableHead>
                  <TableHead>Shenimet</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {candidatePayments.filter((p) => p.amountPaid > 0).length ===
                0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-24 text-center text-muted-foreground"
                    >
                      Nuk ka pagesa te regjistruara.
                    </TableCell>
                  </TableRow>
                ) : (
                  candidatePayments
                    .filter((p) => p.amountPaid > 0)
                    .map((payment) => (
                      <TableRow key={`history-${payment.id}`}>
                        <TableCell>
                          {payment.paymentDate
                            ? formatDate(payment.paymentDate)
                            : '-'}
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(payment.amountPaid)}
                        </TableCell>
                        <TableCell>
                          {payment.paymentMethod || 'Cash'}
                        </TableCell>
                        <TableCell>
                          {payment.candidate
                            ? `${payment.candidate.firstName} ${payment.candidate.lastName}`
                            : '-'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {payment.remarks || '-'}
                        </TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
