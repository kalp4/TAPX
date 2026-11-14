import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).send('Missing Supabase environment variables on Vercel');
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
    return res.status(401).send('Missing Shortcut API Token');
  }

  const cleanToken = String(token).trim();

  // MODE 1: Smart 1-Line Quick Input via GET (?token=xxx&q=150 fampay food)
  if (req.query?.q) {
    const rawQuery = String(req.query.q).trim();
    const amountMatch = rawQuery.match(/(\d+(\.\d+)?)/);

    if (!amountMatch) {
      return res.status(400).send('⚠️ Could not find an amount in your input.');
    }

    const numericAmount = Number(amountMatch[1]);
    const remainingText = rawQuery.replace(amountMatch[0], '').trim().toLowerCase();

    // Fetch user's actual wallets and categories to auto-match words
    const { data: meta } = await supabase.rpc('shortcut_get_meta', {
      p_token: cleanToken
    });

    let matchedWallet = '';
    let matchedCategory = '';

    if (meta && Array.isArray(meta.wallets)) {
      const foundWallet = meta.wallets.find((w) =>
        remainingText.includes(String(w).toLowerCase())
      );
      if (foundWallet) matchedWallet = foundWallet;
    }

    if (meta && Array.isArray(meta.categories)) {
      const foundCategory = meta.categories.find((c) =>
        remainingText.includes(String(c).toLowerCase())
      );
      if (foundCategory) matchedCategory = foundCategory;
    }

    const { data, error } = await supabase.rpc('shortcut_quick_log', {
      p_token: cleanToken,
      p_amount: numericAmount,
      p_wallet_name: matchedWallet,
      p_category_name: matchedCategory,
      p_type: 'expense',
      p_note: remainingText
    });

    if (error) {
      return res.status(500).send(`⚠️ Error: ${error.message}`);
    }

    return res.status(200).send(data?.message || '✅ Logged to TAPX!');
  }

  // MODE 2: Menu-Picker Logging via Simple GET URL (?token=xxx&amount=150&wallet=FamPay&category=Food)
  if (req.method === 'GET' && req.query?.amount) {
    const numericAmount = Number(req.query.amount);
    if (!numericAmount || isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).send('⚠️ Enter a valid amount greater than 0');
    }

    const { data, error } = await supabase.rpc('shortcut_quick_log', {
      p_token: cleanToken,
      p_amount: numericAmount,
      p_wallet_name: req.query.wallet ? String(req.query.wallet).trim() : '',
      p_category_name: req.query.category ? String(req.query.category).trim() : '',
      p_type: req.query.type ? String(req.query.type).trim() : 'expense',
      p_note: req.query.note ? String(req.query.note).trim() : ''
    });

    if (error) {
      return res.status(500).send(`⚠️ Error: ${error.message}`);
    }

    if (req.query.format === 'json') {
      return res.status(200).json(data);
    }

    return res.status(200).send(data?.message || '✅ Logged to TAPX!');
  }

  // MODE 3: Fetch Live Wallets & Categories List for Menu Picker (?token=xxx)
  if (req.method === 'GET') {
    const { data, error } = await supabase.rpc('shortcut_get_meta', {
      p_token: cleanToken
    });

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(200).json(data);
  }

  // MODE 4: Traditional POST Request Support
  if (req.method === 'POST') {
    const { amount, wallet, category, type, note } = parsedBody || {};

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return res.status(400).json({ error: 'Valid positive amount is required' });
    }

    const { data, error } = await supabase.rpc('shortcut_quick_log', {
      p_token: cleanToken,
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