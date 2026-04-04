# Elarin — Architecture Reference

> Feed this document to an AI assistant to give it full codebase context before starting work on any feature.

---

## Overview

Elarin is a React Native habit app (Expo bare workflow) that helps users build habits through a "step-down" system: 3-tier goals where you can drop to an easier version instead of skipping entirely. The core metric is **Self-Trust**: a 0–100 meter that reflects your completion consistency.

**Stack:** React Native 0.83.2 · Expo ~55.0.5 · TypeScript 5.9 · expo-router · AsyncStorage

---

## File Map

```
app/                      ← Screen components (expo-router)
  _layout.tsx             ← Root layout: fonts, theme context, notification listeners
  index.tsx               ← Entry: redirects to /onboarding or /home based on storage
  onboarding.tsx          ← First-run animated onboarding (name → sage → ladder demo)
  theme-select.tsx        ← Light/dark theme picker (shown after onboarding)
  home.tsx                ← Main screen: goal list + swipe actions + activity heatmap
  templates.tsx           ← Pre-built goal selection screen
  create.tsx              ← 4-step goal creation flow
  goal/[id].tsx           ← Goal detail / edit screen
  profile.tsx             ← User profile: name, theme, trust level, delete account
  template/create.tsx     ← Template goal edit form (modal presentation)

src/                      ← Shared logic (no UI)
  types.ts                ← All TypeScript interfaces (Goal, ReminderConfig, etc.)
  constants.ts            ← TRUST_LEVELS, MILESTONES, MICROCOPY, PRE_BUILT_GOALS
  storage.ts              ← AsyncStorage CRUD — single source of truth for all data
  progression.ts          ← Trust meter logic: recordDoIt, recordStepDown, recordSnooze
  notifications.ts        ← expo-notifications: setup, schedule, cancel, response handler
  background.ts           ← Background notification task (action buttons while app closed)
  theme.ts                ← ThemeContext, light/dark color tokens, font names
  battery.ts              ← Battery optimization prompt helpers (not currently used)
  alarms.ts               ← Native AlarmManager module wrappers (future use, not called)

assets/                   ← App icons and images
scripts/
  gen_icons.js            ← Node.js script (jimp) to regenerate app icon PNGs
```

---

## Navigation

expo-router Stack. All screens have `headerShown: false` except `template/create` (modal with title).

```
index           → onboarding (first run) or home (returning user)
onboarding      → theme-select → home
home            → create | templates | goal/[id] | profile
templates       → create (pre-filled)
create          ← 4 steps: goal info → frequency → time → done
goal/[id]       ← edit/delete existing goal
profile         ← settings, name edit, theme toggle, data reset
template/create ← modal: edit a pre-built goal before saving
```

---

## Data Model (`src/types.ts`)

### Goal

```ts
{
  id: string; // uuid
  name: string; // "Daily Walk"
  emoji: string; // ""
  tiers: {
    primary: string; // "15 min walk outside"
    easier: string; // "1 min walk outside"
    easiest: string; // "1 min walk in your room"
  }
  reminder: ReminderConfig;
  createdAt: number; // Date.now()
}
```

### ReminderConfig

```ts
{
  type: "window" | "exact"
  startTime: string              // "HH:mm"
  endTime?: string               // "HH:mm" (window type only)
  remindersPerDay: number        // default 2
  activeDays: number[]           // 0=Sun…6=Sat, empty = every day
  notificationsEnabled: boolean
  frequency: FrequencyType       // see below
}

type FrequencyType =
  | "daily" | "every_other_day" | "every_3_days"
  | "every_4_days" | "every_5_days" | "every_6_days"
  | "weekly" | "every_2_weeks" | "monthly"
```

**Note:** Notification scheduling currently always uses `DAILY` triggers regardless of `frequency`. Frequency affects UI grouping but not actual notification cadence — this is a known gap.

### DailyGoalState

```ts
{
  goalId: string
  status: "pending" | "done" | "stepped_down" | "snoozed"
  completedTier?: "primary" | "easier" | "easiest"
}
```

Keyed in AsyncStorage as `elarin:daily_state:YYYY-MM-DD` (date must be zero-padded).

### UserProgress

```ts
{
  trustLevel: number          // 1–10 (see TRUST_LEVELS in constants.ts)
  selfTrustMeter: number      // 0–100
  lastActivityAt: number      // timestamp
  completions: CompletionRecord[]
  celebratedMilestones: number[]  // [5, 10, 20, ...]
}
```

---

## Storage Layer (`src/storage.ts`)

All persistence is AsyncStorage. No Redux, no Zustand.

| Key                             | Content                       |
| ------------------------------- | ----------------------------- |
| `elarin:goals`                  | `Goal[]` JSON array           |
| `elarin:progress`               | `UserProgress` JSON object    |
| `elarin:daily_state:YYYY-MM-DD` | `DailyGoalState[]` JSON array |
| `elarin:profile`                | `UserProfile` JSON object     |
| `elarin:onboarded`              | `"true"` or `"false"`         |
| `elarin:swipe_tutorial_shown`   | `"true"`                      |
| `elarin:heatmap_start`          | `"YYYY-MM-DD"` (init date)    |

**Date key format:** Always `YYYY-MM-DD` with zero-padded month and day. Use:

