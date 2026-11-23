import { Router, Request, Response } from 'express';
import { supabase } from '../db/supabase.js';
import { isUUID } from '../utils/uuid.js';
import { authMiddleware } from '../middleware/auth.js';
import { getUserHostelIds } from '../utils/hostelScope.js';

const router = Router();

// Enforce authentication on all tenant routes
router.use(authMiddleware);

// GET tenants (strictly scoped to authenticated user's hostels)
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

    let query = supabase.from('tenants').select('*').order('created_at', { ascending: false });
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

    const formatted = (data || []).map((t) => ({
      id: t.id,
      hostelId: t.hostel_id,
      roomId: t.room_id,
      roomNumber: t.room_number,
      name: t.name,
      phone: t.phone,
      email: t.email,
      checkIn: t.check_in,
      rentDue: t.rent_due,
      rentAmount: Number(t.rent_amount),
      cycleStartDate: t.cycle_start_date,
      cycleEndDate: t.cycle_end_date,
      remindersSent: t.reminders_sent || 0,
      advanceAmount: Number(t.advance_amount || 0),
      advancePaid: Boolean(t.advance_paid),
      advanceReturned: Boolean(t.advance_returned),
      advanceReturnDate: t.advance_return_date,
      advanceRefundAmount: t.advance_refund_amount ? Number(t.advance_refund_amount) : undefined,
      advanceNotes: t.advance_notes,
      maintenanceDeduction: Number(t.maintenance_deduction || 0),
      negligencePenalty: Number(t.negligence_penalty || 0),
      noticeStatus: t.notice_status,
      status: t.status,
      paid: Boolean(t.paid),
      avatar: t.avatar,
    }));

    res.json(formatted);
  } catch (error: any) {
    console.error('[Tenants GET error]:', error.message || error);
    res.status(500).json({ error: 'Failed to fetch tenants from database' });
  }
});

// POST check-in tenant (strictly in an owned hostel)
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const ownedHostelIds = await getUserHostelIds(userId);
    if (ownedHostelIds.length === 0) {
      res.status(400).json({ error: 'You must register a hostel property before checking in tenants.' });
      return;
    }

    const {
      hostelId,
      roomId,
      roomNumber,
      name,
      phone,
      email,
      checkIn,
      rentDue,
      rentAmount,
      cycleStartDate,
      cycleEndDate,
      advanceAmount,
      advancePaid,
      status,
      paid,
    } = req.body;

    if (!name || !phone || !email || !roomNumber) {
      res.status(400).json({ error: 'name, phone, email, and roomNumber are required' });
      return;
    }

    const targetHostelId = isUUID(hostelId) && ownedHostelIds.includes(String(hostelId))
      ? String(hostelId)
      : ownedHostelIds[0];

    const insertData: Record<string, any> = {
      hostel_id: targetHostelId,
      room_id: isUUID(roomId) ? roomId : null,
      room_number: String(roomNumber),
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim().toLowerCase(),
      check_in: checkIn || new Date().toISOString().split('T')[0],
      rent_due: rentDue || new Date().toISOString().split('T')[0],
      rent_amount: Number(rentAmount) || 0,
      cycle_start_date: cycleStartDate || null,
      cycle_end_date: cycleEndDate || null,
      advance_amount: Number(advanceAmount) || 0,
      advance_paid: Boolean(advancePaid),
      status: status || 'active',
      paid: Boolean(paid),
    };

    const { data: tenant, error } = await supabase
      .from('tenants')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;

    console.log(`✅ [Supabase DB] Check-in Tenant: ${tenant.name} -> Room ${tenant.room_number}`);

    // Update room occupancy if roomId is valid and owned
    if (isUUID(roomId)) {
      const { data: room } = await supabase.from('rooms').select('occupied, capacity').eq('id', roomId).in('hostel_id', ownedHostelIds).single();
      if (room) {
        const newOccupied = (room.occupied || 0) + 1;
        const newStatus = newOccupied >= room.capacity ? 'occupied' : 'available';
        await supabase.from('rooms').update({ occupied: newOccupied, status: newStatus }).eq('id', roomId);
      }
    }

    // Auto-record advance payment if paid
    if (advancePaid && Number(advanceAmount) > 0) {
      await supabase.from('payments').insert({
        hostel_id: targetHostelId,
        tenant_id: tenant.id,
        tenant_name: tenant.name,
        room_number: tenant.room_number,
        amount: Number(advanceAmount),
        method: 'UPI',
        type: 'Advance',
        notes: 'Security Deposit advance paid during check-in',
        date: new Date().toISOString().split('T')[0],
      });
    }

    // Auto-record rent payment if marked paid
    if (paid && Number(rentAmount) > 0) {
      await supabase.from('payments').insert({
        hostel_id: targetHostelId,
        tenant_id: tenant.id,
        tenant_name: tenant.name,
        room_number: tenant.room_number,
        amount: Number(rentAmount),
        method: 'UPI',
        type: 'Rent',
        notes: 'First month rent paid during check-in',
        date: new Date().toISOString().split('T')[0],
      });
    }

    res.status(201).json({
      id: tenant.id,
      hostelId: tenant.hostel_id,
      roomId: tenant.room_id,
      roomNumber: tenant.room_number,
      name: tenant.name,
      phone: tenant.phone,
      email: tenant.email,
      checkIn: tenant.check_in,
      rentDue: tenant.rent_due,
      rentAmount: Number(tenant.rent_amount),
      advanceAmount: Number(tenant.advance_amount || 0),
      advancePaid: Boolean(tenant.advance_paid),
      status: tenant.status,
      paid: Boolean(tenant.paid),
    });
  } catch (error: any) {
    console.error('[Tenants POST error]:', error.message || error);
    res.status(500).json({ error: error.message || 'Failed to check-in tenant' });
  }
});

