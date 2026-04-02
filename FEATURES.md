# Elarin — Feature Backlog

> Living document for planned features. Ordered by priority within each tier.
> Features move from **Planned → In Progress → Shipped** as they're built.
>
> **Updated:** March 27, 2026

---

## Shipped in V1 (Core)

### Random Reminder Windows

**Status:** Shipped (V1 core)

User sets a time window (e.g., 5–8 PM). Elarin picks a random time within that window to fire the notification. No predictable schedule. Configurable reminders per day (default: 2).

---

## Paid Tier Features

### Personal Analytics Dashboard

**Status:** Planned
**Tier:** Paid

Track user behavior patterns across all goals and surface meaningful insights. This isn't vanity metrics — it's self-awareness.

**What we track:**

- Completion rate per goal (e.g., 8/10 days engaged)
- Step distribution — how often users complete at each tier
  - Example: "8/10 times you engaged with Air Squats. 6 of those you did the full goal. 2 times you stepped down."
- Time-of-day patterns — when the user is most likely to complete vs. snooze
- Self-trust meter trends over weeks/months
- Snooze patterns — which goals get snoozed most, which times of day
- Step-down depth — how often users fall back to easier/easiest

**Visualizations:**

- Weekly/monthly completion heatmap (gray for missed, gradient for engagement level — never red)
- Per-goal chart: full goal vs. stepped-down vs. snoozed
- Trend lines for self-trust meter over time
- "Your tendencies" summary cards — plain language insights like:
  - "You complete Daily Walk 80% of the time, but tend to step down on Mondays"
  - "You're most consistent between 7–8am"
  - "Reading is your most-snoozed goal — consider making the easiest version even easier"

**Design rules:**

- No judgmental framing. "Tendency" not "failure." "Pattern" not "problem."
- Consistent with Elarin's philosophy: all data is neutral. Gray, never red.
- Insights should suggest actionable adjustments, not guilt

**Data storage:**

- Can be computed from existing completion/progress data in AsyncStorage
- No backend needed initially — all local computation
- Future: backend sync for cross-device and historical depth

---

### Unlimited Goals

**Status:** Planned
**Tier:** Paid

Free tier: 3 goals. Paid tier: unlimited. Simple, clean gate.

---

### Theme Customization

**Status:** Planned
**Tier:** Paid

Custom accent colors, alternative dark themes. Keep it simple — 5-6 preset themes, not a full color picker.

---

### Goal Import / Export

**Status:** Planned
**Tier:** Paid

Export goals as shareable links or JSON. Import from link or file. Foundation for the community feature.

---

## Growth Features

### Community Goal Library

**Status:** Planned
**Tier:** Free to browse, paid to publish

A shared library where users can discover and use goals created by others. Think "goal marketplace" but free to use.

**Core concept:**

- Users can publish their goals to the community library
- Browse by category (fitness, mindfulness, creativity, etc.)
- One-tap import into your own app
- Rating/popularity system (upvotes, most-used)
- Curated "staff picks" and category spotlights

**Why this matters for business:**

- Network effect — more users → more goals → more users
- Retention — fresh goals keep the app interesting
- Social proof — seeing others' goals validates the app's approach
- Content moat — a rich goal library is hard to replicate

**Requirements:**

- Backend infrastructure (user accounts, goal storage, API)
- Moderation system (report/flag inappropriate content)
- Attribution (goal creator visible)
- Privacy: no user behavior data shared — only goal structure

---

### Social Accountability (Optional)

**Status:** Planned
**Tier:** Paid

Optional accountability partners. Share self-trust progress (not goal specifics) with a friend. Lightweight — not a full social network.

---

## Infrastructure Features

### Backend & User Accounts

**Status:** Planned
**Dependency for:** Community Library, Cross-device sync

User accounts, cloud storage, API. Required before community features can ship.

---

### Cross-Device Sync

**Status:** Planned
**Tier:** Paid
**Dependency:** Backend

Sync goals, progress, and analytics across devices.

---

### iOS Support

**Status:** Planned

Port to Apple App Store. Most of the codebase is cross-platform already. Main work: notification system differences, App Store review process.

---

## Feature Priority Order

| Priority | Feature                      | Tier      | Dependencies       |
| -------- | ---------------------------- | --------- | ------------------ |
| ✅       | Random Reminder Windows      | Core      | — (shipped in V1)  |
| 1        | Personal Analytics Dashboard | Paid      | None               |
| 2        | Unlimited Goals (gate)       | Paid      | Subscription infra |
| 3        | Theme Customization          | Paid      | None               |
| 4        | Goal Import / Export         | Paid      | None               |
| 5        | Backend & User Accounts      | Infra     | —                  |
| 6        | Community Goal Library       | Free/Paid | Backend            |
| 7        | Cross-Device Sync            | Paid      | Backend            |
| 8        | Social Accountability        | Paid      | Backend            |
| 9        | iOS Support                  | —         | —                  |
