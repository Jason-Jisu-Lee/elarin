# Elarin — Architecture & System Contract

> **Purpose:** This is the single source of truth for what Elarin IS, what's built, and what's NOT built. Every coding session should start by reading this file. It prevents drift, forgotten context, and the silent integration bugs that kill vibe-coded apps.
>
> **Last Updated:** April 1, 2026

---

## How to Use This Document

**Before every coding session:**

1. Read this file top to bottom (or at minimum, the "Current System State" and "Known Gaps" sections)
2. Check what you're about to build against the data model and screen inventory
3. If a change touches more than one screen, trace the data flow through the system first
4. After finishing work, update this document to reflect what changed

**Rules:**

- If it's not in this document, it's not "done" — it might compile but it's not integrated
- Every screen must know where its data comes from and where it writes to
- No new features get built until the current system is consistent with this doc
- No "I'll fix it later" — if something breaks the contract, fix it now or add it to Known Gaps

---

## App Identity

| Field       | Value                                  |
| ----------- | -------------------------------------- |
| App Name    | Elarin                                 |
| Package     | com.elarin.app                         |
| Version     | 0.1.0                                  |
| Framework   | React Native + Expo bare workflow      |
| SDK         | Expo SDK 55                            |
| Language    | TypeScript (strict)                    |
| Routing     | expo-router (file-based)               |
| Storage     | AsyncStorage (local only, no backend)  |
| Target      | Android SDK 34+ (Android only for V1)  |
| Theme       | Light — egg white bg, light blue accent|
| Auth        | None (V1 is fully local, no accounts)  |

---

## Data Model (Source of Truth)

These are the actual TypeScript types in `src/types.ts`. Every screen reads/writes these.

```typescript
Goal {
  id: string                    // generated: timestamp + random
  name: string                  // "Daily Walk"
  emoji: string                 // DEPRECATED — always "" now. Field kept for storage compat.
  tiers: {
    primary: string             // "15 min walk outside"
    easier: string              // "1 min walk outside"
    easiest: string             // "1 min walk in your room"
  }
  reminder: ReminderConfig
  createdAt: number
}

ReminderConfig {
  type: "window" | "exact"      // UI only exposes "exact" now. "window" kept for storage compat.
  startTime: string             // "HH:mm" — the reminder time
  endTime?: string              // UNUSED in UI — kept for storage compat
  remindersPerDay: number       // 1-3
  activeDays: number[]          // UNUSED — always [] (means every day)
  frequency: "daily" | "weekly" | "every_3_days"  // UNUSED — always "daily"
}

DailyGoalState {
  goalId: string
  status: "pending" | "done" | "stepped_down" | "snoozed"
  completedTier?: string
}

CompletionRecord {
  id: string
  goalId: string
  tier: string
  action: "do_it" | "step_down"
  timestamp: number
}

UserProgress {
  trustLevel: number            // 1-10
  selfTrustMeter: number        // 0-100
  lastActivityAt: number
  completions: CompletionRecord[]
  celebratedMilestones: number[]
}
```

### Storage Keys (AsyncStorage)

| Key                              | Type           | Description                    |
| -------------------------------- | -------------- | ------------------------------ |
| `elarin:goals`                   | Goal[]         | All user goals                 |
| `elarin:progress`                | UserProgress   | Trust level, completions, etc. |
| `elarin:onboarded`               | "true"/"false" | Has user completed onboarding  |
| `elarin:profile`                 | UserProfile    | { name: string }               |
| `elarin:daily_state:{YYYY-MM-DD}`| DailyGoalState[] | Per-day goal states          |
| `elarin:swipe_tutorial_shown`    | "true"/"false" | One-time swipe hint flag       |
| `elarin:battery-prompt-shown`    | "true"/"false" | One-time battery modal flag    |

---

## Screen Inventory

7 screens in the app. This is the complete list.

| # | Screen               | File                    | Purpose                                    | Status    |
|---|----------------------|-------------------------|--------------------------------------------|-----------|
| 1 | Entry Router         | `app/index.tsx`         | Checks onboarded → redirects               | Done      |
| 2 | Onboarding           | `app/onboarding.tsx`    | Animated storytelling, name input           | Done      |
| 3 | Template Selection   | `app/templates.tsx`     | 3 pre-built goals + Create Your Own        | Done      |
| 4 | Create Goal          | `app/create.tsx`        | Step-by-step goal wizard (6 steps)         | Done      |
| 5 | Home                 | `app/home.tsx`          | Goal cards, swipe actions, FAB             | Done      |
| 6 | Goal Detail/Edit     | `app/goal/[id].tsx`     | View ladder, tap to edit, delete           | Done      |
| 7 | Profile              | `app/profile.tsx`       | Name, replay tutorial, about               | Done      |

