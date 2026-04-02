# Design System Specification: Editorial Mindfulness

## 1. Overview & Creative North Star: "The Living Journal"
The Creative North Star for this design system is **"The Living Journal."** Unlike typical productivity apps that feel like rigid databases, this system is designed to feel like a high-end, bespoke stationery set. It prioritizes the tactile sensation of paper, the intellectual clarity of editorial layouts, and the warmth of a human touch.

We break the "digital template" look through **Intentional Asymmetry** and **Tonal Depth**. By utilizing wide margins, off-center headings, and the juxtaposition of clinical sans-serifs against humanistic "scribbles," we create an environment that feels premium, calm, and deeply personal.

---

## 2. Colors & Surface Philosophy
The palette is rooted in organic, warmth-leaning neutrals, punctuated by a singular "Sky" primary and "Harvest" secondary accents.

### The "No-Line" Rule
Standard 1px borders are strictly prohibited for sectioning. Boundaries must be defined through background color shifts. For example, a `surface-container-low` section sitting on a `surface` background provides all the definition needed without the visual "noise" of a line.

### Surface Hierarchy & Nesting
Treat the UI as physical layers of fine vellum.
- **Base Layer:** `surface` (#fbf9f6) – The "desk" upon which everything sits.
- **Primary Containers:** `surface-container-lowest` (#ffffff) – Used for primary cards to simulate pure white paper.
- **Nested Content:** `surface-container` (#efeeeb) – Used for secondary information nested within a white card.

### The "Glass & Soul" Rule
To prevent the app from feeling flat, use **Glassmorphism** for persistent floating elements (like a Bottom Navigation Bar). Use `surface` at 80% opacity with a `20px` backdrop blur. 
**Signature Polish:** For primary Action Buttons, apply a subtle linear gradient from `primary` (#00658d) to `primary-container` (#5ba4cf) at a 135-degree angle. This adds "soul" and depth that a flat hex code cannot achieve.

---

## 3. Typography: The Editorial Voice
We use two distinct typefaces to create a dialogue between the system and the user.

*   **The Authority (Manrope):** Used for Headlines and Display. It is modern, geometric, and provides the structural integrity of the app.
*   **The Companion (Plus Jakarta Sans):** Used for Body and Labels. It is highly legible with a friendly, open aperture.
*   **The Human Touch (Hand-written Style):** Used exclusively for "scribbles"—side notes, highlights, or secondary annotations using the `secondary` (#745b00) token.

| Level | Token | Font | Size | Intent |
| :--- | :--- | :--- | :--- | :--- |
| **Display** | `display-lg` | Manrope | 3.5rem | High-impact moments of reflection. |
| **Headline** | `headline-md` | Manrope | 1.75rem | Section titles; always use generous top-margin. |
| **Title** | `title-md` | Plus Jakarta | 1.125rem | Card headers; crisp and clear. |
| **Body** | `body-lg` | Plus Jakarta | 1.0rem | The primary reading experience. |
| **Annotation**| `label-sm` | Hand-written| 0.6875rem | Personal "scribbles" or margin notes. |

---

## 4. Elevation & Depth
Depth is achieved through **Tonal Layering**, not structural scaffolding.

*   **The Layering Principle:** To lift a card, do not reach for a shadow first. Place a `surface-container-lowest` (#ffffff) card on a `surface-container-low` (#f5f3f0) background. The 2% shift in brightness is enough for the human eye to perceive elevation.
*   **Ambient Shadows:** For floating elements (e.g., Modals), use a "Cloud Shadow": `box-shadow: 0 12px 40px rgba(27, 28, 26, 0.05);`. The shadow must be tinted with the `on-surface` color to feel natural.
*   **The Ghost Border:** If a border is required for accessibility, use the `outline-variant` token at **15% opacity**. Never use 100% opaque borders.

---

## 5. Components

### Buttons
- **Primary:** Gradient fill (`primary` to `primary-container`), white text, `xl` (0.75rem) roundedness. 
- **Secondary:** `surface-container-highest` fill with `primary` text. No border.
- **Tertiary:** Pure text with 1.4rem (`spacing-4`) horizontal padding.

### Cards & Lists
- **Rule:** Forbid divider lines. Use `spacing-6` (2rem) of vertical whitespace to separate list items.
- **Interactive Cards:** Use `surface-container-lowest` with a "Ghost Border" that transitions to a 4% ambient shadow on hover.

### Progress Scribbles (System Specific)
Instead of standard progress bars, use a "Hand-drawn" stroke effect using the `tertiary` (#006c48) color for completion or `secondary` (#745b00) for "in-progress." The line should have a slight variable width to mimic a real pen.

### Inputs
- **Style:** Underline-only or Ghost-style. Text fields should not be boxes; they should be "spaces to write." Use `surface-variant` for the underline, thickening to 2px `primary` on focus.

---

## 6. Do’s and Don’ts

### Do
*   **Embrace Negative Space:** If a screen feels "empty," leave it. Space is a luxury in this system.
*   **Asymmetric Alignment:** Align headlines to the left with a massive 15% left-margin offset to create an editorial, magazine-like feel.
*   **Use Tonal Shifts:** Use `surface-dim` for footers to "ground" the page.

### Don't
*   **No Emojis:** They break the sophisticated, tactile aesthetic. Use custom, thin-stroke SVG icons if necessary.
*   **No Pure Black:** Never use #000000. Use `on-surface` (#1b1c1a) for all text to maintain the "ink-on-paper" softness.
*   **No Harsh Corners:** Avoid `none` or `sm` roundedness. Stick to `lg` (0.5rem) and `xl` (0.75rem) to maintain the organic "friendly" feel.