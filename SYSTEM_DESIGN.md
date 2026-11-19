# HostelPMS — System Design Document
## Multi-Tenancy Architecture (Multi-Hostel & Multi-Branch Management)

**Document Version:** 2.0.0  
**Status:** Approved  
**Author:** Antigravity Engineering  
**Architecture Pattern:** Pooled Multi-Tenancy (Shared Database, Shared Schema with Tenant & Branch Discriminators)  
**Target Audience:** Software Architects, Full-Stack Developers, DevOps Engineers  

---

## 1. Executive Summary & Multi-Tenancy Vision

**HostelPMS** is designed from the ground up to support **Hierarchical Multi-Tenancy**. A single client or property owner can operate an entire chain or portfolio of multiple hostels/PGs across different locations, cities, and property types (Boys, Girls, Co-ed) under a unified administrative umbrella.

### Core Multi-Tenancy Capabilities:
1. **Multi-Hostel Portfolio Dashboard:** An owner can view aggregated portfolio metrics (total beds across all hostels, total monthly revenue, pending rent dues across branches) or drill down into an individual hostel branch.
2. **Branch Switching:** Seamless switching between hostels directly from the header dropdown without re-authenticating.
3. **Role-Based Access Control (RBAC):**
   - **Super Admin / Property Owner:** Full access to all owned hostels, financial ledgers, staff assignments, and portfolio analytics.
   - **Branch Warden / Property Manager:** Scoped access strictly restricted to their assigned hostel branch (e.g., managing rooms, tenants, and day-to-day check-ins for "Branch A" only).
   - **Accountant / Bookkeeper:** Read/write access to financial records (payments, expenses) across designated hostels.
4. **Isolated Operational Data:** Rooms, tenants, maintenance issues, utility bills, and payment records are logically separated by `hostel_id`.

---

## 2. Multi-Tenancy Architectural Model

### 2.1 Isolation Strategy: Shared Database, Shared Schema (Discriminator-Based)

To provide the ideal balance between operational cost, scaling efficiency, and code maintainability, HostelPMS implements the **Tenant & Branch Discriminator Pattern**:

- **Database:** Single PostgreSQL database instance via Supabase.
- **Tenant Scope:** Every domain table (`rooms`, `tenants`, `payments`, `expenses`, `notifications`, `staff`) contains an indexed `hostel_id` foreign key.
- **Enforcement:** Enforced at two layers:
  1. **Application Layer:** Express middleware (`hostelContextMiddleware`) extracts and validates the tenant context (`x-hostel-id` header).
  2. **Database Layer:** Supabase **Row Level Security (RLS)** policies prevent cross-tenant data leakage even in the event of an application-level query mistake.

```mermaid
graph TD
    Client["Client Browser (React 19 App)"]
    Switcher["Hostel Switcher (Active: 'Koramangala Boys PG')"]
    Header["HTTP Header: x-hostel-id = h_89f2a"]
    
    Client --> Switcher
    Switcher --> Header
    
    subgraph BackendGateway ["Backend API Gateway (Express)"]
        AuthFilter["1. JWT Auth Middleware (Extract user_id, role)"]
        HostelFilter["2. Hostel Context Resolver (Verify user has access to x-hostel-id)"]
        Controller["3. Scoped Route Controller"]
    end
    
    Header --> AuthFilter
    AuthFilter --> HostelFilter
    HostelFilter --> Controller

    subgraph PostgresDB ["PostgreSQL (Supabase Multi-Tenant Engine)"]
        RLS["PostgreSQL RLS (Row Level Security)"]
        HostelTable[("hostels table")]
        BranchData[("Scoped Tables: rooms, tenants, payments, expenses")]
    end

    Controller --> RLS
    RLS --> HostelTable
    RLS --> BranchData
```

---

## 3. Hierarchical Data Model & Schema Design

### 3.1 Entity Relationship Diagram (Multi-Hostel)

