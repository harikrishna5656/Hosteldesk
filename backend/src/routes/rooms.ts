import { Router, Request, Response } from 'express';
import { supabase } from '../db/supabase.js';
import { isUUID } from '../utils/uuid.js';
import { authMiddleware } from '../middleware/auth.js';
import { getUserHostelIds } from '../utils/hostelScope.js';

const router = Router();

// Enforce authentication on all room routes
router.use(authMiddleware);

// GET all rooms (strictly scoped to authenticated user's hostels)
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const ownedHostelIds = await getUserHostelIds(userId);
    if (ownedHostelIds.length === 0) {
      res.json([]);
      return;
    }

    const { hostelId } = req.query;

    let query = supabase.from('rooms').select('*').order('room_number', { ascending: true });
    
    // Scoped filtering
    if (hostelId && hostelId !== 'all' && isUUID(hostelId)) {
      if (!ownedHostelIds.includes(String(hostelId))) {
        res.json([]);
        return;
      }
      query = query.eq('hostel_id', hostelId);
    } else {
      query = query.in('hostel_id', ownedHostelIds);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Map to frontend naming conventions
    const formatted = (data || []).map((r) => ({
      id: r.id,
      hostelId: r.hostel_id,
      number: r.room_number,
      type: r.type,
      capacity: r.capacity,
      occupied: r.occupied,
      rent: Number(r.rent),
      floor: r.floor,
      status: r.status,
    }));

    res.json(formatted);
  } catch (error: any) {
    console.error('[Rooms GET error]:', error.message || error);
    res.status(500).json({ error: 'Failed to fetch rooms from database' });
  }
});

// POST create room (strictly in an owned hostel)
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const ownedHostelIds = await getUserHostelIds(userId);
    if (ownedHostelIds.length === 0) {
      res.status(400).json({ error: 'You must register a hostel property before adding rooms.' });
      return;
    }

    const { hostelId, number, type, capacity, rent, floor, status } = req.body;

    if (!number || rent === undefined) {
      res.status(400).json({ error: 'room number and rent are required' });
      return;
    }

    const targetHostelId = isUUID(hostelId) && ownedHostelIds.includes(String(hostelId))
      ? String(hostelId)
      : ownedHostelIds[0];

    const { data, error } = await supabase
      .from('rooms')
      .insert({
        hostel_id: targetHostelId,
        room_number: String(number),
        type: type || 'Double',
        capacity: Number(capacity) || 1,
        occupied: 0,
        rent: Number(rent),
        floor: Number(floor) || 1,
        status: status || 'available',
      })
      .select()
      .single();

    if (error) throw error;

    console.log(`✅ [Supabase DB] Created Room ${data.room_number} in Hostel ${data.hostel_id}`);
    res.status(201).json({
      id: data.id,
      hostelId: data.hostel_id,
      number: data.room_number,
      type: data.type,
      capacity: data.capacity,
      occupied: data.occupied,
      rent: Number(data.rent),
      floor: data.floor,
      status: data.status,
    });
  } catch (error: any) {
    console.error('[Rooms POST error]:', error.message || error);
    res.status(500).json({ error: error.message || 'Failed to create room' });
  }
});

// PUT update room (ensure ownership)
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    if (!isUUID(id) || !userId) {
      res.status(400).json({ error: 'Invalid room UUID or unauthorized' });
      return;
    }

    const ownedHostelIds = await getUserHostelIds(userId);
    if (ownedHostelIds.length === 0) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const { number, type, capacity, occupied, rent, floor, status } = req.body;

    const updates: Record<string, any> = {};
    if (number !== undefined) updates.room_number = String(number);
    if (type !== undefined) updates.type = type;
    if (capacity !== undefined) updates.capacity = Number(capacity);
    if (occupied !== undefined) updates.occupied = Number(occupied);
    if (rent !== undefined) updates.rent = Number(rent);
    if (floor !== undefined) updates.floor = Number(floor);
    if (status !== undefined) updates.status = status;

    const { data, error } = await supabase
      .from('rooms')
      .update(updates)
      .eq('id', id)
      .in('hostel_id', ownedHostelIds)
      .select()
      .single();

    if (error) throw error;

    res.json({
      id: data.id,
      hostelId: data.hostel_id,
      number: data.room_number,
      type: data.type,
      capacity: data.capacity,
      occupied: data.occupied,
      rent: Number(data.rent),
      floor: data.floor,
      status: data.status,
    });
  } catch (error: any) {
    console.error('[Rooms PUT error]:', error.message || error);
    res.status(500).json({ error: error.message || 'Failed to update room' });
  }
});

// DELETE room (ensure ownership)
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    if (!isUUID(id) || !userId) {
      res.status(400).json({ error: 'Invalid room UUID or unauthorized' });
      return;
    }

    const ownedHostelIds = await getUserHostelIds(userId);
    if (ownedHostelIds.length === 0) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    // Check if active tenants exist in this room
    const { data: activeTenants } = await supabase
      .from('tenants')
      .select('id')
      .eq('room_id', id)
      .eq('status', 'active');

    if (activeTenants && activeTenants.length > 0) {
      res.status(400).json({ error: `Cannot delete room. ${activeTenants.length} active tenant(s) are currently occupying this room.` });
      return;
    }

    const { error } = await supabase
      .from('rooms')
      .delete()
      .eq('id', id)
      .in('hostel_id', ownedHostelIds);

    if (error) throw error;

    console.log(`🗑️ [Supabase DB] Deleted Room ID: ${id}`);
    res.json({ success: true, message: 'Room deleted successfully' });
  } catch (error: any) {
    console.error('[Rooms DELETE error]:', error.message || error);
    res.status(500).json({ error: error.message || 'Failed to delete room' });
  }
});

export default router;