**Dead screen:** `app/template/create.tsx` — registered in Stack but nothing navigates to it. Legacy edit form. Can be removed.

### Navigation Flow

```
app/index.tsx
  ├─ (not onboarded) → /onboarding
  │     └─ finishes → /templates
  │           ├─ select pre-built → /create?prebuilt=N
  │           └─ "Create Your Own" → /create
  │                 └─ finishes → /home (replace)
  └─ (onboarded) → /home
        ├─ tap goal card → /goal/[id]
        │     └─ tap tier → inline edit mode
        │     └─ back ← (arrow button)
        ├─ profile icon → /profile
        │     └─ back ← (arrow button)
        └─ FAB (+)
              ├─ "Create" → /create → /home (replace)
              └─ "Template" → /templates → /create → /home (replace)
```

---

## System Architecture — Data Flow

### Creating a Goal
```
create.tsx (step-by-step wizard)
  → addGoal(goal)                    // writes to AsyncStorage
  → scheduleGoalNotifications(goal)  // schedules expo-notifications triggers
  → router.replace("/home")
```

### Completing a Goal (via swipe or notification)
```
User action (swipe on home / notification button)
  → recordDoIt(goalId, tier)         // writes CompletionRecord + updates DailyGoalState
     OR recordStepDown(goalId, tier)  // same, different status
     OR recordSnooze(goalId)          // updates DailyGoalState only, re-schedules notification
  → home.tsx reloads goals + daily states
```

### Editing a Goal
```
goal/[id].tsx (tap tier → edit mode)
  → updateGoal(goal)                 // writes to AsyncStorage
  → scheduleGoalNotifications(goal)  // re-schedules notifications
  → stays on same screen (exit edit mode)
```

### Notification System
```
scheduleGoalNotifications(goal)
  → cancels all notifications for goal (by identifier prefix)
  → schedules daily CALENDAR triggers via expo-notifications
  → "exact" type: single trigger at startTime
  → "window" type: spaces reminders evenly in window

Notification arrives:
  → 3 buttons: "Done" / "Step down" / "Snooze 15m"
  → Foreground: handleNotificationResponse() in _layout.tsx
  → Background: TaskManager task in background.ts
  → Both call same progression functions
```

---

## Color Palette

| Token        | Hex       | Usage                        |
|--------------|-----------|------------------------------|
| bg           | #FAF8F5   | Main background (egg white)  |
| surface      | #FFFFFF   | Cards                        |
| surfaceLight | #F0F4F8   | Subtle sections              |
| accent       | #5BA4CF   | Buttons, links, primary      |
| accentLight  | #A3CFEA   | Secondary accent             |
| muted        | #E8E6E1   | Borders, dividers            |
| text         | #1A1A1A   | Primary text                 |
| textMuted    | #8C8C8C   | Secondary text               |
| textLight    | #B0B0B0   | Hints, timestamps            |
| pendingBorder| #F5C542   | Goal card — needs action     |
| doneBorder   | #4CAF82   | Goal card — completed        |
| doItGreen    | #4CAF82   | Swipe "Done"                 |
| stepDownYellow| #F5C542  | Swipe "Step Down"            |
| snoozeGray   | #B0B0B0   | Swipe "Snooze"               |
| scribbleYellow| #C4A032  | Onboarding scribble text     |

---

## Known Gaps & Technical Debt

Things that are broken, missing, or inconsistent. Fix these before building new features.

### Critical (Will Break Things)

| # | Gap | Detail | Files Affected |
|---|-----|--------|----------------|
| 1 | **AlarmManager is wired but never called** | Full native pipeline exists (plugin, alarms.ts, receivers) but `scheduleAlarms()` is never called from create/edit. Only expo-notifications is used. Either integrate it or remove it. | `src/alarms.ts`, `plugins/withElarinAlarmManager.js`, `app/create.tsx`, `app/goal/[id].tsx` |
| 2 | **No data migration** | If Goal schema changes, existing AsyncStorage data could silently break on app update. Need a version key + migration function. | `src/storage.ts` |
| 3 | **Background notification duplicate code** | `buildNotificationContent()` is duplicated in `notifications.ts` and `background.ts`. One change, two places to update. | `src/notifications.ts`, `src/background.ts` |

### Medium (Will Make It Unpublishable)

