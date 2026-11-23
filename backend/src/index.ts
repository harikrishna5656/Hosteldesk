import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import emailRoutes from './routes/email.js';
import hostelRoutes from './routes/hostels.js';
import roomRoutes from './routes/rooms.js';
import tenantRoutes from './routes/tenants.js';
import paymentRoutes from './routes/payments.js';
import expenseRoutes from './routes/expenses.js';
import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3001;

// CORS configuration (allow any localhost port for dev + FRONTEND_URL)
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      if (
        origin.includes('localhost') ||
        origin.includes('127.0.0.1') ||
        origin.includes('vercel.app') ||
        origin === process.env.FRONTEND_URL
      ) {
        return callback(null, true);
      }
      return callback(null, true); // Permissive in dev
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Realtime Request Logger Middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });

  res.on('finish', () => {
    const duration = Date.now() - start;
    const isError = res.statusCode >= 400;
    const icon = isError ? '❌' : '✅';
    console.log(`${icon} [${timestamp}] ${req.method.padEnd(6)} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
  });

  next();
});

// Health Check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'HostelPMS Backend API',
    database: 'Supabase PostgreSQL',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Domain Routes
app.use('/api/auth', authRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/hostels', hostelRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/expenses', expenseRoutes);

// 404 Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: `Endpoint not found: ${req.method} ${req.originalUrl}` });
});

// Centralized Error Handler
app.use(errorHandler);

// Start Server
app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 HostelPMS Backend running on http://localhost:${PORT}`);
  console.log(`📡 Connected Database: Supabase PostgreSQL (Public Schema)`);
  console.log(`📋 Live Routes Active:`);
  console.log(`   - POST /api/auth/signup      (Saves user in Supabase 'users' table)`);
  console.log(`   - POST /api/auth/login       (Verifies user from Supabase 'users' table)`);
  console.log(`   - GET/POST /api/hostels      (Supabase 'hostels' table)`);
  console.log(`   - GET/POST /api/rooms        (Supabase 'rooms' table)`);
  console.log(`   - GET/POST /api/tenants      (Supabase 'tenants' table)`);
  console.log(`   - GET/POST /api/payments     (Supabase 'payments' table)`);
  console.log(`   - GET/POST /api/expenses     (Supabase 'expenses' table)`);
  console.log(`======================================================\n`);
});

export default app;
