# TAPX

A multi-wallet personal expense tracker and Progressive Web App (PWA) with a serverless webhook API for iOS Back Tap Shortcuts.

**Production:** [xtap.vercel.app](https://xtap.vercel.app) · **Privacy Policy:** [xtap.vercel.app/privacy.html](https://xtap.vercel.app/privacy.html)

---

## Overview

Logging small daily transactions often fails because opening an app, waiting for authentication, and navigating forms introduces too much friction.

TAPX solves this in two ways:
1. **Headless Ingestion (`/api/shortcut`):** A stateless Vercel Serverless Function that lets iOS Shortcuts (triggered via iPhone Back Tap) fetch live account metadata and commit transactions directly to PostgreSQL from the Lock Screen.
2. **Optimistic Offline-Ready PWA:** A React 19 web client that hydrates synchronously from `localStorage` (`tapx_local_cache_v4`), applies optimistic balance updates, queues offline entries (`tapx_offline_queue_v1`), and reconciles with Supabase in the background.

---

## Key Features

- **Tactile Keypad & Multi-Wallet Tracking:** Fast expense, income, and inter-wallet transfer entry with quick-add chips (`+₹50`, `+₹100`, `+₹500`, `+₹1k`) and instant balance previews.
- **iPhone Back Tap Integration:** One-tap iCloud Shortcut setup with revocable per-user security tokens and fuzzy wallet/category matching.
- **Organized Insights & CSV Export:** Period presets (`7D`, `This Month`, `Last Month`, `30D`, `90D`, `All`, `Custom`), interactive SVG category donut, spending trend chart, day-of-week heatmap, time-of-day & ticket-size habits, budget guardrails, and UTF-8 BOM CSV export.
- **Custom Accounts & 110+ Icon Library:** Searchable emoji picker with custom keyboard emoji input, custom sticker colors, and optional monthly category limits.
- **Zero-Dependency Sound & Haptics Engine:** Synthesized Web Audio API keypad pops, chimes, and cross-platform haptics (Vibration API + iOS 17.4+ Taptic switch fallback) with a persistent mute toggle.
- **Charcoal & Warm Sand Theme:** Auto (system), Light, and Dark modes with fixed viewport locking and dynamically rendered 512x512 PNG iOS touch icons.

---

## Architecture

- **Frontend (`src/`):** React 19, Vite 6, and Tailwind CSS. Modularized into UI components, analytics computation, theme/icon constants, and Web Audio synthesis.
- **Serverless API (`api/`):** Node.js handlers deployed on Vercel:
  - `api/shortcut.js`: Normalizes JSON, URL-encoded form data, or shorthand query strings from Apple Shortcuts, resolves fuzzy wallet/category matches, and invokes database RPCs.
  - `api/keepalive.js`: Triggered daily at `08:00 UTC` via Vercel Cron (`vercel.json`) to run a lightweight RPC ping and prevent Supabase project hibernation.
- **Database & Auth:** Supabase (PostgreSQL + Google OAuth 2.0). All tables enforce Row-Level Security (RLS) scoped to `auth.uid() = user_id`.

---

## Repository Structure

```text
tapx/
├── api/
│   ├── keepalive.js            # Daily cron handler to prevent database pausing
│   └── shortcut.js             # Webhook endpoint for Apple Shortcuts
├── public/
│   ├── favicon.svg             # Vector application icon
│   ├── logo.png                # 512x512 PWA icon
│   ├── manifest.json           # Web App Manifest
│   └── privacy.html            # Static privacy policy for OAuth verification
├── src/
│   ├── components/
│   │   ├── Modals.jsx          # Logo, NavIcon, IconLibraryPicker, LoginScreen & bottom-sheet modals
│   │   └── Tabs.jsx            # Keypad, Accounts, Insights, and Settings views
│   ├── analytics.js            # Session hydration, date windows, and spending analytics engine
│   ├── App.jsx                 # Core application state, sync queue, and ErrorBoundary
│   ├── constants.js            # Theme tokens, defaults, storage keys, and 110+ icon catalog
│   ├── index.css               # Viewport lock and scroll container rules
│   ├── main.jsx                # Application entry point
│   ├── sounds.js               # Web Audio API sound synthesizer and haptics
│   └── supabaseClient.js       # Supabase client singleton
├── .oxlintrc.json              # Oxlint ruleset
├── index.html                  # App shell, pre-paint theme script, and iOS touch-icon canvas
├── package.json                # Dependencies and build scripts
├── vercel.json                 # Cron definitions and SPA/API routing rewrites
└── vite.config.js              # Vite bundler configuration
```

---

## Webhook API Reference

All requests to `/api/shortcut` authenticate via the `x-shortcut-token` HTTP header or the `token` query parameter.

### 1. Retrieve Account Metadata
```http
GET /api/shortcut?token=<SHORTCUT_TOKEN>
```
Returns active wallets and categories in both lowercase and TitleCase keys to populate dynamic selection menus across iOS versions.

**Response (`200 OK`, `application/json`):**
```json
{
  "types": ["Expense", "Income"],
  "wallets": ["UPI", "Cash"],
  "categories": ["Food & Drinks", "Groceries", "Transport", "Shopping"],
  "Expense": ["Food & Drinks", "Groceries", "Transport", "Shopping"],
  "Income": ["Income & Allowance"]
}
```

### 2. Record Structured Transaction
```http
POST /api/shortcut
Content-Type: application/json
x-shortcut-token: <SHORTCUT_TOKEN>
```
Accepts JSON, `application/x-www-form-urlencoded`, or query parameters. Fuzzy-matches wallet and category names (stripping emojis and whitespace) before falling back to the primary wallet/category.

**Request Body:**
```json
{
  "amount": 150,
  "wallet": "UPI",
  "category": "Food & Drinks",
  "type": "expense",
  "note": "Lunch"
}
```

**Response (`200 OK`, `text/plain`):**
```text
✅ -₹150 • Food & Drinks
💳 UPI: ₹2,850.00
```

### 3. Record Shorthand Query
```http
GET /api/shortcut?token=<SHORTCUT_TOKEN>&q=<ENCODED_STRING>
```
Parses a single freeform string for amount, direction (`+` or keywords like `income`/`earned`), wallet name, category prefix, and note remainder.

- **Expense:** `/api/shortcut?token=TOKEN&q=150%20upi%20food%20coffee`
- **Income:** `/api/shortcut?token=TOKEN&q=%2B500%20cash%20allowance`

---

## Database Schema

Configure a Supabase project with the following tables and RPC functions:

### Tables

- **`user_settings`**
  - `user_id` (`uuid`, Primary Key, references `auth.users`)
  - `currency` (`text`, default `'₹'`)
  - `shortcut_token` (`text`, unique)
- **`wallets`**
  - `id` (`uuid`, Primary Key, default `gen_random_uuid()`)
  - `user_id` (`uuid`, references `auth.users`)
  - `name` (`text`), `type` (`text`), `balance` (`numeric`, default `0`), `color` (`text`), `icon` (`text`)
  - `created_at` (`timestamptz`, default `now()`)
- **`categories`**
  - `id` (`uuid`, Primary Key, default `gen_random_uuid()`)
  - `user_id` (`uuid`, references `auth.users`)
  - `name` (`text`), `type` (`text`: `'expense'` | `'income'`), `icon` (`text`), `color` (`text`)
  - `monthly_budget` (`numeric`, nullable)
  - `created_at` (`timestamptz`, default `now()`)
- **`transactions`**
  - `id` (`uuid`, Primary Key, default `gen_random_uuid()`)
  - `user_id` (`uuid`, references `auth.users`)
  - `wallet_id` (`uuid`, references `wallets.id` on delete cascade)
  - `to_wallet_id` (`uuid`, nullable, references `wallets.id` on delete set null)
  - `category_id` (`uuid`, nullable, references `categories.id` on delete set null)
  - `type` (`text`: `'expense'` | `'income'` | `'transfer'`)
  - `amount` (`numeric`), `note` (`text`), `source` (`text`: `'app'` | `'shortcut'`)
  - `created_at` (`timestamptz`, default `now()`)

### Required PostgreSQL RPC Functions

- `shortcut_get_meta(p_token text)`: Validates `p_token` against `user_settings.shortcut_token` and returns JSON with `wallets` and `categories`.
- `shortcut_quick_log(p_token text, p_amount numeric, p_wallet_name text, p_category_name text, p_type text, p_note text)`: Validates `p_token`, resolves wallet/category IDs, inserts the transaction with `source = 'shortcut'`, updates `wallets.balance`, and returns `amount`, `wallet_name`, `category_name`, `type`, `currency`, and `new_balance`.
- `keep_alive_ping()`: Returns a lightweight status payload (`SELECT 1`) for the daily cron job.

---

## Local Development

### Prerequisites
- Node.js >= 18.x
- Supabase project with Google OAuth enabled

### Setup

1. Clone the repository and install dependencies:
   ```bash
   git clone [https://github.com/kalp4/TAPX](https://github.com/kalp4/TAPX)
   cd TAPX
   npm install
   ```

2. Create a `.env` file in the root directory:
   ```env
   VITE_SUPABASE_URL=[https://your-project-ref.supabase.co](https://your-project-ref.supabase.co)
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```
   *Both variables must also be configured in your Vercel project settings so the serverless functions in `api/` can initialize Supabase.*

3. Start the Vite development server:
   ```bash
   npm run dev
   ```

4. Build and preview for production:
   ```bash
   npm run build
   npm run preview
   ```

---

## iOS Shortcut Configuration

1. Sign in to TAPX and open **Settings → Shortcut Setup**.
2. Tap **Copy Personal URL & Install Shortcut** (or open the [shared iCloud Shortcut template](https://www.icloud.com/shortcuts/f14c323b56b34217a774b466a558c57b)).
3. Paste your personal URL when prompted and tap **Add Shortcut**.
4. Bind it to hardware gestures in iOS **Settings → Accessibility → Touch → Back Tap → Double Tap** and choose **TAPX**.

---

## Author
**Kalp Patel**