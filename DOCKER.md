# HostelDesk — Docker Setup & Deployment Guide

This project is fully dockerized with separate Dockerfiles for the **Backend** and **Frontend**, allowing you to build, deploy, and scale them independently or together.

---

## 1. Prerequisites
- [Docker](https://docs.docker.com/get-docker/) installed on your machine or server.
- [Docker Compose](https://docs.docker.com/compose/) (included with Docker Desktop).

---

## 2. Option A: Run Backend Separately

### Step 1: Navigate to the backend folder
```bash
cd backend
```

### Step 2: Build the Docker image
```bash
docker build -t hosteldesk-backend .
```

### Step 3: Run the container
```bash
docker run -d \
  --name hosteldesk-backend \
  -p 3001:3001 \
  --env-file .env \
  hosteldesk-backend
```

*Or using docker-compose inside `backend/`:*
```bash
docker compose up -d --build
```

### Step 4: Verify
Open `http://localhost:3001/api/health` in your browser. You should see:
```json
{
  "status": "ok",
  "service": "HostelPMS Backend API",
  "timestamp": "...",
  "database": "Supabase PostgreSQL"
}
```

---

## 3. Option B: Run Frontend Separately

### Step 1: Navigate to the frontend folder
```bash
cd frontend
```

### Step 2: Build the Docker image
You can specify the backend URL at build time using `--build-arg`:
```bash
# Pointing to local backend:
docker build --build-arg VITE_API_URL=http://localhost:3001 -t hosteldesk-frontend .

# Or pointing to deployed Render backend:
docker build --build-arg VITE_API_URL=https://hosteldesk-x1f4.onrender.com -t hosteldesk-frontend .
```

### Step 3: Run the container
```bash
docker run -d \
  --name hosteldesk-frontend \
  -p 3000:3000 \
  hosteldesk-frontend
```

*Or using docker-compose inside `frontend/`:*
```bash
docker compose up -d --build
```

### Step 4: Verify
Open `http://localhost:3000` in your browser.

---

## 4. Option C: Run Both Together (Root Compose)

To start both Backend and Frontend with a single command from the root directory:

```bash
docker compose up -d --build
```

- **Frontend**: `http://localhost:3000`
- **Backend API**: `http://localhost:3001`
- **Health Check**: `http://localhost:3001/api/health`

---

## 5. Helpful Docker Commands

### View running containers
```bash
docker ps
```

### View container logs
```bash
# Backend logs
docker logs -f hosteldesk-backend

# Frontend logs
docker logs -f hosteldesk-frontend
```

### Stop containers
```bash
# Stop standalone backend
docker stop hosteldesk-backend && docker rm hosteldesk-backend

# Stop standalone frontend
docker stop hosteldesk-frontend && docker rm hosteldesk-frontend

# Stop root compose services
docker compose down
```
