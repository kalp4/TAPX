import { createClient } from '@supabase/supabase-js';

// Read raw request body stream in case Vercel does not auto-parse Apple Shortcuts payload
async function getRawBody(req) {
  if (req.body !== undefined && req.body !== null && req.body !== '') {
    if (Buffer.isBuffer(req.body)) {
      return req.body.toString('utf-8');
    }
    return req.body;
  }
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => {
      resolve(data);
    });
    req.on('error', () => {
      resolve('');
    });
  });
}

// Parse JSON or URL-encoded form body into a normalized lowercase-key object
function parseAndNormalizePayload(rawBody, queryObj = {}) {
  let obj = {};

  if (typeof rawBody === 'object' && rawBody !== null && !Buffer.isBuffer(rawBody)) {
    obj = { ...rawBody };
  } else if (typeof rawBody === 'string') {
    const trimmed = rawBody.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        obj = JSON.parse(trimmed);
      } catch {
        obj = {};
      }
    } else if (trimmed.includes('=')) {
      try {
        const params = new URLSearchParams(trimmed);
        for (const [k, v] of params.entries()) {
          obj[k] = v;
        }
      } catch {
        obj = {};
      }
    } else if (/^\d+(\.\d+)?$/.test(trimmed)) {
      obj = { amount: trimmed };
    }
  }

  const normalized = {};
  for (const [key, val] of Object.entries({ ...queryObj, ...obj })) {
    const cleanKey = String(key).trim().toLowerCase();
    normalized[cleanKey] = val;
  }

  return normalized;
}

// Extract positive numeric amount from any possible Shortcut field name
function extractAmount(payload) {
  const candidateKeys = [
    'amount',
    'amt',
    'price',
    'value',
    'input',
    'provided input',
    'providedinput',
    'number'
  ];

  for (const key of candidateKeys) {
    if (payload[key] !== undefined && payload[key] !== null && String(payload[key]).trim() !== '') {
      const cleaned = String(payload[key]).replace(/[^0-9.]/g, '');
      const num = Number(cleaned);
      if (!isNaN(num) && num > 0) {
        return num;
      }
    }
  }

  for (const [key, val] of Object.entries(payload)) {
    if (key === 'token' || key === 'q') continue;
    const strVal = String(val ?? '').trim();
    if (/^[₹$€£]?\s*\d+(\.\d+)?$/.test(strVal)) {
      const num = Number(strVal.replace(/[^0-9.]/g, ''));
      if (!isNaN(num) && num > 0) {
        return num;
      }
    }
  }

  return 0;
}

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

  const qLower = String(rawQueryText || '').trim().toLowerCase();
  if (
    qLower.startsWith('+') ||
    /\b(income|earned|earn|received|salary|allowance)\b/.test(qLower)
  ) {
    return 'income';
  }

  return 'expense';
}

// Strip emojis and extra whitespace for fuzzy comparison while returning the exact DB string
function cleanForCompare(str) {
  return String(str || '')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
    .trim()
    .toLowerCase();
}

