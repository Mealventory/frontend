# Live household flow

The app's home route now uses real Supabase email/password authentication and the backend household API. Create/join actions wait for the backend response before showing success. The member list comes from the database; because the backend returns UUIDs rather than names, other members currently show a short ID. Inventory, scanning and recipe designs remain prototypes; they are not presented as live inventory in this flow.

## Run

Use Node 24 (or a version supported by Expo SDK 57), then `npm install` and `npm start`. On a physical phone, open the QR code in a compatible Expo Go version. Use the same Wi-Fi as the backend computer.

Create a git-ignored `.env.local` using `.env.example`. Set:

- `EXPO_PUBLIC_SUPABASE_URL`: your Supabase project URL.
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: publishable key (legacy anon key is also supported through EXPO_PUBLIC_SUPABASE_ANON_KEY).
- `EXPO_PUBLIC_BACKEND_URL`: `http://<computer-LAN-IP>:8000` for a phone, `http://127.0.0.1:8000` for web or iOS simulator.

Public environment variables are included in the app bundle. Never use a service-role key, signing secret or database password. Restart/reload Expo after changing these values. An Expo tunnel shares the app bundle, not the backend; the phone must still reach the backend URL.

Run backend branches containing #42 and #43. Its Supabase URL/signing configuration must match the frontend project, and its database must contain the #29 household schema. Use a reviewed development/staging database. These frontend changes do not migrate or write to a database automatically.

Sign in with a Supabase user, or create an account. If email confirmation is enabled, confirm in email and then sign in here. Create a household, check its invite code and owner membership, then sign out and use a second account to join with the code. Refresh the first account's member list to see the new member. Try an invalid code to check the error state.

Sessions are held in memory for this first slice, with automatic token refresh while the app is active; restarting the app requires sign-in. Persistent secure token storage, account recovery, and role-management UI are separate work. API member removal/role changes from #43 are not exposed in this UI yet.

`npm run typecheck` checks TypeScript. `npm test` verifies the API request/error behavior without real credentials or network calls. `npm run web` opens the browser version. To inspect the earlier sample-data design use `/prototype`; it is separate from the live household flow.
