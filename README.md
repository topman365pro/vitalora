# Vitaloria

Vitaloria is a Next.js PWA for BLE health devices. It supports:

- Firebase Authentication with Google login and Firebase email/password
- Device pairing and BLE capture session tracking
- Live mock smartwatch streaming with a pluggable custom BLE adapter
- Historical sensor charts from stored readings
- Persistent AI chat threads about recent wearable trends
- Offline shell and cached history/chat reads through a service worker

## Stack

- Next.js App Router + TypeScript
- Tailwind CSS
- Drizzle ORM + PostgreSQL
- Recharts
- Vitest

## Environment

Copy `.env.example` to `.env.local` and fill in:

```bash
DATABASE_URL=postgres://postgres:postgres@localhost:5432/vitaloria
SESSION_COOKIE_NAME=vitaloria_session
SESSION_TTL_DAYS=14
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
NEXT_PUBLIC_DEFAULT_ADAPTER=mock
```

`OPENAI_API_KEY` is optional. If it is omitted, the app uses the mock wellness coach provider.

Firebase Admin credentials are required for the server-side session exchange route and SSR auth checks.

## Database setup

1. Create a PostgreSQL database.
2. Apply the baseline schema in [`schema.sql`](/Users/arham/Downloads/vitaloria/schema.sql).
3. Apply the additive app migration in [`drizzle/0001_app_extensions.sql`](/Users/arham/Downloads/vitaloria/drizzle/0001_app_extensions.sql).
4. Apply the Firebase auth migration in [`drizzle/0002_firebase_auth.sql`](/Users/arham/Downloads/vitaloria/drizzle/0002_firebase_auth.sql).

Example:

```bash
psql "$DATABASE_URL" -f schema.sql
psql "$DATABASE_URL" -f drizzle/0001_app_extensions.sql
psql "$DATABASE_URL" -f drizzle/0002_firebase_auth.sql
```

## Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

```bash
npm run dev
npm run lint
npm run typecheck
npm run test:run
npm run build
```

## BLE integration notes

- The default adapter is the mock adapter so the product is usable immediately.
- The custom adapter scaffold lives in [`src/lib/ble/custom-text-spec-adapter.ts`](/Users/arham/Downloads/vitaloria/src/lib/ble/custom-text-spec-adapter.ts).
- When you provide the plaintext BLE spec later, wire the service UUIDs, characteristic UUIDs, and payload parsing into that adapter.

## Firebase auth notes

- Enable Google and Email/Password providers in Firebase Auth.
- Add `vitalora-ruby.vercel.app` to Firebase authorized domains.
- The browser uses the Firebase Web SDK; the server verifies ID tokens and mints session cookies with Firebase Admin.
- Existing users are linked to their PostgreSQL data by normalized email on first Firebase sign-in.

## AI chat notes

- The provider abstraction lives under [`src/lib/ai`](/Users/arham/Downloads/vitaloria/src/lib/ai).
- Without an API key, the chat uses deterministic mock replies built from recent sensor summaries.
- With an API key, the app calls the OpenAI Responses API.
