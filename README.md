# Vitaloria

Vitaloria is a Next.js PWA for BLE health devices. It supports:

- Firebase Authentication with Google plus email/password
- Device pairing and BLE capture session tracking
- Live mock smartwatch streaming with a pluggable custom BLE adapter
- Historical sensor charts from Firestore readings
- Persistent AI chat threads about recent wearable trends
- Offline shell and cached history/chat reads through a service worker

## Stack

- Next.js App Router + TypeScript
- Tailwind CSS
- Firebase Authentication
- Cloud Firestore
- Recharts
- Vitest

## Environment

Copy `.env.example` to `.env.local` and fill in:

```bash
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
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3-flash-preview
NEXT_PUBLIC_DEFAULT_ADAPTER=mock
```

`GEMINI_API_KEY` is optional. If it is omitted, the app uses the mock wellness coach provider.
`FIREBASE_*` admin credentials are required for server-side Firebase session cookies and Firestore access.

Firebase console setup:
- Enable Google and Email/Password in Authentication.
- Add `localhost` and `vitalora-ruby.vercel.app` to Authorized domains.
- Keep Firestore enabled in project `vitalora-1ffd9`.

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

## AI chat notes

- The provider abstraction lives under [`src/lib/ai`](/Users/arham/Downloads/vitaloria/src/lib/ai).
- User profiles, devices, readings, capture sessions, and chat threads are stored in Firestore under each user document.
- Without an API key, the chat uses deterministic mock replies built from recent sensor summaries.
- With an API key, the app calls the Google Gemini `generateContent` API using `gemini-3-flash-preview`.
