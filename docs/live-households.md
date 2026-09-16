# Live household flow

The app's home route uses real Supabase email/password authentication and the backend household API. Create/join actions wait for the backend response before showing success. The member list comes from the database; because the backend returns UUIDs rather than names, other members currently show a short ID. The pantry now loads, adds, and deletes shared database inventory; see [shared inventory setup and testing](shared-inventory.md). Scanning and recipe designs remain prototypes.

## Run

Use Node 24 (or a version supported by Expo SDK 57), then `npm install` and `npm start`. On a physical phone, open the QR code in a compatible Expo Go version. A shared HTTPS backend tunnel does not require the phone to be on the backend computer's Wi-Fi. Expo's own LAN connection still requires the phone and frontend computer to share a reachable network; use Expo tunnel mode if needed.

Create a git-ignored `.env.local` using `.env.example`. Set:

- `EXPO_PUBLIC_SUPABASE_URL`: your Supabase project URL.
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: publishable key (legacy anon key is also supported through EXPO_PUBLIC_SUPABASE_ANON_KEY).
- `EXPO_PUBLIC_BACKEND_URL`: the current shared backend tunnel URL. The supplied address is `https://reverse-singh-biggest-mid.trycloudflare.com`; confirm that the backend host is still running this tunnel before using it. Alternatively, use your own backend tunnel, `http://<computer-LAN-IP>:8000` on the same Wi-Fi, or `http://127.0.0.1:8000` for a browser on the backend computer.

### Shared tunnel versus individual tunnels

All teammates may use the same URL when connecting to one shared backend. The developer hosting it must keep both the backend and `cloudflared tunnel --url http://localhost:8000` running. Other teammates do not need to run a local backend for household requests in this setup. The shared backend must use the same Supabase project as their frontend.

Cloudflare Quick Tunnels generate a random hostname for each tunnel. The address is not tied to a teammate's account or permanently assigned to this project. When the host starts a replacement tunnel, share the newly printed URL and update each frontend's `.env.local`. Developers running independent backends use their own tunnel URLs instead. A named tunnel with a stable hostname is a separate option for a persistent team address.

`.env.example` is a setup template; Expo does not load it directly. `.env.local` overrides matching values in `.env`. Keep Supabase public settings in either loaded file, and keep `.env.local` ignored by Git. Restart Expo after changing the backend URL (`npx.cmd expo start --clear` in Windows PowerShell), then reload the app.

To check connectivity, open `<backend-URL>/docs`. A DNS error means the hostname could not be found; a Cloudflare tunnel error means the tunnel or its origin needs attention. Neither is a household-role restriction.

References: [Expo environment files](https://docs.expo.dev/guides/environment-variables/) and [Cloudflare Quick Tunnels](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/trycloudflare/).

Public environment variables are included in the app bundle. Never use a service-role key, signing secret or database password. Restart/reload Expo after changing these values. An Expo tunnel shares the app bundle, not the backend; the phone must still reach the backend URL.

Run backend branches containing #42 and #43. Its Supabase URL/signing configuration must match the frontend project, and its database must contain the #29 household schema. Use a reviewed development/staging database. These frontend changes do not migrate or write to a database automatically.

Sign in with a Supabase user, or create an account. If email confirmation is enabled, confirm in email and then sign in here. Create a household, check its invite code and owner membership, then sign out and use a second account to join with the code. Refresh the first account's member list to see the new member. Try an invalid code to check the error state.

Sessions are held in memory for this first slice, with automatic token refresh while the app is active; restarting the app requires sign-in. Persistent secure token storage, account recovery, and role-management UI are separate work. API member removal/role changes from #43 are not exposed in this UI yet.

`npm run typecheck` checks TypeScript. `npm test` verifies the API request/error behavior without real credentials or network calls. `npm run web` opens the browser version. To inspect the earlier sample-data design use `/prototype`; it is separate from the live household flow.
