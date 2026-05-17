'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  Check,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Pencil,
  Save,
  Shield,
  User,
  X,
} from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const ROLE_LABELS: Record<string, string> = {
  administrator: 'Administrator',
  instructor: 'Instruktor',
  lecturer: 'Ligjërues',
  super_admin: 'Super Admin',
};

const ROLE_COLORS: Record<string, string> = {
  administrator: 'bg-blue-50 text-blue-700 ring-blue-200',
  instructor:    'bg-emerald-50 text-emerald-700 ring-emerald-200',
  lecturer:      'bg-amber-50 text-amber-700 ring-amber-200',
  super_admin:   'bg-rose-50 text-rose-700 ring-rose-200',
};

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? '';
  const b = parts[parts.length - 1]?.[0] ?? '';
  return (a + (parts.length > 1 ? b : '')).toUpperCase() || '?';
}

/** Simple password strength heuristic — returns 0..4 */
function strengthOf(pw: string): number {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 6) score += 1;
  if (pw.length >= 10) score += 1;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score += 1;
  if (/\d/.test(pw)) score += 1;
  if (/[^A-Za-z0-9]/.test(pw)) score += 1;
  return Math.min(4, score);
}

const STRENGTH_LABELS = ['Shumë i dobët', 'I dobët', 'Mesatar', 'I mirë', 'I fortë'];
const STRENGTH_COLORS = ['bg-rose-500', 'bg-rose-500', 'bg-amber-500', 'bg-emerald-500', 'bg-emerald-600'];

