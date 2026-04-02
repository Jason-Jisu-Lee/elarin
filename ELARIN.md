# Elarin — Product & Business Document

> **Last Updated:** March 27, 2026
> **Version:** 0.2.0
> **Status:** Design Phase Complete — Ready for Frontend Rebuild

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
> _or easier:_ 10 air squats
> _or easiest:_ 5 air squats

**Reminder window:** Time range for random reminders (NOT activity duration). Can be a window ("5–8 PM") or exact time ("10 PM"). Random timing within the window — no predictable schedule.

**Reminders per day:** Default twice. Configurable.

**Once done = done.** No more reminders that day.

**Goal frequency:** Daily by default. Changeable (weekly, every 3 days, etc).

**Key design rules:**

- Every level is celebrated equally. No punishment for choosing easier.
- No failure states. Ever.
- Missed days show as **neutral gray**. No red UI. Ever.
- Users can run multiple goals simultaneously.

**Notification actions:**

- **Do It** → log completion, stop reminders, "Promise kept."
- **Step Down** → show easier version, log, stop reminders, "Stepped down. Still in."
- **Snooze** → remind again in 15 min, "Coming back soon."

---

## Progression System

**No daily streak counter.** Milestone celebrations only: 5, 10, 20, 30, 50, 100 days.

**Self-Trust Meter:** Fills based on consistency. Displayed on home screen.

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

---

## Onboarding Philosophy

Animated storytelling flow (~60 seconds). Not a "read and skip" tutorial. Sets the entire emotional contract of the app.

1. **Name input** — "What is your name?"
2. **The Goal** — Goals flash by, getting harder, subtly redder
3. **The Reframe** — "But first — you need to become someone who follows through."
4. **Descending ladder** — 1 hr reading → 1 sentence (red ↓ arrows)
5. **Ascending ladder** — 1 sentence → 1 hr (green ↑ arrows)
6. **The Line** — "That's how you rebuild trust in yourself."
7. **Name close** — "I'm [name]. And I'm ready." → Template selection

The onboarding teaches the step-down ladder mechanic through storytelling, not instructions.

---

## Accounts

**No accounts for V1.** No signup, no login, no email. Everything stored locally on device. Zero friction.

Accounts come later only when needed (cloud sync, cross-device, social features).

---

## Tech Stack

| Component        | Technology                            |
| ---------------- | ------------------------------------- |
| Framework        | React Native + Expo (bare workflow)   |
| SDK              | Expo SDK 55                           |
| Language         | TypeScript (strict)                   |
| Routing          | expo-router                           |
| Storage          | AsyncStorage (local only)             |
| Notifications    | expo-notifications                    |
| Background Tasks | expo-task-manager                     |
| Scheduling       | AlarmManager (setAlarmClock priority) |
| Target           | Android SDK 34+                       |

**Critical technical requirement:** The step-down notification mechanic must work when the app is **fully closed**. Uses Expo bare workflow (not managed) and expo-task-manager for background notification action handling.

---

## Current State (v0.2.0)

### What's Done

- [x] Project scaffold with Expo bare workflow
- [x] Native Android project generated (`android/` directory)
- [x] Data model (goals with 3-tier ladder, schedule, progress tracking)
- [x] Local storage layer (AsyncStorage — goals, progress, onboarding state)
- [x] Notification system (scheduling, categories, action handlers)
- [x] Step-down notification flow (Do It / Step Down / Snooze buttons)
- [x] Background notification handler (expo-task-manager) — works when app is closed
- [x] AlarmManager with setAlarmClock for time-critical scheduling
- [x] Native Android receivers (ElarinAlarmReceiver, ElarinActionReceiver)
- [x] Pending actions bridge (native → JS) for app-killed state recovery
- [x] Battery optimization whitelist prompt on first launch
- [x] Progression system (trust levels, self-trust meter, milestone streaks)
- [x] Expo config plugin for native AlarmManager injection
- [x] Debug APK built (182 MB) and installed on Samsung phone
- [x] App running on device — JS bundle loads, no errors
- [x] GitHub repo set up (github.com/Jason-Jisu-Lee/elarin.git)
- [x] **DESIGN.md complete** — all UX/UI decisions locked in
  - Storytelling onboarding (~60 sec animated flow)
  - Template selection (4 cards — 3 pre-built + create your own)
  - Home screen (todo list + swipe-to-act + first-time tutorial)
  - Create goal flow (guided first time, form for returning users)
  - Notifications (random within window, Do It / Step Down / Snooze)
  - Progression (trust levels, milestone-only streaks, self-trust meter)

### What Needs Work

