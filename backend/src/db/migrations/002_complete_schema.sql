-- ====================================================================
-- HostelDesk / Hostel PMS Complete Database Schema
-- Run this in your Supabase SQL Editor (SQL Editor -> New Query -> Run)
-- ====================================================================

-- 0. Enable Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ====================================================================
-- 1. USERS TABLE (Owners & Managers)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    global_role VARCHAR(50) DEFAULT 'owner' CHECK (global_role IN ('owner', 'superadmin', 'staff')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- ====================================================================
-- 2. HOSTELS TABLE (Multi-Property Branches)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.hostels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    type VARCHAR(50) NOT NULL DEFAULT 'Boys' CHECK (type IN ('Boys', 'Girls', 'Co-ed')),
    address TEXT NOT NULL DEFAULT '',
    city VARCHAR(100) NOT NULL DEFAULT 'Hyderabad',
    state VARCHAR(100) NOT NULL DEFAULT 'Telangana',
    pincode VARCHAR(20) NOT NULL DEFAULT '',
    contact_phone VARCHAR(50) NOT NULL DEFAULT '',
    contact_email VARCHAR(255) NOT NULL DEFAULT '',
    monthly_target_revenue NUMERIC(12, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hostels_owner_id ON public.hostels(owner_id);
CREATE INDEX IF NOT EXISTS idx_hostels_code ON public.hostels(code);

-- ====================================================================
-- 3. HOSTEL STAFF TABLE (RBAC: Wardens, Managers, Staff)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.hostel_staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hostel_id UUID NOT NULL REFERENCES public.hostels(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    branch_role VARCHAR(50) NOT NULL CHECK (branch_role IN ('warden', 'manager', 'accountant', 'cleaner')),
    permissions JSONB DEFAULT '[]'::jsonb,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (hostel_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_hostel_staff_hostel ON public.hostel_staff(hostel_id);
CREATE INDEX IF NOT EXISTS idx_hostel_staff_user ON public.hostel_staff(user_id);

-- ====================================================================
-- 4. ROOMS TABLE (Floor & Bed Management)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hostel_id UUID NOT NULL REFERENCES public.hostels(id) ON DELETE CASCADE,
    room_number VARCHAR(50) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'Double' CHECK (type IN ('Single', 'Double', 'Triple', 'Sharing')),
    capacity INTEGER NOT NULL DEFAULT 1,
    occupied INTEGER NOT NULL DEFAULT 0,
    rent NUMERIC(10, 2) NOT NULL DEFAULT 0,
    floor INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(50) NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'maintenance')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (hostel_id, room_number)
);

CREATE INDEX IF NOT EXISTS idx_rooms_hostel_id ON public.rooms(hostel_id);
CREATE INDEX IF NOT EXISTS idx_rooms_floor ON public.rooms(hostel_id, floor);

-- ====================================================================
-- 5. TENANTS TABLE (Residents, Billing Cycles, Security Advance & Vacate)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hostel_id UUID NOT NULL REFERENCES public.hostels(id) ON DELETE CASCADE,
    room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
    room_number VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL,
    check_in DATE NOT NULL DEFAULT CURRENT_DATE,
    rent_due DATE NOT NULL,
    rent_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    cycle_start_date DATE,
    cycle_end_date DATE,
    reminders_sent INTEGER NOT NULL DEFAULT 0,
    advance_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    advance_paid BOOLEAN NOT NULL DEFAULT false,
    advance_returned BOOLEAN NOT NULL DEFAULT false,
    advance_return_date DATE,
    advance_refund_amount NUMERIC(10, 2),
    advance_notes TEXT,
    maintenance_deduction NUMERIC(10, 2) NOT NULL DEFAULT 0,
    negligence_penalty NUMERIC(10, 2) NOT NULL DEFAULT 0,
    notice_status VARCHAR(50) CHECK (notice_status IN ('proper_notice', 'short_notice', 'no_notice')),
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'checkout-pending', 'left')),
    paid BOOLEAN NOT NULL DEFAULT false,
    avatar TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenants_hostel_id ON public.tenants(hostel_id);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON public.tenants(status);
CREATE INDEX IF NOT EXISTS idx_tenants_room_id ON public.tenants(room_id);

-- ====================================================================
-- 6. PAYMENTS TABLE (Rent Collections, Advance, Refunds)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hostel_id UUID NOT NULL REFERENCES public.hostels(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
    tenant_name VARCHAR(255) NOT NULL,
    room_number VARCHAR(50) NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    method VARCHAR(50) NOT NULL DEFAULT 'UPI' CHECK (method IN ('Cash', 'UPI', 'Bank Transfer')),
    type VARCHAR(50) NOT NULL DEFAULT 'Rent' CHECK (type IN ('Rent', 'Advance', 'Advance Refund')),
    notes TEXT,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_hostel_id ON public.payments(hostel_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON public.payments(date);

-- ====================================================================
-- 7. EXPENSES TABLE (Property Operating Costs)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hostel_id UUID NOT NULL REFERENCES public.hostels(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    category VARCHAR(50) NOT NULL CHECK (category IN ('Utilities', 'Maintenance', 'Salaries', 'Groceries', 'Other')),
    amount NUMERIC(10, 2) NOT NULL,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_hostel_id ON public.expenses(hostel_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category);

-- ====================================================================
-- 8. NOTIFICATIONS TABLE (Rent Reminders & Alerts)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hostel_id UUID NOT NULL REFERENCES public.hostels(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL DEFAULT 'rent_reminder',
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'sent' CHECK (status IN ('queued', 'sent', 'failed')),
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_hostel ON public.notifications(hostel_id);

-- ====================================================================
-- 9. AUTOMATIC TIMESTAMP TRIGGER
-- ====================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_timestamp_hostels ON public.hostels;
CREATE TRIGGER set_timestamp_hostels
    BEFORE UPDATE ON public.hostels
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_timestamp_rooms ON public.rooms;
CREATE TRIGGER set_timestamp_rooms
    BEFORE UPDATE ON public.rooms
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_timestamp_tenants ON public.tenants;
CREATE TRIGGER set_timestamp_tenants
    BEFORE UPDATE ON public.tenants
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ====================================================================
-- 10. ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hostels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hostel_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Allow service_role & authenticated/anon access with public fallback for app features
CREATE POLICY "Public full access hostels" ON public.hostels FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access rooms" ON public.rooms FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access tenants" ON public.tenants FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access payments" ON public.payments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access expenses" ON public.expenses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access users" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access hostel_staff" ON public.hostel_staff FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access notifications" ON public.notifications FOR ALL USING (true) WITH CHECK (true);
