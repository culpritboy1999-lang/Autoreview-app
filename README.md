# ⭐ AutoReview — Auto Google Review Responder SaaS

A complete, working SaaS platform where **shop owners connect their Google Business Profile** and let AI
answer their Google reviews in their own brand voice — plus a **public perception search** where anyone
can look up what guests collectively say about a shop.

---

## What it does

### 1. Shop owner accounts & login
- Email + password signup/login (bcrypt-hashed, HttpOnly session cookies, origin-guarded forms)
- "Continue with Google" identity login (enabled automatically once OAuth keys are configured)
- **Demo account:** `demo@autoreview.app` / `demo1234`

### 2. Automatic review answering (the core loop)
A sync worker runs every 90 seconds (plus a manual **“Check Google now”** button) and for every
connected business:

| Review rating | What happens |
|---|---|
| ★★★★★ / ★★★★ | AI writes a brand-aware reply → **posted to Google automatically** |
| ★★★ / ★★ / ★ | AI writes a careful draft → parked in the **approval inbox** |

In the approval inbox the owner can **Approve & post** (goes straight to Google), **edit** the text
first, **regenerate** a new AI draft, or **skip**. Everything is logged with who/what/when
(`ai_auto` / `ai_approved` / `manual`).

### 3. Real Google integration
- **Google Business Profile OAuth** (`business.manage` scope, offline refresh tokens)
- Lists the owner's accounts & locations via the Business Profile APIs
- Fetches reviews (`mybusiness v4 /locations/{id}/reviews`) and **posts replies directly to Google**
  (`/reviews/{id}:reply`)
- Token refresh is cached per business; failures are surfaced in the UI
- Optional **Places API (New)** key powers the public guest search against real Google places

> Without Google credentials the app runs in **Demo Mode**: a simulated Google surface where reviews
> arrive over time and replies are "posted", so the entire product works end-to-end out of the box.

### 4. Brand identity → AI follows your rules
Per business, the owner configures tone (friendly / warm / professional / playful / quirky / luxurious),
about/description, house **“Always”** and **“Never”** rules, signature, language, emoji policy and reply
length. Every reply prompt is built from these rules. Safety rails are always on: the AI never promises
refunds/compensation and never shares contact details.

### 5. Public perception pages (guest side)
Guests search on the landing page and open a shop's **perception page** built from all its Google
reviews: what the shop is about, **most famous dishes/items**, atmosphere, **important things to notice**
(honest caveats mined from negative reviews), best-for tags, sentiment split and a rating breakdown.

---

## AI model

The app uses the best **free** chat models, picked automatically by which API key is present:

| Priority | Provider | Model (free) |
|---|---|---|
| 1 | OpenRouter | `google/gemma-3-27b-it:free` |
| 2 | Groq | `gemma2-9b-it` |
| 3 | Google AI Studio | `gemini-2.0-flash` |
| — | none | built-in **brand-rules engine** (offline fallback, always works) |

> Note: “Gemma 4 31B” doesn't exist — Gemma 3 27B is the newest/largest free Gemma, so that's the default.
> Any model can be swapped via env (`OPENROUTER_MODEL`, `GROQ_MODEL`, `GOOGLE_AI_MODEL`).

## Tech stack

- **Node.js + Express**, EJS server-rendered views, no build step
- **SQLite** via `node:sqlite` (zero native deps) — data in `./data/autoreview.db`
- cookie-session (HttpOnly, SameSite=Lax) + origin guard on mutations + rate limiting on auth/search
- Free-tier AI via OpenRouter/Groq/Google AI with automatic fallback

## Run it

```bash
npm install
npm start          # → http://localhost:3000
```

Optional: `cp .env.example .env` and add keys (AI key, Google OAuth, Places API). With no keys the app
runs fully in Demo Mode — perfect for trying everything immediately.

### Enabling live Google access
1. Google Cloud Console → create an **OAuth Web client**
2. Enable **Business Profile API** and **My Business Account Management API**
3. Register redirect URIs on the client:
   - `https://<your-host>/auth/google/callback`
   - `https://<your-host>/dashboard/connect/google/callback`
4. Set `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` in `.env`, restart
5. In the dashboard → **Connect business → Connect with Google** → pick your location

## Project layout

```
server.js               Express bootstrap
lib/
  db.js                 SQLite schema + queries
  seed.js               Demo world (owner, shops, reviews, drafts waiting)
  demodata.js           Fictional shops + synthetic reviews
  demo.js               Simulated Google surface for demo mode
  google.js             OAuth, Business Profile API (fetch/post), Places API
  ai.js                 Multi-provider free AI + brand-rules fallback + perception
  pipeline.js           The auto-responder: sync → classify → reply/draft → post
  middleware.js         auth, origin guard, rate limit, flash
routes/                 public pages, auth, dashboard, public search API
views/                  EJS templates (landing, perception, auth, dashboard)
public/                 CSS + JS
```