```mermaid
erDiagram
    USERS ||--o{ HOSTELS : "owns"
    USERS ||--o{ HOSTEL_STAFF : "assigned_as"
    HOSTELS ||--o{ HOSTEL_STAFF : "employs"
    HOSTELS ||--o{ ROOMS : "contains"
    HOSTELS ||--o{ EXPENSES : "incurs"
    HOSTELS ||--o{ PAYMENTS : "collects"
    HOSTELS ||--o{ NOTIFICATIONS : "generates"
    ROOMS ||--o{ TENANTS : "allocates_beds_to"
    TENANTS ||--o{ PAYMENTS : "submits"
    TENANTS ||--o{ NOTIFICATIONS : "receives"

    USERS {
        uuid id PK
        string email UK
        string password_hash
        string full_name
        string phone
        string global_role "owner | superadmin"
        timestamp created_at
    }

    HOSTELS {
        uuid id PK
        uuid owner_id FK "References USERS(id)"
        string name "e.g. Green Valley PG - Branch 1"
        string code UK "e.g. GVP-01"
        string type "Boys | Girls | Co-ed"
        string address
        string city
        string state
        string pincode
        string contact_phone
        string contact_email
        numeric monthly_target_revenue
        timestamp created_at
    }

    HOSTEL_STAFF {
        uuid id PK
        uuid hostel_id FK "References HOSTELS(id)"
        uuid user_id FK "References USERS(id)"
        string branch_role "warden | manager | accountant | cleaner"
        jsonb permissions
        timestamp assigned_at
    }

    ROOMS {
        uuid id PK
        uuid hostel_id FK "References HOSTELS(id)"
        string room_number
        string room_type "Single | Double | Triple | Sharing"
        int capacity
        int occupied
        numeric base_rent
        int floor_number
        string status "available | occupied | maintenance"
        timestamp updated_at
    }

    TENANTS {
        uuid id PK
        uuid hostel_id FK "References HOSTELS(id)"
        uuid room_id FK "References ROOMS(id)"
        string room_number
        string full_name
        string phone
        string email
        date check_in_date
        date rent_due_date
        numeric agreed_rent
        string status "active | checkout-pending | left"
        boolean is_paid
        string kyc_id_type "Aadhaar | Passport | Driving License"
        string kyc_document_url
        timestamp created_at
    }

    PAYMENTS {
        uuid id PK
        uuid hostel_id FK "References HOSTELS(id)"
        uuid tenant_id FK "References TENANTS(id)"
        string tenant_name
        string room_number
        numeric amount
        string payment_method "UPI | Cash | Bank Transfer"
        date payment_date
        string transaction_ref
        timestamp created_at
    }

    EXPENSES {
        uuid id PK
        uuid hostel_id FK "References HOSTELS(id)"
        uuid logged_by FK "References USERS(id)"
        date expense_date
        string category "Utilities | Maintenance | Salaries | Groceries | Other"
        numeric amount
        text note
        timestamp created_at
    }

    NOTIFICATIONS {
        uuid id PK
        uuid hostel_id FK "References HOSTELS(id)"
        uuid tenant_id FK "References TENANTS(id)"
        string notification_type "rent | maintenance | room | expense"
        string title
        text description
        boolean is_read
        timestamp sent_at
    }
```

---

## 4. Multi-Hostel Context Resolution & Security

### 4.1 Request Lifecycle & Context Middleware

```mermaid
sequenceDiagram
    autonumber
    actor Client as Frontend (Hostel Switcher Active)
    participant Gateway as Express API Gateway
    participant AuthMid as JWT Auth Middleware
    participant ContextMid as Hostel Context Resolver
    participant Controller as Data Controller
    participant Postgres as Supabase DB (with RLS)

    Client->>Gateway: GET /api/rooms (Header: x-hostel-id = h_102)
    Gateway->>AuthMid: Verify Bearer JWT
    AuthMid-->>Gateway: Authenticated (user_id = u_01, role = owner)
    
    Gateway->>ContextMid: Validate Access(u_01, hostel_id = h_102)
    alt User DOES NOT own or work at h_102
        ContextMid-->>Client: 403 Forbidden ("Access denied to this hostel branch")
    else User is Owner or Assigned Warden
        ContextMid->>Controller: Attach req.hostel = { id: 'h_102', ... }
        Controller->>Postgres: SELECT * FROM rooms WHERE hostel_id = 'h_102'
        Postgres-->>Controller: Filtered Room records
        Controller-->>Client: 200 OK (Rooms for Branch h_102 only)
    end
```