```ts
`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
```

**Batch reads:** Use `AsyncStorage.multiGet(keys)` for any loop over dates (e.g., heatmap). Never do sequential `getItem` in a loop.

---

## Progression Engine (`src/progression.ts`)

Core logic for the Self-Trust meter. All functions read/write storage directly.

| Function                       | Description                                       |
| ------------------------------ | ------------------------------------------------- |
| `recordDoIt(goalId, tier)`     | Mark goal done for today, update progress         |
| `recordStepDown(goalId, tier)` | Mark stepped-down for today                       |
| `recordSnooze(goalId)`         | Mark snoozed for today                            |
| `getLiveProgress(goals)`       | Returns completed count, trust level, meter value |
| `getConsecutiveDays()`         | Count current streak (uses padded date keys)      |
| `calculateSelfTrustMeter()`    | 0–100 score based on last 30 days × goal count    |

**Critical:** Date keys must be zero-padded. A bug where `getMonth()` was used without `+1` and `padStart` caused streaks to always read as 0 — now fixed.

---

## Theme System (`src/theme.ts`)

```ts
// Usage in any screen:
const { colors, isDark, theme, setTheme } = useTheme();

// Color tokens (never hardcode hex — always use colors.*)
colors.surface; // page background
colors.onSurface; // primary text
colors.onSurfaceVariant; // secondary text
colors.primary; // brand color (teal)
colors.primaryContainer; // tinted surface for cards
colors.surfaceContainerLowest; // sunken surface (modal backgrounds)

// Font names (always use fonts.* — never inline fontFamily strings)
fonts.headlineBold; // Manrope_700Bold
fonts.headlineExtraBold; // Manrope_800ExtraBold
fonts.bodyRegular; // PlusJakartaSans_400Regular
fonts.bodyMedium; // PlusJakartaSans_500Medium
fonts.bodySemiBold; // PlusJakartaSans_600SemiBold
fonts.bodyBold; // PlusJakartaSans_700Bold
fonts.bodyItalic; // PlusJakartaSans_400Regular_Italic
fonts.handwritten; // Caveat_400Regular
```

---

## Notification Pipeline

```
User creates goal
  → scheduleGoalNotifications(goal)   [notifications.ts]
      → Notifications.scheduleNotificationAsync() × remindersPerDay
      → DAILY trigger (HH:mm)

User taps notification action button
  ┌─ App open/foreground:
  │   → addNotificationResponseReceivedListener
  │   → handleNotificationResponse()  [notifications.ts]
  │   → recordDoIt / recordStepDown / recordSnooze  [progression.ts]
  │
  └─ App closed/background:
      → ELARIN_BACKGROUND_NOTIFICATION task  [background.ts]
      → same logic via TaskManager.defineTask
      → imports buildNotificationContent from notifications.ts

SNOOZE action:
  → schedules a TIME_INTERVAL notification N minutes later
  → SNOOZE_DURATION_MINUTES defined in constants.ts
```

---

## UI Patterns

### Buttons

Always use `Pressable` (not `TouchableOpacity`) with this pressed style:

```tsx
<Pressable
  style={({ pressed }) => [
    styles.btn,
    pressed && styles.ghostBtnPressed,
  ]}
>

// In StyleSheet:
ghostBtnPressed: {
  backgroundColor: "rgba(128, 128, 128, 0.18)",
},
```

### Cards / Surfaces

- Use `colors.surfaceContainerLowest` or `colors.primaryContainer` for card backgrounds
- Border radius: 16 for small cards, 20–24 for large modals
- Never hardcode background colors — always pull from `colors.*`

### Typography

- Screen titles: `fonts.headlineExtraBold`, size 28–36
- Section headers: `fonts.headlineBold`, size 18–22
- Body text: `fonts.bodyRegular` or `fonts.bodyMedium`, size 14–16
- Accent/handwritten: `fonts.handwritten` (Caveat), use sparingly for personality

### Spacing rhythm

- Page padding: 20–24 horizontal
- Vertical gap between sections: 16–24
- Tap target minimum: 44pt

---

## Code Rules

1. **Date keys** — always zero-pad month and day: `.padStart(2, "0")`
2. **No hardcoded hex colors** — use `colors.*` from theme
3. **No hardcoded font strings** — use `fonts.*` from theme
4. **Batch AsyncStorage** — use `multiGet`/`multiSet` instead of loops of `getItem`
5. **Pressable not TouchableOpacity** for interactive elements in new code
6. **No `console.log`** — use `console.warn` or `console.error` only
7. **TypeScript strict** — no `any` without explicit justification comment
8. **Arrow functions for callbacks** — consistent style across files

---

## Running the App

```bash
# Dev server
npm start

# Build & install on connected Android device
npm run android   # or: npx expo run:android

# Address of test device (Samsung SM-S906U1)
adb connect 192.168.1.151:5555

# Type check
npx tsc --noEmit

# Lint (zero warnings enforced)
npm run lint

# Auto-fix lint issues
npm run lint:fix
```

**App ID:** `com.elarin.app`

---

## Known Gaps / Future Work

| Issue                                | Location                                         | Notes                                                       |
| ------------------------------------ | ------------------------------------------------ | ----------------------------------------------------------- |
| Notification frequency not respected | `notifications.ts` `scheduleGoalNotifications()` | Always schedules DAILY; needs frequency-aware trigger       |
| `alarms.ts` unused                   | `src/alarms.ts`                                  | Native AlarmManager module not yet wired up; safe to ignore |
| `battery.ts` unused                  | `src/battery.ts`                                 | Battery optimization prompt disabled; can be re-enabled     |
