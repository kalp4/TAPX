import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Missing Supabase environment variables on Vercel' });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Parse body safely if sent as a JSON string from Apple Shortcuts
  let parsedBody = req.body;
  if (typeof parsedBody === 'string') {
    try {
      parsedBody = JSON.parse(parsedBody);
    } catch {
      parsedBody = {};
    }
  }

  const token =
    req.headers['x-shortcut-token'] ||
    req.query?.token ||
    parsedBody?.token;

  if (!token) {
    return res.status(401).json({ error: 'Missing Shortcut API Token' });
  }

  // GET request: Returns your live Wallets and Categories list to Apple Shortcuts
  if (req.method === 'GET') {
    const { data, error } = await supabase.rpc('shortcut_get_meta', {
      p_token: String(token).trim()
    });

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(200).json(data);
  }

  // POST request: Logs the transaction from Lock Screen Back Tap and returns updated balance
  if (req.method === 'POST') {
    const { amount, wallet, category, type, note } = parsedBody || {};

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return res.status(400).json({ error: 'Valid positive amount is required' });
    }

    const { data, error } = await supabase.rpc('shortcut_quick_log', {
      p_token: String(token).trim(),
      p_amount: Number(amount),
      p_wallet_name: wallet ? String(wallet).trim() : '',
      p_category_name: category ? String(category).trim() : '',
      p_type: type ? String(type).trim() : 'expense',
      p_note: note ? String(note).trim() : ''
    });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json(data);
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}