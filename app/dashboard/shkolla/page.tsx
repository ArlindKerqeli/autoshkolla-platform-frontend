'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Pencil, Save, X } from 'lucide-react';
import api from '@/lib/api';
import type { Tenant } from '@/lib/types';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface SchoolFormData {
  name: string;
  nui: string;
  tvsh: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  representative: string;
  bankName: string;
  bankAccount: string;
  licenseNumber: string;
}

const FIELD_LABELS: { key: keyof SchoolFormData; label: string }[] = [
  { key: 'name', label: 'Emri i Shkollës' },
  { key: 'nui', label: 'NUI' },
  { key: 'tvsh', label: 'TVSH' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Telefoni' },
  { key: 'address', label: 'Adresa' },
  { key: 'city', label: 'Qyteti' },
  { key: 'representative', label: 'Përfaqësuesi' },
  { key: 'bankName', label: 'Banka' },
  { key: 'bankAccount', label: 'Llogaria Bankare' },
  { key: 'licenseNumber', label: 'Numri i Licencës' },
];

function toFormData(school: Tenant | undefined): SchoolFormData {
  return {
    name: school?.name ?? '',
    nui: school?.nui ?? '',
    tvsh: school?.tvsh ?? '',
    email: school?.email ?? '',
    phone: school?.phone ?? '',
    address: school?.address ?? '',
    city: school?.city ?? '',
    representative: school?.representative ?? '',
    bankName: school?.bankName ?? '',
    bankAccount: school?.bankAccount ?? '',
    licenseNumber: school?.licenseNumber ?? '',
  };
}

export default function ShkollaPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<SchoolFormData>(toFormData(undefined));

  const { data: school, isLoading } = useQuery({
    queryKey: ['school-profile'],
    queryFn: async () => {
      const res = await api.get('/school/profile');
      return res.data as Tenant;
    },
    onSuccess: (data: Tenant) => {
      setFormData(toFormData(data));
    },
  } as { queryKey: string[]; queryFn: () => Promise<Tenant>; onSuccess: (data: Tenant) => void });

  const updateSchool = useMutation({
    mutationFn: (data: SchoolFormData) => api.put('/school/profile', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-profile'] });
      setIsEditing(false);
      toast({ title: 'Profili u ruajt me sukses' });
    },
    onError: (err: { message: string }) => {
      toast({ title: 'Gabim', description: err.message, variant: 'destructive' });
    },
  });

  const handleEdit = () => {
    setFormData(toFormData(school));
    setIsEditing(true);
  };

  const handleCancel = () => {
    setFormData(toFormData(school));
    setIsEditing(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSchool.mutate(formData);
  };

  const updateField = (key: keyof SchoolFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Profili i Shkollës" />
        <LoadingSkeleton variant="form" rows={11} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Profili i Shkollës" description="Informatat e autoshkollës suaj">
        {!isEditing ? (
          <Button onClick={handleEdit}>
            <Pencil className="mr-2 h-4 w-4" />
            Edito
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel}>
              <X className="mr-2 h-4 w-4" />
              Anulo
            </Button>
            <Button onClick={handleSubmit} disabled={updateSchool.isPending}>
              <Save className="mr-2 h-4 w-4" />
              {updateSchool.isPending ? 'Duke ruajtur...' : 'Ruaj'}
            </Button>
          </div>
        )}
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Informatat e Shkollës
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <form onSubmit={handleSubmit} className="grid gap-6 sm:grid-cols-2">
              {FIELD_LABELS.map(({ key, label }) => (
                <div key={key} className="space-y-1.5">
                  <Label htmlFor={`school-${key}`}>{label}</Label>
                  <Input
                    id={`school-${key}`}
                    value={formData[key]}
                    onChange={(e) => updateField(key, e.target.value)}
                  />
                </div>
              ))}
            </form>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2">
              {FIELD_LABELS.map(({ key, label }) => (
                <div key={key} className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">{label}</p>
                  <p className="text-sm font-semibold">
                    {(school as unknown as Record<string, unknown>)?.[key]
                      ? String((school as unknown as Record<string, unknown>)[key])
                      : '-'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
