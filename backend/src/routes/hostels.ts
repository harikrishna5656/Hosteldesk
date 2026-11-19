import { Router, Request, Response } from 'express';
import { supabase } from '../db/supabase.js';
import { authMiddleware } from '../middleware/auth.js';
import { Hostel, HostelPortfolioSummary } from '../types/hostel.js';

const router = Router();

// Apply auth middleware to all hostel routes
router.use(authMiddleware);

// In-memory store fallback when Supabase is in local/mock mode (starts clean)
let demoHostels: Hostel[] = [];

// 1. Get Portfolio Aggregated Summary (all hostels for owner)
router.get('/portfolio/summary', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    // Check if live Supabase is active
    const isMock = !process.env.SUPABASE_URL || process.env.SUPABASE_URL.includes('your-project') || process.env.SUPABASE_URL.includes('placeholder');

    if (isMock) {
      const summary: HostelPortfolioSummary = {
        totalHostels: demoHostels.length,
        totalRooms: 0,
        totalBeds: 0,
        occupiedBeds: 0,
        availableBeds: 0,
        occupancyPercentage: 0,
        totalMonthlyRevenue: 0,
        totalMonthlyExpenses: 0,
        totalPendingDues: 0,
        branches: demoHostels.map((h) => ({
          id: h.id,
          name: h.name,
          code: h.code,
          type: h.type,
          city: h.city,
          totalRooms: 0,
          totalBeds: 0,
          occupiedBeds: 0,
          occupancyPercentage: 0,
          monthlyRevenue: 0,
          pendingDues: 0,
        })),
      };
      res.json(summary);
      return;
    }

    // Live Supabase query
    const { data: hostels, error: hError } = await supabase
      .from('hostels')
      .select('*')
      .eq('owner_id', userId);

    if (hError) throw hError;

    // Aggregate statistics from database
    const hostelIds = (hostels || []).map((h) => h.id);
    const { data: rooms } = await supabase
      .from('rooms')
      .select('*')
      .in('hostel_id', hostelIds);

    const totalRooms = (rooms || []).length;
    const totalBeds = (rooms || []).reduce((acc, r) => acc + (r.capacity || 0), 0);
    const occupiedBeds = (rooms || []).reduce((acc, r) => acc + (r.occupied || 0), 0);

    const summary: HostelPortfolioSummary = {
      totalHostels: hostelIds.length,
      totalRooms,
      totalBeds,
      occupiedBeds,
      availableBeds: totalBeds - occupiedBeds,
      occupancyPercentage: totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0,
      totalMonthlyRevenue: 0,
      totalMonthlyExpenses: 0,
      totalPendingDues: 0,
      branches: (hostels || []).map((h) => {
        const branchRooms = (rooms || []).filter((r) => r.hostel_id === h.id);
        const bBeds = branchRooms.reduce((acc, r) => acc + (r.capacity || 0), 0);
        const bOcc = branchRooms.reduce((acc, r) => acc + (r.occupied || 0), 0);
        return {
          id: h.id,
          name: h.name,
          code: h.code,
          type: h.type,
          city: h.city,
          totalRooms: branchRooms.length,
          totalBeds: bBeds,
          occupiedBeds: bOcc,
          occupancyPercentage: bBeds > 0 ? Math.round((bOcc / bBeds) * 100) : 0,
          monthlyRevenue: 0,
          pendingDues: 0,
        };
      }),
    };

    res.json(summary);
  } catch (error) {
    console.error('Error fetching portfolio summary:', error);
    res.status(500).json({ error: 'Failed to fetch portfolio summary' });
  }
});

// 2. List all hostels for current user
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const isMock = !process.env.SUPABASE_URL || process.env.SUPABASE_URL.includes('your-project') || process.env.SUPABASE_URL.includes('placeholder');

    if (isMock) {
      res.json(demoHostels);
      return;
    }

    const { data, error } = await supabase
      .from('hostels')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error listing hostels:', error);
    res.status(500).json({ error: 'Failed to list hostels' });
  }
});

// 3. Create a new hostel branch
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id || 'user_default';
    const { name, code, type, address, city, state, pincode, contact_phone, contact_email, monthly_target_revenue } = req.body;

    if (!name || !code || !type || !address || !city) {
      res.status(400).json({ error: 'Missing required hostel fields (name, code, type, address, city)' });
      return;
    }

    const isMock = !process.env.SUPABASE_URL || process.env.SUPABASE_URL.includes('your-project') || process.env.SUPABASE_URL.includes('placeholder');

    const newHostel: Hostel = {
      id: 'h_' + Date.now(),
      owner_id: userId,
      name,
      code: code.toUpperCase(),
      type: type || 'Boys',
      address,
      city,
      state: state || '',
      pincode: pincode || '',
      contact_phone: contact_phone || '',
      contact_email: contact_email || '',
      monthly_target_revenue: Number(monthly_target_revenue) || 0,
      created_at: new Date().toISOString(),
    };

    if (isMock) {
      demoHostels.push(newHostel);
      res.status(201).json(newHostel);
      return;
    }

    const { data, error } = await supabase
      .from('hostels')
      .insert([newHostel])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    console.error('Error creating hostel:', error);
    res.status(500).json({ error: 'Failed to create hostel branch' });
  }
});

// 4. Get a specific hostel by ID
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const isMock = !process.env.SUPABASE_URL || process.env.SUPABASE_URL.includes('your-project') || process.env.SUPABASE_URL.includes('placeholder');

    if (isMock) {
      const found = demoHostels.find((h) => h.id === id);
      if (!found) {
        res.status(404).json({ error: 'Hostel not found' });
        return;
      }
      res.json(found);
      return;
    }

    const { data, error } = await supabase
      .from('hostels')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      res.status(404).json({ error: 'Hostel not found' });
      return;
    }

    res.json(data);
  } catch (error) {
    console.error('Error fetching hostel:', error);
    res.status(500).json({ error: 'Failed to fetch hostel' });
  }
});

// 5. Update a hostel branch
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const isMock = !process.env.SUPABASE_URL || process.env.SUPABASE_URL.includes('your-project') || process.env.SUPABASE_URL.includes('placeholder');

    if (isMock) {
      const idx = demoHostels.findIndex((h) => h.id === id);
      if (idx === -1) {
        res.status(404).json({ error: 'Hostel not found' });
        return;
      }
      demoHostels[idx] = { ...demoHostels[idx], ...updates };
      res.json(demoHostels[idx]);
      return;
    }

    const { data, error } = await supabase
      .from('hostels')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error updating hostel:', error);
    res.status(500).json({ error: 'Failed to update hostel' });
  }
});

// 6. Delete a hostel branch
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const isMock = !process.env.SUPABASE_URL || process.env.SUPABASE_URL.includes('your-project') || process.env.SUPABASE_URL.includes('placeholder');

    if (isMock) {
      demoHostels = demoHostels.filter((h) => h.id !== id);
      res.json({ success: true, message: 'Hostel deleted successfully' });
      return;
    }

    const { error } = await supabase.from('hostels').delete().eq('id', id);
    if (error) throw error;

    res.json({ success: true, message: 'Hostel deleted successfully' });
  } catch (error) {
    console.error('Error deleting hostel:', error);
    res.status(500).json({ error: 'Failed to delete hostel' });
  }
});

export default router;
