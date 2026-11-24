import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Enforce Vercel Cron secret when configured in project environment variables
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers.authorization !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Missing Supabase environment variables on Vercel' });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data, error } = await supabase.rpc('keep_alive_ping');

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json(data);
}