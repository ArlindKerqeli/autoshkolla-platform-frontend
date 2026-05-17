'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { formatDate, formatCurrency } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import type { Category, Instructor, Vehicle, Country, Municipality, Place } from '@/lib/types';

// --- Step schemas ---
const step1Schema = z.object({
  firstName: z.string().min(1, 'Emri eshte i detyrueshem'),
  lastName: z.string().min(1, 'Mbiemri eshte i detyrueshem'),
  parentName: z.string().optional(),
  personalNumber: z.string().min(1, 'Nr. personal eshte i detyrueshem'),
  dateOfBirth: z.string().optional(),
  gender: z.enum(['M', 'F'], { required_error: 'Gjinia eshte e detyrueshme' }),
  phone: z.string().optional(),
  email: z.string().email('Email jo valid').optional().or(z.literal('')),
});

const step2Schema = z.object({
  birthCountryId: z.string().optional(),
  birthMunicipalityId: z.string().optional(),
  birthPlaceId: z.string().optional(),
  residenceMunicipalityId: z.string().optional(),
  residencePlaceId: z.string().optional(),
});

const step3Schema = z.object({
  categoryId: z.string().min(1, 'Kategoria eshte e detyrueshme'),
  instructorId: z.string().optional(),
  lecturerId: z.string().optional(),
  vehicleId: z.string().optional(),
  isAutomatic: z.boolean(),
});

const step4Schema = z.object({
  price: z.number().min(0, 'Cmimi nuk mund te jete negativ'),
  registrationDate: z.string().min(1, 'Data e regjistrimit eshte e detyrueshme'),
  protocolNumber: z.string().optional(),
  medicalCertificate: z.boolean(),
  medicalCertificateNumber: z.string().optional(),
  medicalCertificateDate: z.string().optional(),
  redCrossCertificate: z.boolean(),
  idCardCopy: z.boolean(),
});

const fullSchema = step1Schema.merge(step2Schema).merge(step3Schema).merge(step4Schema);
type FullFormData = z.infer<typeof fullSchema>;

const stepSchemas = [step1Schema, step2Schema, step3Schema, step4Schema];
const STEP_TITLES = [
  'Te Dhenat Personale',
  'Vendndodhja',
  'Trajnimi',
  'Cmimi & Dokumentet',
  'Perfundimi',
];

