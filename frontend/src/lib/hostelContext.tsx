import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import {
  Hostel,
  Room,
  Tenant,
  Payment,
  Expense,
  initialHostels,
  rooms as initialRooms,
  tenants as initialTenants,
  payments as initialPayments,
  expenses as initialExpenses,
} from "./mockData";

interface HostelContextType {
  hostels: Hostel[];
  activeHostelId: string | "all";
  activeHostel: Hostel | null;
  isPortfolioView: boolean;
  setActiveHostelId: (id: string | "all") => void;
  addHostel: (hostel: Omit<Hostel, "id">) => void;
  
  // Scoped Data Collections
  rooms: Room[];
  allRooms: Room[];
  tenants: Tenant[];
  allTenants: Tenant[];
  payments: Payment[];
  allPayments: Payment[];
  expenses: Expense[];
  allExpenses: Expense[];

  // Mutations
  addRoom: (room: Omit<Room, "id" | "hostelId"> & { hostelId?: string }) => void;
  updateRoom: (room: Room) => void;
  deleteRoom: (id: string) => { success: boolean; error?: string };
  canDeleteRoom: (roomId: string) => { allowed: boolean; reason?: string; activeCount: number };

  addTenant: (tenant: Omit<Tenant, "id" | "hostelId"> & { hostelId?: string }) => void;
  updateTenant: (tenant: Tenant) => void;
  deleteTenant: (id: string) => void;

  addPayment: (payment: Omit<Payment, "id" | "hostelId"> & { hostelId?: string }) => void;
  addExpense: (expense: Omit<Expense, "id" | "hostelId"> & { hostelId?: string }) => void;
}

const HostelContext = createContext<HostelContextType | undefined>(undefined);

// Helper to detect and purge legacy mock seeds from previous sessions
const isLegacySeed = (list: any[]) =>
  Array.isArray(list) &&
  list.some(
    (item) =>
      item?.id === "h_sunrise" ||
      item?.id === "h_greenvalley" ||
      item?.hostelId === "h_sunrise" ||
      item?.id === "r1" ||
      item?.id === "t1"
  );

