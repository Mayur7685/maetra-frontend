# Maetra

Privacy-preserving trading reputation platform on Aleo. Traders prove their performance via zero-knowledge proofs without revealing trade data. Followers subscribe to access alpha content.

---

## How Aleo is Used

Maetra uses three Leo programs deployed on the Aleo blockchain. Each serves a distinct role in the privacy architecture.

### 1. Trust Score Verification (`maetra_trust.aleo`)

**Problem**: Traders claim performance ("I'm up 80% this month") but there's no way to verify without exposing their full trade history, positions, and PnL.

**Solution**: The trader's raw metrics (profitable days, total days, trade count, volume, streak) are submitted as **private inputs** to a ZK circuit. The circuit computes derived scores and writes only the results to public on-chain mappings.

```
Private Inputs (never revealed)     Public Outputs (on-chain)
------------------------------      -------------------------
profitable_days: 22                 win_rate: 7333 (73.33%)
total_days: 30                      trust_score: 219
trade_count: 87                     weight_class: 1 (Middleweight)
avg_volume_usd: 15000000            trade_count: 87
current_streak: 5                   win_streak: 5
```

The ZK proof guarantees the public outputs are correctly derived from valid private inputs. No one — not even Maetra — can see the raw trade data.

**On-chain mappings** (address => value):
- `trust_scores` — Composite score: `win_rate * log(trade_count) / 10000`
- `win_rates` — Win rate x10000 for precision
- `trade_counts` — Total verified trades
- `weight_classes` — 0=Lightweight (<$100K), 1=Middleweight ($100K-$500K), 2=Heavyweight (>$500K)
- `win_streaks` — Current consecutive winning days

### 2. Private Subscriptions (`maetra_subscription.aleo`)

**Problem**: On a public blockchain, everyone can see who subscribes to whom, revealing trading strategy interests and financial relationships.

**Solution**: When a user subscribes, they receive a **private `SubscriptionRecord`** — an encrypted Aleo record that only the subscriber can decrypt. The on-chain state only tracks the creator's price and total subscriber count (not who subscribed).

```
Private (only subscriber sees)      Public (on-chain)
------------------------------      -------------------------
SubscriptionRecord {                subscription_prices[creator] = 5000000
  owner: subscriber_address         subscriber_counts[creator] = 42
  creator: creator_address
  amount: 5000000
  expires_at: 1430000
}
```

**What's hidden**: Who subscribes to whom. The subscriber's identity is encrypted inside the record.

**What's public**: Creator prices and total subscriber counts (aggregate only).

**Verification**: `verify_subscription` lets a subscriber prove they have a valid subscription to a specific creator without revealing their identity to anyone else.

### 3. Content Integrity (`maetra_content.aleo`)

**Problem**: A creator could retroactively claim they called a trade. There's no timestamped proof of when alpha was published.

**Solution**: When a creator publishes a post, the content hash is registered on-chain. The actual content is stored off-chain (encrypted in the database). The on-chain hash serves as an immutable timestamp proof.

```
Off-chain (encrypted DB)            On-chain (public)
------------------------------      -------------------------
Post {                              content_hashes[post_id] = hash
  title: "ETH breakout incoming"    content_owners[post_id] = creator
  content: "Full analysis..."       post_counts[creator] = 15
  contentEncrypted: "..."
}
```

**What's hidden**: The actual content (only subscribers can read it).

**What's public**: That a creator published something at a specific time, and the hash to verify it hasn't been altered.

---

## Data Architecture

### What Lives Where

| Data | Location | Visibility | Why |
|------|----------|-----------|-----|
| Raw trade metrics | Private ZK inputs | Nobody sees | Core privacy guarantee |
| Trust scores, win rates | Aleo on-chain mappings | Public | Leaderboard reputation |
| Subscription records | Aleo private records | Only subscriber | Hide who follows whom |
| Subscriber counts | Aleo on-chain mappings | Public | Social proof (aggregate) |
| Content hashes | Aleo on-chain mappings | Public | Timestamp proof of alpha |
| Alpha post content | PostgreSQL (encrypted) | Subscribers only | Gated access |
| User profiles | PostgreSQL | Public (via API) | Display on leaderboard |
| Exchange API keys | PostgreSQL | Server only | Fetch trade data |
| Passwords | PostgreSQL (bcrypt hash) | Nobody | Auth |

