# Aetherion Auctions

Full-stack real-time auction platform (Expo · React Native · Web · iOS · Android) with Supabase backend.

Architecture and product rules live in **[instructions.md](./instructions.md)** — read that first.

## Prerequisites

- [Node.js](https://nodejs.org/) 20+ (includes `npm`)
- [Expo Go](https://expo.dev/go) on a device (optional)

## Setup

```bash
cd leilao-futurista
npm install
cp .env.example .env
# Add Supabase URL + anon key to .env
npm start
```

Press `w` for web, `a` for Android emulator, `i` for iOS simulator.

## Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Run `supabase/migrations/001_initial_schema.sql` in the SQL editor (or use Supabase CLI).
3. Enable **Realtime** replication for `bids` and `auctions`.
4. Copy project URL and anon key into `.env`.

## Project structure

```
app/                 # Expo Router screens (Pillar 2)
  splash.tsx
  (auth)/login.tsx
  (tabs)/            # Home, Vendor, Admin
  auction/[id].tsx
  checkout/[id].tsx
src/
  theme/tokens.ts    # Pillar 4 design tokens
  lib/               # Supabase client, bid math
  services/          # AI support, logistics stubs
supabase/migrations/ # Pillar 3 schema
instructions.md      # Source of truth
```

## Scripts

| Command        | Description        |
|----------------|--------------------|
| `npm start`    | Expo dev server    |
| `npm run web`  | Web only           |
| `npm run android` | Android       |
| `npm run ios`  | iOS                |