export function HostelProvider({ children }: { children: React.ReactNode }) {
  // 1. Hostels state
  const [hostels, setHostels] = useState<Hostel[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("hostelpms_hostels");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (!isLegacySeed(parsed)) return parsed;
        }
      } catch {}
    }
    return initialHostels;
  });

  // 2. Active Hostel Selection ('all' or specific hostel ID)
  const [activeHostelId, setActiveHostelIdState] = useState<string | "all">(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("hostelpms_active_hostel_id");
        if (stored && stored !== "h_sunrise" && stored !== "h_greenvalley" && stored !== "h_metro") {
          return stored;
        }
      } catch {}
    }
    return "all";
  });

  // 3. Domain entities state
  const [roomsList, setRoomsList] = useState<Room[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("hostelpms_rooms");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (!isLegacySeed(parsed)) return parsed;
        }
      } catch {}
    }
    return initialRooms;
  });

  const [tenantsList, setTenantsList] = useState<Tenant[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("hostelpms_tenants");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (!isLegacySeed(parsed)) return parsed;
        }
      } catch {}
    }
    return initialTenants;
  });

  const [paymentsList, setPaymentsList] = useState<Payment[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("hostelpms_payments");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (!isLegacySeed(parsed)) return parsed;
        }
      } catch {}
    }
    return initialPayments;
  });

  const [expensesList, setExpensesList] = useState<Expense[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("hostelpms_expenses");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (!isLegacySeed(parsed)) return parsed;
        }
      } catch {}
    }
    return initialExpenses;
  });

  // Synchronize state with LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem("hostelpms_hostels", JSON.stringify(hostels));
      localStorage.setItem("hostelpms_active_hostel_id", activeHostelId);
      localStorage.setItem("hostelpms_rooms", JSON.stringify(roomsList));
      localStorage.setItem("hostelpms_tenants", JSON.stringify(tenantsList));
      localStorage.setItem("hostelpms_payments", JSON.stringify(paymentsList));
      localStorage.setItem("hostelpms_expenses", JSON.stringify(expensesList));
    } catch {}
  }, [hostels, activeHostelId, roomsList, tenantsList, paymentsList, expensesList]);

  const setActiveHostelId = useCallback((id: string | "all") => {
    setActiveHostelIdState(id);
  }, []);

  const activeHostel = useMemo(() => {
    if (activeHostelId === "all") return null;
    return hostels.find((h) => h.id === activeHostelId) || hostels[0] || null;
  }, [hostels, activeHostelId]);

  const isPortfolioView = activeHostelId === "all";

  // Filtered scoped collections
  const currentHostelId = activeHostel?.id || hostels[0]?.id || "";

  const rooms = useMemo(() => {
    const list = isPortfolioView ? roomsList : roomsList.filter((r) => r.hostelId === activeHostelId);
    return list.map((r) => {
      const activeCount = tenantsList.filter(
        (t) =>
          (!t.hostelId || t.hostelId === r.hostelId) &&
          t.roomNumber === r.number &&
          t.status !== "left"
      ).length;
      const actualOccupied = Math.max(r.occupied, activeCount);
      const status: Room["status"] =
        r.status === "maintenance"
          ? "maintenance"
          : actualOccupied >= r.capacity
          ? "occupied"
          : "available";
      return {
        ...r,
        occupied: actualOccupied,
        status,
      };
    });
  }, [roomsList, tenantsList, activeHostelId, isPortfolioView]);

  const allRooms = useMemo(() => {
    return roomsList.map((r) => {
      const activeCount = tenantsList.filter(
        (t) =>
          (!t.hostelId || t.hostelId === r.hostelId) &&
          t.roomNumber === r.number &&
          t.status !== "left"
      ).length;
      const actualOccupied = Math.max(r.occupied, activeCount);
      const status: Room["status"] =
        r.status === "maintenance"
          ? "maintenance"
          : actualOccupied >= r.capacity
          ? "occupied"
          : "available";
      return {
        ...r,
        occupied: actualOccupied,
        status,
      };
    });
  }, [roomsList, tenantsList]);

  const tenants = useMemo(() => {
    if (isPortfolioView) return tenantsList;
    return tenantsList.filter((t) => t.hostelId === activeHostelId);
  }, [tenantsList, activeHostelId, isPortfolioView]);

  const payments = useMemo(() => {
    if (isPortfolioView) return paymentsList;
    return paymentsList.filter((p) => p.hostelId === activeHostelId);
  }, [paymentsList, activeHostelId, isPortfolioView]);

  const expenses = useMemo(() => {
    if (isPortfolioView) return expensesList;
    return expensesList.filter((e) => e.hostelId === activeHostelId);
  }, [expensesList, activeHostelId, isPortfolioView]);

  // Mutations
  const addHostel = useCallback((newHostelData: Omit<Hostel, "id">) => {
    const newHostel: Hostel = {
      ...newHostelData,
      id: "h_" + Date.now(),
    };
    setHostels((prev) => [...prev, newHostel]);
    setActiveHostelIdState(newHostel.id);
  }, []);

  const addRoom = useCallback(
    (roomData: Omit<Room, "id" | "hostelId"> & { hostelId?: string }) => {
      const targetHostelId = roomData.hostelId || currentHostelId || hostels[0]?.id || "";
      const newRoom: Room = {
        ...roomData,
        id: "r_" + Date.now(),
        hostelId: targetHostelId,
      };
      setRoomsList((prev) => [...prev, newRoom]);
    },
    [currentHostelId, hostels]
  );

  const updateRoom = useCallback((room: Room) => {
    setRoomsList((prev) => prev.map((r) => (r.id === room.id ? room : r)));
  }, []);

  const canDeleteRoom = useCallback(
    (roomId: string): { allowed: boolean; reason?: string; activeCount: number } => {
      const room = roomsList.find((r) => r.id === roomId);
      if (!room) return { allowed: false, reason: "Room not found", activeCount: 0 };
      const activeTenantsInRoom = tenantsList.filter(
        (t) =>
          (!t.hostelId || t.hostelId === room.hostelId) &&
          t.roomNumber === room.number &&
          t.status !== "left"
      );
      if (room.occupied > 0 || activeTenantsInRoom.length > 0) {
        const count = Math.max(room.occupied, activeTenantsInRoom.length);
        return {
          allowed: false,
          activeCount: count,
          reason: `Cannot delete Room ${room.number}: It has ${count} occupied resident(s). All tenants must vacate or check out before this room can be deleted.`,
        };
      }
      return { allowed: true, activeCount: 0 };
    },
    [roomsList, tenantsList]
  );

  const deleteRoom = useCallback(
    (id: string): { success: boolean; error?: string } => {
      const check = canDeleteRoom(id);
      if (!check.allowed) {
        return { success: false, error: check.reason };
      }
      setRoomsList((prev) => prev.filter((r) => r.id !== id));
      return { success: true };
    },
    [canDeleteRoom]
  );

  const addTenant = useCallback(
    (tenantData: Omit<Tenant, "id" | "hostelId"> & { hostelId?: string }) => {
      const targetHostelId = tenantData.hostelId || currentHostelId || hostels[0]?.id || "";
      const newTenant: Tenant = {
        ...tenantData,
        id: "t_" + Date.now(),
        hostelId: targetHostelId,
      };

      // 1. Add tenant to list
      setTenantsList((prev) => [...prev, newTenant]);

      // 2. Automatically update corresponding room's occupied bed count and occupancy status
      setRoomsList((prev) =>
        prev.map((r) => {
          if (r.hostelId === targetHostelId && r.number === newTenant.roomNumber) {
            const newOccupied = r.occupied + 1;
            const newStatus =
              r.status === "maintenance"
                ? "maintenance"
                : newOccupied >= r.capacity
                ? "occupied"
                : "available";
            return {
              ...r,
              occupied: newOccupied,
              status: newStatus,
            };
          }
          return r;
        })
      );
    },
    [currentHostelId, hostels]
  );

  const updateTenant = useCallback((updatedTenant: Tenant) => {
    setTenantsList((prev) => {
      const oldTenant = prev.find((t) => t.id === updatedTenant.id);

      // Check if checkout occurred (active / checkout-pending -> left)
      if (oldTenant && oldTenant.status !== "left" && updatedTenant.status === "left") {
        setRoomsList((rooms) =>
          rooms.map((r) => {
            const matchesHostel = !updatedTenant.hostelId || r.hostelId === updatedTenant.hostelId;
            if (matchesHostel && r.number === updatedTenant.roomNumber) {
              const newOccupied = Math.max(0, r.occupied - 1);
              const newStatus =
                r.status === "maintenance"
                  ? "maintenance"
                  : newOccupied >= r.capacity
                  ? "occupied"
                  : "available";
              return {
                ...r,
                occupied: newOccupied,
                status: newStatus,
              };
            }
            return r;
          })
        );
      }

      // Check if room transfer occurred (e.g. moved from Room 101 to Room 102)
      if (
        oldTenant &&
        oldTenant.status !== "left" &&
        updatedTenant.status !== "left" &&
        (oldTenant.roomNumber !== updatedTenant.roomNumber || oldTenant.hostelId !== updatedTenant.hostelId)
      ) {
        setRoomsList((rooms) =>
          rooms.map((r) => {
            if (r.hostelId === oldTenant.hostelId && r.number === oldTenant.roomNumber) {
              const newOccupied = Math.max(0, r.occupied - 1);
              return {
                ...r,
                occupied: newOccupied,
                status: r.status === "maintenance" ? "maintenance" : newOccupied >= r.capacity ? "occupied" : "available",
              };
            }
            if (r.hostelId === updatedTenant.hostelId && r.number === updatedTenant.roomNumber) {
              const newOccupied = r.occupied + 1;
              return {
                ...r,
                occupied: newOccupied,
                status: r.status === "maintenance" ? "maintenance" : newOccupied >= r.capacity ? "occupied" : "available",
              };
            }
            return r;
          })
        );
      }

      return prev.map((t) => (t.id === updatedTenant.id ? updatedTenant : t));
    });
  }, []);

  const deleteTenant = useCallback((id: string) => {
    setTenantsList((prev) => {
      const tenantToDelete = prev.find((t) => t.id === id);
      if (tenantToDelete && tenantToDelete.status !== "left") {
        setRoomsList((rooms) =>
          rooms.map((r) => {
            const matchesHostel = !tenantToDelete.hostelId || r.hostelId === tenantToDelete.hostelId;
            if (matchesHostel && r.number === tenantToDelete.roomNumber) {
              const newOccupied = Math.max(0, r.occupied - 1);
              return {
                ...r,
                occupied: newOccupied,
                status: r.status === "maintenance" ? "maintenance" : newOccupied >= r.capacity ? "occupied" : "available",
              };
            }
            return r;
          })
        );
      }
      return prev.filter((t) => t.id !== id);
    });
  }, []);

  const addPayment = useCallback(
    (paymentData: Omit<Payment, "id" | "hostelId"> & { hostelId?: string }) => {
      const targetHostelId = paymentData.hostelId || currentHostelId || hostels[0]?.id || "";
      const newPayment: Payment = {
        ...paymentData,
        id: "p_" + Date.now(),
        hostelId: targetHostelId,
      };
      setPaymentsList((prev) => [newPayment, ...prev]);
    },
    [currentHostelId, hostels]
  );

  const addExpense = useCallback(
    (expenseData: Omit<Expense, "id" | "hostelId"> & { hostelId?: string }) => {
      const targetHostelId = expenseData.hostelId || currentHostelId || hostels[0]?.id || "";
      const newExpense: Expense = {
        ...expenseData,
        id: "e_" + Date.now(),
        hostelId: targetHostelId,
      };
      setExpensesList((prev) => [newExpense, ...prev]);
    },
    [currentHostelId, hostels]
  );

  return (
    <HostelContext.Provider
      value={{
        hostels,
        activeHostelId,
        activeHostel,
        isPortfolioView,
        setActiveHostelId,
        addHostel,
        rooms,
        allRooms: roomsList,
        tenants,
        allTenants: tenantsList,
        payments,
        allPayments: paymentsList,
        expenses,
        allExpenses: expensesList,
        addRoom,
        updateRoom,
        deleteRoom,
        canDeleteRoom,
        addTenant,
        updateTenant,
        deleteTenant,
        addPayment,
        addExpense,
      }}
    >
      {children}
    </HostelContext.Provider>
  );
}

export function useHostel() {
  const context = useContext(HostelContext);
  if (!context) {
    throw new Error("useHostel must be used within a HostelProvider");
  }
  return context;
}