// PUT update tenant (scoped to owned hostels)
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    if (!isUUID(id) || !userId) {
      res.status(400).json({ error: 'Invalid tenant UUID or unauthorized' });
      return;
    }

    const ownedHostelIds = await getUserHostelIds(userId);
    if (ownedHostelIds.length === 0) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const body = req.body;

    const updates: Record<string, any> = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.phone !== undefined) updates.phone = body.phone;
    if (body.email !== undefined) updates.email = body.email;
    if (body.roomNumber !== undefined) updates.room_number = body.roomNumber;
    if (body.rentDue !== undefined) updates.rent_due = body.rentDue;
    if (body.rentAmount !== undefined) updates.rent_amount = Number(body.rentAmount);
    if (body.cycleStartDate !== undefined) updates.cycle_start_date = body.cycleStartDate;
    if (body.cycleEndDate !== undefined) updates.cycle_end_date = body.cycleEndDate;
    if (body.remindersSent !== undefined) updates.reminders_sent = Number(body.remindersSent);
    if (body.advanceReturned !== undefined) updates.advance_returned = Boolean(body.advanceReturned);
    if (body.advanceReturnDate !== undefined) updates.advance_return_date = body.advanceReturnDate;
    if (body.advanceRefundAmount !== undefined) updates.advance_refund_amount = Number(body.advanceRefundAmount);
    if (body.advanceNotes !== undefined) updates.advance_notes = body.advanceNotes;
    if (body.maintenanceDeduction !== undefined) updates.maintenance_deduction = Number(body.maintenanceDeduction);
    if (body.negligencePenalty !== undefined) updates.negligence_penalty = Number(body.negligencePenalty);
    if (body.noticeStatus !== undefined) updates.notice_status = body.noticeStatus;
    if (body.status !== undefined) updates.status = body.status;
    if (body.paid !== undefined) updates.paid = Boolean(body.paid);

    const { data: tenant, error } = await supabase
      .from('tenants')
      .update(updates)
      .eq('id', id)
      .in('hostel_id', ownedHostelIds)
      .select()
      .single();

    if (error) throw error;

    // If tenant vacated / left, decrease room bed occupancy
    if (body.status === 'left' && tenant.room_id && isUUID(tenant.room_id)) {
      const { data: room } = await supabase.from('rooms').select('occupied, capacity').eq('id', tenant.room_id).single();
      if (room && room.occupied > 0) {
        await supabase.from('rooms').update({ occupied: room.occupied - 1, status: 'available' }).eq('id', tenant.room_id);
      }
    }

    console.log(`✅ [Supabase DB] Updated Tenant: ${tenant.name} (Status: ${tenant.status})`);
    res.json(tenant);
  } catch (error: any) {
    console.error('[Tenants PUT error]:', error.message || error);
    res.status(500).json({ error: error.message || 'Failed to update tenant' });
  }
});

// DELETE tenant (scoped to owned hostels)
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    if (!isUUID(id) || !userId) {
      res.status(400).json({ error: 'Invalid tenant UUID or unauthorized' });
      return;
    }

    const ownedHostelIds = await getUserHostelIds(userId);
    if (ownedHostelIds.length === 0) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const { data: tenant } = await supabase.from('tenants').select('room_id').eq('id', id).in('hostel_id', ownedHostelIds).single();
    if (tenant?.room_id && isUUID(tenant.room_id)) {
      const { data: room } = await supabase.from('rooms').select('occupied').eq('id', tenant.room_id).single();
      if (room && room.occupied > 0) {
        await supabase.from('rooms').update({ occupied: room.occupied - 1, status: 'available' }).eq('id', tenant.room_id);
      }
    }

    const { error } = await supabase.from('tenants').delete().eq('id', id).in('hostel_id', ownedHostelIds);
    if (error) throw error;

    console.log(`🗑️ [Supabase DB] Deleted Tenant ID: ${id}`);
    res.json({ success: true, message: 'Tenant deleted successfully' });
  } catch (error: any) {
    console.error('[Tenants DELETE error]:', error.message || error);
    res.status(500).json({ error: error.message || 'Failed to delete tenant' });
  }
});

export default router;
