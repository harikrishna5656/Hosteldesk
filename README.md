# HostelPMS - Property Management System

> 📖 **Architecture & Engineering Blueprint:** For in-depth architecture diagrams, data models, API contracts, and security design, see [SYSTEM_DESIGN.md](SYSTEM_DESIGN.md).

HostelPMS is organized into two separate folders:

```
HostelPMS/
├── frontend/           # React + TanStack Start frontend application
│   ├── src/            # Components, routes, pages, hooks, styling
│   ├── public/         # Static assets
│   ├── package.json    # Frontend dependencies and scripts
│   ├── vite.config.ts  # Vite configuration
│   └── tsconfig.json   # Frontend TypeScript configuration
│
├── backend/            # Express.js + Supabase + Nodemailer API backend
│   ├── src/
│   │   ├── db/         # Supabase client setup
│   │   ├── middleware/ # Authentication and error handling
│   │   ├── routes/     # Auth and Email API endpoints
│   │   ├── services/   # Email notification service (rent reminder, payment confirmation)
│   │   ├── types/      # Express TypeScript type definitions
│   │   └── index.ts    # Express server entry point
│   ├── .env.example    # Environment variables template
│   ├── package.json    # Backend dependencies and scripts
│   └── tsconfig.json   # Backend TypeScript configuration
│
└── package.json        # Root scripts to run frontend and backend
```

---

## 🚀 Getting Started

### 1. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend will start at **http://localhost:5173** (or the port specified by Vite).

### 2. Backend Setup

```bash
cd backend
npm install
cp .env.example .env    # Configure your credentials
npm run dev
```

The backend server will start at **http://localhost:3001**.

---

## 🛠️ Root Scripts

You can also run commands directly from the root folder:

- **Frontend dev server**: `npm run dev:frontend`
- **Backend dev server**: `npm run dev:backend`
- **Frontend build**: `npm run build:frontend`
- **Backend build**: `npm run build:backend`
- **Install dependencies**:
  - `npm run install:frontend`
  - `npm run install:backend`

---

## 🔐 Backend Configuration (`backend/.env`)

| Variable | Description |
| :--- | :--- |
| `PORT` | API server port (default: `3001`) |
| `FRONTEND_URL` | Frontend URL for CORS configuration |
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `JWT_SECRET` | Secret key for JWT signing |
| `GMAIL_USER` | Gmail address for sending rent notifications |
| `GMAIL_APP_PASS` | Gmail App Password |
