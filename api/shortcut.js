import { createClient } from '@supabase/supabase-js';

// Helper to build a clean, UTF-8 safe iOS Notification Banner string
function formatCleanBanner(data, fallbackAmount, fallbackWallet, fallbackCategory, type = 'expense') {
  // If data is a string that looks like JSON, parse it first
  let payload = data;
  if (typeof payload === 'string') {
    try {
      payload = JSON.parse(payload);
    } catch {
      // It's already a plain string
      return payload;
    }
  }

  if (payload?.error) {
    return `⚠️ ${payload.error}`;
  }

  const currency = payload?.currency || '₹';
  const rawAmt = Number(payload?.amount ?? fallbackAmount ?? 0);
  const formattedAmt = rawAmt.toLocaleString('en-IN', {
    minimumFractionDigits: rawAmt % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2
  });

  const walletName = payload?.wallet_name || payload?.wallet || fallbackWallet || 'Wallet';
  const categoryName = payload?.category_name || payload?.category || fallbackCategory || '';
  const newBalance = payload?.new_balance ?? payload?.balance;

  const actionSign = type === 'income' ? '+' : '-';
  const catLabel = categoryName ? ` • ${categoryName}` : '';

  if (newBalance !== undefined && newBalance !== null && !isNaN(Number(newBalance))) {
    const formattedBal = Number(newBalance).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    return `✅ ${actionSign}${currency}${formattedAmt}${catLabel}\n💳 ${walletName}: ${currency}${formattedBal}`;
  }

  if (payload?.message && typeof payload.message === 'string') {
    return payload.message;
  }

  return `✅ ${actionSign}${currency}${formattedAmt} logged to ${walletName}${catLabel}`;
}

export default async function handler(req, res) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.status(500).send('⚠️ Missing Supabase environment variables on Vercel');
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
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.status(401).send('⚠️ Missing Shortcut API Token');
  }

  const cleanToken = String(token).trim();

  // MODE 1: Smart 1-Line Quick Input via GET (?token=xxx&q=150 fampay food)
  if (req.query?.q !== undefined) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');

    const rawQuery = String(req.query.q).trim();
    const amountMatch = rawQuery.match(/(\d+(\.\d+)?)/);

    if (!amountMatch) {
      return res.status(400).send('⚠️ Enter an amount (e.g. 150 or 150 fampay food)');
    }

    const numericAmount = Number(amountMatch[1]);
    const remainingText = rawQuery.replace(amountMatch[0], '').trim().toLowerCase();

    // Fetch user's actual wallets and categories to auto-match words
    const { data: meta } = await supabase.rpc('shortcut_get_meta', {
      p_token: cleanToken
    });

    let matchedWallet = '';
    let matchedCategory = '';

    if (meta && Array.isArray(meta.wallets) && meta.wallets.length > 0) {
      const foundWallet = meta.wallets.find((w) =>
        remainingText.includes(String(w).toLowerCase())
      );
      matchedWallet = foundWallet || meta.wallets[0];
    }

    if (meta && Array.isArray(meta.categories) && meta.categories.length > 0) {
      const foundCategory = meta.categories.find((c) =>
        remainingText.includes(String(c).toLowerCase())
      );
      matchedCategory = foundCategory || meta.categories[0];
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
      return res.status(500).send(`⚠️ ${error.message}`);
    }

    const bannerText = formatCleanBanner(data, numericAmount, matchedWallet, matchedCategory, 'expense');
    return res.status(200).send(bannerText);
  }

  // MODE 2: Menu-Picker Logging via Simple GET URL (?token=xxx&amount=150&wallet=FamPay&category=Food)
  if (req.method === 'GET' && req.query?.amount) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');

    const numericAmount = Number(req.query.amount);
    if (!numericAmount || isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).send('⚠️ Enter a valid amount greater than 0');
    }

    const walletArg = req.query.wallet ? String(req.query.wallet).trim() : '';
    const categoryArg = req.query.category ? String(req.query.category).trim() : '';
    const typeArg = req.query.type ? String(req.query.type).trim() : 'expense';
    const noteArg = req.query.note ? String(req.query.note).trim() : '';

    const { data, error } = await supabase.rpc('shortcut_quick_log', {
      p_token: cleanToken,
      p_amount: numericAmount,
      p_wallet_name: walletArg,
      p_category_name: categoryArg,
      p_type: typeArg,
      p_note: noteArg
    });

    if (error) {
      return res.status(500).send(`⚠️ ${error.message}`);
    }

    const bannerText = formatCleanBanner(data, numericAmount, walletArg, categoryArg, typeArg);
    return res.status(200).send(bannerText);
  }

  // MODE 3: Fetch Live Wallets & Categories List for Menu Picker (?token=xxx)
  if (req.method === 'GET') {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');

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

    const walletArg = wallet ? String(wallet).trim() : '';
    const categoryArg = category ? String(category).trim() : '';
    const typeArg = type ? String(type).trim() : 'expense';

    const { data, error } = await supabase.rpc('shortcut_quick_log', {
      p_token: cleanToken,
      p_amount: Number(amount),
      p_wallet_name: walletArg,
      p_category_name: categoryArg,
      p_type: typeArg,
      p_note: note ? String(note).trim() : ''
    });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const cleanMessage = formatCleanBanner(data, Number(amount), walletArg, categoryArg, typeArg);
    return res.status(200).json({
      ...(typeof data === 'object' && data !== null ? data : {}),
      message: cleanMessage
    });
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}