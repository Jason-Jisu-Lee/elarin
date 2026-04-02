# Elarin — Design Doc

> Living doc. Updated as we go.
> **Last Updated:** April 1, 2026
>
> For architecture, data model, and system state, see **ARCHITECTURE.md**.

---

## Philosophy

**The real problem:** Broken self-trust.

Every abandoned gym plan, failed diet, dropped routine — your brain learns "I don't follow through." That kills confidence at the root. Not laziness. Learned distrust.

**What Elarin does:** Makes sure you ALWAYS do _something_. Step down on bad days instead of quitting. Every follow-through is a deposit into a self-trust account that's been empty for years.

**Why it works:** Consistency over intensity. Days and weeks, not hours. The action itself is almost irrelevant — "5 push-ups" sounds like nothing, but doing it every day for 60 days rewires the nervous system to believe "I follow through." Cold turkey fails because one miss kills the streak. The ladder removes failure. Step down, keep going.

---

## Core Mechanic

Each goal = the goal + 2 easier versions. No special label — users just see the goal and fallbacks:

> **20 air squats**
> ↓ 10 air squats
> ↓ 5 air squats

**Reminder:** Exact time. User picks a time, gets reminded at that time.

**Reminders per day:** 1-3. Configurable.

**Once done = done.** No more reminders that day.

**Goal frequency:** Daily (V1 only supports daily).

---

## Accounts

**No accounts for V1.** No signup, no login, no email. Everything stored locally on device. Zero friction.

---

## 1. First Open Experience — Onboarding

### Onboarding (animated, progress bar on top, no skip)

**Progress bar:** Thin 3px line at the top, fills with spring physics. No skip button.

**Step 1 — Name (egg white bg):**
"What is your name?" → text input → Continue

**Step 2 — Sage line 1 (egg white, auto-advance ~2.5s):**
"You already know where you want to be."
Typewriter effect. Fades in alone, sits, fades out.

**Step 3 — Sage line 2 (egg white, auto-advance ~3.5s):**
"The path there is not a leap, or even a step — it's a nudge."
Same typewriter effect. Fades in alone, sits, fades out.

