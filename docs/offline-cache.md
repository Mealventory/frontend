# Offline inventory cache

Mealventory persists successful household inventory queries to MMKV so a previously loaded pantry can render after a cold launch without waiting for the backend.

## Architecture

- TanStack Query v5 owns real household inventory server state.
- `react-native-mmkv` stores the persisted query client under the `mealventory-sync-cache` MMKV instance.
- Only successful inventory queries are dehydrated. Auth/session state, notification state, and unrelated queries are not persisted by this cache.
- Inventory query keys include both the authenticated user id and selected household id.
- Cached queries use a seven-day `gcTime` and a seven-day persistence `maxAge`.
- When the authenticated user changes or signs out, cached inventory queries for the previous user are removed.
- E2E/demo inventory remains in memory and does not use the persisted production cache.

The persister uses TanStack's current async-storage adapter with MMKV underneath. MMKV reads and writes remain synchronous; the adapter is used because the current TanStack persistence API accepts synchronous storage implementations and the older sync-storage persister is deprecated.

## Native build requirement

MMKV v4 is a Nitro native module and requires `react-native-nitro-modules`. Expo Go does not contain that native module.

After installing dependencies, create a local development build:

```bash
npm install
npx expo run:ios
```

or:

```bash
npm install
npx expo run:android
```

Do not commit the generated `ios/` or `android/` folders. They are ignored by the repository.

After the development build is installed, Metro can be started with:

```bash
npx expo start --dev-client
```

## Manual offline verification

1. Sign in and select a household while online.
2. Open **My Kitchen** and wait for the pantry inventory to load successfully.
3. Fully terminate the app.
4. Enable Airplane Mode.
5. Relaunch the installed development build.
6. Sign-in/session restoration should return to the same household, and the cached pantry should render without a pantry loading spinner or connection-error replacement.
7. Restore connectivity and pull to refresh; the server result should replace/update the cached query normally.

If there is no cached inventory for the current user/household, a real network failure is still surfaced so the user is not shown a misleading empty pantry.
