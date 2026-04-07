# Elarin — Architecture Reference

> Feed this document to an AI assistant to give it full codebase context before starting work on any feature.

---

## Overview

Elarin is a React Native habit-tracking app (Expo bare workflow) that helps users build habits through a progressive "nudge" system. Each **goal** (called a "template" during onboarding) contains **tasks**: an **Action** (what you want to do) and a **Micro Action** (an easy fallback). Users swipe goals on the home screen to mark them done or reset them. Progress is tracked via a Self-Trust meter and an activity heatmap.

**Stack:** React Native 0.83.2 · Expo ~55.0.5 · TypeScript 5.9 · expo-router · AsyncStorage · Supabase (auth + cloud sync)

---

## Terminology

| App Term         | Code Term         | Description                                     |
| ---------------- | ----------------- | ----------------------------------------------- |
| **Goal**         | `Goal`            | A habit the user tracks (e.g., "Push Ups")      |
| **Action**       | `tiers.primary`   | The main task to perform (e.g., "20 push ups")  |
| **Micro Action** | `tiers.easier`    | An easy fallback version (e.g., "1 push up")    |
| **Template**     | `PRE_BUILT_GOALS` | Pre-made goals users can pick during onboarding |

---

## File Map

```
app/                      ← Screen components (expo-router)
  _layout.tsx             ← Root layout: fonts, theme context, notification listeners
  index.tsx               ← Entry: redirects to /onboarding or /home based on storage
  onboarding.tsx          ← First-run animated onboarding (name → sage → ladder demo)
  theme-select.tsx        ← Light/dark theme picker (shown after onboarding)
  account-setup.tsx       ← Post-onboarding account creation (email/password + verification)
  home.tsx                ← Main screen: goal cards + swipe actions + quote + activity heatmap
  templates.tsx           ← Pre-built goal selection screen
  create.tsx              ← 4-step goal creation flow (task → frequency → notification → done)
  goal/[id].tsx           ← Goal detail / edit screen (Action + Micro Action)
  profile.tsx             ← User profile: name, theme, trust level, log in/out
  account/index.tsx       ← Account info (username, email, birthday, reset password)
  account/signin.tsx      ← Sign-in screen
  account/create.tsx      ← Standalone account creation (legacy, not in main flow)
  template/create.tsx     ← Template goal edit form (modal presentation)

src/                      ← Shared logic (no UI)
  types.ts                ← All TypeScript interfaces (Goal, ReminderConfig, etc.)
  constants.ts            ← TRUST_LEVELS, MILESTONES, MICROCOPY, PRE_BUILT_GOALS
  storage.ts              ← AsyncStorage CRUD — single source of truth for all data
  progression.ts          ← Trust meter logic: recordDoIt, recordStepDown, recordSnooze
  notifications.ts        ← expo-notifications: setup, schedule, cancel, response handler
  background.ts           ← Background notification task (action buttons while app closed)
  theme.ts                ← ThemeContext, light/dark color tokens, font names
  auth.ts                 ← Supabase auth: signUp, signIn, signOut, resendVerification, resetPassword
  supabase.ts             ← Supabase client initialization
  alarms.ts               ← Native AlarmManager module wrappers

assets/                   ← App icons (black E on white), sounds
scripts/                  ← Utility scripts (icon generation, DB schema)
```

---

## Navigation Flow

expo-router Stack. All screens have `headerShown: false` except `template/create` (modal with title).

```
First Run:
  index → onboarding → templates → create → theme-select → account-setup → home

Returning User:
  index → home

Home Screen:
  home → create | templates | goal/[id] | profile
  home → profile → account (if logged in) | account/signin (if not)

Goal Creation (4 steps):
  Task info → Frequency → Notification → Done
  ← Back arrows on Frequency and Notification steps
```

---

## Data Model (`src/types.ts`)

### Goal

```ts
{
  id: string; // unique id (timestamp + random)
  name: string; // "Push Ups"
  emoji: string; // unused, always ""
  tiers: {
    primary: string; // Action: "20 push ups"
    easier: string; // Micro Action: "1 push up"
    easiest: string; // same as easier (2-tier system now)
  }
  reminder: ReminderConfig;
  createdAt: number;
}
```

### ReminderConfig

```ts
{
  type: "window" | "exact"
  startTime: string              // "HH:mm"
  endTime?: string               // "HH:mm" (window type only)
  remindersPerDay: number        // default 1
  activeDays: number[]           // 0=Sun…6=Sat, empty = every day
  notificationsEnabled: boolean  // false = no reminders
  frequency: FrequencyType       // see below
}

type FrequencyType =
  | "daily" | "every_other_day" | "every_3_days"
  | "every_4_days" | "every_5_days" | "every_6_days"
  | "weekly" | "every_2_weeks" | "monthly"
```

### DailyGoalState

