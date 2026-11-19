export type Hostel = {
  id: string;
  name: string;
  code: string;
  type: "Boys" | "Girls" | "Co-ed";
  address: string;
  city: string;
  totalRooms?: number;
  totalBeds?: number;
  occupiedBeds?: number;
  contactPhone?: string;
};

export type Room = {
  id: string;
  hostelId: string;
  number: string;
  type: "Single" | "Double" | "Triple" | "Sharing";
  capacity: number;
  occupied: number;
  rent: number;
  floor: number;
  status: "available" | "occupied" | "maintenance";
};

export type Tenant = {
  id: string;
  hostelId: string;
  name: string;
  phone: string;
  email: string;
  roomNumber: string;
  checkIn: string;
  rentDue: string;
  rentAmount: number;
  cycleStartDate?: string;
  cycleEndDate?: string;
  remindersSent?: number;
  advanceAmount?: number;
  advancePaid?: boolean;
  advanceReturned?: boolean;
  advanceReturnDate?: string;
  advanceRefundAmount?: number;
  advanceNotes?: string;
  maintenanceDeduction?: number;
  negligencePenalty?: number;
  noticeStatus?: "proper_notice" | "short_notice" | "no_notice";
  status: "active" | "checkout-pending" | "left";
  paid: boolean;
  avatar?: string;
};

export type Expense = {
  id: string;
  hostelId: string;
  date: string;
  category: "Utilities" | "Maintenance" | "Salaries" | "Groceries" | "Other";
  amount: number;
  note: string;
};

export type Payment = {
  id: string;
  hostelId: string;
  tenantName: string;
  roomNumber: string;
  amount: number;
  method: "Cash" | "UPI" | "Bank Transfer";
  date: string;
  type?: "Rent" | "Advance" | "Advance Refund";
  notes?: string;
};

export const initialHostels: Hostel[] = [];

export const rooms: Room[] = [];

export const tenants: Tenant[] = [];

export const expenses: Expense[] = [];

export const payments: Payment[] = [];

export const monthlyRevenue: { month: string; revenue: number; expenses: number }[] = [];

export const formatINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
