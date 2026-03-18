# Elarin — Feature Backlog

> Living document for planned features. Ordered by priority within each tier.
> Features move from **Planned → In Progress → Shipped** as they're built.

---

## Paid Tier Features

### Random Nudge Windows

**Status:** Planned
**Tier:** Paid

User sets a time window (e.g., 6am–9am). Elarin picks a random time within that window to fire the step-down notification. Configurable minimum gap between pings if multiple templates overlap.

Keeps the core interrupt mechanic intact while removing the rigidity of fixed times. Users who want flexibility pay for it.

---

### Personal Analytics Dashboard

**Status:** Planned
**Tier:** Paid

Track user behavior patterns across all templates and surface meaningful insights. This isn't vanity metrics — it's self-awareness.

**What we track:**

- Completion rate per template (e.g., 8/10 days engaged)
- Step distribution — how often users complete at each ladder level
  - Example: "8/10 times you engaged with Pushups. 6 of those you completed the full action. 2 times you stepped down to '1 pushup'."
- Time-of-day patterns — when the user is most likely to complete vs. snooze
- Momentum trends over weeks/months (not just the live meter)
- Snooze patterns — which templates get snoozed most, which times of day
- Step-down depth — how far down the ladder users typically go per template

**Visualizations:**

- Weekly/monthly completion heatmap (gray for missed, gradient for engagement level — never red)
- Per-template pie/ring chart: full action vs. stepped-down vs. snoozed
- Trend lines for momentum over time
- "Your tendencies" summary cards — plain language insights like:
  - "You complete Morning Pushups 80% of the time, but tend to step down on Mondays"
  - "You're most consistent between 7–8am"
  - "Writing is your most-snoozed template — consider making the minimum step easier"

**Design rules:**

- No judgmental framing. "Tendency" not "failure." "Pattern" not "problem."
- Consistent with Elarin's philosophy: all data is neutral. Gray, never red.
- Insights should suggest actionable adjustments, not guilt

**Data storage:**

- MVP analytics can be computed from existing `CompletionRecord` data in AsyncStorage
- No backend needed initially — all local computation
- Future: backend sync for cross-device and historical depth

---

### Unlimited Templates

**Status:** Planned
**Tier:** Paid

Free tier: 3 templates. Paid tier: unlimited. Simple, clean gate.

---

### Theme Customization

**Status:** Planned
**Tier:** Paid

Custom accent colors, alternative dark themes. Keep it simple — 5-6 preset themes, not a full color picker.

---

### Template Import / Export

**Status:** Planned
**Tier:** Paid

Export templates as shareable links or JSON. Import from link or file. Foundation for the community feature.

---

## Growth Features

### Community Template Library

**Status:** Planned
**Tier:** Free to browse, paid to publish

A shared library where users can discover and use templates created by others. Think "template marketplace" but free to use.

**Core concept:**

- Users can publish their templates to the community library
- Browse by category (fitness, mindfulness, creativity, etc.)
- One-tap import into your own app
- Rating/popularity system (upvotes, most-used)
- Curated "staff picks" and category spotlights

**Why this matters for business:**

- Network effect — more users → more templates → more users
- Retention — fresh templates keep the app interesting
- Social proof — seeing others' templates validates the app's approach
- Content moat — a rich template library is hard to replicate

**Requirements:**

- Backend infrastructure (user accounts, template storage, API)
- Moderation system (report/flag inappropriate content)
- Attribution (template creator visible)
- Privacy: no user behavior data shared — only template structure

---

### Social Accountability (Optional)

**Status:** Planned
**Tier:** Paid

Optional accountability partners. Share momentum (not specifics) with a friend. Lightweight — not a full social network.

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

Sync templates, progress, and analytics across devices.

---

### iOS Support

**Status:** Planned

Port to Apple App Store. Most of the codebase is cross-platform already. Main work: notification system differences, App Store review process.

---

## Feature Priority Order

| Priority | Feature                      | Tier      | Dependencies       |
| -------- | ---------------------------- | --------- | ------------------ |
| 1        | Random Nudge Windows         | Paid      | None               |
| 2        | Personal Analytics Dashboard | Paid      | None               |
| 3        | Unlimited Templates (gate)   | Paid      | Subscription infra |
| 4        | Theme Customization          | Paid      | None               |
| 5        | Template Import / Export     | Paid      | None               |
| 6        | Backend & User Accounts      | Infra     | —                  |
| 7        | Community Template Library   | Free/Paid | Backend            |
| 8        | Cross-Device Sync            | Paid      | Backend            |
| 9        | Social Accountability        | Paid      | Backend            |
| 10       | iOS Support                  | —         | —                  |
