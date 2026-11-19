import { Tenant } from "./mockData";

export interface TenantCycleInfo {
  cycleStart: Date;
  cycleEnd: Date;
  cycleLabel: string;
  nextCycleStart: Date;
  nextCycleEnd: Date;
  nextCycleLabel: string;
  isCurrentCyclePaid: boolean;
  isNextCycleDue: boolean;
  daysRemaining: number;
  isPastDue: boolean;
  pendingAmount: number;
}

/**
 * Adds exactly 1 month to a date, preserving the day of month (e.g., Nov 11 -> Dec 11)
 */
export function addOneMonth(date: Date): Date {
  const result = new Date(date);
  const targetMonth = result.getMonth() + 1;
  result.setMonth(targetMonth);
  // Handle edge case if month rollover occurred (e.g. Jan 31 -> Feb 28)
  if (result.getMonth() > targetMonth % 12) {
    result.setDate(0);
  }
  return result;
}

export function formatCycleDate(date: Date): string {
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

export function formatCycleDateFull(date: Date): string {
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Computes exact monthly cycle dates, due status and renewal information for a tenant
 */
export function getTenantCycleInfo(tenant: Tenant, referenceDate = new Date()): TenantCycleInfo {
  const checkInDate = new Date(tenant.checkIn || Date.now());
  const cycleStart = tenant.cycleStartDate ? new Date(tenant.cycleStartDate) : checkInDate;
  const cycleEnd = tenant.cycleEndDate ? new Date(tenant.cycleEndDate) : addOneMonth(cycleStart);

  const nextCycleStart = new Date(cycleEnd);
  const nextCycleEnd = addOneMonth(nextCycleStart);

  const cycleLabel = `${formatCycleDate(cycleStart)} – ${formatCycleDate(cycleEnd)}`;
  const nextCycleLabel = `${formatCycleDate(nextCycleStart)} – ${formatCycleDate(nextCycleEnd)}`;

  const diffTime = cycleEnd.getTime() - referenceDate.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const isPastDue = daysRemaining <= 0;

  // If current cycle is marked unpaid, they owe current cycle rent
  // If current cycle is paid, but the 1 month is completed (isPastDue or within 3 days), they owe next month rent if continuing
  const isCurrentCyclePaid = tenant.paid;
  const isNextCycleDue = isCurrentCyclePaid && isPastDue;

  let pendingAmount = 0;
  if (!isCurrentCyclePaid && tenant.status === "active") {
    pendingAmount = tenant.rentAmount;
  } else if (isNextCycleDue && tenant.status === "active") {
    pendingAmount = tenant.rentAmount;
  }

  return {
    cycleStart,
    cycleEnd,
    cycleLabel,
    nextCycleStart,
    nextCycleEnd,
    nextCycleLabel,
    isCurrentCyclePaid,
    isNextCycleDue,
    daysRemaining,
    isPastDue,
    pendingAmount,
  };
}
