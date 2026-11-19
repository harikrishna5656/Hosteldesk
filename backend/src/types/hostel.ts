export type HostelType = 'Boys' | 'Girls' | 'Co-ed';

export interface Hostel {
  id: string;
  owner_id: string;
  name: string;
  code: string;
  type: HostelType;
  address: string;
  city: string;
  state: string;
  pincode: string;
  contact_phone: string;
  contact_email: string;
  monthly_target_revenue?: number;
  created_at: string;
}

export interface HostelStaff {
  id: string;
  hostel_id: string;
  user_id: string;
  branch_role: 'warden' | 'manager' | 'accountant' | 'cleaner';
  permissions?: string[];
  assigned_at: string;
}

export interface HostelPortfolioSummary {
  totalHostels: number;
  totalRooms: number;
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  occupancyPercentage: number;
  totalMonthlyRevenue: number;
  totalMonthlyExpenses: number;
  totalPendingDues: number;
  branches: {
    id: string;
    name: string;
    code: string;
    type: HostelType;
    city: string;
    totalRooms: number;
    totalBeds: number;
    occupiedBeds: number;
    occupancyPercentage: number;
    monthlyRevenue: number;
    pendingDues: number;
  }[];
}
