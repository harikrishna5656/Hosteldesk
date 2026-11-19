-- ====================================================================
-- HostelPMS Multi-Tenancy Database Migration (PostgreSQL / Supabase)
-- ====================================================================

-- 1. Create HOSTELS Table
CREATE TABLE IF NOT EXISTS hostels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('Boys', 'Girls', 'Co-ed')),
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    pincode VARCHAR(20) NOT NULL,
    contact_phone VARCHAR(50) NOT NULL,
    contact_email VARCHAR(255) NOT NULL,
    monthly_target_revenue NUMERIC(12, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookup by owner
CREATE INDEX IF NOT EXISTS idx_hostels_owner_id ON hostels(owner_id);

-- 2. Create HOSTEL_STAFF Table (RBAC for Wardens, Managers, etc.)
CREATE TABLE IF NOT EXISTS hostel_staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hostel_id UUID NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    branch_role VARCHAR(50) NOT NULL CHECK (branch_role IN ('warden', 'manager', 'accountant', 'cleaner')),
    permissions JSONB DEFAULT '[]'::jsonb,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (hostel_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_hostel_staff_user ON hostel_staff(user_id);
CREATE INDEX IF NOT EXISTS idx_hostel_staff_hostel ON hostel_staff(hostel_id);

-- 3. Add hostel_id to domain tables (if they already exist or create them)
CREATE TABLE IF NOT EXISTS rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hostel_id UUID NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
    room_number VARCHAR(50) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('Single', 'Double', 'Triple', 'Sharing')),
    capacity INTEGER NOT NULL DEFAULT 1,
    occupied INTEGER NOT NULL DEFAULT 0,
    rent NUMERIC(10, 2) NOT NULL,
    floor INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(50) NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'maintenance')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (hostel_id, room_number)
);

CREATE INDEX IF NOT EXISTS idx_rooms_hostel_id ON rooms(hostel_id);

CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hostel_id UUID NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
    room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
    room_number VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL,
    check_in DATE NOT NULL DEFAULT CURRENT_DATE,
    rent_due DATE NOT NULL,
    rent_amount NUMERIC(10, 2) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'checkout-pending', 'left')),
    paid BOOLEAN NOT NULL DEFAULT false,
    avatar TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenants_hostel_id ON tenants(hostel_id);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);

CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hostel_id UUID NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    tenant_name VARCHAR(255) NOT NULL,
    room_number VARCHAR(50) NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    method VARCHAR(50) NOT NULL CHECK (method IN ('Cash', 'UPI', 'Bank Transfer')),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_hostel_id ON payments(hostel_id);

CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hostel_id UUID NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    category VARCHAR(50) NOT NULL CHECK (category IN ('Utilities', 'Maintenance', 'Salaries', 'Groceries', 'Other')),
    amount NUMERIC(10, 2) NOT NULL,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_hostel_id ON expenses(hostel_id);

-- 4. Supabase Row-Level Security (RLS) Setup
ALTER TABLE hostels ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Owner and Staff Policies
CREATE POLICY "Hostels access policy" ON hostels
    FOR ALL USING (
        owner_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM hostel_staff
            WHERE hostel_staff.hostel_id = hostels.id
            AND hostel_staff.user_id = auth.uid()
        )
    );

CREATE POLICY "Rooms multi-tenancy policy" ON rooms
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM hostels
            WHERE hostels.id = rooms.hostel_id
            AND (hostels.owner_id = auth.uid() OR EXISTS (
                SELECT 1 FROM hostel_staff
                WHERE hostel_staff.hostel_id = rooms.hostel_id AND hostel_staff.user_id = auth.uid()
            ))
        )
    );

CREATE POLICY "Tenants multi-tenancy policy" ON tenants
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM hostels
            WHERE hostels.id = tenants.hostel_id
            AND (hostels.owner_id = auth.uid() OR EXISTS (
                SELECT 1 FROM hostel_staff
                WHERE hostel_staff.hostel_id = tenants.hostel_id AND hostel_staff.user_id = auth.uid()
            ))
        )
    );

CREATE POLICY "Payments multi-tenancy policy" ON payments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM hostels
            WHERE hostels.id = payments.hostel_id
            AND (hostels.owner_id = auth.uid() OR EXISTS (
                SELECT 1 FROM hostel_staff
                WHERE hostel_staff.hostel_id = payments.hostel_id AND hostel_staff.user_id = auth.uid()
            ))
        )
    );

CREATE POLICY "Expenses multi-tenancy policy" ON expenses
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM hostels
            WHERE hostels.id = expenses.hostel_id
            AND (hostels.owner_id = auth.uid() OR EXISTS (
                SELECT 1 FROM hostel_staff
                WHERE hostel_staff.hostel_id = expenses.hostel_id AND hostel_staff.user_id = auth.uid()
            ))
        )
    );
