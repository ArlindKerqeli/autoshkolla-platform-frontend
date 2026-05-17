// Base types
export interface BaseModel {
  id: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Tenant extends BaseModel {
  name: string;
  slug: string;
  nui?: string;
  tvsh?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  representative?: string;
  bankName?: string;
  bankAccount?: string;
  licenseNumber?: string;
  logoUrl?: string;
  isActive: boolean;
}

export interface User extends BaseModel {
  tenantId: string;
  username: string;
  fullName: string;
  personalNumber?: string;
  email?: string;
  role: 'super_admin' | 'administrator' | 'instructor' | 'lecturer';
  isActive: boolean;
  activationCount?: number;
  lastLoginAt?: string;
  endDate?: string;
  tenant?: Tenant;
}

export interface Candidate extends BaseModel {
  tenantId: string;
  code: string;
  firstName: string;
  parentName?: string;
  lastName: string;
  personalNumber: string;
  phone?: string;
  email?: string;
  birthCountryId?: string;
  birthMunicipalityId?: string;
  birthPlaceId?: string;
  birthMunicipalityForeign?: string;
  birthPlaceForeign?: string;
  dateOfBirth?: string;
  gender?: 'M' | 'F';
  residenceMunicipalityId?: string;
  residencePlaceId?: string;
  categoryId: string;
  isAutomatic: boolean;
  price: number;
  amountPaid: number;
  practicalHours: number;
  theoryHours: number;
  practicalHoursRealized: number;
  registrationDate: string;
  protocolNumber?: string;
  medicalCertificate: boolean;
  medicalCertificateNumber?: string;
  medicalCertificateDate?: string;
  verificationFlag: boolean;
  redCrossCertificate: boolean;
  idCardCopy: boolean;
  lecturerId?: string;
  instructorId?: string;
  vehicleId?: string;
  hasExtraHours: boolean;
  isArchived: boolean;
  comments?: string;
  deletedAt?: string;
  // Flat summary fields returned by list API
  categoryCode?: string;
  instructorName?: string;
  lecturerName?: string;
  vehiclePlate?: string;
  debt?: number;
  fullName?: string;
  // Expanded relations (when API includes them)
  category?: Category;
  instructor?: Instructor;
  lecturer?: Instructor;
  vehicle?: Vehicle;
  birthCountry?: Country;
  birthMunicipality?: Municipality;
  birthPlace?: Place;
  residenceMunicipality?: Municipality;
  residencePlace?: Place;
  supplementaryRegistrations?: SupplementaryRegistration[];
}

export interface Instructor extends BaseModel {
  tenantId: string;
  userId?: string;
  code: string;
  firstName: string;
  lastName: string;
  personalNumber?: string;
  email?: string;
  phone?: string;
  position: 'instructor' | 'lecturer' | 'both';
  hoursRealized: number;
  licenseInfo?: string;
  licenseExpiry?: string | null;
  costPerCandidate: number;
  isActive: boolean;
}

export interface Category extends BaseModel {
  tenantId: string;
  code: string;
  description?: string;
  verificationText?: string;
  verificationCode?: string;
  theoryHours: number;
  practicalHours: number;
  price: number;
  contractPrice?: number;
  isLicensed: boolean;
  isActive: boolean;
}

export interface Vehicle extends BaseModel {
  tenantId: string;
  make: string;
  model?: string;
  chassisNumber?: string;
  plateNumber: string;
  registrationDate?: string;
  registrationExpiry?: string;
  technicalControlDate?: string;
  insuranceExpiry?: string | null;
  instructorId?: string;
  isActive: boolean;
  instructor?: Instructor;
}

// Location types (shared, no tenant)
export interface Country {
  id: string;
  name: string;
  code?: string;
  createdAt: string;
}

export interface Municipality {
  id: string;
  countryId: string;
  name: string;
  code?: number;
  createdAt: string;
}

export interface Place {
  id: string;
  municipalityId: string;
  name: string;
  code?: number;
  createdAt: string;
}

export interface Payment extends BaseModel {
  candidateId: string;
  tenantId: string;
  amount: number;
  paymentMethod?: string;
  paymentDate: string;
  receivedByUserId?: string;
  isSupplementary: boolean;
  remarks?: string;
  candidate?: Candidate;
  receivedBy?: User;
}

export interface TheoryHourSession extends BaseModel {
  candidateId: string;
  tenantId: string;
  sessionNumber: number;
  chapterTopics: string;
  dateRealized?: string;
  timeFrom: string;
  timeTo: string;
  hoursCount: number;
  isRealized: boolean;
}

export interface PracticalHourSession extends BaseModel {
  candidateId: string;
  tenantId: string;
  instructorId?: string;
  dateRealized: string;
  timeRealized: string;
  hoursCount: number;
  pricePerHour: number;
  chapterTopics?: string;
  remarks?: string;
  isPaid: boolean;
  instructor?: Instructor;
}

export interface LessonChapter extends BaseModel {
  tenantId: string;
  categoryId: string;
  categoryCode?: string;
  chapterType: 'theory' | 'practical';
  sessionNumber: number;
  chapterTopics: string;
  timeFrom?: string;
  timeTo?: string;
  hoursCount: number;
  isActive: boolean;
}

export interface ScheduledLesson extends BaseModel {
  tenantId: string;
  title?: string;
  instructorId: string;
  candidateId?: string;
  vehicleId?: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  notes?: string;
  cancelledReason?: string;
  practicalSessionId?: string;
  instructor?: Instructor;
  candidate?: Candidate;
  vehicle?: Vehicle;
}

export interface CandidateTest extends BaseModel {
  candidateId: string;
  tenantId: string;
  testNumber?: number;
  score?: number;
  passingScore: number;
  dateTaken?: string;
  isPassed?: boolean;
}

export interface Verification extends BaseModel {
  candidateId: string;
  tenantId: string;
  categoryId: string;
  verificationDate?: string;
  theoryHoursStart?: string;
  theoryHoursEnd?: string;
  practicalHoursStart?: string;
  practicalHoursEnd?: string;
  sequenceNumber?: string;
  lecturerId?: string;
  instructorId?: string;
  redCrossCert: boolean;
  idCardCopy: boolean;
  category?: Category;
  lecturer?: Instructor;
  instructor?: Instructor;
}

export interface Expense extends BaseModel {
  tenantId: string;
  vehicleId?: string;
  expenseTypeId: string;
  date: string;
  amount: number;
  description?: string;
  vehicle?: Vehicle;
  expenseType?: ExpenseType;
}

export interface ExpenseType extends BaseModel {
  tenantId: string;
  name: string;
  isActive: boolean;
}

export interface InstructorPayment extends BaseModel {
  tenantId: string;
  instructorId: string;
  candidateId: string;
  amount: number;
  amountPaid: number;
  paymentDate?: string;
  paymentMethod?: string;
  status: 'unpaid' | 'partial' | 'paid';
  remarks?: string;
  instructor?: Instructor;
  candidate?: Candidate;
}

export interface SupplementaryRegistration extends BaseModel {
  candidateId: string;
  tenantId: string;
  categoryId: string;
  categoryCode?: string;
  isAutomatic: boolean;
  price?: number;
  practicalHours?: number;
  theoryHours?: number;
  registrationDate: string;
}

export interface LastMessagePreview {
  content: string | null;
  senderId: string | null;
  senderName: string | null;
  createdAt: string | null;
}

export interface Conversation extends BaseModel {
  tenantId: string;
  subject: string;
  participantIds: string[];
  lastMessageAt?: string;
  createdBy: string;
  creatorName?: string;
  unreadCount?: number;
  lastMessage?: LastMessagePreview;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  recipientId?: string;
  senderName?: string;
  content: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
  sender?: {
    id: string;
    fullName: string;
    role: string;
  };
}

export interface AuditLog {
  id: string;
  tenantId?: string;
  userId: string;
  action: 'create' | 'update' | 'delete' | 'login' | 'impersonate';
  entityType?: string;
  entityId?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress?: string;
  createdAt: string;
  user?: User;
}

export interface Exam {
  id: string;
  tenantId: string;
  candidateId: string;
  examType: 'theory' | 'practical';
  examDate: string;
  score?: number | null;
  result: 'scheduled' | 'passed' | 'failed' | 'cancelled';
  attemptNumber: number;
  notes?: string | null;
  examinerName?: string | null;
  examLocation?: string | null;
  candidateName?: string;
  candidateCode?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExamEligibility {
  theoryEligible: boolean;
  theoryReason: string;
  practicalEligible: boolean;
  practicalReason: string;
  theoryHoursRealized: number;
  theoryHoursNeeded: number;
  practicalHoursRealized: number;
  practicalHoursNeeded: number;
  theoryExamPassed: boolean;
}
