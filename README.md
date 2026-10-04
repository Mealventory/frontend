# Current working flow

Real sign-in, household creation/joining, invite codes and members are available on the home route. Follow [the live household guide](docs/live-households.md) to connect your backend and run in Expo Go. The rest of this document describes the target product.

## Production source layout

Expo Router under `app/` is the authoritative navigation and screen implementation for Mealventory. Shared production components, contexts, types, and API helpers live under `src/`.

The old Figma/Vite web prototype and duplicate `src/screens/` implementations have been removed from production source. There is no separate legacy screen tree to edit or keep in sync.

# Mealventory Mobile Client: Target Final State & Purpose

## 1. Purpose of the Repository
The `frontend` repository delivers the cross-platform mobile client for **Mealventory** on iOS and Android. Built with **React Native (Expo SDK 51+, Managed Workflow)** and **TypeScript**, it serves as the user-facing command center for household food inventory management, smart meal planning, and food waste reduction.

### Key Functional Objectives:
- **Instant Optical Capture**: Enable users to capture grocery receipts, fresh produce, and product barcodes with sub-second camera shutter responsiveness and live feedback.
- **Interactive Review & Verification**: Allow household members to review AI-detected line items, adjust quantities, select storage zones (Pantry, Fridge, Freezer), and verify expiration dates before committing to inventory.
- **Real-Time Expiration Radar**: Provide an at-a-glance dashboard prioritizing foods by urgency (Expired, Expiring in 48h, Fresh), preventing food spoilage.
- **Inventory-Driven Meal Planning**: Suggest recipes dynamically ranked by what ingredients are currently in stock, prioritizing recipes that consume soon-to-expire items.
- **Collaborative Household Sync**: Seamless multi-user synchronization within a household unit, updating stock changes in real time across family members.
- **Offline-First Resilience**: Full operational access even in supermarket basements with zero cellular reception, backed by synchronous local disk caching (`react-native-mmkv`).

---

## 2. Target Look, Feel & Visual Aesthetics

### Design Philosophy
The application adheres to an **Executive Consumer-Grade Aesthetic**—blending the utility of a logistics tool with the warmth and visual polish of a modern health and culinary application. It avoids flat, generic mobile UI patterns in favor of rich visual depth, tailored typography, dynamic glassmorphism, and haptic feedback.

### Color Palette (Tailwind / NativeWind v4 Tokens)
- **Primary / Vitality Brand**: Emerald 600 (`#059669`) and Emerald 500 (`#10B981`), signifying freshness, sustainability, and vitality.
- **Dark Mode Ground (Default)**: Deep Slate 950 (`#020617`) and Slate 900 (`#0F172A`), paired with elevated surface card containers in Slate 800/70 (`rgba(30, 41, 59, 0.7)`).
- **Light Mode Ground**: Clean Off-White / Alabaster (`#F8FAFC`) with pure white card elevated surfaces (`#FFFFFF`).
- **Urgency Semantic System**:
  - 🔴 **Expired / Critical (<= 0 days)**: Rose 500 (`#F43F5E`) with glowing badge border.
  - 🟡 **Expiring Soon (1–3 days)**: Amber 500 (`#F59E0B`) with subtle pulse animation.
  - 🟢 **Fresh (> 3 days)**: Emerald 500 (`#10B981`).
  - 🔵 **Frozen / Long-Term**: Sky 500 (`#0EA5E9`).

### Typography & Iconography
- **Typography**: Inter / Outfit via Google Fonts with clear hierarchical scales (H1: 32px Bold, H2: 24px Bold, H3: 18px Semi-Bold, Body: 15px Regular, Caption: 12px Medium).
- **Iconography**: `lucide-react-native` for clean, modern 1.5px stroke weight icons.

### Key Screens & Visual Experience:
1. **Cold Launch & Welcome**: Dark gradient hero with smooth fade-in animations, showcasing the value proposition: "Never waste food again".
2. **Pantry Dashboard**:
   - Floating glassmorphic bottom navigation tab bar (`expo-blur`).
   - Top **Expiry Radar Bar**: Horizontal carousel of urgency pills displaying items needing immediate consumption.
   - Storage Zone Tabs (`All`, `Fridge ❄️`, `Freezer 🧊`, `Pantry 🥫`, `Spice Rack 🧂`) with animated indicator pills.
   - 2-column or 1-column `FlashList` items featuring food photography, category tags, remaining day badges, and quick-swipe "Mark as Consumed" gestures.
3. **Camera & Scanner View**:
   - Fullscreen viewfinder with mode carousel: `Produce` (bounding box targeting reticle), `Receipt` (document edge guides), `Barcode` (interactive green laser line).
   - Real-time haptic tick (`expo-haptics`) upon barcode or receipt capture.
