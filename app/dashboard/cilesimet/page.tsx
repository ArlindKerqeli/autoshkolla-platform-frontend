'use client';

import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Lock, User, Pencil, Save, X } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

const ROLE_LABELS: Record<string, string> = {
  administrator: 'Administrator',
  instructor: 'Instruktor',
  lecturer: 'Ligjerues',
  super_admin: 'Super Admin',
};

export default function CilesimetPage() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();

  // Profile editing
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (user) {
      setFullName(user.fullName ?? '');
      setEmail(user.email ?? '');
    }
  }, [user]);

  // Password change
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const updateProfile = useMutation({
    mutationFn: () =>
      api.put(`/users/${user?.id}`, { fullName, email }),
    onSuccess: async () => {
      setIsEditing(false);
      toast({ title: 'Profili u perditesua me sukses' });
      await refreshUser();
    },
    onError: (err: { message: string }) => {
      toast({ title: 'Gabim', description: err.message, variant: 'destructive' });
    },
  });

  const changePassword = useMutation({
    mutationFn: () =>
      api.put(`/users/${user?.id}/password`, { password: newPassword }),
    onSuccess: () => {
      setNewPassword('');
      setConfirmPassword('');
      toast({ title: 'Fjalekalimi u ndryshua me sukses' });
    },
    onError: (err: { message: string }) => {
      toast({ title: 'Gabim', description: err.message, variant: 'destructive' });
    },
  });

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast({ title: 'Gabim', description: 'Emri nuk mund te jete bosh', variant: 'destructive' });
      return;
    }
    updateProfile.mutate();
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      toast({
        title: 'Gabim',
        description: 'Fjalekalimi duhet te kete se paku 6 karaktere',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: 'Gabim',
        description: 'Fjalekalimi nuk perputhen',
        variant: 'destructive',
      });
      return;
    }

    changePassword.mutate();
  };

  const cancelEdit = () => {
    setFullName(user?.fullName ?? '');
    setEmail(user?.email ?? '');
    setIsEditing(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profili Im"
        description="Menaxhoni llogarinë tuaj"
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Account Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-muted-foreground" />
                <div>
                  <CardTitle className="text-base">Informacionet e Llogarise</CardTitle>
                  <CardDescription>Detajet e llogarise suaj</CardDescription>
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
          <CardContent>
            {isEditing ? (
              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-name">Emri i plote</Label>
                  <Input
                    id="edit-name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-email">Email</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Emri i perdoruesit</p>
                    <p className="font-medium">{user?.username ?? '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Roli</p>
                    <Badge variant="outline">
                      {ROLE_LABELS[user?.role ?? ''] ?? user?.role}
                    </Badge>
                  </div>
                </div>
                <Button type="submit" disabled={updateProfile.isPending}>
                  <Save className="mr-2 h-4 w-4" />
                  {updateProfile.isPending ? 'Duke ruajtur...' : 'Ruaj'}
                </Button>
              </form>
            ) : (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Emri i plote</p>
                  <p className="font-medium">{user?.fullName ?? '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Emri i perdoruesit</p>
                  <p className="font-medium">{user?.username ?? '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Email</p>
                  <p className="font-medium">{user?.email ?? '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Roli</p>
                  <Badge variant="outline">
                    {ROLE_LABELS[user?.role ?? ''] ?? user?.role}
                  </Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Change Password */}
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
                <Label htmlFor="confirm-password">Konfirmo fjalekalimin</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
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
