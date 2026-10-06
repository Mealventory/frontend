# Mobile E2E smoke tests

Mealventory uses [Maestro](https://maestro.mobile.dev/) for lightweight end-to-end mobile smoke tests.

The suite runs the real Expo Router screens against an isolated in-memory fixture mode. It does **not** require production Supabase credentials, a production backend, camera hardware, or production data.

## What the suite covers

`.maestro/critical-journey.yaml` validates:

1. Sign in with a deterministic test identity.
2. Select the fixture household.
3. Enter the kitchen.
4. Manually add a pantry item.
5. Open and edit the item.
6. Mark the item consumed.
7. Sign out.

`.maestro/scanner-review.yaml` validates:

1. Product scan -> AI Review using deterministic product data.
2. Barcode fallback -> AI Review using deterministic fallback data.

The scanner fixture launcher is only rendered when `EXPO_PUBLIC_E2E_MODE=1`. Normal app builds continue to use the real camera and APIs.

## Prerequisites

Install Maestro on the development machine and use a simulator/emulator with a local development build of Mealventory installed.

The app id used by the flows is:

```text
com.mealventory.app
```

For iOS Simulator, a paid Apple Developer account is not required for a local simulator build.

## Start an isolated E2E build

The E2E flag is consumed by the JavaScript bundle, so **Metro must be started with the flag enabled**. A native rebuild is only required when the development build is not already installed.

For a first local iOS setup, install the development build:

```bash
npx expo run:ios
```

Then stop any existing Metro process and start a clean E2E Metro server:

```bash
EXPO_PUBLIC_E2E_MODE=1 npx expo start --dev-client -c
```

Open the installed Mealventory development build in the simulator. The sign-in screen must visibly show `E2E Test Mode` before running Maestro.

For a first Android setup, install the development build with:

```bash
npx expo run:android
```

Then use the same E2E Metro command:

```bash
EXPO_PUBLIC_E2E_MODE=1 npx expo start --dev-client -c
```

Keep that Metro process running while executing the Maestro flows from another terminal.

The local flows use `launchApp` without `clearState: true`. E2E auth and inventory are in-memory and reset with an app-process restart, while preserving the development client's Metro connection. The fixture values are prefilled only in E2E mode. The flows target stable control IDs, wait for the household screen, scroll to the real Enter kitchen control when needed, and avoid simulator keyboard, autofill, and focus flakiness.

## Run the smoke suite

From the frontend repository:

```bash
npm run test:e2e
```

That command runs every flow in `.maestro/`.

On Daniel's Mac, use Java 21 only in the terminal running Maestro, leaving the Java 8 setup for database coursework unchanged:

```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 21)
export PATH="$JAVA_HOME/bin:$HOME/.maestro/bin:$PATH"
```

For Expo iOS development builds, disable the floating Tools button before testing. It can overlap the kitchen's Add button and intercept Maestro taps. With the simulator booted, stop the app and set its simulator-only preference:

```bash
xcrun simctl terminate booted com.mealventory.app
xcrun simctl spawn booted defaults write com.mealventory.app EXDevMenuShowFloatingActionButton -bool false
```

The next Maestro launch uses this preference; Metro can stay running. Set the same preference to `true` and restart the app to restore the floating button after testing. The keyboard shortcut still opens the dev menu.


The fixture credentials used by the suite are intentionally non-production and are prefilled only while E2E mode is active. The E2E-only submit button signs in with these fixed fixture values directly, and the manual-add/edit forms also prefill deterministic fixture values only in E2E mode. Maestro still exercises the real Sign in, Add, Save, Consume, and Sign out actions without depending on simulator keyboard or autofill behavior:

```text
Email: e2e@mealventory.test
Password: MealventoryE2E!
Household: E2E Test Kitchen
```

The `.test` domain is reserved for testing and these credentials are accepted only by the in-memory E2E auth path.

## Safety

Do not set `EXPO_PUBLIC_E2E_MODE=1` in normal development, preview, or production builds. When the flag is absent, E2E sign-in is unavailable, inventory uses the real backend, and the real scanner UI is rendered.

The E2E inventory is reset whenever the application process/state is cleared, so the suite can run repeatedly without cleanup against a server.

The login flows scroll the fixture sign-in button fully into view before tapping its stable `e2e-sign-in` ID. iOS accessibility can expose the button even when it is clipped below the scroll viewport, so asserting its label alone does not ensure that a tap can reach it. Avoid fixed screen coordinates, which vary with device size and layout.
