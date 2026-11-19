import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// Test / Verify token endpoint
router.get('/me', authMiddleware, (req: Request, res: Response) => {
  res.json({ user: req.user });
});

// Issue JWT Token (can be used directly or integrated with Supabase auth)
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  const jwtSecret = process.env.JWT_SECRET || 'secret';
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

  const user = {
    id: 'user_' + Buffer.from(email).toString('hex').slice(0, 10),
    email,
    name: email.split('@')[0],
  };

  const token = jwt.sign(user, jwtSecret, { expiresIn } as jwt.SignOptions);

  res.json({
    token,
    user,
  });
});

export default router;
