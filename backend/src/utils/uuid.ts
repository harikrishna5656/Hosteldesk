import { supabase } from '../db/supabase.js';

export const isUUID = (str: any): boolean =>
  typeof str === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str.trim());

let cachedDefaultHostelId: string | null = null;

export async function resolveHostelId(hostelId: any): Promise<string> {
  if (isUUID(hostelId)) {
    return String(hostelId).trim();
  }

  if (cachedDefaultHostelId) {
    return cachedDefaultHostelId;
  }

  // Look up first hostel in Supabase
  try {
    const { data } = await supabase.from('hostels').select('id').limit(1).maybeSingle();
    if (data?.id && isUUID(data.id)) {
      cachedDefaultHostelId = data.id;
      return data.id;
    }
  } catch {}

  return '';
}
