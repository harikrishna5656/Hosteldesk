import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "./auth";
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

import { API_URL } from "./apiConfig";

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
  refreshData: () => Promise<void>;
}

const HostelContext = createContext<HostelContextType | undefined>(undefined);

const isUUID = (str: any): boolean =>
  typeof str === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str.trim());

const generateUUID = (): string => {
  if (typeof window !== "undefined" && window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

// Helper to detect and purge legacy mock seeds
const isLegacySeed = (list: any[]) =>
  Array.isArray(list) &&
  list.some(
    (item) =>
      item?.id === "h_sunrise" ||
      item?.id === "h_greenvalley" ||
      item?.hostelId === "h_sunrise" ||
      item?.id === "r1" ||
      item?.id === "t1" ||
      (typeof item?.id === "string" && item.id.startsWith("h_179"))
  );

export function HostelProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();

  // Helper for auth headers
  const getAuthHeaders = useCallback((): HeadersInit => {
    return {
      "Content-Type": "application/json",
      ...(user?.token ? { Authorization: `Bearer ${user.token}` } : {}),
    };
  }, [user?.token]);

  // 1. Hostels state (strictly isolated per authenticated user)
  const [hostels, setHostels] = useState<Hostel[]>([]);

  // 2. Active Hostel Selection ('all' or specific hostel UUID)
  const [activeHostelId, setActiveHostelIdState] = useState<string | "all">("all");

  // 3. Domain entities state
  const [roomsList, setRoomsList] = useState<Room[]>([]);
  const [tenantsList, setTenantsList] = useState<Tenant[]>([]);
  const [paymentsList, setPaymentsList] = useState<Payment[]>([]);
  const [expensesList, setExpensesList] = useState<Expense[]>([]);

  // Reset or load state whenever authenticated user switches (multitenant client isolation)
  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      setHostels([]);
      setActiveHostelIdState("all");
      setRoomsList([]);
      setTenantsList([]);
      setPaymentsList([]);
      setExpensesList([]);
      return;
    }

    // Load cached data specifically scoped to this user
    try {
      const uKey = `hostelpms_${user.id}_`;
      const storedHostels = localStorage.getItem(`${uKey}hostels`);
      const storedRooms = localStorage.getItem(`${uKey}rooms`);
      const storedTenants = localStorage.getItem(`${uKey}tenants`);
      const storedPayments = localStorage.getItem(`${uKey}payments`);
      const storedExpenses = localStorage.getItem(`${uKey}expenses`);
      const storedActiveId = localStorage.getItem(`${uKey}active_hostel_id`);

      setHostels(storedHostels ? JSON.parse(storedHostels) : []);
      setRoomsList(storedRooms ? JSON.parse(storedRooms) : []);
      setTenantsList(storedTenants ? JSON.parse(storedTenants) : []);
      setPaymentsList(storedPayments ? JSON.parse(storedPayments) : []);
      setExpensesList(storedExpenses ? JSON.parse(storedExpenses) : []);
      setActiveHostelIdState(storedActiveId && isUUID(storedActiveId) ? storedActiveId : "all");
    } catch {}
  }, [user?.id, isAuthenticated]);

  // Synchronize state with User-Scoped LocalStorage
  useEffect(() => {
    if (!user?.id || !isAuthenticated) return;
    try {
      const uKey = `hostelpms_${user.id}_`;
      localStorage.setItem(`${uKey}hostels`, JSON.stringify(hostels));
      localStorage.setItem(`${uKey}active_hostel_id`, activeHostelId);
      localStorage.setItem(`${uKey}rooms`, JSON.stringify(roomsList));
      localStorage.setItem(`${uKey}tenants`, JSON.stringify(tenantsList));
      localStorage.setItem(`${uKey}payments`, JSON.stringify(paymentsList));
      localStorage.setItem(`${uKey}expenses`, JSON.stringify(expensesList));
    } catch {}
  }, [user?.id, isAuthenticated, hostels, activeHostelId, roomsList, tenantsList, paymentsList, expensesList]);

  // LIVE DATABASE FETCH FUNCTION (Strictly scoped with JWT Authorization)
  const refreshData = useCallback(async () => {
    if (!API_URL || !isAuthenticated || !user?.token) return;

    try {
      const headers = { Authorization: `Bearer ${user.token}` };

      // 1. Fetch Hostels from Supabase (strictly scoped to this owner)
      const hRes = await fetch(`${API_URL}/api/hostels`, { headers });
      if (hRes.ok) {
        const hData = await hRes.json();
        if (Array.isArray(hData)) {
          setHostels(hData);
        }
      }

      const hostelParam = isUUID(activeHostelId) ? `?hostelId=${activeHostelId}` : "";

      // 2. Fetch Rooms from Supabase
      const rRes = await fetch(`${API_URL}/api/rooms${hostelParam}`, { headers });
      if (rRes.ok) {
        const rData = await rRes.json();
        if (Array.isArray(rData)) {
          setRoomsList(rData);
        }
      }

      // 3. Fetch Tenants from Supabase
      const tRes = await fetch(`${API_URL}/api/tenants${hostelParam}`, { headers });
      if (tRes.ok) {
        const tData = await tRes.json();
        if (Array.isArray(tData)) {
          setTenantsList(tData);
        }
      }

      // 4. Fetch Payments from Supabase
      const pRes = await fetch(`${API_URL}/api/payments${hostelParam}`, { headers });
      if (pRes.ok) {
        const pData = await pRes.json();
        if (Array.isArray(pData)) {
          setPaymentsList(pData);
        }
      }

      // 5. Fetch Expenses from Supabase
      const eRes = await fetch(`${API_URL}/api/expenses${hostelParam}`, { headers });
      if (eRes.ok) {
        const eData = await eRes.json();
        if (Array.isArray(eData)) {
          setExpensesList(eData);
        }
      }
    } catch (err) {
      console.warn("[HostelContext] Live API sync offline/unreachable:", err);
    }
  }, [activeHostelId, isAuthenticated, user?.token]);

  // Trigger live API fetch on mount and whenever active property or user switches
  useEffect(() => {
    if (isAuthenticated && user?.token) {
      refreshData();
    }
  }, [refreshData, isAuthenticated, user?.token]);

  // Fallback active property
  useEffect(() => {
    if (activeHostelId !== "all" && hostels.length > 0 && !hostels.some((h) => h.id === activeHostelId)) {
      setActiveHostelIdState("all");
    }
  }, [hostels, activeHostelId]);

  const setActiveHostelId = useCallback((id: string | "all") => {
    setActiveHostelIdState(id);
  }, []);

  const isPortfolioView = activeHostelId === "all";

  const activeHostel = useMemo(() => {
    if (activeHostelId === "all") return null;
    return hostels.find((h) => h.id === activeHostelId) || null;
  }, [hostels, activeHostelId]);

  const currentHostelId = useMemo(() => {
    return activeHostelId === "all" ? hostels[0]?.id : activeHostelId;
  }, [activeHostelId, hostels]);

  // Dynamically reconcile room occupied count with active residents
  const reconciledRoomsList = useMemo(() => {
    return roomsList.map((room) => {
      const activeResidentsInRoom = tenantsList.filter(
        (tenant) =>
          (!tenant.hostelId || !room.hostelId || tenant.hostelId === room.hostelId) &&
          String(tenant.roomNumber).trim() === String(room.number).trim() &&
          tenant.status !== "left"
      );
      const computedOccupied = Math.min(room.capacity, Math.max(room.occupied || 0, activeResidentsInRoom.length));
      const status: Room["status"] =
        room.status === "maintenance"
          ? "maintenance"
          : computedOccupied >= room.capacity
          ? "occupied"
          : "available";

      return {
        ...room,
        occupied: computedOccupied,
        status,
      };
    });
  }, [roomsList, tenantsList]);

  // Filtered collections
  const rooms = useMemo(() => {
    if (activeHostelId === "all") return reconciledRoomsList;
    return reconciledRoomsList.filter((r) => r.hostelId === activeHostelId);
  }, [reconciledRoomsList, activeHostelId]);

  const tenants = useMemo(() => {
    if (activeHostelId === "all") return tenantsList;
    return tenantsList.filter((t) => t.hostelId === activeHostelId);
  }, [tenantsList, activeHostelId]);

  const payments = useMemo(() => {
    if (activeHostelId === "all") return paymentsList;
    return paymentsList.filter((p) => p.hostelId === activeHostelId);
  }, [paymentsList, activeHostelId]);

  const expenses = useMemo(() => {
    if (activeHostelId === "all") return expensesList;
    return expensesList.filter((e) => e.hostelId === activeHostelId);
  }, [expensesList, activeHostelId]);

  // MUTATIONS (Optimistic UI update + Live Backend/Supabase API sync)

  const addHostel = useCallback(
    async (newHostelData: Omit<Hostel, "id">) => {
      const newHostel: Hostel = {
        ...newHostelData,
        id: generateUUID(),
      };
      setHostels((prev) => [...prev, newHostel]);
      setActiveHostelIdState(newHostel.id);

      if (API_URL) {
        try {
          const res = await fetch(`${API_URL}/api/hostels`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify(newHostelData),
          });
          if (res.ok) {
            const saved = await res.json();
            setHostels((prev) => [...prev.filter((h) => h.id !== newHostel.id), saved]);
            setActiveHostelIdState(saved.id);
          }
        } catch {}
      }
    },
    [getAuthHeaders]
  );

  const addRoom = useCallback(
    async (roomData: Omit<Room, "id" | "hostelId"> & { hostelId?: string }) => {
      const targetHostelId = roomData.hostelId || currentHostelId || hostels[0]?.id || "";
      const tempId = "r_" + Date.now();
      const newRoom: Room = {
        ...roomData,
        id: tempId,
        hostelId: targetHostelId,
      };
      setRoomsList((prev) => [...prev, newRoom]);

      if (API_URL) {
        try {
          const res = await fetch(`${API_URL}/api/rooms`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({ ...roomData, hostelId: targetHostelId }),
          });
          if (res.ok) {
            const saved = await res.json();
            setRoomsList((prev) => [...prev.filter((r) => r.id !== tempId), saved]);
          }
        } catch {}
      }
    },
    [currentHostelId, hostels, getAuthHeaders]
  );

  const updateRoom = useCallback(async (room: Room) => {
    setRoomsList((prev) => prev.map((r) => (r.id === room.id ? room : r)));

    if (API_URL && !room.id.startsWith("r_")) {
      try {
        await fetch(`${API_URL}/api/rooms/${room.id}`, {
          method: "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify(room),
        });
      } catch {}
    }
  }, [getAuthHeaders]);

  const canDeleteRoom = useCallback(
    (roomId: string): { allowed: boolean; reason?: string; activeCount: number } => {
      const room = roomsList.find((r) => r.id === roomId);
      if (!room) return { allowed: false, reason: "Room not found", activeCount: 0 };
      const activeTenantsInRoom = tenantsList.filter(
        (t) =>
          (!t.hostelId || t.hostelId === room.hostelId) &&
          String(t.roomNumber) === String(room.number) &&
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

      if (API_URL && !id.startsWith("r_")) {
        fetch(`${API_URL}/api/rooms/${id}`, {
          method: "DELETE",
          headers: getAuthHeaders(),
        }).catch(() => {});
      }
      return { success: true };
    },
    [canDeleteRoom, getAuthHeaders]
  );

  const addTenant = useCallback(
    async (tenantData: Omit<Tenant, "id" | "hostelId"> & { hostelId?: string }) => {
      const targetHostelId = tenantData.hostelId || currentHostelId || hostels[0]?.id || "";
      const tempId = "t_" + Date.now();
      const newTenant: Tenant = {
        ...tenantData,
        id: tempId,
        hostelId: targetHostelId,
      };

      // Optimistic update
      setTenantsList((prev) => [newTenant, ...prev]);

      // Automatically update room's occupied bed count
      setRoomsList((prev) =>
        prev.map((r) => {
          if (r.hostelId === targetHostelId && String(r.number) === String(newTenant.roomNumber)) {
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

      // Auto record advance if paid
      if (newTenant.advancePaid && Number(newTenant.advanceAmount) > 0) {
        const advancePayment: Payment = {
          id: "p_adv_" + Date.now(),
          hostelId: targetHostelId,
          tenantName: newTenant.name,
          roomNumber: newTenant.roomNumber,
          amount: Number(newTenant.advanceAmount),
          method: "UPI",
          type: "Advance",
          notes: "Security Deposit advance paid during check-in",
          date: new Date().toISOString().split("T")[0],
        };
        setPaymentsList((prev) => [advancePayment, ...prev]);
      }

      // Live Backend / Supabase API Call
      if (API_URL) {
        try {
          const res = await fetch(`${API_URL}/api/tenants`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({ ...tenantData, hostelId: targetHostelId }),
          });
          if (res.ok) {
            const saved = await res.json();
            setTenantsList((prev) => [...prev.filter((t) => t.id !== tempId), saved]);
          }
        } catch {}
      }
    },
    [currentHostelId, hostels, getAuthHeaders]
  );

  const updateTenant = useCallback(async (updatedTenant: Tenant) => {
    setTenantsList((prev) => {
      const oldTenant = prev.find((t) => t.id === updatedTenant.id);

      // Check if checkout occurred
      if (oldTenant && oldTenant.status !== "left" && updatedTenant.status === "left") {
        setRoomsList((rooms) =>
          rooms.map((r) => {
            const matchesHostel = !updatedTenant.hostelId || r.hostelId === updatedTenant.hostelId;
            if (matchesHostel && String(r.number) === String(updatedTenant.roomNumber)) {
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

      return prev.map((t) => (t.id === updatedTenant.id ? updatedTenant : t));
    });

    if (API_URL && !updatedTenant.id.startsWith("t_")) {
      try {
        await fetch(`${API_URL}/api/tenants/${updatedTenant.id}`, {
          method: "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify(updatedTenant),
        });
      } catch {}
    }
  }, [getAuthHeaders]);

  const deleteTenant = useCallback((id: string) => {
    setTenantsList((prev) => {
      const tenantToDelete = prev.find((t) => t.id === id);
      if (tenantToDelete && tenantToDelete.status !== "left") {
        setRoomsList((rooms) =>
          rooms.map((r) => {
            const matchesHostel = !tenantToDelete.hostelId || r.hostelId === tenantToDelete.hostelId;
            if (matchesHostel && String(r.number) === String(tenantToDelete.roomNumber)) {
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
      return prev.filter((t) => t.id !== id);
    });

    if (API_URL && !id.startsWith("t_")) {
      fetch(`${API_URL}/api/tenants/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      }).catch(() => {});
    }
  }, [getAuthHeaders]);

  const addPayment = useCallback(
    async (paymentData: Omit<Payment, "id" | "hostelId"> & { hostelId?: string }) => {
      const targetHostelId = paymentData.hostelId || currentHostelId || hostels[0]?.id || "";
      const tempId = "p_" + Date.now();
      const newPayment: Payment = {
        ...paymentData,
        id: tempId,
        hostelId: targetHostelId,
      };
      setPaymentsList((prev) => [newPayment, ...prev]);

      if (API_URL) {
        try {
          const res = await fetch(`${API_URL}/api/payments`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({ ...paymentData, hostelId: targetHostelId }),
          });
          if (res.ok) {
            const saved = await res.json();
            setPaymentsList((prev) => [...prev.filter((p) => p.id !== tempId), saved]);
          }
        } catch {}
      }
    },
    [currentHostelId, hostels, getAuthHeaders]
  );

  const addExpense = useCallback(
    async (expenseData: Omit<Expense, "id" | "hostelId"> & { hostelId?: string }) => {
      const targetHostelId = expenseData.hostelId || currentHostelId || hostels[0]?.id || "";
      const tempId = "e_" + Date.now();
      const newExpense: Expense = {
        ...expenseData,
        id: tempId,
        hostelId: targetHostelId,
      };
      setExpensesList((prev) => [newExpense, ...prev]);

      if (API_URL) {
        try {
          const res = await fetch(`${API_URL}/api/expenses`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({ ...expenseData, hostelId: targetHostelId }),
          });
          if (res.ok) {
            const saved = await res.json();
            setExpensesList((prev) => [...prev.filter((e) => e.id !== tempId), saved]);
          }
        } catch {}
      }
    },
    [currentHostelId, hostels, getAuthHeaders]
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
        refreshData,
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
