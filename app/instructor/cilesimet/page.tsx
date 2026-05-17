'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Lock,
  User,
  Phone,
  Mail,
  Hash,
  Shield,
  CreditCard,
  CalendarDays,
  AlertTriangle,
} from 'lucide-react';
import api from '@/lib/api';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import type { Instructor } from '@/lib/types/models';

const POSITION_LABELS: Record<string, string> = {
  instructor: 'Instruktor',
  lecturer: 'Ligjerues',
  both: 'Instruktor & Ligjerues',
};

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
  } catch {
    return dateStr;
  }
}

function isExpiringWithin30Days(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  const expiry = new Date(dateStr);
  const now = new Date();
  const diffMs = expiry.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= 30;
}

function isExpired(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

export default function InstructorCilesimetPage() {
  const { toast } = useToast();

  // Fetch instructor profile
  const { data: instructor, isLoading } = useQuery<Instructor>({
    queryKey: ['instructor-me'],
    queryFn: async () => {
      const res = await api.get('/instructor/me');
      return res.data;
    },
  });

  // Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const changePassword = useMutation({
    mutationFn: () =>
      api.put('/instructor/password', {
        currentPassword,
        newPassword,
      }),
    onSuccess: () => {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast({ title: 'Fjalekalimi u ndryshua me sukses' });
    },
    onError: (err: { message: string }) => {
      toast({
        title: 'Gabim',
        description: err.message,
        variant: 'destructive',
      });
    },
  });

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword.trim()) {
      toast({
        title: 'Gabim',
        description: 'Shkruani fjalekalimin aktual',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: 'Gabim',
        description: 'Fjalekalimi i ri duhet te kete se paku 6 karaktere',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: 'Gabim',
        description: 'Fjalekalimi i ri nuk perputhet me konfirmimin',
        variant: 'destructive',
      });
      return;
    }

    changePassword.mutate();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Cilesimet" description="Profili dhe fjalekalimi" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-5 bg-slate-100 rounded w-3/4" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Cilesimet" description="Profili juaj dhe ndryshimi i fjalekalimit" />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Section 1: Personal Information (read-only) */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle className="text-base">Informata Personale</CardTitle>
                <CardDescription>Detajet e profilit tuaj</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Full name */}
              <div className="flex items-start gap-3">
                <User className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Emri i plote</p>
                  <p className="text-sm font-medium">
                    {instructor?.firstName} {instructor?.lastName}
                  </p>
                </div>
              </div>

              {/* Code */}
              <div className="flex items-start gap-3">
                <Hash className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Kodi</p>
                  <p className="text-sm font-medium">{instructor?.code || '-'}</p>
                </div>
              </div>

              {/* Email */}
              <div className="flex items-start gap-3">
                <Mail className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm font-medium">{instructor?.email || '-'}</p>
                </div>
              </div>

              {/* Phone */}
              <div className="flex items-start gap-3">
                <Phone className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Telefoni</p>
                  <p className="text-sm font-medium">{instructor?.phone || '-'}</p>
                </div>
              </div>

              {/* Position */}
              <div className="flex items-start gap-3">
                <Shield className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Pozita</p>
                  <Badge variant="outline" className="mt-0.5">
                    {POSITION_LABELS[instructor?.position ?? ''] ?? instructor?.position}
                  </Badge>
                </div>
              </div>

              {/* License info */}
              <div className="flex items-start gap-3">
                <Shield className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Numri i licenses</p>
                  <p className="text-sm font-medium">{instructor?.licenseInfo || '-'}</p>
                </div>
              </div>

              {/* License expiry */}
              <div className="flex items-start gap-3">
                <CalendarDays className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Data e skadimit te licenses</p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">
                      {formatDate(instructor?.licenseExpiry)}
                    </p>
                    {isExpired(instructor?.licenseExpiry) && (
                      <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Skaduar
                      </Badge>
                    )}
                    {!isExpired(instructor?.licenseExpiry) &&
                      isExpiringWithin30Days(instructor?.licenseExpiry) && (
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0 border-amber-300 text-amber-600 bg-amber-50"
                        >
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Skadon se shpejti
                        </Badge>
                      )}
                  </div>
                </div>
              </div>

              {/* Cost per candidate */}
              <div className="flex items-start gap-3">
                <CreditCard className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Cmimi per kandidat</p>
                  <p className="text-sm font-medium">
                    {instructor?.costPerCandidate != null
                      ? `${Number(instructor.costPerCandidate).toFixed(2)} \u20AC`
                      : '-'}
                  </p>
                </div>
              </div>

              {/* Registration date */}
              <div className="flex items-start gap-3">
                <CalendarDays className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Data e regjistrimit</p>
                  <p className="text-sm font-medium">{formatDate(instructor?.createdAt)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Change Password */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle className="text-base">Ndrysho Fjalekalimin</CardTitle>
                <CardDescription>Perditesoni fjalekalimin e llogarise suaj</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="current-password">Fjalekalimi aktual</Label>
                <Input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Shkruani fjalekalimin aktual"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-password">Fjalekalimi i ri</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Se paku 6 karaktere"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm-password">Konfirmo fjalekalimin e ri</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Konfirmo fjalekalimin e ri"
                  required
                />
              </div>
              <Button type="submit" disabled={changePassword.isPending}>
                {changePassword.isPending ? 'Duke ndryshuar...' : 'Ndrysho Fjalekalimin'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