```ts
{
  goalId: string
  status: "pending" | "done" | "stepped_down" | "snoozed"
  completedTier?: "primary" | "easier" | "easiest"
}
```

Keyed in AsyncStorage as `elarin:daily_state:YYYY-MM-DD`.

---

## Home Screen Features

### Goal Cards

- **Cards** show at 60% width with a colored left bar
- **Swipe right** = mark done (green), **swipe left** = reset to pending (grey)
- **Left bar colors**: green (done), yellow (overdue), grey (pending)
- **No-notification goals**: Show "Incomplete" (yellow) or "Complete" (green) text

### Activity Heatmap

- Fixed at bottom of screen, above nav buttons
- 3-month rolling window showing **all days** (including future dates in current month)
- Title format: `{year} Activity` (e.g., "2026 Activity")
- 11px cells, 3-letter month labels, horizontal scroll

### Inspirational Quotes

- Displayed above the heatmap, rotating daily
- `INSPIRING_QUOTES` array, selected by `day % length`

---

## Authentication (`src/auth.ts`)

Supabase auth with email confirmation enabled.

| Function               | Description                       |
| ---------------------- | --------------------------------- |
| `signUp(params)`       | Create account + profile row      |
| `signIn(email, pass)`  | Email/password login              |
| `signOut()`            | Clear session                     |
| `resendVerification()` | Resend confirmation email         |
| `resetPassword()`      | Send password reset email         |
| `getAccountId()`       | Current session user ID           |
| `getAccountEmail()`    | Current session email             |
| `isUsernameTaken()`    | Check username availability       |
| `updateUsername()`     | Change username in profiles table |
| `recordEvent()`        | Log action events to Supabase     |

**Important:** Supabase email verification redirect URL must be set to `elarin://` (the app's deep link scheme) in the Supabase dashboard, not `localhost`.

---

## Storage Layer (`src/storage.ts`)

All local persistence is AsyncStorage. No Redux/Zustand.

| Key                             | Content                       |
| ------------------------------- | ----------------------------- |
| `elarin:goals`                  | `Goal[]` JSON array           |
| `elarin:progress`               | `UserProgress` JSON object    |
| `elarin:daily_state:YYYY-MM-DD` | `DailyGoalState[]` JSON array |
| `elarin:profile`                | `UserProfile` JSON object     |
| `elarin:onboarded`              | `"true"` or `"false"`         |
| `elarin:swipe_tutorial_shown`   | `"true"`                      |
| `elarin:heatmap_start`          | `"YYYY-MM-DD"` (init date)    |
| `elarin:account_id`             | Supabase user UUID            |

**Date key format:** Always `YYYY-MM-DD` with zero-padded month and day.

---

## Progression Engine (`src/progression.ts`)

| Function                       | Description                                       |
| ------------------------------ | ------------------------------------------------- |
| `recordDoIt(goalId, tier)`     | Mark goal done for today, update progress         |
| `recordStepDown(goalId, tier)` | Mark stepped-down for today                       |
| `recordSnooze(goalId)`         | Mark snoozed for today                            |
| `getLiveProgress(goals)`       | Returns completed count, trust level, meter value |
| `getConsecutiveDays()`         | Count current streak                              |
| `calculateSelfTrustMeter()`    | 0–100 score based on last 30 days × goal count    |

---

## Theme System (`src/theme.ts`)

```ts
const { colors, isDark, theme, setTheme } = useTheme();

// Fonts (always use fonts.* — never inline fontFamily strings)
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
Goal created → scheduleGoalNotifications(goal)
  → Notifications.scheduleNotificationAsync() × remindersPerDay
  → DAILY trigger (HH:mm)

Notification action tapped:
  ├─ App foreground → handleNotificationResponse() → recordDoIt/recordStepDown
  └─ App background → ELARIN_BACKGROUND_NOTIFICATION task → same logic
```

---

## Build & Deploy

```bash
# Dev server (Metro bundler)
npx expo start --port 8081

# Build & install on device (Expo can't handle TLS mDNS device serials)
cd android
$env:ANDROID_SERIAL = "adb-R3CTA09RW3L-vLdSdD (2)._adb-tls-connect._tcp"
.\gradlew installDebug

# Port forwarding + launch
adb reverse tcp:8081 tcp:8081
adb shell am start -n "com.elarin.app/.MainActivity"
```

**Package:** `com.elarin.app` · **Device:** Samsung SM-S906U1

---

## Code Rules

1. **Date keys** — always zero-pad month and day: `.padStart(2, "0")`
2. **No hardcoded hex colors** — use `colors.*` from theme
3. **No hardcoded font strings** — use `fonts.*` from theme
4. **Batch AsyncStorage** — use `multiGet`/`multiSet` instead of loops
5. **TypeScript strict** — no `any` without justification
6. **2-tier system** — Goals have Action + Micro Action (not 3 tiers)

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
```