| # | Gap | Detail | Files Affected |
|---|-----|--------|----------------|
| 4 | **No error boundaries** | React crash = white screen with no recovery. Need at least one top-level ErrorBoundary. | `app/_layout.tsx` |
| 5 | **No loading/error states in screens** | Most screens assume data loads instantly. No skeletons, no retry, no error messages. | All screens |
| 6 | **app.json theme mismatch** | `userInterfaceStyle: "dark"`, splash bg `#0D0D0D`, accent `#7C5CFC` — but actual app is light theme. Status bar and splash will look wrong. | `app.json` |
| 7 | **Version mismatch** | `package.json` says 0.1.0, `profile.tsx` About says 0.2.0. | `package.json`, `app/profile.tsx` |
| 8 | **Progression system not surfaced** | Trust levels, self-trust meter, milestone celebrations all computed in `progression.ts` but nothing displays them. `getLiveProgress()` is never called. | `src/progression.ts`, `app/home.tsx` |
| 9 | **Dead screen** | `app/template/create.tsx` is unreachable. Remove it. | `app/template/create.tsx`, `app/_layout.tsx` |
| 10 | **Native emojis in alarm receiver** | `ElarinAlarmReceiver.kt` (inside the config plugin) still uses ⚡, ✅, ⬇️, 💤 in notification strings. These get baked into the native build. | `plugins/withElarinAlarmManager.js` |

### Low (Unprofessional)

| # | Gap | Detail |
|---|-----|--------|
| 11 | **No accessibility** | No accessibilityLabel/Role on any touchable. Screen readers can't use the app. |
| 12 | **No analytics/crash reporting** | No Sentry, no Firebase Analytics. Flying blind after launch. |
| 13 | **Unused type fields** | `frequency`, `activeDays`, `endTime` defined in types, never used in logic. Dead code. |
| 14 | **Emoji field still in Goal type** | `emoji: string` exists on Goal. Always "". Remove when doing next schema migration. |

---

## Dependency Inventory

Core runtime dependencies and what they're used for. If something breaks, check here first.

| Package | Version | Used For |
|---------|---------|----------|
| expo | ~55.0.5 | Core framework |
| react-native | 0.83.2 | UI runtime |
| expo-router | ~5.0.3 | File-based navigation |
| expo-notifications | ~0.31.2 | Notification scheduling + actions |
| expo-task-manager | ~12.1.3 | Background notification handler |
| @react-native-async-storage/async-storage | 2.1.2 | Local data persistence |
| @react-native-community/datetimepicker | 8.4.1 | Time picker UI |
| react-native-gesture-handler | ~2.24.0 | Swipe actions on goal cards |
| react-native-reanimated | ~3.17.4 | Animation system |
| expo-av | ~15.0.2 | Pencil scratch sound in onboarding |
| expo-font | ~13.3.1 | Custom font loading |
| @expo-google-fonts/caveat | ^0.2.5 | Handwritten scribble font |
| expo-device | ~7.1.4 | Device type checks |
| expo-intent-launcher | ~12.1.3 | Battery settings deep link |

---

## Pre-Launch Checklist

Things that MUST be done before submitting to Google Play.

- [ ] Fix `app.json` theme — light bg, light splash, correct accent color
- [ ] Privacy policy page (even though all data is local)
- [ ] Data safety form in Play Console
- [ ] Permissions justification (exact alarm, notifications, battery)
- [ ] Target API level compliance (SDK 34+, already set)
- [ ] Signed release AAB build (keystore generation)
- [ ] Google Play Developer account ($25 fee)
- [ ] Store listing (name, description, screenshots, feature graphic)
- [ ] Content rating questionnaire
- [ ] Closed testing track (20+ testers, 14 days — Google requirement)
- [ ] Test on low-end Android device (not just flagship Samsung)
- [ ] Error boundary wrapping root layout
- [ ] Remove dead `template/create.tsx` screen
- [ ] Decide: integrate AlarmManager or remove it
- [ ] Remove native emoji strings from alarm plugin

---

## Design Rules (Non-Negotiable)

These apply to EVERY screen, EVERY change. No exceptions.

1. **No emojis anywhere** — no emoji characters in any user-facing text, notifications, or UI
2. **No failure states** — every interaction is positive. Step down, never quit
3. **Gray, never red** — missed days neutral, never punishing
4. **No accounts** — V1 is fully local. No signup, no login, no email
5. **Exact time reminders only** — no time windows in UI (type: "exact")
6. **Egg white + light blue** — the visual language. No dark mode in V1
7. **Minimal labels** — if it's obvious from context, don't label it
8. **"←" not "← Back"** — terse navigation, no redundant words
9. **"Delete" not "Delete Goal"** — we know what we're deleting

---

## Changelog

- 2026-04-01: Created. Consolidated from DESIGN.md, ELARIN.md, and full codebase audit. Documents actual system state, not aspirational design.
