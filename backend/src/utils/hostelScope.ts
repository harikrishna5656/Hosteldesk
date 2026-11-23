import { supabase } from '../db/supabase.js';

/**
 * Returns an array of hostel IDs owned by the specified user.
 * Guarantees multitenancy data isolation.
 */
export async function getUserHostelIds(userId: string): Promise<string[]> {
  if (!userId) return [];
  try {
    const { data, error } = await supabase
      .from('hostels')
      .select('id')
      .eq('owner_id', userId);

    if (error || !data) return [];
    return data.map((h) => h.id);
  } catch {
    return [];
  }
}
