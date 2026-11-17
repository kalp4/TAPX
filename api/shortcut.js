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

// Unwrap single-item arrays that Apple Shortcuts frequently produces from menu/list actions
function unwrapShortcutValue(val) {
  if (Array.isArray(val)) {
    if (val.length === 1) return unwrapShortcutValue(val[0]);
    return val;
  }
  return val;
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
    normalized[cleanKey] = unwrapShortcutValue(val);
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
  const unwrapped = unwrapShortcutValue(rawType);
  if (Array.isArray(unwrapped)) {
    return 'expense';
  }

  const clean = String(unwrapped || '').trim().toLowerCase();

  if (clean.includes('expense') && clean.includes('income')) {
    return 'expense';
  }

  if (
    clean === 'expense' ||
    clean === 'spent' ||
    clean === 'spend' ||
    clean === 'debit' ||
    clean === '-' ||
    clean.startsWith('expense') ||
    clean.startsWith('spent')
  ) {
    return 'expense';
  }

  if (
    clean === 'income' ||
    clean === 'earned' ||
    clean === 'earn' ||
    clean === 'credit' ||
    clean === '+' ||
    clean.startsWith('income') ||
    clean.startsWith('earn')
  ) {
    return 'income';
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

function cleanForCompare(str) {
  return String(str || '')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
    .trim()
    .toLowerCase();
}

function findItemInDbList(preferredValue, allPayloadValues, dbList) {
  const unwrappedPref = unwrapShortcutValue(preferredValue);

  if (!Array.isArray(dbList) || dbList.length === 0) {
    return Array.isArray(unwrappedPref) ? '' : String(unwrappedPref || '').trim();
  }

  if (
    unwrappedPref &&
    !Array.isArray(unwrappedPref) &&
    !String(unwrappedPref).includes('\n')
  ) {
    const cleanPref = cleanForCompare(unwrappedPref);
    if (cleanPref) {
      const exact = dbList.find((item) => cleanForCompare(item) === cleanPref);
      if (exact) return exact;

      const partial = dbList.find(
        (item) =>
          cleanForCompare(item).includes(cleanPref) ||
          cleanPref.includes(cleanForCompare(item))
      );
      if (partial) return partial;
    }
  }

  for (const rawVal of allPayloadValues) {
    const val = unwrapShortcutValue(rawVal);
    if (Array.isArray(val) || String(val).includes('\n')) continue;
    const cleanVal = cleanForCompare(val);
    if (!cleanVal) continue;
    const exactMatch = dbList.find((item) => cleanForCompare(item) === cleanVal);
    if (exactMatch) return exactMatch;
  }

  return '';
}

function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

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

  const isIncome = normalizeTxType(payload?.type || type) === 'income';
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
    payload.wallet ??
    payload.selectedwallet ??
    payload.account ??
    payload.selectedaccount ??
    payload.wallets ??
    '';
  const rawCategoryArg =
    payload.category ??
    payload.selectedcategory ??
    payload.cat ??
    payload.chosenitem ??
    payload['chosen item'] ??
    payload.categories ??
    '';
  const rawTypeArg =
    payload.type ??
    payload.selectedtype ??
    payload.kind ??
    payload.types ??
    '';
  const noteArg = String(payload.note || '').trim();

  const allValues = Object.entries(payload)
    .filter(([k]) => k !== 'token' && k !== 'q')
    .map(([, v]) => v);

  // MODE 1: POST Request OR GET Request with Amount (Interactive Menu Shortcut)
  if (req.method === 'POST' || extractedAmount > 0) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');

    if (!extractedAmount || extractedAmount <= 0) {
      return res.status(400).send('⚠️ Enter a valid amount greater than 0');
    }

    const { data: meta } = await supabase.rpc('shortcut_get_meta', {
      p_token: cleanToken
    });

    const dbWallets = Array.isArray(meta?.wallets) ? meta.wallets : [];
    const dbCategories = Array.isArray(meta?.categories) ? meta.categories : [];

    let resolvedType = normalizeTxType(rawTypeArg);
    if (!rawTypeArg) {
      const singleExpense = allValues.some(
        (v) => !Array.isArray(v) && /^(expense|spent|spend|-)$/i.test(String(v).trim())
      );
      const singleIncome = allValues.some(
        (v) => !Array.isArray(v) && /^(income|earned|earn|\+)$/i.test(String(v).trim())
      );
      if (singleExpense) resolvedType = 'expense';
      else if (singleIncome) resolvedType = 'income';
    }

    const defaultCategoryForType =
      resolvedType === 'income'
        ? dbCategories.find((c) => /income|allowance|salary/i.test(String(c))) || 'Income & Allowance'
        : dbCategories.find((c) => !/income|allowance|salary/i.test(String(c))) || dbCategories[0] || '';

    const matchedWallet =
      findItemInDbList(rawWalletArg, allValues, dbWallets) ||
      (Array.isArray(rawWalletArg) ? '' : String(rawWalletArg || '').trim()) ||
      dbWallets[0] ||
      '';

    const matchedCategory =
      findItemInDbList(rawCategoryArg, allValues, dbCategories) ||
      (Array.isArray(rawCategoryArg) ? '' : String(rawCategoryArg || '').trim()) ||
      defaultCategoryForType;

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

  // MODE 2: Smart 1-Line Quick Input via GET (?token=xxx&q=150 cash food)
  if (req.method === 'GET' && payload.q !== undefined && String(payload.q).trim() !== '') {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');

    const rawQuery = String(payload.q).trim();
    const amountMatch = rawQuery.match(/(\d+(\.\d+)?)/);

    if (!amountMatch) {
      return res.status(400).send('⚠️ Enter an amount (e.g. 150 cash food or +500 cash)');
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

    let matchedWallet = Array.isArray(rawWalletArg) ? '' : String(rawWalletArg).trim();
    let matchedCategory = Array.isArray(rawCategoryArg) ? '' : String(rawCategoryArg).trim();

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
        matchedCategory =
          resolvedType === 'income'
            ? meta.categories.find((c) => /income|allowance|salary/i.test(String(c))) || 'Income & Allowance'
            : meta.categories[0];
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

    const resolvedExpenseCats = expenseCats.length > 0 ? expenseCats : categoriesList;
    const resolvedIncomeCats =
      incomeCats.length > 0 ? incomeCats : ['Income & Allowance', ...categoriesList];

    return res.status(200).json({
      ...(typeof data === 'object' && data !== null ? data : {}),
      types: ['Expense', 'Income'],
      Types: ['Expense', 'Income'],
      wallets: walletsList,
      Wallets: walletsList,
      categories: categoriesList,
      Categories: categoriesList,
      category: categoriesList,
      Category: categoriesList,
      Expense: resolvedExpenseCats,
      expense: resolvedExpenseCats,
      Income: resolvedIncomeCats,
      income: resolvedIncomeCats
    });
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}