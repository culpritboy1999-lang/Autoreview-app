# ⭐ AutoReview — Auto Google Review Responder SaaS

A complete SaaS platform where **shop owners connect their Google Business Profile** and let AI answer
their Google reviews in their own brand voice — plus a **public perception search** where anyone can
look up what guests collectively say about a shop.

**Two ways to run it — pick one:**

| | 🐙 **GitHub-native (no server)** | 🖥️ **Self-hosted Node app** |
|---|---|---|
| Frontend | Static SPA in [`docs/`](docs), served by **GitHub Pages** | Express + EJS (`server.js`) |
| Backend | **The repo itself** — data as JSON in `docs/data/`, writes via GitHub Contents API | SQLite + Express API |
| Auto-responder | **GitHub Actions** (`sync.yml`, every 30 min) | Built-in worker (every 90 s) |
| Owner login | **GitHub token** (repo write access = owner) | Email/password + Google OAuth |
| AI | Free Gemma 3 / Groq / Gemini — in-browser or via Actions secrets | Same chain, server-side |
| Live Google sync | Add `GOOGLE_*` repo secrets → Actions posts to Google | Full OAuth connect in-app |

---

## 🐙 Run it directly on GitHub (recommended start)

The app lives in [`docs/`](docs) and is deployed by the included workflow the moment the branch
merges to `main` (Pages source: **GitHub Actions** — the deploy workflow enables it automatically).
Live URL after merge: `https://<owner>.github.io/<repo>/`

**How it works with zero servers:**
1. **GitHub Pages** serves the static frontend (`docs/`).
2. **Public data** (shops, reviews, perceptions) is read straight from `docs/data/*.json` — served statically, no API calls needed.
3. **GitHub Actions** runs `scripts/github-sync.mjs` every 30 minutes: new reviews come in, AI writes brand-aware replies, 4★–5★ are auto-posted, ≤3★ are parked as drafts — and the updated JSON is **committed to the repo**, which instantly updates the live site.
4. **Shop owners sign in with a GitHub token** — a fine-grained PAT with *Contents: Read and write* on this repo. Approving a reply, editing brand rules, adding a business → each action is a clean Git commit. The repo *is* the backend.

**Try it now:**
1. Open the Pages URL (or `index.html` served from any static host).
2. Browse shops → open a perception page.
3. **Sign in** with a GitHub token (create: *Settings → Developer settings → Fine-grained tokens*, scope to this repo, Contents + Actions read/write).
4. Dashboard → simulate an incoming review → watch the AI draft/auto-reply → approve drafts.

**Optional repo secrets** (Settings → Secrets → Actions) to upgrade from demo simulation to live Google:
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN` (OAuth scope `https://www.googleapis.com/auth/business.manage`) → the worker pulls your real reviews and **posts replies directly to Google**
- `OPENROUTER_API_KEY` or `GROQ_API_KEY` or `GOOGLE_AI_API_KEY` → LLM replies instead of the built-in rules engine (defaults: `google/gemma-3-27b-it:free` → `gemma2-9b-it` → `gemini-2.0-flash`)

---

## 🖥️ Self-hosted Node app

```bash
npm install
npm start          # → http://localhost:3000
```

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

## Setup details (self-hosted)

Optional: `cp .env.example .env` and add keys (AI key, Google OAuth, Places API). With no keys the app
runs fully in Demo Mode — perfect for trying everything immediately.

### Enabling live Google access (self-hosted)
1. Google Cloud Console → create an **OAuth Web client**
2. Enable **Business Profile API** and **My Business Account Management API**
3. Register redirect URIs on the client:
   - `https://<your-host>/auth/google/callback`
   - `https://<your-host>/dashboard/connect/google/callback`
4. Set `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` in `.env`, restart
5. In the dashboard → **Connect business → Connect with Google** → pick your location

## Project layout

```
docs/                   🐙 GitHub-native app (served by Pages)
  index.html            Static SPA shell
  css/app.css           Design system
  js/                   config · util · icons · gh (GitHub API client) · ai · store · views · app
  data/                 ← the "database": businesses.json, reviews.json, perceptions.json
scripts/
  github-sync.mjs       GitHub Actions worker: pull reviews → AI replies → post/draft → commit
  seed-static-data.cjs  Regenerates docs/data from the demo dataset
  render-test.cjs       Headless render tests for all SPA views
.github/workflows/
  sync.yml              Scheduled auto-responder (every 30 min) + manual dispatch
  pages.yml             Deploys docs/ to GitHub Pages
server.js               🖥️ Express bootstrap (self-hosted variant)
lib/                    SQLite, Google OAuth/Business Profile/Places, AI chain, pipeline
routes/ · views/ · public/   Self-hosted app UI
```

## Tests

```bash
node scripts/render-test.cjs   # headless SPA render + pipeline policy tests (11 checks)
node scripts/github-sync.mjs   # dry-run the Actions worker locally (demo simulation)
```

## Project layout
