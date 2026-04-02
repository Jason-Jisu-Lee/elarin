# Elarin — Product & Business Document

> **Last Updated:** April 1, 2026
> **Version:** 0.1.0
> **Status:** Core V1 Built — Needs polish, testing, and Play Store prep
>
> For architecture, data model, and technical debt, see **ARCHITECTURE.md**.
> For UX/UI design specs, see **DESIGN.md**.

---

## Vision

Elarin is a mobile self-improvement app that rebuilds **broken self-trust.** Every abandoned gym plan, failed diet, dropped routine — your brain learns "I don't follow through." That kills confidence at the root.

Elarin makes sure you ALWAYS do _something._ Step down on bad days instead of quitting. Every follow-through is a deposit into a self-trust account that's been empty for years.

**Why it works:** Consistency over intensity. The action itself is almost irrelevant — "5 push-ups" sounds like nothing, but doing it every day for 60 days rewires the nervous system to believe "I follow through."

There are no failures in Elarin. Step down, keep going.

---

## Core Mechanic — 3-Tier Goals

Users create **goals** — each with the goal itself + 2 easier versions:

> **20 air squats**
> ↓ 10 air squats
> ↓ 5 air squats

**Reminder:** Exact time. User picks a time, gets reminded at that time. Configurable 1-3x/day.

**Once done = done.** No more reminders that day.

**Goal frequency:** Daily (V1 only supports daily).

**Key design rules:**

- Every level is celebrated equally. No punishment for choosing easier.
- No failure states. Ever.
- Missed days show as **neutral gray**. No red UI. Ever.
- Users can run multiple goals simultaneously.

**Notification actions:**

- **Done** → log completion, stop reminders, "Promise kept."
- **Step Down** → log step-down, stop reminders, "Stepped down. Still in."
- **Snooze** → remind again in 15 min, "Coming back soon."

---

## Progression System

**No daily streak counter.** Milestone celebrations only: 5, 10, 20, 30, 50, 100 days.

**Trust Levels (permanent — never goes down):**

| Level | Name            |
| ----- | --------------- |
| 1     | Starting Out    |
| 2     | Showing Up      |
| 3     | Building Ground |
| 4     | Steady          |
| 5     | Consistent      |
| 6     | Reliable        |
| 7     | Committed       |
| 8     | Resilient       |
| 9     | Unshakable      |
| 10    | Self-Made       |

**Self-Trust Meter:** Computed (% of last 30 days active) but not displayed in V1. Add later if warranted.

---

## Onboarding

Animated storytelling flow (~60 seconds). Not a "read and skip" tutorial. Sets the entire emotional contract of the app.

1. **Name input** — "What is your name?"
2. **Sage lines** — Two philosophical lines with typewriter effect and deliberate pauses
3. **Background transition** — egg white shifts to light blue
4. **Ladder demo** — "1 hour a day" → animated build of easier options → crossout of top → scribble annotations in handwritten font with pencil scratch sound
5. **Template selection** — 3 pre-built goals + Create Your Own

The onboarding teaches the step-down ladder mechanic through storytelling, not instructions.

---

## Accounts

**No accounts for V1.** No signup, no login, no email. Everything stored locally on device. Zero friction.

Accounts come later only when needed (cloud sync, cross-device, social features).

---

## Tech Stack

| Component        | Technology                             |
| ---------------- | -------------------------------------- |
| Framework        | React Native + Expo (bare workflow)    |
| SDK              | Expo SDK 55                            |
| Language         | TypeScript (strict)                    |
| Routing          | expo-router (file-based)               |
| Storage          | AsyncStorage (local only)              |
| Notifications    | expo-notifications                     |
| Background Tasks | expo-task-manager                      |
| Scheduling       | expo-notifications (daily triggers)    |
| Gestures         | react-native-gesture-handler           |
| Animations       | Animated API + LayoutAnimation         |
| Font             | Caveat (handwritten, for onboarding)   |
| Sound            | expo-av (pencil scratch in onboarding) |
| Target           | Android SDK 34+                        |

**Critical technical requirement:** The step-down notification mechanic must work when the app is **fully closed**. Uses Expo bare workflow (not managed) and expo-task-manager for background notification action handling.

---

## Current State (v0.1.0)

### What's Built and Working