### Data Flow

```
1. PROVE PERFORMANCE
   Exchange API (Hyperliquid/Binance)
     |  fetch trades (server-side)
     v
   Backend aggregates metrics
     |  cache in PostgreSQL (performance_cache)
     v
   Format as Leo inputs
     |  send to frontend
     v
   User's wallet signs ZK proof
     |  private inputs stay in wallet
     v
   Aleo blockchain stores public scores only

2. SUBSCRIBE
   Subscriber clicks "Unlock Alpha"
     |
     v
   Wallet executes maetra_subscription::subscribe
     |  pays microcredits to creator
     v
   Aleo returns private SubscriptionRecord to subscriber
     |  on-chain: only increments subscriber_counts
     v
   Backend confirms tx, creates DB subscription record
     |
     v
   Content API now returns decrypted posts

3. PUBLISH CONTENT
   Creator writes post
     |
     v
   Backend stores in PostgreSQL (content_encrypted)
     |
     v
   Frontend computes content hash
     |  wallet signs maetra_content::publish
     v
   Aleo stores hash + owner on-chain (immutable timestamp)
```

### Privacy Boundaries

**The wallet is the trust boundary.** All ZK proof generation happens client-side in the user's Aleo wallet (Shield or Leo). The backend never sees private inputs or private keys.

| Operation | What backend sees | What Aleo sees | What public sees |
|-----------|------------------|----------------|-----------------|
| Submit performance | Aggregated metrics (for caching) | Only public scores | Scores on leaderboard |
| Subscribe | That a subscription was created | Creator + count (not subscriber) | Nothing |
| Publish content | Full content (encrypted at rest) | Content hash only | That something was published |

### Database Schema (PostgreSQL)

```
users                      — Profile, wallet address, subscription price
performance_cache          — Cached scores per period (mirrors on-chain)
posts                      — Encrypted alpha content, content hash
subscriptions              — Access records (subscriber + creator + status)
exchange_connections       — Exchange API keys (encrypted)
```

The database acts as a **performance layer** and **access control layer**. The source of truth for reputation is the Aleo blockchain. The database caches on-chain data for fast API responses and manages content delivery.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, Tailwind v4 |
| Backend API | Hono, Prisma 7, PostgreSQL |
| Blockchain | Aleo (Leo 3.4), 3 smart contracts |
| Wallet | Shield (default), Leo Wallet via @provablehq adapters |
| Auth | JWT (7-day expiry), bcrypt passwords |

---

## Project Structure

```
maetra-aleo/
  maetra-app/              — Next.js frontend
    src/
      app/(dashboard)/     — Leaderboard, creator profiles, my-page
      context/             — Auth + Wallet providers
      hooks/               — useAleoPrograms (on-chain interactions)
      lib/                 — API client, types
  maetra-backend/          — Hono API server
    src/
      routes/              — auth, profile, leaderboard, posts, subscriptions, exchanges
      lib/                 — db, jwt, env, exchange pipeline
      middleware/           — JWT auth middleware
    prisma/                — Schema + migrations
  programs/
    maetra_trust/          — ZK trust score computation
    maetra_subscription/   — Private subscription records
    maetra_content/        — Content hash registry
```

---

## Getting Started

```bash
# Backend
cd maetra-backend
cp .env.example .env          # Set DATABASE_URL and JWT_SECRET
npm install
npm run db:generate
npm run db:push
npm run dev                   # Runs on port 3002

# Frontend
cd maetra-app
npm install --legacy-peer-deps
npm run dev                   # Runs on port 3000

# Leo programs (optional — already compiled)
cd programs/maetra_trust
leo build
```
