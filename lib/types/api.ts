import type { InstructorPayment, ScheduledLesson, User } from './models';

// API response envelope types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export interface ApiError {
  success: false;
  error: {
    message: string;
    details?: Array<{ field: string; message: string }>;
  };
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
}

// Alternative pagination format
export interface PaginatedData<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
}

// Dashboard types
export interface RecentCandidate {
  id: string;
  fullName: string;
  registrationDate: string | null;
  categoryCode: string | null;
  isArchived: boolean;
}

export interface DashboardStats {
  totalCandidates: number;
  activeCandidates: number;
  archivedCandidates: number;
  activeCandidatesTrend: number;
  totalRevenue: number;
  monthlyRevenue: number;
  monthlyRevenueTrend: number;
  pendingPayments: number;
  practicalHoursToday: number;
  instructorTotalDebt: number;
  recentCandidates: RecentCandidate[];
}

export interface CategoryBreakdown {
  category: string;
  count: number;
  percentage: number;
}

export interface DashboardAlert {
  type: 'expiring_registration' | 'expiring_technical_control' | 'expiring_insurance' | 'expiring_instructor_license' | 'overdue_payment' | 'instructor_high_debt';
  message: string;
  entityId: string;
  severity: 'warning' | 'error' | 'info';
}

export interface PaymentSummary {
  totalAmount: number;
  totalByMethod: Record<string, number>;
  totalSupplementary: number;
  count: number;
}

export interface ExpenseSummary {
  totalAmount: number;
  totalCount: number;
  byType: Record<string, number>;
  byVehicle: Record<string, number>;
}

export interface InstructorDebtSummary {
  instructorId: string;
  instructorName: string;
  totalCandidates: number;
  totalAmountOwed: number;
  totalAmountPaid: number;
  outstandingBalance: number;
  costPerCandidate: number;
  payments?: InstructorPayment[];
}

export interface InstructorDashboard {
  activeCandidates: number;
  lessonsToday: number;
  outstandingDebt: number;
  unreadMessages: number;
  upcomingLessons: ScheduledLesson[];
}

// Auth types
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface RefreshResponse {
  accessToken: string;
  expiresIn: number;
}

// Super admin types
export interface GlobalStats {
  totalTenants: number;
  activeTenants: number;
  totalUsers: number;
  totalCandidates: number;
  activeCandidates: number;
  archivedCandidates: number;
  timestamp: string;
}