4. **AI Review Bottom Sheet (`@gorhom/bottom-sheet`)**:
   - Slides up seamlessly over the camera view.
   - Expandable batch cards showing recognized item name, confidence badge, editable expiration date picker, and storage location chip selector.
   - Prominent primary CTA button: "Add X Items to Pantry".
5. **Recipe Suggestions**:
   - Visual cards showing matched percentage badge (e.g., "92% In Stock!"), missing ingredients indicator, and "Cook This" button that automatically decrements pantry inventory.

---

## 3. Technology Stack & Architectural Pillars
- **Framework**: React Native 0.86+ with Expo SDK 57 (Managed Workflow).
- **Navigation**: Expo Router v57 (Strict TypeScript file-based routing with route groups `(auth)`, `(onboarding)`, `(app)`, `(modal)`).
- **Styling**: NativeWind v4 (Tailwind CSS engine with application-wide CSS variables in `global.css`).
- **State Management**:
  - **Server Cache State**: TanStack React Query v5 with `persistQueryClient` and `createSyncStoragePersister`.
  - **Local Persistence Storage**: `react-native-mmkv` (synchronous, C++ backed, sub-millisecond I/O).
  - **Ephemeral Client State**: Zustand (active filter toggles, camera flash, scanner draft state).
- **Network Layer**: OpenAPI-generated TypeScript client (`openapi-fetch`) synced to FastAPI backend `/openapi.json`.
- **Sensors & Hardware**: `expo-camera`, `expo-haptics`, `expo-notifications`, `react-native-svg`.

---

## 4. Quickstart & Launch Guide (Windows & Mac)

### Step 1: Install Dependencies
```powershell
# Inside frontend/
npm install
```

### Step 2: Configure Environment Variables
Copy `.env.example` to `.env`:
```powershell
cp .env.example .env
```
Configure your service URLs:
- **Physical iPhone / Android testing (same Wi-Fi)**:
  - Find your computer's local IP:
    - **Windows**: run `ipconfig` (find IPv4, e.g. `192.168.51.91`)
    - **Mac**: run `ipconfig getifaddr en0`
  - Set `EXPO_PUBLIC_BACKEND_URL=http://<YOUR_LOCAL_IP>:8000`
  - Set `EXPO_PUBLIC_API_URL=http://<YOUR_LOCAL_IP>:8000`
  - Set `EXPO_PUBLIC_AI_SERVICE_URL=http://<YOUR_LOCAL_IP>:8001`
- **Mac iOS Simulator (Xcode)**:
  - Use `http://localhost:8000` and `http://localhost:8001`.

---

### Step 3: Launch the Application

#### Option A: Windows Developers (Tunnel Mode - Recommended)
Windows Defender Firewall often blocks incoming connections on port `8081`. Using tunnel mode bypasses local firewall and router AP isolation completely:
```powershell
npm run start:tunnel
```
*(Or `npx expo start --tunnel`)*.
- A QR code will display in your terminal.
- Open the native **Camera** app on your iPhone (or **Expo Go** on Android).
- Tap the pop-up banner to open in **Expo Go**.

#### Option B: Mac Developers (iOS Simulator or Physical Device)
- **To run on Mac's on-screen iOS Simulator**:
  ```bash
  npm run ios
  ```
  *(Or press `i` in the Expo terminal)*. Requires Xcode installed.
- **To run on a physical iPhone**:
  ```bash
  npm start
  ```
  Scan the terminal QR code with your iPhone camera.

#### Option C: Android Emulator or Web
- **Android Emulator**: `npm run android` (or press `a` in terminal)
- **Web Browser Preview**: `npm run web` (or press `w` in terminal)

---

### Step 4: Common Troubleshooting & Gotchas

1. **"You're signed in to Expo Go as 'username', but not signed in to Expo CLI"**:
   - When using tunnel mode with a logged-in Expo Go app on iPhone, the CLI must use the same account.
   - Run `npx expo login` on your computer and sign in with the same account.
   - *Alternative*: Tap **Go home** in Expo Go on your phone, go to your profile icon, and tap **Sign Out** to run in anonymous/guest mode.
2. **"Could not connect to the server" on physical iPhone**:
   - Ensure both PC and phone are on the exact same Wi-Fi network, or use `npm run start:tunnel`.
3. **Resetting Metro Bundler Cache**:
   - If styles or dependencies don't reflect immediately, restart with:
     ```powershell
     npm start -- -c
     ```



## Mobile end-to-end smoke tests

Critical mobile journeys are covered with Maestro using an isolated in-memory test mode. The suite does not require production credentials or production data.

See [Mobile E2E smoke tests](docs/e2e-mobile.md) for simulator/emulator setup, fixture credentials, and scanner test behavior.

Run the suite with:

```bash
npm run test:e2e
```