export default function RegisterCandidatePage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);

  const form = useForm<FullFormData>({
    resolver: zodResolver(fullSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      parentName: '',
      personalNumber: '',
      dateOfBirth: '',
      gender: undefined,
      phone: '',
      email: '',
      birthCountryId: '',
      birthMunicipalityId: '',
      birthPlaceId: '',
      residenceMunicipalityId: '',
      residencePlaceId: '',
      categoryId: '',
      instructorId: '',
      lecturerId: '',
      vehicleId: '',
      isAutomatic: false,
      price: 0,
      registrationDate: new Date().toISOString().split('T')[0],
      protocolNumber: '',
      medicalCertificate: false,
      medicalCertificateNumber: '',
      medicalCertificateDate: '',
      redCrossCertificate: false,
      idCardCopy: false,
    },
    mode: 'onBlur',
  });

  const values = form.watch();

  // Reference data queries
  const { data: countries } = useQuery<Country[]>({
    queryKey: ['countries'],
    queryFn: async () => {
      const res = await api.get('/locations/countries');
      return res.data;
    },
  });

  const { data: birthMunicipalities } = useQuery<Municipality[]>({
    queryKey: ['municipalities', values.birthCountryId],
    queryFn: async () => {
      const res = await api.get(`/locations/municipalities?country_id=${values.birthCountryId}`);
      return res.data;
    },
    enabled: !!values.birthCountryId,
  });

  const { data: birthPlaces } = useQuery<Place[]>({
    queryKey: ['places', values.birthMunicipalityId],
    queryFn: async () => {
      const res = await api.get(`/locations/places?municipality_id=${values.birthMunicipalityId}`);
      return res.data;
    },
    enabled: !!values.birthMunicipalityId,
  });

  const { data: residenceMunicipalities } = useQuery<Municipality[]>({
    queryKey: ['residence-municipalities-reg'],
    queryFn: async () => {
      const kosovoId = countries?.find((c) => c.name === 'Kosovë' || c.code === 'KS')?.id;
      const cId = kosovoId || values.birthCountryId;
      if (!cId) return [];
      const res = await api.get(`/locations/municipalities?country_id=${cId}`);
      return res.data;
    },
    enabled: !!countries,
  });

  const { data: residencePlaces } = useQuery<Place[]>({
    queryKey: ['residence-places', values.residenceMunicipalityId],
    queryFn: async () => {
      const res = await api.get(`/locations/places?municipality_id=${values.residenceMunicipalityId}`);
      return res.data;
    },
    enabled: !!values.residenceMunicipalityId,
  });

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

  // Auto-generate protocol number
  const { data: nextProtocol } = useQuery<{ protocolNumber: string }>({
    queryKey: ['next-protocol-number'],
    queryFn: async () => {
      const res = await api.get('/candidates/next-protocol-number');
      return res.data;
    },
  });

  // Pre-fill protocol number when entering step 4 (if not already set by user)
  const [protocolPrefilled, setProtocolPrefilled] = useState(false);
  useEffect(() => {
    if (currentStep === 3 && nextProtocol?.protocolNumber && !protocolPrefilled) {
      const current = form.getValues('protocolNumber');
      if (!current) {
        form.setValue('protocolNumber', nextProtocol.protocolNumber);
      }
      setProtocolPrefilled(true);
    }
  }, [currentStep, nextProtocol, protocolPrefilled, form]);

  const createCandidate = useMutation({
    mutationFn: async (data: FullFormData) => {
      // Clean empty strings to null for optional UUID fields
      const cleaned: Record<string, unknown> = { ...data };
      const uuidFields = ['birthCountryId', 'birthMunicipalityId', 'birthPlaceId', 'residenceMunicipalityId', 'residencePlaceId', 'instructorId', 'lecturerId', 'vehicleId'];
      for (const field of uuidFields) {
        if (cleaned[field] === '' || cleaned[field] === undefined) {
          cleaned[field] = null;
        }
      }
      const res = await api.post('/candidates', cleaned);
      return res.data;
    },
    onSuccess: (data) => {
      toast({
        title: 'Kandidati u regjistrua',
        description: `${data.firstName} ${data.lastName} u regjistrua me sukses.`,
      });
      router.push(`/dashboard/kandidatet/${data.id}`);
    },
    onError: () => {
      toast({
        title: 'Gabim',
        description: 'Ka ndodhur nje gabim gjate regjistrimit. Ju lutem provoni perseri.',
        variant: 'destructive',
      });
    },
  });

  // Step navigation
  const validateAndNext = async () => {
    if (currentStep < 4) {
      const schema = stepSchemas[currentStep];
      if (schema) {
        const fields = Object.keys(schema.shape) as (keyof FullFormData)[];
        const valid = await form.trigger(fields);
        if (!valid) return;
      }
      setCurrentStep((s) => s + 1);
    }
  };

  const goBack = () => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  };

  const handleSubmit = () => {
    form.handleSubmit((data) => createCandidate.mutate(data))();
  };

  // Auto-fill price from category
  const selectedCategory = categories?.find((c) => c.id === values.categoryId);
  const selectedInstructor = instructors?.find((i) => i.id === values.instructorId);
  const selectedLecturer = instructors?.find((i) => i.id === values.lecturerId);
  const selectedVehicle = vehicles?.find((v) => v.id === values.vehicleId);

  // When category changes, auto-fill price
  const onCategoryChange = (catId: string) => {
    form.setValue('categoryId', catId);
    const cat = categories?.find((c) => c.id === catId);
    if (cat) {
      form.setValue('price', cat.price);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/kandidatet')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Regjistro Kandidat</h1>
          <p className="text-sm text-muted-foreground">
            Ploteso te dhenat per te regjistruar kandidatin e ri
          </p>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2">
        {STEP_TITLES.map((title, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                idx < currentStep
                  ? 'bg-green-500 text-white'
                  : idx === currentStep
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-500'
              }`}
            >
              {idx < currentStep ? <Check className="h-4 w-4" /> : idx + 1}
            </div>
            <span
              className={`hidden text-sm sm:inline ${
                idx === currentStep ? 'font-medium text-gray-900' : 'text-muted-foreground'
              }`}
            >
              {title}
            </span>
            {idx < STEP_TITLES.length - 1 && (
              <div className={`h-px w-6 ${idx < currentStep ? 'bg-green-500' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle>{STEP_TITLES[currentStep]}</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Step 1: Personal Info */}
          {currentStep === 0 && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Emri *</Label>
                  <Input id="firstName" {...form.register('firstName')} />
                  {form.formState.errors.firstName && (
                    <p className="text-xs text-red-500">{form.formState.errors.firstName.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Mbiemri *</Label>
                  <Input id="lastName" {...form.register('lastName')} />
                  {form.formState.errors.lastName && (
                    <p className="text-xs text-red-500">{form.formState.errors.lastName.message}</p>
                  )}
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="parentName">Emri i prindit</Label>
                  <Input id="parentName" {...form.register('parentName')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="personalNumber">Nr. Personal *</Label>
                  <Input id="personalNumber" {...form.register('personalNumber')} />
                  {form.formState.errors.personalNumber && (
                    <p className="text-xs text-red-500">{form.formState.errors.personalNumber.message}</p>
                  )}
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Datelindja</Label>
                  <Input id="dateOfBirth" type="date" {...form.register('dateOfBirth')} />
                </div>
                <div className="space-y-2">
                  <Label>Gjinia *</Label>
                  <div className="flex items-center gap-4 pt-2">
                    <label className="flex items-center gap-2">
                      <input type="radio" value="M" {...form.register('gender')} className="text-blue-600" />
                      <span className="text-sm">Mashkull</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="radio" value="F" {...form.register('gender')} className="text-blue-600" />
                      <span className="text-sm">Femer</span>
                    </label>
                  </div>
                  {form.formState.errors.gender && (
                    <p className="text-xs text-red-500">{form.formState.errors.gender.message}</p>
                  )}
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefoni</Label>
                  <Input id="phone" {...form.register('phone')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" {...form.register('email')} />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Location */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Shteti i lindjes</Label>
                <Select
                  value={values.birthCountryId || ''}
                  onValueChange={(val) => {
                    form.setValue('birthCountryId', val, { shouldDirty: true });
                    form.setValue('birthMunicipalityId', '', { shouldDirty: true });
                    form.setValue('birthPlaceId', '', { shouldDirty: true });
                  }}
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
                    value={values.birthMunicipalityId || ''}
                    onValueChange={(val) => {
                      form.setValue('birthMunicipalityId', val, { shouldDirty: true });
                      form.setValue('birthPlaceId', '', { shouldDirty: true });
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
                    value={values.birthPlaceId || ''}
                    onValueChange={(val) => form.setValue('birthPlaceId', val, { shouldDirty: true })}
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

              <div className="border-t pt-4">
                <h3 className="mb-3 font-semibold text-gray-700">Vendbanimi</h3>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Komuna e banimit</Label>
                  <Select
                    value={values.residenceMunicipalityId || ''}
                    onValueChange={(val) => {
                      form.setValue('residenceMunicipalityId', val, { shouldDirty: true });
                      form.setValue('residencePlaceId', '', { shouldDirty: true });
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
                    value={values.residencePlaceId || ''}
                    onValueChange={(val) => form.setValue('residencePlaceId', val, { shouldDirty: true })}
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
          )}

          {/* Step 3: Training */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Kategoria *</Label>
                  <Select value={values.categoryId || ''} onValueChange={onCategoryChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Zgjedh kategorine" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories?.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.code} - {c.description ?? c.code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.categoryId && (
                    <p className="text-xs text-red-500">{form.formState.errors.categoryId.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Instruktori</Label>
                  <Select
                    value={values.instructorId || ''}
                    onValueChange={(val) => form.setValue('instructorId', val, { shouldDirty: true })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Zgjedh instruktorin" />
                    </SelectTrigger>
                    <SelectContent>
                      {instructors
                        ?.filter((i) => i.position === 'instructor' || i.position === 'both')
                        .map((i) => (
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
                  <Label>Ligjerues</Label>
                  <Select
                    value={values.lecturerId || ''}
                    onValueChange={(val) => form.setValue('lecturerId', val, { shouldDirty: true })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Zgjedh ligjeruesin" />
                    </SelectTrigger>
                    <SelectContent>
                      {instructors
                        ?.filter((i) => i.position === 'lecturer' || i.position === 'both')
                        .map((i) => (
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
                    value={values.vehicleId || ''}
                    onValueChange={(val) => form.setValue('vehicleId', val, { shouldDirty: true })}
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
              <div className="space-y-2">
                <Label>Transmisioni</Label>
                <div className="flex items-center gap-4 pt-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={!values.isAutomatic}
                      onChange={() => form.setValue('isAutomatic', false)}
                      className="text-blue-600"
                    />
                    <span className="text-sm">Manual</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={values.isAutomatic}
                      onChange={() => form.setValue('isAutomatic', true)}
                      className="text-blue-600"
                    />
                    <span className="text-sm">Automatik</span>
                  </label>
                </div>
              </div>
              {selectedCategory && (
                <div className="rounded-lg bg-blue-50 p-4 text-sm">
                  <p className="font-medium text-blue-800">Informata e kategorise:</p>
                  <p className="text-blue-700">
                    Ore teorike: {selectedCategory.theoryHours} | Ore praktike: {selectedCategory.practicalHours} | Cmimi: {formatCurrency(selectedCategory.price)}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Price & Documents */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="price">Cmimi *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    {...form.register('price', { valueAsNumber: true })}
                  />
                  {form.formState.errors.price && (
                    <p className="text-xs text-red-500">{form.formState.errors.price.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="registrationDate">Data e regjistrimit *</Label>
                  <Input id="registrationDate" type="date" {...form.register('registrationDate')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="protocolNumber">Nr. Regjistrit</Label>
                  <Input id="protocolNumber" {...form.register('protocolNumber')} />
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="mb-3 font-semibold text-gray-700">Dokumentet</h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="mc"
                    checked={values.medicalCertificate}
                    onCheckedChange={(val) => form.setValue('medicalCertificate', !!val)}
                  />
                  <Label htmlFor="mc">Certifikata mjekesore</Label>
                </div>
                {values.medicalCertificate && (
                  <div className="grid gap-4 pl-6 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="mcNumber">Nr. certifikates</Label>
                      <Input id="mcNumber" {...form.register('medicalCertificateNumber')} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="mcDate">Data</Label>
                      <Input id="mcDate" type="date" {...form.register('medicalCertificateDate')} />
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="rc"
                    checked={values.redCrossCertificate}
                    onCheckedChange={(val) => form.setValue('redCrossCertificate', !!val)}
                  />
                  <Label htmlFor="rc">Certifikata e Kryqit te Kuq</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="idc"
                    checked={values.idCardCopy}
                    onCheckedChange={(val) => form.setValue('idCardCopy', !!val)}
                  />
                  <Label htmlFor="idc">Kopja e leternjoftimit</Label>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Review */}
          {currentStep === 4 && (
            <div className="space-y-6">
              {/* Personal */}
              <div>
                <h3 className="mb-2 font-semibold text-gray-700">Te Dhenat Personale</h3>
                <div className="grid gap-x-8 gap-y-2 rounded-lg bg-gray-50 p-4 text-sm sm:grid-cols-2">
                  <div><span className="text-muted-foreground">Emri:</span> <strong>{values.firstName} {values.lastName}</strong></div>
                  <div><span className="text-muted-foreground">Emri i prindit:</span> {values.parentName || '-'}</div>
                  <div><span className="text-muted-foreground">Nr. Personal:</span> {values.personalNumber}</div>
                  <div><span className="text-muted-foreground">Datelindja:</span> {values.dateOfBirth ? formatDate(values.dateOfBirth) : '-'}</div>
                  <div><span className="text-muted-foreground">Gjinia:</span> {values.gender === 'M' ? 'Mashkull' : 'Femer'}</div>
                  <div><span className="text-muted-foreground">Telefoni:</span> {values.phone || '-'}</div>
                  <div><span className="text-muted-foreground">Email:</span> {values.email || '-'}</div>
                </div>
              </div>

              {/* Location */}
              <div>
                <h3 className="mb-2 font-semibold text-gray-700">Vendndodhja</h3>
                <div className="grid gap-x-8 gap-y-2 rounded-lg bg-gray-50 p-4 text-sm sm:grid-cols-2">
                  <div>
                    <span className="text-muted-foreground">Shteti i lindjes:</span>{' '}
                    {countries?.find((c) => c.id === values.birthCountryId)?.name || '-'}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Komuna e lindjes:</span>{' '}
                    {birthMunicipalities?.find((m) => m.id === values.birthMunicipalityId)?.name || '-'}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Vendlindja:</span>{' '}
                    {birthPlaces?.find((p) => p.id === values.birthPlaceId)?.name || '-'}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Komuna e banimit:</span>{' '}
                    {residenceMunicipalities?.find((m) => m.id === values.residenceMunicipalityId)?.name || '-'}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Vendbanimi:</span>{' '}
                    {residencePlaces?.find((p) => p.id === values.residencePlaceId)?.name || '-'}
                  </div>
                </div>
              </div>

              {/* Training */}
              <div>
                <h3 className="mb-2 font-semibold text-gray-700">Trajnimi</h3>
                <div className="grid gap-x-8 gap-y-2 rounded-lg bg-gray-50 p-4 text-sm sm:grid-cols-2">
                  <div><span className="text-muted-foreground">Kategoria:</span> <strong>{selectedCategory?.code || '-'}</strong></div>
                  <div>
                    <span className="text-muted-foreground">Instruktori:</span>{' '}
                    {selectedInstructor ? `${selectedInstructor.firstName} ${selectedInstructor.lastName}` : '-'}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Ligjeruesi:</span>{' '}
                    {selectedLecturer ? `${selectedLecturer.firstName} ${selectedLecturer.lastName}` : '-'}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Automjeti:</span>{' '}
                    {selectedVehicle ? `${selectedVehicle.make} ${selectedVehicle.model ?? ''} - ${selectedVehicle.plateNumber}` : '-'}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Transmisioni:</span>{' '}
                    {values.isAutomatic ? 'Automatik' : 'Manual'}
                  </div>
                </div>
              </div>

              {/* Price & Documents */}
              <div>
                <h3 className="mb-2 font-semibold text-gray-700">Cmimi & Dokumentet</h3>
                <div className="grid gap-x-8 gap-y-2 rounded-lg bg-gray-50 p-4 text-sm sm:grid-cols-2">
                  <div><span className="text-muted-foreground">Cmimi:</span> <strong>{formatCurrency(values.price)}</strong></div>
                  <div><span className="text-muted-foreground">Data e regjistrimit:</span> {values.registrationDate ? formatDate(values.registrationDate) : '-'}</div>
                  <div><span className="text-muted-foreground">Nr. Regjistrit:</span> {values.protocolNumber || '-'}</div>
                  <div><span className="text-muted-foreground">Certifikata mjekesore:</span> {values.medicalCertificate ? 'Po' : 'Jo'}</div>
                  <div><span className="text-muted-foreground">Kryqi i Kuq:</span> {values.redCrossCertificate ? 'Po' : 'Jo'}</div>
                  <div><span className="text-muted-foreground">Kopja e ID:</span> {values.idCardCopy ? 'Po' : 'Jo'}</div>
                </div>
              </div>

              {createCandidate.isError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  Ka ndodhur nje gabim gjate regjistrimit. Ju lutem provoni perseri.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={goBack} disabled={currentStep === 0}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Kthehu
        </Button>
        {currentStep < 4 ? (
          <Button onClick={validateAndNext}>
            Vazhdo
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={createCandidate.isPending}>
            <Check className="mr-2 h-4 w-4" />
            {createCandidate.isPending ? 'Duke regjistruar...' : 'Regjistro Kandidatin'}
          </Button>
        )}
      </div>
    </div>
  );
}
