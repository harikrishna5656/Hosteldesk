import { Request, Response, NextFunction } from 'express';
import { supabase } from '../db/supabase.js';
import { Hostel } from '../types/hostel.js';

export function hostelContextMiddleware(options: { required?: boolean } = { required: true }) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const hostelId = (req.headers['x-hostel-id'] as string) || (req.query.hostel_id as string);

    if (!hostelId) {
      if (options.required) {
        res.status(400).json({
          error: 'Missing hostel context',
          message: 'The x-hostel-id header is required for this operation.',
        });
        return;
      }
      return next();
    }

    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized: User context required.' });
      return;
    }

    try {
      // Query Supabase for hostel membership/ownership
      const { data: hostel, error } = await supabase
        .from('hostels')
        .select('*')
        .eq('id', hostelId)
        .single();

      if (error || !hostel) {
        // Fallback or demo support if running without connected Supabase instance
        if (!process.env.SUPABASE_URL || process.env.SUPABASE_URL.includes('your-project') || process.env.SUPABASE_URL.includes('placeholder')) {
          req.hostel = {
            id: hostelId,
            owner_id: userId,
            name: 'Demo Hostel Branch',
            code: 'DEMO-01',
            type: 'Boys',
            address: '123 Main Road',
            city: 'Bengaluru',
            state: 'Karnataka',
            pincode: '560001',
            contact_phone: '+91 98765 43210',
            contact_email: 'contact@hostel.com',
            created_at: new Date().toISOString(),
          };
          return next();
        }

        res.status(404).json({ error: 'Hostel not found' });
        return;
      }

      // Verify user has ownership or staff role
      if (hostel.owner_id !== userId) {
        const { data: staff } = await supabase
          .from('hostel_staff')
          .select('*')
          .eq('hostel_id', hostelId)
          .eq('user_id', userId)
          .single();

        if (!staff && req.user?.global_role !== 'superadmin') {
          res.status(403).json({ error: 'Access denied: You do not have permissions for this hostel branch.' });
          return;
        }
      }

      req.hostel = hostel as Hostel;
      next();
    } catch (err) {
      console.error('[Hostel Context Middleware Error]:', err);
      res.status(500).json({ error: 'Failed to verify hostel context' });
    }
  };
}
