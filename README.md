# ATSS POS

Point-of-sale system for small F&B businesses in Malaysia (cafés, kopitiam, bubble tea,
quick-service restaurants). Runs offline-first on an Android tablet at the counter, with a
Supabase cloud backend for sync and a browser-based back office. See [CLAUDE.md](CLAUDE.md)
for the full product and architecture spec.

## Prerequisites

- Node.js 20+ and npm
- A [Supabase](https://supabase.com) project (or the Supabase CLI + Docker Desktop to run one
  locally)
- For Android builds: Android Studio / the Android SDK

## Setup

1. Install dependencies:

   ```sh
   npm install
   ```

2. Configure environment variables:

   ```sh
   cp .env.example .env.local
   ```

   Fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from your Supabase project's
   API settings (or from `supabase start`'s output if running locally).

3. Apply the database schema. Either run the migrations in `supabase/migrations/` against a
   linked cloud project:

   ```sh
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push
   ```

   or against a local Supabase instance (requires Docker Desktop):

   ```sh
   npx supabase start
   npx supabase db reset
   ```

4. Start the dev server:

   ```sh
   npm run dev
   ```

## Scripts

| Command           | Description                          |
| ----------------- | ------------------------------------ |
| `npm run dev`     | Start the Vite dev server            |
| `npm run build`   | Type-check and build for production  |
| `npm run preview` | Preview the production build locally |
| `npm run lint`    | Run ESLint                           |
| `npm run format`  | Format the codebase with Prettier    |
| `npm test`        | Run the Vitest test suite            |

## Database tests

RLS/multi-tenancy tests live in `supabase/tests/database/` (pgTAP) and run via:

```sh
npx supabase test db
```

This requires Docker Desktop (`supabase start` spins up a local Postgres to test against).

## Android (Capacitor)

```sh
npm run build
npx cap sync android
npx cap open android
```

### Building a signed release APK (for sideloading onto pilot tablets)

1. Generate a release keystore once (keep it forever — losing it means you can never ship an
   update signed as the same app again):

   ```sh
   cd android
   keytool -genkeypair -v -keystore release.keystore.jks -alias atsspos \
     -keyalg RSA -keysize 2048 -validity 10000 \
     -dname "CN=Your Company, OU=, O=, L=, ST=, C=MY"
   ```

   Then copy `android/keystore.properties.example` to `android/keystore.properties` and fill in
   the `storePassword`/`keyPassword` you just chose (PKCS12 keystores use the same password for
   both). Both `release.keystore.jks` and `keystore.properties` are gitignored — back them up
   somewhere safe (a password manager or secure vault), outside this repo.

2. Build and sign:

   ```sh
   npm run build
   npx cap sync android
   cd android
   ./gradlew assembleRelease
   ```

   The signed APK is at `android/app/build/outputs/apk/release/app-release.apk`. Without
   `keystore.properties`, this same command still produces an APK (signed with the debug key)
   so local builds work without a release key.

3. Install it on a tablet (USB debugging enabled, or copy the APK over and open it with
   "install from unknown sources" allowed):

   ```sh
   adb install -r android/app/build/outputs/apk/release/app-release.apk
   ```

## Deployment (web / back office)

The same React app serves the owner back office in a browser (Staff/Menu/Settings/Dashboard,
sign-up/login). It's a static SPA, deployed to [Vercel](https://vercel.com):

1. Push this repo to GitHub (or another git provider Vercel supports).
2. In Vercel, "Add New Project" → import the repo. `vercel.json` already sets the build
   command (`npm run build`) and output directory (`dist`), plus the SPA rewrite so client-side
   routes like `/pos` and `/backoffice/dashboard` resolve correctly on refresh/direct link.
3. In the Vercel project's Environment Variables, add the **production** Supabase values
   (same names as `.env.local`):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy. Every push to the production branch redeploys automatically.

The POS itself runs from the Android app's bundled assets (see below), not from this
deployment — the web deployment is for the owner back office only, though `/pos` also works
in a desktop browser for testing.

## Project structure

```
src/
  app/          routes and layouts (pos/, backoffice/)
  features/     auth, menu, ordering, payment, printing, shift, reports, sync
  components/   shared UI
  lib/          supabase client, dexie db, money utils, calculateTotals, types
supabase/
  migrations/   SQL schema + RLS policies
  functions/    edge functions
android/        Capacitor Android project
```
"# atss_pos" 