**Step 4 — BG transition:**
Background smoothly shifts from egg white to light blue (#E8F1F8).

**Step 5 — Ladder intro (light blue bg):**
"Let's say your goal is to read"
"1 hour a day."
After 2s, "Let's say..." fades out, "1 hour a day" stays.

**Step 6 — Ladder build (auto-animated):**
Lines appear below, pushing the column up (always centered):

- "How about 30 minutes a day?" → prefix/suffix fade → "30 minutes a day"
- "10 minutes?" → suffix fades → "10 minutes"
- "How about one page?" → prefix/suffix fade → "one page"

**Step 7 — Crossout:**
"1 hour a day" gets a red strikethrough line drawn across it.
Fades/removes, leaving 3 options which re-center smoothly via LayoutAnimation.

**Step 8 — Scribble annotations (Caveat handwritten font, yellow #C4A032):**
Fast typewriter text appears above each line. Pencil scratch sound plays. Right arrows (→) appear.

- "You will try this first" → (above 30 minutes a day)
- "If that's too much, try this" → (above 10 minutes)
- "And if that's too much" → (above one page)

Scribbles fade out, everything fades out → Template selection.

### Template Selection (immediately after onboarding)

No header. Cards show goal name + tier ladder with ↓ arrows.

```
Daily Walk
    15 min walk outside
    ↓ 1 min outside
    ↓ 1 min in your room

Air Squats
    20 air squats
    ↓ 10 air squats
    ↓ 5 air squats

Read a Book
    Read for 30 minutes
    ↓ Read for 10 minutes
    ↓ Read 1 page

Create Your Own
```

### Microcopy (always active, everywhere)

- **After Do It:** "Promise kept."
- **After Step Down:** "Stepped down. Still in."
- **After Snooze:** "Coming back soon."
- **First completed day:** "Day 1. You said you would. And you did."
- **Milestones only:** "5 days. 5 promises kept." / "10 days straight." (No daily counter.)

---

## 2. Pre-Built Goals

**Goal 1: Daily Walk**

- Goal: 15 minute walk outside
- Easier: 1 minute walk outside
- Easiest: 1 minute walk in your room
- Reminder: 5:00 PM exact | 1x/day | Daily

**Goal 2: Air Squats**

- Goal: 20 air squats
- Easier: 10 air squats
- Easiest: 5 air squats
- Reminder: 8:00 AM exact | 1x/day | Daily

**Goal 3: Read a Book**

- Goal: Read for 30 minutes
- Easier: Read for 10 minutes
- Easiest: Read 1 page
- Reminder: 9:00 PM exact | 1x/day | Daily

**Card 4: Create Your Own**

---

## 3. Create Goal Flow

Guided walkthrough (6 steps, fade transitions between):

1. "What do you want to do?" → name + goal input
2. "What's an easier version?" → easier input (shows primary as context)
3. "What's the easiest version? Something you'd do even on your worst day." → easiest input
4. "When should we remind you?" → exact time picker ("At [time]")
5. Notification permission: "We'll send you a reminder at your chosen time. Once you've done it, we stop for the day."
6. Done → summary card (name + 3 tiers with ↓ arrows) → "Let's go" → home

Returning users reach this same flow via FAB → Create, or FAB → Template → select one (pre-fills fields).

---

## 4. Notifications

- **Title:** Goal name (no emoji)
- **Body:** Primary tier text (e.g., "15 min walk outside")
- **Actions:** Done / Step down / Snooze 15m

Delivered at the exact time the user set. Configurable 1-3x/day.

- Done → log, stop reminders, "Promise kept."
- Step Down → log, stop reminders, "Stepped down. Still in."
- Snooze → remind again in 15 min, "Coming back soon."

---

## 5. Progression

No daily streak counter. Milestone celebrations only: 5, 10, 20, 30, 50, 100 days.

**Trust levels (permanent — never goes down):**
Starting Out → Showing Up → Building Ground → Steady → Consistent → Reliable → Committed → Resilient → Unshakable → Self-Made

**Self-Trust meter:** Computed but NOT displayed in V1. Add later if needed.

---

## 6. Home Screen

**The main screen. Goal cards = the entire screen. Minimal UI. Zero friction.**

```
┌──────────────────────────┐
│                      [o] │  ← profile icon (CSS silhouette, top-right)
│                          │
│   ┌──────────────────┐   │
│   │ Daily Walk       │   │  ← goal card (tappable)
│   │   5:00 PM        │   │     tap → Goal Detail
│   │                  │   │     swipe → done / step down / snooze
│   └──────────────────┘   │
│                          │
│   ┌──────────────────┐   │
│   │ Air Squats       │   │
│   │   8:00 AM        │   │
│   └──────────────────┘   │
│                          │
│                     [+]  │  ← FAB → "Create" or "Template"
└──────────────────────────┘
```

**Only 2 icons on the whole screen:** profile (top-right) and + (bottom-right FAB).

**Profile icon:** Gender-neutral CSS silhouette (circle + head/body, no images). Tap → Profile screen.

**FAB (+):** Tap → shows 2 options:

- **"Create"** → go straight to goal creation wizard
- **"Template"** → go to template selection page

**Swipe actions (hidden, revealed on swipe):**

- Swipe right → **Done** (green) / **Step Down** (yellow)
- Swipe left → **Snooze** (gray)
- Disabled when goal is already done/stepped down for the day

**First-time swipe tutorial:** On first home visit with goals, top card auto-slides left, revealing buttons, then bounces back. Tooltip: "Swipe to act." Happens once. Replay in Profile.

**Goal card states:**

- **Pending:** Yellow border. Shows goal name + reminder time.
- **Done:** Green border. Shows ✓ + "Promise kept." (muted italic)
- **Stepped down:** Green border. Shows ✓ + "Stepped down. Still in." (muted italic)

**No top bar.** No name, no trust level, no meter. Just goals. Pull-to-refresh.

---

## 7. Visual Theme

**Egg white + light blue. Clean, warm, minimal. No emojis anywhere.**

- **Background:** Egg white (#FAF8F5) — warm, not sterile
- **Cards:** White (#FFFFFF) — clean against the egg white bg
- **Primary accent:** Light blue (#5BA4CF) — buttons, links, FAB
- **Supporting:** Warm gray (#E8E6E1) — borders, dividers
- **Text:** Near-black (#1A1A1A) primary, gray (#8C8C8C) secondary

**Goal card borders:**

- **Pending (needs action today):** Yellow border (#F5C542)
- **Done / Stepped down:** Green border (#4CAF82)

**Swipe colors:** Green (done), Yellow (step down), Gray (snooze)

**Overall feel:** Light, airy, no dark mode V1. Feels like paper.

---

## 8. V1 Screens

```
FIRST OPEN:
  Onboarding (animated story) → Template Selection → Goal Creation → Home

DAILY USE:
  Home → Goal Detail (view/edit)
       → Create New Goal

PROFILE:
  Profile (edit name, replay tutorial, about)
```

7 screens total. See ARCHITECTURE.md for file-to-screen mapping and data flow.

---

## 9. Goal Detail Screen

Opens when user taps a goal card on home screen. Full screen push.

```
┌──────────────────────────┐
│  ←                       │
│                          │
│         Daily Walk       │  ← goal name, centered
│                          │
│  ┌────────────────────┐  │
│  │ 15 min walk outside│  │  ← primary tier (tappable → edit)
│  └────────────────────┘  │
│           ↓              │
│  ┌────────────────────┐  │
│  │ 1 min walk outside │  │  ← easier tier (tappable → edit)
│  └────────────────────┘  │
│           ↓              │
│  ┌────────────────────┐  │
│  │ 1 min walk in room │  │  ← easiest tier (tappable → edit)
│  └────────────────────┘  │
│                          │
│  Reminder: 5:00 PM · 1x │
│                          │
│         [Delete]         │  ← red text, centered
│                          │
└──────────────────────────┘
```

**Interaction:**

- **Tap any tier** → inline edit mode:
  - Edit goal name
  - Edit all 3 tier descriptions (no labels — order is obvious)
  - Edit reminder time ("At [time]")
  - Edit reminders per day (1x/2x/3x chips)
  - Save / Cancel
- **Delete** → confirmation → removes goal + cancels notifications → goes back
- No tier labels in view or edit mode

---

## 10. Create Goal — Returning Users

When user taps FAB (+) on home screen → modal with 2 options:

- **"Create"** → goes straight to guided wizard (same 6-step flow)
- **"Template"** → goes to template selection (3 pre-built + Create Your Own)

Selecting a template pre-fills the wizard.

---

## 11. Profile Screen

Opens when user taps the profile icon on home screen.

```
┌──────────────────────────┐
│  ←                       │
│                          │
│  [o]                     │  ← CSS avatar (circle silhouette)
│  Jason                   │
│                          │
│  Edit Name               │
│  Replay Tutorial         │
│  About                   │
│                          │
└──────────────────────────┘
```

**Edit Name:** Inline text input with Save button.
**Replay Tutorial:** Re-shows the swipe tutorial on home screen.
**About:** Version number.

No emojis on menu items. Plain text.

---

## Changelog

- 2026-04-01: Major update. Removed all emoji references. Exact-time-only reminders. Updated wireframes to match codebase. Removed tier labels. Created ARCHITECTURE.md as system contract.
- 2026-03-28: Theme locked — egg white + light blue + warm gray. 7 screens designed.
- 2026-03-27: Home screen locked in — swipe-to-act + swipe tutorial.
- 2026-03-26: Switched onboarding to 2nd person. Added template selection.
- 2026-03-24: No accounts for V1. Dropped difficulty labels.
- 2026-03-23: Added Read a Book template. Defined V1 screens.
- 2026-03-22: Locked in 3-tier goals, random notifications, milestone-only streaks.
- 2026-03-21: Created.
