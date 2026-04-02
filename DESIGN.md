# Elarin — Design Doc

> Living doc. Updated as we go.

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
> _or easier:_ 10 air squats
> _or easiest:_ 5 air squats

**Reminder window:** Time range for random reminders (NOT activity duration). Can be a window ("5–8 PM") or exact time ("10 PM").

**Reminders per day:** Default twice. Configurable.

**Once done = done.** No more reminders that day.

**Goal frequency:** Daily by default. Changeable (weekly, every 3 days, etc).

---

## Accounts

**No accounts for V1.** No signup, no login, no email. Everything stored locally on device. Zero friction.

Accounts come later only when needed (cloud sync, cross-device, social features).

---

## 1. First Open Experience — Onboarding

### Onboarding (animated, progress bar on top, no skip)

**Progress bar:** Thin 3px line at the top, fills as user advances. No skip button.

**Step 1 — Name (egg white bg):**
"What is your name?" → text input → Continue

**Step 2 — Sage line 1 (egg white, auto-advance 2.5s):**
"You already know where you want to be."
Fades in alone, sits, fades out.

**Step 3 — Sage line 2 (egg white, auto-advance 3.5s):**
"The path there is not a leap, or even a step — it's a nudge."
Fades in alone, sits, fades out.

**Step 4 — BG transition:**
Background smoothly shifts from egg white to light blue (#E8F1F8). Signals: "we're getting started."

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
Then it fades/removes, leaving only 3 options which re-center smoothly.

**Step 8 — Scribble annotations (typewriter style):**
Fast typewriter text appears above each remaining line, like handwritten notes:

- "You will try this first" (above 30 minutes a day)
- "If that's too much, try this" (above 10 minutes)
- "And if that's too much" (above one page)

Scribbles fade out. Then everything fades out smoothly.

→ Template selection

### Template Selection (immediately after onboarding)

No header, no question. Just 4 cards. One tap → guided creation starts.

```
🚶  Daily Walk
    15 min walk outside
    ↓ 1 min outside
    ↓ 1 min in your room

💪  Air Squats
    20 air squats
    ↓ 10 air squats
    ↓ 5 air squats

📖  Read a Book
    Read for 30 minutes
    ↓ Read for 10 minutes
    ↓ Read 1 page

✨  Create Your Own
```

Cards show the easier versions with ↓ arrows — reinforces the ladder mechanic they just learned. One tap → guided creation with that goal pre-filled.

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
- Window: 5–8 PM | 2x/day | Daily

**Goal 2: Air Squats**

- Goal: 20 air squats
- Easier: 10 air squats
- Easiest: 5 air squats
- Window: All day | 2x/day | Daily

**Goal 3: Study a Book**

- Goal: Stuy for 30 minutes
- Easier: Study for 10 minutes
- Easiest: Study 1 page
- Window: 5+ PM exact | 1x | Daily

**Card 4: Create Your Own**

---

## 3. Create Goal Flow

First time = guided walkthrough:

1. "What do you want to do?" → goal input
2. "What's an easier version?" → easier input
3. "What's the easiest version? Something you'd do even on your worst day." → easiest input
4. "When should we remind you?" → time picker (window or exact)
5. Notification permission: "We'll send reminders in your window. Once you've done it, we stop for the day."
6. Done → home

Returning users: just a form.

---

## 4. Notifications

- **Title:** Goal name
- **Body:** Current version (e.g., "Time to: 15 min walk outside")
- **Actions:** Do It / Step Down / Snooze

Random timing within window. No predictable schedule.

- Do It → log, stop reminders, "Promise kept."
- Step Down → show easier version, log, stop reminders
- Snooze → remind again in 15 min

---

## 5. Progression

No daily streak counter. Milestone celebrations only: 5, 10, 20, 30, 50, 100 days.

**Trust levels:**
Starting Out → Showing Up → Building Ground → Steady → Consistent → Reliable → Committed → Resilient → Unshakable → Self-Made

**Self-Trust meter:** Cut from V1. MVP ships without it. Add later if needed.

---

## 6. Home Screen

**The main screen. Goal cards = the entire screen. Minimal UI. Zero friction.**

Design principle: The ONLY thing the user sees is their goals. Everything else is tucked away.

```
┌──────────────────────────┐
│                      👤  │  ← profile icon (gender-neutral silhouette, top-right)
│                          │
│   ┌──────────────────┐   │
│   │ 🚶 Daily Walk    │   │  ← goal card (big, tappable)
│   │   15 min walk    │   │     tap → Goal Detail (3 tiers + delete)
│   │                  │   │     swipe → do it / step down / snooze
│   └──────────────────┘   │
│                          │
│   ┌──────────────────┐   │
│   │ 💪 Air Squats    │   │  ← more goals stack vertically
│   │   20 squats      │   │
│   └──────────────────┘   │
│                          │
│                     [+]  │  ← FAB → shows "Template" or "Create"
└──────────────────────────┘
```

**Only 2 icons on the whole screen:** profile (top-right) and + (bottom-right FAB).

**Profile icon (👤):** Gender-neutral silhouette. Tap → Profile screen (see section 11).

**FAB (+):** Tap → shows 2 options:

- **"Create"** → go straight to goal creation form
- **"Template"** → go to template page (3 pre-built goals, more added later)

**Swipe actions (hidden, revealed on swipe):**

- Swipe left → **Do It** (green) / **Step Down** (yellow)
- Swipe right → **Snooze** (gray)

**First-time swipe tutorial:** On first home screen visit, the top goal card auto-animates a partial swipe left (~30% of the way), revealing the Do It / Step Down buttons underneath, then bounces back. A small tooltip: "Swipe to act." Happens once, never again. Replay lives in Profile > Settings.

**Goal card states:**

- **Pending:** Yellow border. Shows emoji + goal name + reminder time.
- **Done:** Green border. Shows ✓ + "Promise kept." (muted text)
- **Stepped down:** Green border. Shows ✓ + "Stepped down. Still in." (muted text)

**No top bar.** No name, no trust level, no meter. Just goals.

**Tap a goal card → Goal Detail screen** (see section 9).

---

## 7. Visual Theme

**Egg white + light blue. Clean, warm, minimal.**

- **Background:** Egg white (#FAF8F5) — warm, not sterile
- **Cards:** White (#FFFFFF) — clean against the egg white bg
- **Primary accent:** Light blue (#5BA4CF) — buttons, links, FAB
- **Supporting:** Warm gray (#E8E6E1) — borders, dividers, subtle lines
- **Text:** Near-black (#1A1A1A) primary, gray (#8C8C8C) secondary

**Goal card borders:**

- **Pending (needs action today):** Yellow border (#F5C542)
- **Done / Stepped down:** Green border (#4CAF82)

**Swipe colors:** Green (do it), Yellow (step down), Gray (snooze)

**Overall feel:** Light, airy, no dark mode V1. Feels like paper. Non-intrusive.

---

## 8. V1 Screens

```
FIRST OPEN:
  Onboarding (animated story) → Template Selection → Guided Goal Creation → Home

DAILY USE:
  Home → Goal Detail (view/edit)
       → Create New Goal

PROFILE:
  Profile (user info, default notifications, replay tutorial, about)
```

7 unique screens total:

| #   | Screen                                         | Design Status |
| --- | ---------------------------------------------- | ------------- |
| 1   | Onboarding (animated storytelling flow)        | ✅ Designed   |
| 2   | Template Selection (4 cards)                   | ✅ Designed   |
| 3   | Guided Goal Creation (first-time walkthrough)  | ✅ Designed   |
| 4   | Home (goal cards + swipe-to-act, minimal UI)   | ✅ Designed   |
| 5   | Goal Detail (tap a goal → view tiers + edit)   | ✅ Designed   |
| 6   | Create Goal (Template or Create picker)        | ✅ Designed   |
| 7   | Profile (name, notifications, tutorial, about) | ✅ Designed   |

---

## 9. Goal Detail Screen

**✅ Designed**

Opens when user taps a goal card on the home screen. Full screen push. Shows the 3-tier ladder + delete.

```
┌──────────────────────────┐
│  ← Back                  │
│                          │
│  🚶 Daily Walk           │  ← emoji + goal name
│                          │
│  ┌────────────────────┐  │
│  │ 15 min walk outside│  │  ← primary tier (tappable → edit)
│  └────────────────────┘  │
│          ↓ easier        │
│  ┌────────────────────┐  │
│  │ 1 min walk outside │  │  ← easier tier (tappable → edit)
│  └────────────────────┘  │
│          ↓ easiest       │
│  ┌────────────────────┐  │
│  │ 1 min walk in room │  │  ← easiest tier (tappable → edit)
│  └────────────────────┘  │
│                          │
│  [Delete Goal]           │  ← delete button (red text, bottom)
│                          │
└──────────────────────────┘
```

**Interaction:**

- **Tap any tier** → opens edit view for that goal:
  - Edit the goal name + emoji
  - Edit all 3 tier descriptions
  - Edit notification settings (time, frequency, reminders per day)
  - Save / cancel
- **Delete Goal** → confirmation → removes goal
- No history, no stats, no calendar — MVP
- Full screen push (not modal)

---

## 10. Create Goal — Returning Users

**✅ Designed**

When user taps FAB (+) on home screen → shows 2 options:

```
┌──────────────────┐
│   Template       │  → goes to template page (3 pre-built goals)
│   Create         │  → goes straight to goal creation form
└──────────────────┘
```

**"Create":** Opens the goal creation form immediately — same fields as guided walkthrough but without the step-by-step storytelling. All fields on one screen: goal name, emoji, 3 tiers, notification settings.

**"Template":** Goes to template selection page showing the 3 pre-built goals (same as onboarding). More templates added later. Selecting one pre-fills the creation form.

---

## 11. Profile Screen

**✅ Designed**

Opens when user taps the profile icon (👤) on home screen. Full screen push.

```
┌──────────────────────────┐
│  ← Back                  │
│                          │
│  👤                      │
│  Jason                   │  ← user's name (from onboarding)
│                          │
│  ┌────────────────────┐  │
│  │ 👤 Profile         │  │  ← basic user info (name, edit name)
│  └────────────────────┘  │
│                          │
│  ┌────────────────────┐  │
│  │ 🔔 Notifications   │  │  ← default notification settings
│  └────────────────────┘  │
│                          │
│  ┌────────────────────┐  │
│  │ 🔄 Replay Tutorial │  │  ← replay swipe tutorial
│  └────────────────────┘  │
│                          │
│  ┌────────────────────┐  │
│  │ ℹ️ About           │  │  ← version info
│  └────────────────────┘  │
│                          │
└──────────────────────────┘
```

**Profile:** Edit name.
**Notifications:** Default notification settings (applies as default to new goals).
**Replay Tutorial:** Re-shows the swipe tutorial on home screen.
**About:** Version number, that's it for MVP.

---

## Changelog

- 2026-03-28: Theme locked — egg white + light blue + warm gray. Goal cards: yellow border (pending), green border (done). Goal Detail redesigned — tap any tier to edit, delete at bottom. Home screen: profile icon replaces gear, FAB shows Template/Create picker. Profile screen designed. All 7 screens designed.
- 2026-03-27: Home screen locked in — todo list with swipe-to-act + first-time swipe tutorial animation.
- 2026-03-26: Switched onboarding to 2nd person. Added template selection screen (4 cards, no header, ↓ arrows show easier versions). Updated V1 screen count to 7.
- 2026-03-24: No accounts for V1. Dropped all difficulty-level labels — users just see "easier" and "easiest." Simplified V1 screen map. Cleaned up doc.
- 2026-03-23: Added Template 3 (Read a Book). Updated onboarding line. Defined V1 screens.
- 2026-03-22: Locked in D+E hybrid, 3-tier goals, random notifications, milestone-only streaks.
- 2026-03-21: Created. Philosophy. First-open approaches brainstormed.
