import { Router, Request, Response } from 'express';
import { supabase } from '../db/supabase.js';
import { isUUID, resolveHostelId } from '../utils/uuid.js';

const router = Router();

// GET payments
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { hostelId } = req.query;

    let query = supabase.from('payments').select('*').order('date', { ascending: false });
    if (hostelId && hostelId !== 'all' && isUUID(hostelId)) {
      query = query.eq('hostel_id', hostelId);
    }

    const { data, error } = await query;
    if (error) throw error;

    const formatted = (data || []).map((p) => ({
      id: p.id,
      hostelId: p.hostel_id,
      tenantId: p.tenant_id,
      tenantName: p.tenant_name,
      roomNumber: p.room_number,
      amount: Number(p.amount),
      method: p.method,
      type: p.type || 'Rent',
      notes: p.notes,
      date: p.date,
    }));

    res.json(formatted);
  } catch (error: any) {
    console.error('[Payments GET error]:', error.message || error);
    res.status(500).json({ error: 'Failed to fetch payments from database' });
  }
});

// POST record payment
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { hostelId, tenantId, tenantName, roomNumber, amount, method, type, notes, date } = req.body;

    if (!tenantName || !amount) {
      res.status(400).json({ error: 'tenantName and amount are required' });
      return;
    }

    const targetHostelId = await resolveHostelId(hostelId);

    const { data: payment, error } = await supabase
      .from('payments')
      .insert({
        hostel_id: targetHostelId,
        tenant_id: isUUID(tenantId) ? tenantId : null,
        tenant_name: tenantName,
        room_number: String(roomNumber || ''),
        amount: Number(amount),
        method: method || 'UPI',
        type: type || 'Rent',
        notes: notes || '',
        date: date || new Date().toISOString().split('T')[0],
      })
      .select()
      .single();

    if (error) throw error;

    console.log(`✅ [Supabase DB] Payment Recorded: ₹${payment.amount} (${payment.type}) for ${payment.tenant_name}`);
    res.status(201).json({
      id: payment.id,
      hostelId: payment.hostel_id,
      tenantId: payment.tenant_id,
      tenantName: payment.tenant_name,
      roomNumber: payment.room_number,
      amount: Number(payment.amount),
      method: payment.method,
      type: payment.type,
      notes: payment.notes,
      date: payment.date,
    });
  } catch (error: any) {
    console.error('[Payments POST error]:', error.message || error);
    res.status(500).json({ error: error.message || 'Failed to record payment' });
  }
});

export default router;
