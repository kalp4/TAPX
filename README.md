# TAPX

A multi-wallet personal expense tracker and Progressive Web App (PWA) with a serverless webhook API for iOS Shortcuts.

**Production:** [xtap.vercel.app](https://xtap.vercel.app) · **Privacy Policy:** [xtap.vercel.app/privacy.html](https://xtap.vercel.app/privacy.html)

---

## Overview

Logging small daily transactions often fails because opening an app, waiting for client authentication, and navigating forms introduces too much friction. 

TAPX addresses this in two ways:
1. **Headless Ingestion (`/api/shortcut`):** A stateless Vercel Serverless Function that allows iOS Shortcuts (triggered via iPhone Back Tap) to fetch live account metadata and commit transactions directly to PostgreSQL without opening the web client.
2. **Optimistic Web Client:** A React 19 PWA that caches state locally in `localStorage` (`tapx_local_cache_v4`) and applies optimistic balance mutations on input, reconciling with Supabase in the background.

---

## Architecture

* **Frontend (`src/`):** React 19, Vite 6, and Tailwind CSS. Configured for standalone iOS display (`manifest.json`) with fixed viewport locking and dynamic canvas-rendered PNG touch icons (`index.html`).
* **Serverless API (`api/`):** Node.js serverless handlers deployed on Vercel:
  * `api/shortcut.js`: Normalizes JSON, URL-encoded form data, or raw query strings from Apple Shortcuts, resolves fuzzy wallet/category matches, and invokes database RPCs.
  * `api/keepalive.js`: Invoked daily at `08:00 UTC` via Vercel Cron (`vercel.json`) to execute a lightweight RPC ping and prevent Supabase project hibernation.
* **Database & Auth:** Supabase (PostgreSQL + Google OAuth 2.0). All tables enforce Row-Level Security (RLS) scoped to `auth.uid() = user_id`. External webhook calls authenticate via a revocable 32-character hex `shortcut_token` managed per user.

---

## Repository Structure

```text
tapx/
├── api/
│   ├── keepalive.js          # Daily cron handler to prevent database pausing
│   └── shortcut.js           # Webhook endpoint for Apple Shortcuts
├── public/
│   ├── favicon.svg           # Vector application icon
│   ├── icons.svg             # SVG symbol definitions
│   ├── logo.png              # 512x512 PWA icon
│   ├── manifest.json         # Web App Manifest
│   └── privacy.html          # Static privacy policy for OAuth verification
├── src/
│   ├── App.css               # Base stylesheet
│   ├── App.jsx               # Core application state, views, and ErrorBoundary
│   ├── index.css             # Viewport lock and scroll container rules
│   ├── main.jsx              # Application entry point
│   └── supabaseClient.js     # Supabase client singleton
├── .oxlintrc.json            # Oxlint ruleset
├── index.html                # App shell and iOS touch-icon canvas script
├── package.json              # Dependencies and build scripts
├── vercel.json               # Cron definitions and SPA/API routing rewrites
└── vite.config.js            # Vite bundler configuration
```

---

## Webhook API Reference

All requests to `/api/shortcut` require authentication via either the `x-shortcut-token` HTTP header or the `token` query parameter.

### 1. Retrieve Account Metadata
```http
GET /api/shortcut?token=<SHORTCUT_TOKEN>
```
Returns the user's active wallets and categories to populate dynamic selection menus in Apple Shortcuts. Keys are returned in both lowercase and titlecase to prevent dictionary lookup failures across iOS versions.

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
Accepts JSON, `application/x-www-form-urlencoded`, or query parameters. Fuzzy-matches wallet and category strings against the user's database records (stripping emojis and whitespace) before falling back to the primary wallet/category.

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
Parses a single freeform string for amount, transaction direction (`+` or keywords like `income`/`earned`), wallet name, category prefix, and note remainder.

* **Expense:** `/api/shortcut?token=TOKEN&q=150%20upi%20food%20coffee`
* **Income:** `/api/shortcut?token=TOKEN&q=%2B500%20cash%20allowance`

---

## Database Schema

To deploy your own instance, configure a Supabase project with the following tables and RPC functions:

### Tables

* **`user_settings`**
  * `user_id` (`uuid`, Primary Key, references `auth.users`)
  * `currency` (`text`, default `'₹'`)
  * `shortcut_token` (`text`, unique)
* **`wallets`**
  * `id` (`uuid`, Primary Key, default `gen_random_uuid()`)
  * `user_id` (`uuid`, references `auth.users`)
  * `name` (`text`), `type` (`text`), `balance` (`numeric`, default `0`), `color` (`text`), `icon` (`text`)
  * `created_at` (`timestamptz`, default `now()`)
* **`categories`**
  * `id` (`uuid`, Primary Key, default `gen_random_uuid()`)
  * `user_id` (`uuid`, references `auth.users`)
  * `name` (`text`), `type` (`text`: `'expense'` | `'income'`), `icon` (`text`), `color` (`text`)
  * `monthly_budget` (`numeric`, nullable)
  * `created_at` (`timestamptz`, default `now()`)
* **`transactions`**
  * `id` (`uuid`, Primary Key, default `gen_random_uuid()`)
  * `user_id` (`uuid`, references `auth.users`)
  * `wallet_id` (`uuid`, references `wallets.id` on delete cascade)
  * `to_wallet_id` (`uuid`, nullable, references `wallets.id` on delete set null)
  * `category_id` (`uuid`, nullable, references `categories.id` on delete set null)
  * `type` (`text`: `'expense'` | `'income'` | `'transfer'`)
  * `amount` (`numeric`), `note` (`text`), `source` (`text`: `'app'` | `'shortcut'`)
  * `created_at` (`timestamptz`, default `now()`)

### Required PostgreSQL RPC Functions

* `shortcut_get_meta(p_token text)`: Validates `p_token` against `user_settings.shortcut_token` and returns a JSON object containing the user's `wallets` and `categories` name arrays.
* `shortcut_quick_log(p_token text, p_amount numeric, p_wallet_name text, p_category_name text, p_type text, p_note text)`: Validates `p_token`, resolves the wallet and category IDs, inserts the transaction row with `source = 'shortcut'`, updates `wallets.balance`, and returns `amount`, `wallet_name`, `category_name`, `type`, `currency`, and `new_balance`.
* `keep_alive_ping()`: Returns a static status payload (`SELECT 1`) for the daily cron job.

---

## Local Development

### Prerequisites
* Node.js >= 18.x
* Supabase project with Google OAuth provider enabled

### Setup

1. Clone the repository and install dependencies:
   ```bash
   git clone https://github.com/kalp4/TAPX
   cd tapx
   npm install
   ```

2. Create a `.env` file in the root directory:
   ```env
   VITE_SUPABASE_URL=[https://your-project-ref.supabase.co](https://your-project-ref.supabase.co)
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```
   *Note: Both variables must also be configured in your Vercel project environment settings so the serverless functions in `api/` can initialize the Supabase client.*

3. Start the Vite development server:
   ```bash
   npm run dev
   ```

4. Build for production:
   ```bash
   npm run build
   npm run preview
   ```

---

## iOS Shortcut Configuration

1. Sign in to the web client and navigate to **Settings → Back Tap Setup**.
2. Copy your personal webhook URL or use the [shared iCloud Shortcut template](https://www.icloud.com/shortcuts/e2b04fe336ae49af8df883fccb1370f2).
3. To bind the shortcut to hardware gestures, open iOS **Settings → Accessibility → Touch → Back Tap** and assign the shortcut to **Double Tap** or **Triple Tap**.

---

## Author
**Kalp Patel**  