- [ ] **Visual theme** — colors, fonts, spacing (doing in Stitch)
- [ ] **Frontend rebuild** — rewrite all 7 screens to match DESIGN.md
- [ ] Physical device testing for notification reliability
- [ ] Random notification timing within windows
- [ ] Signed release build (AAB)
- [ ] Play Store listing and submission

---

## Business Model

### Pricing Strategy: Freemium → Subscription

**Phase 1: Free Tier (Launch)**

- Full step-down notification mechanic
- Single or limited templates
- Basic progression (XP + Momentum)
- Core onboarding experience

**Phase 2: Paid Tier (Subscription)**

- Unlimited templates
- Advanced scheduling (random windows, custom gaps)
- Enhanced analytics and streaks
- Priority notification reliability features
- Theme customization
- Template import/export

### Revenue Model

- Monthly and annual subscription options
- Free tier hooks users with the core mechanic
- Paid tier unlocks power-user features and unlimited usage
- Pricing TBD — competitive analysis needed

### Distribution

- **Primary:** Google Play Store (Android first)
- **Future:** Apple App Store (iOS)

---

## Roadmap

### Phase 1 — Launch to Play Store (Current)

- [x] Background notification handling (app-closed state)
- [x] AlarmManager integration for reliable scheduling
- [x] Battery optimization whitelist prompt
- [x] Debug APK built and installed on phone
- [x] App running on device (JS bundle loads, no errors)
- [x] UX/UI design locked in (DESIGN.md)
- [ ] **Visual theme** — finalize in Stitch
- [ ] **Frontend rebuild** — rewrite all 7 screens per DESIGN.md:
  1. Onboarding (animated storytelling flow)
  2. Template Selection (4 cards)
  3. Guided Goal Creation (first-time walkthrough)
  4. Home (todo list + swipe-to-act + self-trust meter)
  5. Goal Detail (view ladder, history, edit)
  6. Create Goal (form for returning users)
  7. Settings
- [ ] **Test on device** — notifications, swipe actions, onboarding flow
- [ ] **Polish** — animations, loading/error/empty states
- [ ] **Build signed release AAB** — generate keystore, production build
- [ ] **Google Play Developer account** — $25 one-time fee
- [ ] **Store listing** — name, description, screenshots, feature graphic
- [ ] **Privacy policy** — host a page (all local, no data leaves device)
- [ ] **Upload to Play Console** — content rating, pricing (free), upload AAB
- [ ] **Closed testing** — 20+ testers for 14 days (Google requirement)
- [ ] **Submit for production** — Google review (1-3 days for new apps)
- [ ] **Post-launch monitoring** — crash reporting (Sentry), user feedback

### Phase 2 — Polish & Monetization

- Subscription infrastructure (Google Play Billing)
- Free/paid tier gating
- Time picker UI improvements
- Visual polish and animations
- Crashlytics / error monitoring

### Phase 3 — Growth Features

- Community template library (share/discover templates)
- Analytics dashboard (trends, completion rates)
- iOS support (Apple App Store)
- Social features (optional accountability partners)

### Phase 4 — Scale

- Backend infrastructure (user accounts, sync)
- Web dashboard
- Wearable integration
- Localization / i18n

---

## Future Features (NOT in V1)

These are explicitly out of scope for launch:

- Community goal library
- Personal analytics dashboard
- Pro tier / subscription monetization
- iOS support
- Backend / user accounts / cloud sync
- Social features / accountability partners
- Theme customization (beyond default)

See FEATURES.md for the full backlog with details.

---

## Design Principles

1. **No failure states** — every interaction is positive. Step down, never quit.
2. **Gray, never red** — missed days are neutral, never punishing
3. **Lowest barrier wins** — the app succeeds when the user does the minimum
4. **Zero friction** — no accounts, no signup, no paywalls at launch
5. **Teach by story, not instructions** — onboarding is a 60-second narrative
6. **Milestone, not daily** — celebrate 5, 10, 20 day marks. No daily streak pressure.
7. **Start embarrassingly small** — the app's core philosophy is also its UX philosophy

---

## Original Prompt

The founding prompt that defines Elarin's product vision, technical requirements, and development philosophy is preserved in repository memory for continuity across development sessions.

---

## Package / App Identity

| Field         | Value                     |
| ------------- | ------------------------- |
| App Name      | Elarin                    |
| Package       | com.elarin.app            |
| Slug          | elarin                    |
| Orientation   | Portrait                  |
| Theme         | Dark (#0D0D0D background) |
| Accent Color  | #7C5CFC                   |
| Success Color | #34D399                   |
