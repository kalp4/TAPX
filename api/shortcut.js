import { createClient } from '@supabase/supabase-js';

const DEFAULT_CATEGORIES_LIST = [
  'Food & Drinks',
  'Groceries',
  'Transport',
  'Shopping',
  'Entertainment',
  'Bills & Recharge',
  'Health & Fitness',
  'Income & Allowance'
];

// Read raw request body stream in case Vercel does not auto-parse Apple Shortcuts payload
async function getRawBody(req) {
  if (req.body !== undefined && req.body !== null) {
    if (Buffer.isBuffer(req.body)) {
      return req.body.toString('utf-8');
    }
    return req.body;
  }
  if (req.readableEnded || req.destroyed ||
      (req.method === 'GET' && !req.headers['content-length'] && !req.headers['transfer-encoding'])) {
    return '';
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

// Extract the intended amount token from a shorthand query like "2 coffees 150 upi" or "+500 cash"
function extractShorthandAmount(rawQuery) {
  const tokens = String(rawQuery || '').trim().split(/\s+/).filter(Boolean);
  const candidates = [];

  tokens.forEach((token, idx) => {
    const m = token.match(/^([+-]?[₹$€£]?)(\d{1,3}(?:,\d{3})+|\d{1,2}(?:,\d{2})*,\d{3}|\d+)(\.\d+)?$/);
    if (m) {
      const value = Number(m[2].replace(/,/g, '') + (m[3] || ''));
      if (Number.isFinite(value) && value > 0) {
        candidates.push({
          rawToken: token,
          value,
          hasPrefix: Boolean(m[1]),
          index: idx
        });
      }
    }
  });

  if (candidates.length === 0) {
    if (/\d,\d/.test(rawQuery)) return null;
    const fallbackMatch = String(rawQuery || '').match(/(\d+(?:\.\d+)?)/);
    if (!fallbackMatch) return null;
    const val = Number(fallbackMatch[1]);
    return val > 0 ? { rawToken: fallbackMatch[0], value: val } : null;
  }

  // Prefer tokens with an explicit sign or currency symbol (e.g. +500, ₹150)
  const prefixed = candidates.find((c) => c.hasPrefix);
  if (prefixed) return prefixed;

  // If the first token is a tiny quantity (e.g. "2 coffees 150"), pick the largest standalone number
  if (candidates.length > 1) {
    return [...candidates].sort((a, b) => b.value - a.value)[0];
  }

  return candidates[0];
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

// Build complete category list combining DB categories with the 8 standard defaults
function buildKnownCategories(metaCategories) {
  const rawList = Array.isArray(metaCategories)
    ? metaCategories.map((c) => (typeof c === 'object' && c !== null ? c.name : String(c))).filter(Boolean)
    : [];

  const merged = [...rawList];
  const seen = new Set(rawList.map((c) => cleanForCompare(c)));

  for (const defCat of DEFAULT_CATEGORIES_LIST) {
    if (!seen.has(cleanForCompare(defCat))) {
      merged.push(defCat);
      seen.add(cleanForCompare(defCat));
    }
  }
  return merged;
}

function isSingleValueCandidate(val) {
  const unwrapped = unwrapShortcutValue(val);
  if (unwrapped === undefined || unwrapped === null) return false;
  if (Array.isArray(unwrapped)) return false;
  const s = String(unwrapped).trim();
  if (!s || s.includes('\n')) return false;
  // Reject comma-separated dumps of the full category menu
  if (s.includes('Food & Drinks') && s.includes('Groceries')) return false;
  return true;
}

function matchAgainstDbList(candidateStr, dbList) {
  const cleanCand = cleanForCompare(candidateStr);
  if (!cleanCand || !Array.isArray(dbList) || dbList.length === 0) return '';

  // 1. Exact match
  const exact = dbList.find((item) => cleanForCompare(item) === cleanCand);
  if (exact) return exact;

  // 2. First-word or substring match (e.g. "Transport" or "Bills")
  const partial = dbList.find((item) => {
    const cleanDb = cleanForCompare(item);
    const firstWord = cleanDb.split(/[\s&/]+/)[0];
    return (
      cleanDb.includes(cleanCand) ||
      cleanCand.includes(cleanDb) ||
      (firstWord.length >= 3 && cleanCand === firstWord)
    );
  });
  return partial || '';
}

function resolveWalletFromPayload(payload, allValues, dbWallets) {
  const walletKeys = [
    'wallet',
    'selectedwallet',
    'selected_wallet',
    'account',
    'selectedaccount',
    'selected_account',
    'wallets'
  ];

  for (const k of walletKeys) {
    if (isSingleValueCandidate(payload[k])) {
      const matched = matchAgainstDbList(payload[k], dbWallets);
      if (matched) return matched;
      return String(unwrapShortcutValue(payload[k])).trim();
    }
  }

  for (const rawVal of allValues) {
    if (!isSingleValueCandidate(rawVal)) continue;
    const matched = matchAgainstDbList(rawVal, dbWallets);
    if (matched) return matched;
  }

  return dbWallets[0] || 'UPI';
}

function resolveCategoryFromPayload(payload, allValues, dbCategories, matchedWallet, resolvedType) {
  const categoryKeys = [
    'category',
    'selectedcategory',
    'selected_category',
    'chosencategory',
    'chosen_category',
    'cat',
    'subcategory',
    'expense_category',
    'income_category',
    'chosenitem',
    'chosen item',
    'menuresult',
    'menu result',
    'item',
    'categories'
  ];

  // 1. Check all explicit category keys first (ignoring multi-item arrays/lists)
  for (const k of categoryKeys) {
    if (isSingleValueCandidate(payload[k])) {
      const valStr = String(unwrapShortcutValue(payload[k])).trim();
      if (cleanForCompare(valStr) === cleanForCompare(matchedWallet)) continue;
      if (/^(expense|spent|spend|income|earned|earn|\+|-)$/i.test(valStr)) continue;

      const matched = matchAgainstDbList(valStr, dbCategories);
      if (matched) return matched;
      return valStr;
    }
  }

  // 2. Scan all payload values for any known category match
  for (const rawVal of allValues) {
    if (!isSingleValueCandidate(rawVal)) continue;
    const valStr = String(unwrapShortcutValue(rawVal)).trim();
    if (cleanForCompare(valStr) === cleanForCompare(matchedWallet)) continue;
    if (/^(expense|spent|spend|income|earned|earn|\+|-)$/i.test(valStr)) continue;
    if (/^[₹$€£]?\s*\d+(\.\d+)?$/.test(valStr)) continue;

    const matched = matchAgainstDbList(valStr, dbCategories);
    if (matched) return matched;
  }

  // 3. Fallback based on transaction type
  if (resolvedType === 'income') {
    return (
      dbCategories.find((c) => /income|allowance|salary/i.test(String(c))) ||
      'Income & Allowance'
    );
  }
  return (
    dbCategories.find((c) => !/income|allowance|salary/i.test(String(c))) ||
    dbCategories[0] ||
    'Food & Drinks'
  );
}

function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function formatCleanBanner(data, fallbackAmount, fallbackWallet, selectedCategory, type = 'expense') {
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

  // Always prefer the user's selectedCategory over any stale default returned by SQL
  const categoryName = String(
    selectedCategory || payload?.category_name || payload?.category || ''
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
  const rawTypeArg =
    payload.type ??
    payload.selectedtype ??
    payload.selected_type ??
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

    const { data: meta, error: metaError } = await supabase.rpc('shortcut_get_meta', {
      p_token: cleanToken
    });

    if (metaError) {
      return res.status(500).send(`⚠️ ${metaError.message}`);
    }
    if (meta?.error) {
      return res.status(401).send(`⚠️ ${meta.error}`);
    }

    const dbWallets =
      Array.isArray(meta?.wallets) && meta.wallets.length > 0
        ? meta.wallets
        : ['UPI', 'Cash'];
    const dbCategories = buildKnownCategories(meta?.categories);

    let resolvedType = normalizeTxType(rawTypeArg);
    if (!isSingleValueCandidate(rawTypeArg)) {
      const singleExpense = allValues.some(
        (v) => isSingleValueCandidate(v) && /^(expense|spent|spend|-)$/i.test(String(unwrapShortcutValue(v)).trim())
      );
      const singleIncome = allValues.some(
        (v) => isSingleValueCandidate(v) && /^(income|earned|earn|\+)$/i.test(String(unwrapShortcutValue(v)).trim())
      );
      if (singleExpense) resolvedType = 'expense';
      else if (singleIncome) resolvedType = 'income';
    }

    const matchedWallet = resolveWalletFromPayload(payload, allValues, dbWallets);
    const matchedCategory = resolveCategoryFromPayload(
      payload,
      allValues,
      dbCategories,
      matchedWallet,
      resolvedType
    );

    // Embed [cat:CategoryName] tag so App.jsx can auto-heal the category_id even if
    // the Supabase `shortcut_quick_log` SQL function defaults to Food & Drinks
    const taggedNote = matchedCategory
      ? noteArg
        ? `${noteArg} [cat:${matchedCategory}]`
        : `[cat:${matchedCategory}]`
      : noteArg;

    const { data, error } = await supabase.rpc('shortcut_quick_log', {
      p_token: cleanToken,
      p_amount: extractedAmount,
      p_wallet_name: matchedWallet,
      p_category_name: matchedCategory,
      p_type: resolvedType,
      p_note: taggedNote
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

  // MODE 2: Smart 1-Line Quick Input via GET (?token=xxx&q=150 cash transport)
  if (req.method === 'GET' && payload.q !== undefined && String(payload.q).trim() !== '') {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');

    const rawQuery = String(payload.q).trim();
    const amountPick = extractShorthandAmount(rawQuery);

    if (!amountPick) {
      return res.status(400).send('⚠️ Enter an amount (e.g. 150 cash food or +500 cash)');
    }

    const numericAmount = amountPick.value;
    const resolvedType = normalizeTxType(rawTypeArg, rawQuery);

    let remainingText = rawQuery
      .replace(new RegExp(`(^|\\s)${escapeRegex(amountPick.rawToken)}(?=\\s|$)`), '$1')
      .replace(/^[+-]\s*/, '')
      .replace(/\b(spent|spend|expense|earned|earn|income)\b/gi, '')
      .trim();

    const { data: meta, error: metaError } = await supabase.rpc('shortcut_get_meta', {
      p_token: cleanToken
    });

    if (metaError) {
      return res.status(500).send(`⚠️ ${metaError.message}`);
    }
    if (meta?.error) {
      return res.status(401).send(`⚠️ ${meta.error}`);
    }

    const dbWallets =
      Array.isArray(meta?.wallets) && meta.wallets.length > 0
        ? meta.wallets
        : ['UPI', 'Cash'];
    const dbCategories = buildKnownCategories(meta?.categories);

    let matchedWallet = '';
    let matchedCategory = '';

    const lowerRemaining = remainingText.toLowerCase();

    const sortedWallets = [...dbWallets].sort((a, b) => String(b).length - String(a).length);
    const foundWallet = sortedWallets.find((w) =>
      lowerRemaining.includes(String(w).trim().toLowerCase())
    );
    if (foundWallet) {
      matchedWallet = foundWallet;
      remainingText = remainingText
        .replace(new RegExp(`\\b${escapeRegex(String(foundWallet).trim())}\\b`, 'ig'), '')
        .trim();
    } else {
      matchedWallet = dbWallets[0];
    }

    const sortedCats = [...dbCategories].sort((a, b) => String(b).length - String(a).length);
    let matchedByFullCat = false;
    const foundCategory = sortedCats.find((c) => {
      const fullCat = cleanForCompare(c);
      const firstWord = fullCat.split(/[\s&/]+/)[0];
      if (remainingText.toLowerCase().includes(fullCat)) {
        matchedByFullCat = true;
        return true;
      }
      if (firstWord.length >= 3 && new RegExp(`\\b${escapeRegex(firstWord)}\\b`, 'i').test(remainingText)) {
        matchedByFullCat = false;
        return true;
      }
      return false;
    });

    if (foundCategory) {
      matchedCategory = foundCategory;
      if (matchedByFullCat) {
        remainingText = remainingText
          .replace(new RegExp(escapeRegex(String(foundCategory).trim()), 'ig'), '')
          .trim();
      } else {
        const firstWord = cleanForCompare(foundCategory).split(/[\s&/]+/)[0];
        remainingText = remainingText
          .replace(new RegExp(`\\b${escapeRegex(firstWord)}\\b`, 'i'), '')
          .trim();
      }
    } else {
      matchedCategory =
        resolvedType === 'income'
          ? dbCategories.find((c) => /income|allowance|salary/i.test(String(c))) || 'Income & Allowance'
          : dbCategories[0];
    }

    const cleanNote = remainingText.replace(/\s+/g, ' ').trim();
    const taggedNote = matchedCategory
      ? cleanNote
        ? `${cleanNote} [cat:${matchedCategory}]`
        : `[cat:${matchedCategory}]`
      : cleanNote;

    const { data, error } = await supabase.rpc('shortcut_quick_log', {
      p_token: cleanToken,
      p_amount: numericAmount,
      p_wallet_name: matchedWallet,
      p_category_name: matchedCategory,
      p_type: resolvedType,
      p_note: taggedNote
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
    if (data?.error) {
      return res.status(401).json({ error: data.error });
    }

    const walletsList =
      Array.isArray(data?.wallets) && data.wallets.length > 0
        ? data.wallets
        : ['UPI', 'Cash'];

    const categoriesList = buildKnownCategories(data?.categories);

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