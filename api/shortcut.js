import { createClient } from '@supabase/supabase-js';

// Normalize user/Shortcut type input ('Expense', 'Spent', 'Income', 'Earned', '+', '-')
function normalizeTxType(rawType, rawQueryText = '') {
  const clean = String(rawType || '').trim().toLowerCase();
  if (
    clean.includes('income') ||
    clean.includes('earn') ||
    clean.includes('credit') ||
    clean === '+'
  ) {
    return 'income';
  }
  if (
    clean.includes('expense') ||
    clean.includes('spent') ||
    clean.includes('spend') ||
    clean.includes('debit') ||
    clean === '-'
  ) {
    return 'expense';
  }

  // Auto-detect from query text if prefix '+' or keywords 'earned'/'income' are present
  const qLower = String(rawQueryText || '').trim().toLowerCase();
  if (
    qLower.startsWith('+') ||
    /\b(income|earned|earn|received|salary|allowance)\b/.test(qLower)
  ) {
    return 'income';
  }

  return 'expense';
}

// Escape regex special chars when stripping matched wallet/category names from note
function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Helper to build a clean, UTF-8 safe iOS Notification Banner string
function formatCleanBanner(data, fallbackAmount, fallbackWallet, fallbackCategory, type = 'expense') {
  let payload = data;
  if (typeof payload === 'string') {
    try {
      payload = JSON.parse(payload);
    } catch {
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

  const isIncome = normalizeTxType(type) === 'income';
  const actionSign = isIncome ? '+' : '-';
  const statusIcon = isIncome ? '💰' : '✅';
  const catLabel = categoryName ? ` • ${categoryName}` : '';

  if (newBalance !== undefined && newBalance !== null && !isNaN(Number(newBalance))) {
    const formattedBal = Number(newBalance).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    return `${statusIcon} ${actionSign}${currency}${formattedAmt}${catLabel}\n💳 ${walletName}: ${currency}${formattedBal}`;
  }

  if (payload?.message && typeof payload.message === 'string') {
    return payload.message;
  }

  return `${statusIcon} ${actionSign}${currency}${formattedAmt} logged to ${walletName}${catLabel}`;
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

  // MODE 1: POST Request from Interactive Menu Shortcut (Recommended)
  if (req.method === 'POST') {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');

    const { amount, wallet, category, type, note } = parsedBody || {};
    const rawAmountStr = String(amount ?? '').replace(/[^0-9.]/g, '');
    const numericAmount = Number(rawAmountStr);

    if (!numericAmount || isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).send('⚠️ Enter a valid amount greater than 0');
    }

    const walletArg = wallet ? String(wallet).trim() : '';
    const categoryArg = category ? String(category).trim() : '';
    const typeArg = normalizeTxType(type);
    const noteArg = note ? String(note).trim() : '';

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

  // MODE 2: Menu-Picker Logging via GET URL Parameters (?token=xxx&amount=150&wallet=FamPay&category=Food&type=Expense)
  if (req.method === 'GET' && req.query?.amount !== undefined && String(req.query.amount).trim() !== '') {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');

    const rawAmountStr = String(req.query.amount).replace(/[^0-9.]/g, '');
    const numericAmount = Number(rawAmountStr);
    if (!numericAmount || isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).send('⚠️ Enter a valid amount greater than 0');
    }

    const walletArg = req.query.wallet ? String(req.query.wallet).trim() : '';
    const categoryArg = req.query.category ? String(req.query.category).trim() : '';
    const typeArg = normalizeTxType(req.query.type);
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

  // MODE 3: Smart 1-Line Quick Input via GET (?token=xxx&q=150 fampay food)
  if (req.method === 'GET' && req.query?.q !== undefined && String(req.query.q).trim() !== '') {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');

    const rawQuery = String(req.query.q).trim();
    const amountMatch = rawQuery.match(/(\d+(\.\d+)?)/);

    if (!amountMatch) {
      return res.status(400).send('⚠️ Enter an amount (e.g. 150 fampay food or +500 cash)');
    }

    const numericAmount = Number(amountMatch[1]);
    const resolvedType = normalizeTxType(req.query.type, rawQuery);

    let remainingText = rawQuery
      .replace(amountMatch[0], '')
      .replace(/^[+-]\s*/, '')
      .replace(/\b(spent|spend|expense|earned|earn|income)\b/gi, '')
      .trim();

    const { data: meta } = await supabase.rpc('shortcut_get_meta', {
      p_token: cleanToken
    });

    let matchedWallet = req.query.wallet ? String(req.query.wallet).trim() : '';
    let matchedCategory = req.query.category ? String(req.query.category).trim() : '';

    const lowerRemaining = remainingText.toLowerCase();

    if (!matchedWallet && meta && Array.isArray(meta.wallets) && meta.wallets.length > 0) {
      const sortedWallets = [...meta.wallets].sort((a, b) => String(b).length - String(a).length);
      const foundWallet = sortedWallets.find((w) =>
        lowerRemaining.includes(String(w).toLowerCase())
      );
      if (foundWallet) {
        matchedWallet = foundWallet;
        remainingText = remainingText
          .replace(new RegExp(escapeRegex(foundWallet), 'ig'), '')
          .trim();
      } else {
        matchedWallet = meta.wallets[0];
      }
    }

    if (!matchedCategory && meta && Array.isArray(meta.categories) && meta.categories.length > 0) {
      const sortedCats = [...meta.categories].sort((a, b) => String(b).length - String(a).length);
      const foundCategory = sortedCats.find((c) => {
        const fullCat = String(c).toLowerCase();
        const firstWord = fullCat.split(/[\s&/]+/)[0];
        return (
          lowerRemaining.includes(fullCat) ||
          (firstWord.length >= 3 && lowerRemaining.includes(firstWord))
        );
      });
      if (foundCategory) {
        matchedCategory = foundCategory;
        const firstWord = String(foundCategory).split(/[\s&/]+/)[0];
        remainingText = remainingText
          .replace(new RegExp(escapeRegex(foundCategory), 'ig'), '')
          .replace(new RegExp(`\\b${escapeRegex(firstWord)}\\b`, 'ig'), '')
          .trim();
      } else {
        matchedCategory = meta.categories[0];
      }
    }

    const cleanNote = remainingText.replace(/\s+/g, ' ').trim();

    const { data, error } = await supabase.rpc('shortcut_quick_log', {
      p_token: cleanToken,
      p_amount: numericAmount,
      p_wallet_name: matchedWallet,
      p_category_name: matchedCategory,
      p_type: resolvedType,
      p_note: cleanNote
    });

    if (error) {
      return res.status(500).send(`⚠️ ${error.message}`);
    }

    const bannerText = formatCleanBanner(
      data,
      numericAmount,
      matchedWallet,
      matchedCategory,
      resolvedType
    );
    return res.status(200).send(bannerText);
  }

  // MODE 4: Fetch Live Wallets, Categories & Types Dictionary for Menu Picker (GET ?token=xxx)
  if (req.method === 'GET') {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    const { data, error } = await supabase.rpc('shortcut_get_meta', {
      p_token: cleanToken
    });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const walletsList =
      Array.isArray(data?.wallets) && data.wallets.length > 0
        ? data.wallets
        : ['Cash', 'UPI'];

    const categoriesList =
      Array.isArray(data?.categories) && data.categories.length > 0
        ? data.categories
        : [
            'Food & Drinks',
            'Groceries',
            'Transport',
            'Shopping',
            'Entertainment',
            'Bills & Recharge',
            'Health & Fitness',
            'Income & Allowance'
          ];

    const expenseCats = categoriesList.filter(
      (c) => !/income|allowance|salary/i.test(String(c))
    );
    const incomeCats = categoriesList.filter((c) =>
      /income|allowance|salary/i.test(String(c))
    );

    return res.status(200).json({
      ...(typeof data === 'object' && data !== null ? data : {}),
      types: ['Expense', 'Income'],
      wallets: walletsList,
      categories: categoriesList,
      Expense: expenseCats.length > 0 ? expenseCats : categoriesList,
      Income: incomeCats.length > 0 ? incomeCats : ['Income & Allowance', ...categoriesList]
    });
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}