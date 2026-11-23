import { Router, Request, Response } from 'express';
import { supabase } from '../db/supabase.js';
import { isUUID, resolveHostelId } from '../utils/uuid.js';

const router = Router();

// GET expenses
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { hostelId } = req.query;

    let query = supabase.from('expenses').select('*').order('date', { ascending: false });
    if (hostelId && hostelId !== 'all' && isUUID(hostelId)) {
      query = query.eq('hostel_id', hostelId);
    }

    const { data, error } = await query;
    if (error) throw error;

    const formatted = (data || []).map((e) => ({
      id: e.id,
      hostelId: e.hostel_id,
      date: e.date,
      category: e.category,
      amount: Number(e.amount),
      note: e.note || '',
    }));

    res.json(formatted);
  } catch (error: any) {
    console.error('[Expenses GET error]:', error.message || error);
    res.status(500).json({ error: 'Failed to fetch expenses from database' });
  }
});

// POST record expense
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { hostelId, date, category, amount, note } = req.body;

    if (!category || amount === undefined) {
      res.status(400).json({ error: 'category and amount are required' });
      return;
    }

    const targetHostelId = await resolveHostelId(hostelId);

    const { data: expense, error } = await supabase
      .from('expenses')
      .insert({
        hostel_id: targetHostelId,
        date: date || new Date().toISOString().split('T')[0],
        category: category,
        amount: Number(amount),
        note: note || '',
      })
      .select()
      .single();

    if (error) throw error;

    console.log(`✅ [Supabase DB] Expense Recorded: ₹${expense.amount} under '${expense.category}'`);
    res.status(201).json({
      id: expense.id,
      hostelId: expense.hostel_id,
      date: expense.date,
      category: expense.category,
      amount: Number(expense.amount),
      note: expense.note || '',
    });
  } catch (error: any) {
    console.error('[Expenses POST error]:', error.message || error);
    res.status(500).json({ error: error.message || 'Failed to record expense' });
  }
});

export default router;