export default function CilesimetPage() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (user) {
      setFullName(user.fullName ?? '');
      setEmail(user.email ?? '');
    }
  }, [user]);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const strength = useMemo(() => strengthOf(newPassword), [newPassword]);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const updateProfile = useMutation({
    mutationFn: () => api.put(`/users/${user?.id}`, { fullName, email }),
    onSuccess: async () => {
      setIsEditing(false);
      toast({ title: 'Profili u përditësua me sukses' });
      await refreshUser();
    },
    onError: (err: { message: string }) => {
      toast({ title: 'Gabim', description: err.message, variant: 'destructive' });
    },
  });

  const changePassword = useMutation({
    mutationFn: () => api.put(`/users/${user?.id}/password`, { password: newPassword }),
    onSuccess: () => {
      setNewPassword('');
      setConfirmPassword('');
      toast({ title: 'Fjalëkalimi u ndryshua me sukses' });
    },
    onError: (err: { message: string }) => {
      toast({ title: 'Gabim', description: err.message, variant: 'destructive' });
    },
  });

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast({ title: 'Gabim', description: 'Emri nuk mund të jetë bosh', variant: 'destructive' });
      return;
    }
    updateProfile.mutate();
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast({ title: 'Gabim', description: 'Fjalëkalimi duhet të ketë së paku 6 karaktere', variant: 'destructive' });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: 'Gabim', description: 'Fjalëkalimet nuk përputhen', variant: 'destructive' });
      return;
    }
    changePassword.mutate();
  };

  const cancelEdit = () => {
    setFullName(user?.fullName ?? '');
    setEmail(user?.email ?? '');
    setIsEditing(false);
  };

  const initials = getInitials(user?.fullName ?? user?.username ?? '');
  const roleLabel = ROLE_LABELS[user?.role ?? ''] ?? user?.role ?? '—';
  const roleColor = ROLE_COLORS[user?.role ?? ''] ?? 'bg-slate-100 text-slate-700 ring-slate-200';

  return (
    <div className="space-y-6">
      <PageHeader title="Profili Im" description="Menaxhoni llogarinë tuaj dhe sigurinë" />

      {/* Identity strip */}
      <div className="flex flex-col items-start gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-base font-bold text-white shadow-md shadow-primary-600/20">
          {initials}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-semibold text-slate-900">{user?.fullName || user?.username || '—'}</p>
          <p className="text-sm text-slate-500">{user?.email ?? 'Pa email'}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold ring-1 ring-inset', roleColor)}>
            <Shield className="h-3 w-3" /> {roleLabel}
          </span>
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11.5px] font-medium text-slate-600">
            @{user?.username ?? '—'}
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Account Info */}
        <Card>
          <CardHeader className="border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-50 text-blue-600 ring-1 ring-inset ring-blue-200">
                  <User className="h-4 w-4" />
                </span>
                <div>
                  <CardTitle className="text-base">Informacionet e Llogarisë</CardTitle>
                  <CardDescription>Detajet e llogarisë suaj</CardDescription>
                </div>
              </div>
              {!isEditing ? (
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edito
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={cancelEdit}>
                  <X className="mr-2 h-4 w-4" />
                  Anulo
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {isEditing ? (
              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-name">Emri i plotë</Label>
                  <Input id="edit-name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-email">Email</Label>
                  <Input id="edit-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <Button type="submit" disabled={updateProfile.isPending}>
                  <Save className="mr-2 h-4 w-4" />
                  {updateProfile.isPending ? 'Duke ruajtur…' : 'Ruaj ndryshimet'}
                </Button>
              </form>
            ) : (
              <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                <Field label="Emri i plotë" value={user?.fullName ?? '—'} />
                <Field label="Emri i përdoruesit" value={user?.username ?? '—'} />
                <Field
                  label="Email"
                  value={
                    user?.email ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-slate-400" />
                        {user.email}
                      </span>
                    ) : (
                      '—'
                    )
                  }
                />
                <Field
                  label="Roli"
                  value={
                    <Badge variant="outline" className="font-medium">
                      {roleLabel}
                    </Badge>
                  }
                />
              </dl>
            )}
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card>
          <CardHeader className="border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-amber-50 text-amber-600 ring-1 ring-inset ring-amber-200">
                <Lock className="h-4 w-4" />
              </span>
              <div>
                <CardTitle className="text-base">Ndrysho Fjalëkalimin</CardTitle>
                <CardDescription>Përditësoni fjalëkalimin e llogarisë suaj</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="new-password">Fjalëkalimi i ri</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showNew ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Së paku 6 karaktere"
                    className="pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                    aria-label={showNew ? 'Fshih fjalëkalimin' : 'Shfaq fjalëkalimin'}
                  >
                    {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {newPassword && (
                  <div className="pt-1">
                    <div className="flex gap-1">
                      {[0, 1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className={cn(
                            'h-1 flex-1 rounded-full transition-colors',
                            i < strength ? STRENGTH_COLORS[strength] : 'bg-slate-100'
                          )}
                        />
                      ))}
                    </div>
                    <p className="mt-1.5 text-[11px] font-medium text-slate-500">
                      Forca:{' '}
                      <span
                        className={cn(
                          'font-semibold',
                          strength <= 1 ? 'text-rose-600' : strength === 2 ? 'text-amber-600' : 'text-emerald-600'
                        )}
                      >
                        {STRENGTH_LABELS[strength]}
                      </span>
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirm-password">Konfirmo fjalëkalimin</Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={cn(
                      'pr-16',
                      confirmPassword && (passwordsMatch ? 'border-emerald-300' : 'border-rose-300')
                    )}
                    required
                  />
                  <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
                    {confirmPassword && passwordsMatch && (
                      <span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                        <Check className="h-3 w-3" />
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                      aria-label={showConfirm ? 'Fshih fjalëkalimin' : 'Shfaq fjalëkalimin'}
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                {confirmPassword && !passwordsMatch && (
                  <p className="text-[11px] font-medium text-rose-600">Fjalëkalimet nuk përputhen</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={changePassword.isPending || !passwordsMatch || strength < 1}
              >
                {changePassword.isPending ? 'Duke ndryshuar…' : 'Ndrysho Fjalëkalimin'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-slate-900">{value}</dd>
    </div>
  );
}
