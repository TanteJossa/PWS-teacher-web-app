import { createClient } from '@supabase/supabase-js';
import config from '@/config';

export const supabase = createClient(config.supabase.url, config.supabase.anonKey);

// Example: fetch a user's tests
export async function getUserTests(userId) {
  const { data, error } = await supabase
    .from('tests')
    .select('*')
    .eq('user_id', userId);
  if (error) throw error;
  return data;
}