### 4.2 Supabase Row-Level Security (RLS) Policy Example

```sql
-- Enable RLS on domain tables
ALTER TABLE hostels ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- 1. Hostel Access Policy: Owners see their hostels, Wardens see assigned hostels
CREATE POLICY hostel_access_policy ON hostels
  FOR ALL
  USING (
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM hostel_staff
      WHERE hostel_staff.hostel_id = hostels.id
      AND hostel_staff.user_id = auth.uid()
    )
  );

-- 2. Scoped Entity Policy (e.g., Rooms):
CREATE POLICY room_isolation_policy ON rooms
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM hostels
      WHERE hostels.id = rooms.hostel_id
      AND (
        hostels.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM hostel_staff
          WHERE hostel_staff.hostel_id = rooms.hostel_id
          AND hostel_staff.user_id = auth.uid()
        )
      )
    )
  );
```

---

## 5. API Design for Multi-Tenancy

### 5.1 Hostel Management Endpoints (`/api/hostels`)

| Method | Endpoint | Description | Role Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/hostels` | List all hostels owned or accessible to the user | Authenticated |
| `POST` | `/api/hostels` | Register a new hostel branch (name, address, rooms) | Owner |
| `GET` | `/api/hostels/:id` | Get details and settings of a specific hostel branch | Owner / Warden |
| `PUT` | `/api/hostels/:id` | Update hostel profile, rent terms, or contact details | Owner |
| `DELETE` | `/api/hostels/:id` | Decommission / Archive a hostel branch | Owner |
| `GET` | `/api/hostels/portfolio/summary` | Aggregated portfolio metrics (all branches combined) | Owner |

### 5.2 Branch-Scoped Endpoints

All operational endpoints accept the active branch context via header `x-hostel-id`:
- **Rooms:** `GET /api/rooms`, `POST /api/rooms`
- **Tenants:** `GET /api/tenants`, `POST /api/tenants`
- **Payments:** `GET /api/payments`, `POST /api/payments`
- **Expenses:** `GET /api/expenses`, `POST /api/expenses`
- **Email Dispatch:** `POST /api/email/rent-reminder` (automatically injects the specific hostel's name, bank details, and branding into the email template)

---

## 6. Frontend Multi-Hostel UX & State Architecture

### 6.1 Hostel Switcher & State Store

The frontend provides a **Hostel Context Provider** (`HostelContext`) wrapping the application:

```mermaid
graph TD
    User["User Interface"]
    Provider["HostelProvider (Global React Context)"]
    Storage["LocalStorage ('hostelpms_active_hostel_id')"]
    ApiClient["API Client (Axios / Fetch Wrapper)"]
    
    User -->|Selects Branch| Provider
    Provider -->|Persists Active Branch| Storage
    Provider -->|Injects x-hostel-id Header| ApiClient
    ApiClient -->|Sends HTTP Request| Backend["Backend API"]
```

### 6.2 Navigation & View Modes:
1. **Branch View Mode:** When an individual hostel is selected (e.g., *"Indiranagar Girls Hostel"*), all pages (`/rooms`, `/tenants`, `/payments`, `/expenses`) display live operational data for that branch only.
2. **Portfolio View Mode:** When *"All Hostels (Portfolio)"* is selected, the executive dashboard displays:
   - Total beds capacity across all hostels.
   - Aggregate occupancy rate percentage ($\sum \text{occupied} / \sum \text{capacity} \times 100$).
   - Comparative revenue bar charts comparing performance across different branches.
   - Combined rent arrears list categorized by branch.

---

## 7. Migration & Rollout Plan

1. **Database Migration:** Create the `hostels` and `hostel_staff` tables; alter `rooms`, `tenants`, `payments`, and `expenses` to include `hostel_id REFERENCES hostels(id) ON DELETE CASCADE`.
2. **Seed Default Property:** Automatically create a "Main Branch" for existing single-hostel accounts and backfill existing rooms and tenants with the default `hostel_id`.
3. **Backend Middleware Integration:** Add `hostelContextMiddleware.ts` to validate the `x-hostel-id` header on all protected routes.
4. **Frontend Dropdown Component:** Introduce the `<HostelSwitcher />` in the top navigation bar of `AppShell.tsx`.
