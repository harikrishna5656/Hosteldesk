import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { authMiddleware } from '../middleware/auth.js';
import { registerUser, verifyUser, findUserByEmail } from '../services/authStore.js';
import { JWT_SECRET, JWT_EXPIRES_IN } from '../config/jwt.js';

const router = Router();

// Test / Verify token endpoint
router.get('/me', authMiddleware, (req: Request, res: Response) => {
  res.json({ user: req.user });
});

// User Registration Endpoint
router.post('/signup', async (req: Request, res: Response): Promise<void> => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    res.status(400).json({ error: 'Name, email, and password are required' });
    return;
  }

  if (typeof password !== 'string' || password.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters long' });
    return;
  }

  try {
    const { user } = await registerUser(name, email, password);

    const token = jwt.sign(user, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);

    res.status(201).json({
      message: 'Account created successfully',
      token,
      user,
    });
  } catch (err: any) {
    const status = err.message.includes('already exists') ? 409 : 400;
    res.status(status).json({ error: err.message || 'Signup failed' });
  }
});

// User Login Endpoint with real credential verification
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  try {
    const user = await verifyUser(email, password);

    const token = jwt.sign(user, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);

    res.json({
      message: 'Login successful',
      token,
      user,
    });
  } catch (err: any) {
    if (err.message.includes('No account found')) {
      res.status(404).json({ error: err.message });
      return;
    }
    if (err.message.includes('Incorrect password')) {
      res.status(401).json({ error: err.message });
      return;
    }
    res.status(400).json({ error: err.message || 'Login failed' });
  }
});

export default router;
