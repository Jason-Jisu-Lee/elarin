# Elarin — Product & Business Document

> **Last Updated:** March 9, 2026
> **Version:** 0.1.0 (MVP)
> **Status:** MVP Complete — Ready for Device Testing

---

## Vision

Elarin is a mobile self-improvement app built around one core behavioral science principle: **lowering the activation barrier to action.** The thesis is that _starting_ — even in its smallest possible form — is more valuable than the action itself. Starting builds momentum. Any action counts.

There are no failures in Elarin. Only momentum.

---

## Core Mechanic — The Step-Down Notification

Users create **templates** — goal categories (fitness, mindfulness, creativity, etc.) with a primary action and a **step-down ladder** of progressively easier versions.

**Example for "10 pushups":**

| Step                      | Action                   |
| ------------------------- | ------------------------ |
| 1 (Primary)               | 10 pushups               |
| 2                         | 5 pushups                |
| 3                         | 1 pushup                 |
| 4 (Minimum Viable Action) | Stand up from your chair |

At a scheduled time, an **expanded Android notification** fires with 3 action buttons:

- **"Do it"** — marks the current step complete, earns XP
- **"Make it easier"** — cycles down the ladder in-place, inside the notification (user never opens the app)
- **"Snooze"** — reschedules the notification for later

**Key design rules:**

- Every level is celebrated equally. No punishment for choosing easier.
- No failure states. Ever.
- Missed days show as **neutral gray**. No red UI. Ever.
- A long snooze is always one tap away.
- Users can run multiple templates simultaneously.

---

## Progression System

### 1. Momentum (Present Tense)

A meter that fills with recent activity and **drains slowly** with inactivity. Never snaps to zero. Represents _"how you're doing right now."_ Fades gradually, never breaks.

- Gain: +15 per action
- Decay: -0.5 per hour of inactivity
- Range: 0–100

### 2. XP + Levels (Permanent)

Permanent progression that **never goes down**. Represents _"who you are."_

| Action                               | XP Earned |
| ------------------------------------ | --------- |
| Snooze engagement                    | 5 XP      |
| Step completion (scaled by position) | 10–25 XP  |
| Full action completion               | 25 XP     |
| Notification open                    | 3 XP      |

**Level names** use motion/growth language:

| Level | Name      | Min XP |
| ----- | --------- | ------ |
| 1     | Spark     | 0      |
| 2     | Kindling  | 50     |
| 3     | Flame     | 150    |
| 4     | Ember     | 350    |
| 5     | Blaze     | 700    |
| 6     | Torch     | 1,200  |
| 7     | Beacon    | 2,000  |
| 8     | Inferno   | 3,500  |
| 9     | Radiance  | 5,500  |
| 10    | Supernova | 8,000  |

> _XP values are placeholders. Ratios matter more than absolute numbers._

---

## Onboarding Philosophy

Three screens maximum. Must communicate before the user ever touches a template:

1. **The hardest part is starting** — not finishing, not perfection
2. **Every choice counts** — full action, one pushup, snooze — all earn progress
3. **Start embarrassingly small** — interactive ladder demo

This is not a "read and skip" onboarding. It sets the entire emotional contract of the app.

---

## Tech Stack

| Component        | Technology                            |
| ---------------- | ------------------------------------- |
| Framework        | React Native + Expo (bare workflow)   |
| SDK              | Expo SDK 52+ (currently 55)           |
| Language         | TypeScript (strict)                   |
| Routing          | expo-router                           |
| Storage          | AsyncStorage (local only)             |
| Notifications    | expo-notifications                    |
| Background Tasks | expo-task-manager                     |
| Scheduling       | AlarmManager (setAlarmClock priority) |
| Target           | Android SDK 34+                       |

**Critical technical requirement:** The step-down notification mechanic must work when the app is **fully closed**. Uses Expo bare workflow (not managed) and expo-task-manager for background notification action handling.

---

## Current State (v0.1.0 MVP)

### What's Built

- [x] Project scaffold with Expo bare workflow
- [x] Native Android project generated (`android/` directory)
- [x] Data model (Template, StepDownLadder, Schedule, UserProgress, CompletionRecord)
- [x] Local storage layer (AsyncStorage — templates, progress, onboarding state)
- [x] Notification system (scheduling, categories, action handlers)
- [x] Step-down notification flow (Do it / Make it easier / Snooze buttons)
- [x] **Background notification handler (expo-task-manager) — works when app is closed**
- [x] **AlarmManager with setAlarmClock for time-critical scheduling**
- [x] **Native Android receivers (ElarinAlarmReceiver, ElarinActionReceiver)**
- [x] **Pending actions bridge (native → JS) for app-killed state recovery**
- [x] **Battery optimization whitelist prompt on first launch**
- [x] Progression system (XP calculation, momentum decay, level lookup)
- [x] Onboarding flow (3 screens with interactive ladder demo)
- [x] Home screen (momentum meter, XP/level display, template list)
- [x] Template creation/editing UI (name, category, step-down ladder, schedule, active days)
- [x] **Native time picker (replaced raw text input)**
- [x] Template deletion with notification cleanup
- [x] Dark theme (bg: #0D0D0D, accent: #7C5CFC)
- [x] Expo config plugin for native AlarmManager injection

### What Needs Work

- [ ] Physical device testing for notification reliability
- [ ] Random notification windows with configurable minimum gap
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

### Phase 1 — MVP Launch (Current)

- Complete background notification handling (app-closed state)
- AlarmManager integration for reliable scheduling
- Battery optimization whitelist prompt
- Physical device testing
- Play Store listing and submission

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

## Future Features (NOT in MVP)

These are explicitly out of scope for v0.1:

- Community template library
- Analytics dashboard
- Pro tier / monetization logic
- iOS support
- Backend / login / user accounts
- Social features

---

## Design Principles

1. **No failure states** — every interaction is positive
2. **Gray, never red** — missed days are neutral, never punishing
3. **Lowest barrier wins** — the app succeeds when the user does the minimum
4. **Notifications feel owned** — user configures everything explicitly
5. **Dark by default** — respects the user's focus and reduces visual noise
6. **Start embarrassingly small** — the app's core philosophy is also its UX philosophy

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