// Match an incoming string (or any string in payload) against the exact DB array from shortcut_get_meta
function resolveExactDbMatch(preferredValue, allPayloadValues, dbList) {
  if (!Array.isArray(dbList) || dbList.length === 0) {
    return String(preferredValue || '').trim();
  }

  const cleanPreferred = cleanForCompare(preferredValue);

  // 1. Exact or trimmed/case-insensitive match on preferred field
  if (cleanPreferred) {
    const directMatch = dbList.find(
      (item) =>
        String(item).toLowerCase() === String(preferredValue).toLowerCase() ||
        cleanForCompare(item) === cleanPreferred ||
        cleanForCompare(item).includes(cleanPreferred) ||
        cleanPreferred.includes(cleanForCompare(item))
    );
    if (directMatch) return directMatch; // Return exact DB string (preserves any trailing spaces in DB)
  }

  // 2. Scan all other values sent in the Shortcut payload (in case variables were swapped or key was capitalized/renamed)
  for (const val of allPayloadValues) {
    const cleanVal = cleanForCompare(val);
    if (!cleanVal) continue;
    const found = dbList.find(
      (item) =>
        String(item).toLowerCase() === String(val).toLowerCase() ||
        cleanForCompare(item) === cleanVal
    );
    if (found) return found;
  }

  // 3. Fallback to the user's first item in DB so shortcut_quick_log never fails with "No wallet found"
  return dbList[0];
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

  const walletName = String(
    payload?.wallet_name || payload?.wallet || fallbackWallet || 'Wallet'
  ).trim();
  const categoryName = String(
    payload?.category_name || payload?.category || fallbackCategory || ''
  ).trim();
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

  const rawBody = await getRawBody(req);
  const payload = parseAndNormalizePayload(rawBody, req.query || {});

  const token =
    req.headers['x-shortcut-token'] ||
    payload.token;

  if (!token) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.status(401).send('⚠️ Missing Shortcut API Token');
  }

  const cleanToken = String(token).trim();

  const extractedAmount = extractAmount(payload);
  const rawWalletArg =
    payload.wallet || payload.selectedwallet || payload.account || payload.wallets || '';
  const rawCategoryArg =
    payload.category || payload.selectedcategory || payload.cat || payload.categories || '';
  const rawTypeArg =
    payload.type || payload.selectedtype || payload.kind || payload.types || '';
  const noteArg = String(payload.note || '').trim();

  // Collect all non-token values in case Shortcut keys were named differently or variables were swapped
  const allValues = Object.entries(payload)
    .filter(([k]) => k !== 'token' && k !== 'q')
    .map(([, v]) => String(v ?? ''));

  // MODE 1: POST Request OR GET Request with Amount (Interactive Menu Shortcut)
  if (req.method === 'POST' || extractedAmount > 0) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');

    if (!extractedAmount || extractedAmount <= 0) {
      return res
        .status(400)
        .send('⚠️ Enter a valid amount greater than 0');
    }

    // Fetch user's exact wallet and category names from DB so spelling/spaces always match 100%
    const { data: meta } = await supabase.rpc('shortcut_get_meta', {
      p_token: cleanToken
    });

    const dbWallets = Array.isArray(meta?.wallets) ? meta.wallets : [];
    const dbCategories = Array.isArray(meta?.categories) ? meta.categories : [];

    const matchedWallet = resolveExactDbMatch(rawWalletArg, allValues, dbWallets);
    const matchedCategory = resolveExactDbMatch(rawCategoryArg, allValues, dbCategories);

    // Detect type from either the type field or any value containing 'income'/'expense'
    let resolvedType = normalizeTxType(rawTypeArg);
    if (!rawTypeArg) {
      const foundIncomeWord = allValues.some((v) =>
        /^(income|earned|earn|\+)$/i.test(String(v).trim())
      );
      if (foundIncomeWord) resolvedType = 'income';
    }

    const { data, error } = await supabase.rpc('shortcut_quick_log', {
      p_token: cleanToken,
      p_amount: extractedAmount,
      p_wallet_name: matchedWallet,
      p_category_name: matchedCategory,
      p_type: resolvedType,
      p_note: noteArg
    });

    if (error) {
      return res.status(500).send(`⚠️ ${error.message}`);
    }

    const bannerText = formatCleanBanner(
      data,
      extractedAmount,
      matchedWallet,
      matchedCategory,
      resolvedType
    );
    return res.status(200).send(bannerText);
  }

  // MODE 2: Smart 1-Line Quick Input via GET (?token=xxx&q=150 fampay food)
  if (req.method === 'GET' && payload.q !== undefined && String(payload.q).trim() !== '') {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');

    const rawQuery = String(payload.q).trim();
    const amountMatch = rawQuery.match(/(\d+(\.\d+)?)/);

    if (!amountMatch) {
      return res.status(400).send('⚠️ Enter an amount (e.g. 150 fampay food or +500 cash)');
    }

    const numericAmount = Number(amountMatch[1]);
    const resolvedType = normalizeTxType(rawTypeArg, rawQuery);

    let remainingText = rawQuery
      .replace(amountMatch[0], '')
      .replace(/^[+-]\s*/, '')
      .replace(/\b(spent|spend|expense|earned|earn|income)\b/gi, '')
      .trim();

    const { data: meta } = await supabase.rpc('shortcut_get_meta', {
      p_token: cleanToken
    });

    let matchedWallet = String(rawWalletArg).trim();
    let matchedCategory = String(rawCategoryArg).trim();

    const lowerRemaining = remainingText.toLowerCase();

    if (!matchedWallet && meta && Array.isArray(meta.wallets) && meta.wallets.length > 0) {
      const sortedWallets = [...meta.wallets].sort((a, b) => String(b).length - String(a).length);
      const foundWallet = sortedWallets.find((w) =>
        lowerRemaining.includes(String(w).trim().toLowerCase())
      );
      if (foundWallet) {
        matchedWallet = foundWallet;
        remainingText = remainingText
          .replace(new RegExp(escapeRegex(String(foundWallet).trim()), 'ig'), '')
          .trim();
      } else {
        matchedWallet = meta.wallets[0];
      }
    }

    if (!matchedCategory && meta && Array.isArray(meta.categories) && meta.categories.length > 0) {
      const sortedCats = [...meta.categories].sort((a, b) => String(b).length - String(a).length);
      const foundCategory = sortedCats.find((c) => {
        const fullCat = String(c).trim().toLowerCase();
        const firstWord = fullCat.split(/[\s&/]+/)[0];
        return (
          lowerRemaining.includes(fullCat) ||
          (firstWord.length >= 3 && lowerRemaining.includes(firstWord))
        );
      });
      if (foundCategory) {
        matchedCategory = foundCategory;
        const firstWord = String(foundCategory).trim().split(/[\s&/]+/)[0];
        remainingText = remainingText
          .replace(new RegExp(escapeRegex(String(foundCategory).trim()), 'ig'), '')
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

  // MODE 3: Fetch Live Wallets, Categories & Types Dictionary for Menu Picker (GET ?token=xxx)
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
        : ['UPI', 'Cash'];

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