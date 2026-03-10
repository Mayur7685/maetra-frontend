# Maetra Frontend

Next.js application for the Maetra privacy-preserving trading reputation platform. Connects to Aleo blockchain via Shield and Leo wallets for ZK proof submission, private subscriptions, and content publishing.

**Production**: https://maetra.vercel.app

---

## Tech Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| Next.js | 16.x | React framework (App Router) |
| React | 19.x | UI library |
| Tailwind CSS | 4.x | Styling (dark theme) |
| @provablehq/aleo-wallet-adaptor | 0.3.0-alpha | Aleo wallet integration |
| Shield Wallet | - | Default Aleo wallet (listed first) |
| Leo Wallet | - | Alternative Aleo wallet |

---

## Quick Start

```bash
# 1. Install dependencies
npm install --legacy-peer-deps

# 2. Start dev server
npm run dev
```

The app runs on `http://localhost:3000`. API calls proxy to the backend at `http://localhost:3002` via Next.js rewrites.

`--legacy-peer-deps` is required because `@provablehq` wallet packages have a React 18 peer dependency but work fine with React 19.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `BACKEND_URL` | Production only | `http://localhost:3002` | Backend API base URL |

**Vercel production:**

```env
BACKEND_URL=https://maetra-api.onrender.com
```

Locally, no env file is needed — the default rewrite proxies to `localhost:3002`.

---

## Project Structure

```
maetra-app/src/
  app/
    page.tsx                          Landing page
    layout.tsx                        Root layout (providers wrapper)
    globals.css                       Tailwind v4 theme (dark mode)
    (auth)/
      login/page.tsx                  Login form
      signup/page.tsx                 Registration form
      setup-profile/page.tsx          Onboarding (username, bio, price)
    (dashboard)/
      leaderboard/page.tsx            Ranked traders with trust scores
      my-page/page.tsx                Creator dashboard (stats, posts, proof)
      my-subscriptions/page.tsx       Manage active subscriptions
      creator/[username]/page.tsx     Public creator profile + subscribe
  components/
    Navbar.tsx                        App navigation bar
    Logo.tsx                          Maetra logo
    LeaderboardPreview.tsx            Landing page leaderboard preview
    FeatureTabs.tsx                   Landing page feature showcase
  context/
    AuthContext.tsx                    JWT auth state + token management
    WalletContext.tsx                  Aleo wallet adapters + provider
    Providers.tsx                     Wraps Auth + Wallet providers
  hooks/
    useAleoPrograms.ts                On-chain interactions (all 3 programs)
  lib/
    api.ts                            Backend API client + TypeScript types
```

---

## Pages

### Public

| Route | Description |
|-------|-------------|
| `/` | Landing page with feature tabs and leaderboard preview |
| `/login` | Email + password login |
| `/signup` | Account registration |

### Authenticated

| Route | Description |
|-------|-------------|
| `/setup-profile` | First-time profile setup (username, bio, subscription price) |
| `/leaderboard` | Ranked list of traders by trust score, win rate, weight class |
| `/my-page` | Creator dashboard — stats, exchange connections, ZK proof generation, post creation |
| `/my-subscriptions` | List of active subscriptions to other creators |
| `/creator/[username]` | Public creator profile — subscribe to unlock alpha content |

---

## Wallet Integration

### Supported Wallets

| Wallet | Priority | Notes |
|--------|----------|-------|
| Shield | Default (listed first) | Browser extension, best UX |
| Leo | Secondary | Browser extension, mature ecosystem |
| Fox | Available | - |
| Puzzle | Available | - |
| Soter | Available | - |

### On-Chain Operations

All wallet interactions go through the `useAleoPrograms` hook:

| Function | Leo Program | Description |
|----------|------------|-------------|
| `submitPerformance(leoInputs)` | `maetra_trust.aleo` | Submit private trade metrics, publish public trust score |
| `setPrice(price)` | `maetra_subscription.aleo` | Set subscription price on-chain |
| `subscribe(creator, amount)` | `maetra_subscription.aleo` | Pay creator, receive private SubscriptionRecord |
| `publishContent(postId, hash)` | `maetra_content.aleo` | Register content hash on-chain (timestamp proof) |
| `waitForConfirmation(txId)` | - | Poll transaction status until accepted/failed |

### Privacy Model

```
What the wallet handles (client-side, private):
  - ZK proof generation for trust scores
  - Private subscription records (only subscriber can decrypt)
  - Transaction signing

What goes on-chain (public):
  - Trust scores, win rates, weight classes
  - Creator subscription prices, subscriber counts
  - Content hashes (not content itself)

What stays off-chain (database):
  - Alpha post content (gated by subscription)
  - User profiles, exchange connections
```

---

## API Proxy

The frontend never calls the backend directly. All `/api/*` requests are rewritten by Next.js:

```
Browser → https://maetra.vercel.app/api/auth/login
                    ↓ (Next.js rewrite)
         https://maetra-api.onrender.com/api/auth/login
```

This is configured in `next.config.ts`:

```typescript
const backendUrl = process.env.BACKEND_URL || "http://localhost:3002";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};
```

---

## User Flows

### 1. New Creator

```
Sign up → Setup profile (username, bio, subscription price)
  → Connect exchange (Hyperliquid/Binance) OR use Demo Data
  → Generate ZK Proof (wallet signs, private inputs stay local)
  → Trust score appears on leaderboard
  → Set subscription price (wallet signs on-chain)
  → Create alpha posts (content hash published on-chain)
```

### 2. Subscriber

```
Browse leaderboard → Click creator
  → Click "Unlock Alpha" → Wallet pays subscription
  → Wait for on-chain confirmation
  → Posts unlock after successful transaction
```

### 3. Demo Mode (No Exchange)

When no exchange is connected, the "Generate Demo ZK Proof" button appears (yellow). It calls `/api/exchanges/mock-sync` to generate realistic demo trading data, then submits the ZK proof on-chain — same wallet flow as real data.

---

## Theme

Dark theme using Tailwind v4 CSS variables:

| Token | Color | Usage |
|-------|-------|-------|
| `background` | Dark | Page background |
| `surface` | Slightly lighter | Cards, modals |
| `foreground` | White | Primary text |
| `muted` | Gray | Secondary text |
| `lime` | Green | Success, trust scores, CTAs |
| `lemon` | Yellow | Demo mode, middleweight |
| `tangerine` | Orange | Errors, warnings |
| `pomelo` | Red/Pink | Heavyweight class |