- [x] Project scaffold with Expo bare workflow
- [x] Native Android project generated (`android/` directory)
- [x] Data model (goals with 3-tier ladder, schedule, progress tracking)
- [x] Local storage layer (AsyncStorage — goals, progress, onboarding state)
- [x] Notification system (scheduling, categories, action handlers)
- [x] Step-down notification flow (Done / Step Down / Snooze buttons)
- [x] Background notification handler (expo-task-manager)
- [x] Native AlarmManager pipeline (wired but NOT called from JS — see ARCHITECTURE.md gap #1)
- [x] Native Android receivers (ElarinAlarmReceiver, ElarinActionReceiver)
- [x] Battery optimization whitelist prompt on first launch
- [x] Progression system (trust levels, milestones, self-trust meter — computed but not displayed)
- [x] Expo config plugin for native AlarmManager injection
- [x] **Onboarding** — animated 8-phase storytelling flow with typewriter text, Caveat font, pencil scratch sound
- [x] **Template Selection** — 3 pre-built goals + Create Your Own
- [x] **Create Goal** — 6-step guided wizard with fade transitions
- [x] **Home Screen** — goal cards with swipe-to-act (Swipeable), FAB menu, pull-to-refresh, first-time swipe tutorial
- [x] **Goal Detail/Edit** — view 3-tier ladder, tap to edit inline, delete with confirmation
- [x] **Profile** — edit name, replay tutorial, about
- [x] Light theme (egg white + light blue) applied everywhere
- [x] No emojis anywhere in UI
- [x] Exact-time-only reminders
- [x] Debug APK built and installed on Samsung phone
- [x] GitHub repo (github.com/Jason-Jisu-Lee/elarin.git)

### What Needs Work (Before Play Store)

- [ ] Fix `app.json` — dark theme/splash mismatch (should be light)
- [ ] Remove dead `template/create.tsx` screen
- [ ] Decide: integrate AlarmManager or remove it
- [ ] Remove native emoji strings from alarm plugin
- [ ] Add error boundary (React crash = white screen currently)
- [ ] Add loading/error/empty states to screens
- [ ] Surface progression system (trust levels, milestones) somewhere
- [ ] Test on low-end Android device
- [ ] Privacy policy page
- [ ] Signed release AAB build
- [ ] Google Play Developer account ($25)
- [ ] Store listing, screenshots, data safety form
- [ ] Closed testing (20+ testers, 14 days)

---

## Business Model

### Pricing Strategy: Freemium → Subscription

**Phase 1: Free Tier (Launch)**

- Full step-down notification mechanic
- Unlimited goals (no gate at launch — get users first)
- Basic progression
- Core onboarding experience

**Phase 2: Paid Tier (Subscription)**

- Advanced analytics dashboard
- Theme customization
- Template import/export
- Priority notification features
- Pricing TBD — competitive analysis needed

### Distribution

- **Primary:** Google Play Store (Android first)
- **Future:** Apple App Store (iOS)

---

## Roadmap

### Phase 1 — Launch to Play Store (Current)

- [x] Background notification handling
- [x] All 7 screens built
- [x] Onboarding with animations
- [x] Debug APK running on device
- [ ] Fix technical debt (see ARCHITECTURE.md Known Gaps)
- [ ] Polish — loading states, error handling, empty states
- [ ] Fix `app.json` theme mismatch
- [ ] Build signed release AAB
- [ ] Google Play Developer account + listing
- [ ] Privacy policy
- [ ] Closed testing track
- [ ] Submit for production

### Phase 2 — Polish & Monetization

- Subscription infrastructure (Google Play Billing)
- Free/paid tier gating
- Visual polish and animations
- Crashlytics / error monitoring (Sentry)

### Phase 3 — Growth Features

- Personal analytics dashboard
- Community template library
- iOS support
- Social accountability features

### Phase 4 — Scale

- Backend infrastructure (user accounts, sync)
- Cross-device sync
- Wearable integration
- Localization / i18n

---

## Design Principles

1. **No failure states** — every interaction is positive. Step down, never quit.
2. **No emojis** — clean, text-only UI
3. **Gray, never red** — missed days are neutral, never punishing
4. **Lowest barrier wins** — the app succeeds when the user does the minimum
5. **Zero friction** — no accounts, no signup, no paywalls at launch
6. **Teach by story, not instructions** — onboarding is a 60-second narrative
7. **Milestone, not daily** — celebrate 5, 10, 20 day marks. No daily streak pressure.
8. **Minimal labels** — if it's obvious from context, don't label it
9. **Start embarrassingly small** — the app's core philosophy is also its UX philosophy

---

## Package / App Identity

| Field         | Value              |
| ------------- | ------------------ |
| App Name      | Elarin             |
| Package       | com.elarin.app     |
| Slug          | elarin             |
| Orientation   | Portrait           |
| Theme         | Light (#FAF8F5 bg) |
| Accent Color  | #5BA4CF            |
| Success Color | #4CAF82            |
