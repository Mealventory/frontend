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
- **Framework**: React Native 0.74+ with Expo SDK 51+ (Managed Workflow).
- **Navigation**: Expo Router v3 (Strict TypeScript file-based routing with route groups `(auth)`, `(onboarding)`, `(app)`, `(modal)`).
- **Styling**: NativeWind v4 (Tailwind CSS engine optimized for React Native).
- **State Management**:
  - **Server Cache State**: TanStack React Query v5 with `persistQueryClient` and `createSyncStoragePersister`.
  - **Local Persistence Storage**: `react-native-mmkv` (synchronous, C++ backed, sub-millisecond I/O).
  - **Ephemeral Client State**: Zustand (active filter toggles, camera flash, scanner draft state).
- **Network Layer**: OpenAPI-generated TypeScript client (`openapi-fetch`) synced to FastAPI backend `/openapi.json`.
- **Sensors & Hardware**: `expo-camera`, `expo-haptics`, `expo-notifications`, `expo-barcode-scanner`.
