**MindProtocol**

UI Generation Prompt & Design Rationale Report

A ready-to-use prompt for generating the app interface, with a full

explanation of the UX/UI reasoning behind every decision

_Hackathon 2026 · Working Document_

# Contents

# 1\. Executive Summary

This report packages a single deliverable - a comprehensive prompt for generating MindProtocol's user interface - alongside a full explanation of why each instruction inside that prompt exists. The goal is that this document can be handed to a designer, a developer, or an AI design/code-generation tool (Claude, v0, Figma AI, or similar) and used directly, while also serving as a design-decision record the team can defend to judges, users, or future collaborators.

Every instruction in the prompt is traced back to one of four categories of justification: (1) established UI/UX principles, (2) psychological mechanisms relevant to a mental-health context, (3) business/retention considerations specific to a daily-use wellness app, and (4) safety constraints that follow directly from the app's own crisis-handling requirements.

Nothing in this prompt is decorative. Every visual and interaction choice is either reducing cognitive load, protecting the user's emotional state, or reinforcing the habit loop the app depends on for retention.

# 2\. Purpose & How to Use This Report

Section 3 contains the full prompt, ready to paste into an AI design or code-generation tool. Section 4 is the rationale - organized by the same categories used in MindProtocol's broader research review - explaining why each element of the prompt was written the way it was. Section 5 is a condensed quick-reference table. Section 6 lists free/accessible platforms where the prompt can be tested.

Recommended workflow: run the prompt as-is first to get a baseline output, compare that output against the rationale in Section 4 to check nothing important was dropped or misinterpreted, then iterate the prompt itself (not just the output) so future runs stay consistent.

# 3\. The UI Generation Prompt

Paste the block below into the system or first-message field of your chosen tool. It is written to be model-agnostic - it works as a system prompt (Claude, GPT) or as a single detailed instruction (v0.dev, Figma AI, Galileo AI).

**ROLE**

You are a senior product UI/UX designer generating a complete interface

specification for MindProtocol, a daily 15-minute mental-reset journaling app.

Output high-fidelity screen descriptions (or React + Tailwind components if

asked for code) for every screen listed below.

**APP CONTEXT**

\- Single core loop, used once daily, not a browsing/social app.

\- Users: college students and early-career professionals, 18-35, using the

app during emotionally vulnerable moments (stress, low mood, rumination).

\- Tone: calm, private, competent - never clinical, never gamified in a way

that feels like a productivity app or social app.

**VISUAL FOUNDATION**

\- Palette: one desaturated primary (teal/deep blue family), one warm neutral

accent used ONLY for the primary CTA and streak indicator, generous off-

white/near-black neutrals for backgrounds and text. No saturated reds,

oranges, or high-chroma colors anywhere except a single reserved warning

color for the crisis-resource screen.

\- Typography: one humanist sans-serif for UI chrome, one slightly warmer

serif or rounded sans for journaling text areas to signal 'this is a

writing space,' not a form. Minimum 16px body text, 1.5 line height.

\- Spacing: generous whitespace, 8px base spacing unit, never more than one

primary action visible per screen.

\- Motion: default to reduced-motion-safe transitions (fades/slides under

200ms), respect system reduced-motion setting without exception.

**SCREENS TO GENERATE**

1\. Onboarding (3 fields: age, gender, role) - one field per screen, progress

dots, skip-able 'why we ask' microcopy under each field.

2\. Session time picker - large time selector, one sentence explaining why a

fixed time helps, 'change anytime in settings' reassurance.

3\. Session home / Start screen - single dominant 'Start today's session'

action, today's streak shown small and secondary, no other navigation

competing for attention.

4\. Slider screen (used twice: pre- and post-session) - 4 vertical or

horizontal sliders (Mood, Mental Noise, Focus, Energy), large touch

targets, live label feedback, optional skip disabled (all 4 required),

soft haptic tick at 25/50/75/100.

5\. Diagnostic question screen (30% phase) - one question at a time, large

text input, gentle progress indicator (dots, not a percentage bar), back

button always available.

6\. Journaling screen (70% phase) - full-bleed writing area, no visible word

count or timer countdown (use an optional subtle elapsed-time indicator

only), prompt text pinned at top in the serif/rounded font, keyboard-

first design.

7\. Session complete screen - before/after slider delta shown as a simple

animated bar or arrow (not a chart), one AI-generated reflection

sentence, current streak, single 'Done' action.

8\. Dashboard (Daily / Weekly / Monthly tabs) - trend lines for the 4

sliders, session count, no leaderboard, no social comparison elements

anywhere in the app.

9\. Crisis resource screen (triggered state) - calm, high-contrast, no

dismiss-and-forget pattern, resource contact info large and tappable,

never auto-navigates away.

**INTERACTION REQUIREMENTS**

\- Every tap/drag gets visible feedback within 100ms.

\- No destructive action (delete entry, reset streak) without a confirm step.

\- Streak breaks are shown neutrally - no red color, no guilt copy, no streak

reset animation that reads as loss.

\- All primary flows must be fully usable with VoiceOver/TalkBack and meet

WCAG 2.2 AA contrast (4.5:1 body text, 3:1 large text/icons).

\- Minimum tap target 44x44pt everywhere.

**OUTPUT FORMAT**

For each screen provide: layout description, component list, copy/

microcopy text, and states (empty, loading, error, filled). If asked for

code, use React + Tailwind, semantic HTML, and aria-labels on all

interactive elements. Do not add screens, navigation items, or gamification

elements not listed above without flagging the addition explicitly.

# 4\. Design Rationale

Each subsection below corresponds to a block in the prompt above and explains the reasoning behind it, drawing on the same UI/UX framework (fundamental principles, psychology, business, interaction design, feedback/gamification, and metrics) used throughout MindProtocol's design process.

## 4.1 Visual Foundation & Brand

| **UI Element / Decision**                          | **Principle Applied**                          | **Why We Use It**                                                                                                                                                                                                                                                             |
| -------------------------------------------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Desaturated teal/blue primary palette**          | _Color theory + emotional design_              | Cooler, low-saturation palettes reduce physiological arousal rather than adding to it - important for an app used specifically when someone's amygdala is already activated. High-chroma colors (bright red/orange) are reserved so they retain meaning when actually needed. |
| **Single warm accent, used only for CTA + streak** | _Visual hierarchy_                             | Reserving the one 'loud' color for exactly two purposes keeps the eye trained on what matters - a diluted accent color loses its signaling power fast.                                                                                                                        |
| **Serif/rounded font for the writing area only**   | _Emotional design (Norman's 'visceral' level)_ | A distinct typeface for the journaling text area signals 'this is a personal writing space' rather than 'this is a form field,' subtly changing how users approach the blank page - consistent with the expressive-writing research emphasizing low performance pressure.     |
| **Reduced-motion-safe transitions by default**     | _Accessibility + trauma-informed design_       | Some users in acute distress are sensory-sensitive; respecting system reduced-motion settings is a hard requirement, not a nice-to-have, in a mental-health context.                                                                                                          |

## 4.2 Screen Structure & Navigation

| **UI Element / Decision**                          | **Principle Applied**                          | **Why We Use It**                                                                                                                                                                                                               |
| -------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Single dominant CTA on the home screen**         | _Simplicity / cognitive load management_       | One primary action per screen minimizes extraneous cognitive load, leaving the user's mental bandwidth for the actual task (germane load) rather than for deciding what to tap.                                                 |
| **No tab bar / minimal navigation**                | _Interaction design for single-core-loop apps_ | MindProtocol is used once daily for one purpose. A multi-tab navigation pattern borrowed from social apps would imply more destinations than the product actually has, adding decision fatigue with no benefit.                 |
| **One field per onboarding screen**                | _Conversion optimization_                      | Every additional field visible at once measurably increases dropout. Splitting three fields across three screens with progress dots keeps completion high while still collecting the data the app needs to personalize prompts. |
| **'Why we ask' microcopy under onboarding fields** | _Trust / transparency_                         | In a category built on sensitive personal disclosure, explaining why data is collected before asking for it builds the trust needed for users to be honest in the diagnostic and journaling phases later.                       |

## 4.3 Session Flow Screens (Sliders, Diagnostic, Journaling)

| **UI Element / Decision**                                    | **Principle Applied**                                        | **Why We Use It**                                                                                                                                                                                   |
| ------------------------------------------------------------ | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **4 sliders, large touch targets, live labels**              | _Fundamental UI principles (responsiveness) + accessibility_ | Fast, tactile, unambiguous feedback keeps this step under the 60-second target stated in the app's own design doc, so it doesn't eat into the 15-minute session budget.                             |
| **Haptic tick at 25/50/75/100**                              | _Micro-interactions_                                         | A small physical confirmation reduces the need to visually double-check a slider's value, lowering effort and speeding up the pre/post-session check-ins.                                           |
| **One diagnostic question per screen, not a form**           | _Cognitive load management_                                  | Answering one short question at a time mirrors a conversation rather than a survey, keeping the emotional register appropriate for someone describing what's bothering them.                        |
| **No visible word count / countdown timer while journaling** | _Emotional design + expressive-writing research_             | Visible timers and counters introduce performance pressure, which the expressive-writing literature identifies as a factor that suppresses the writing engagement needed for the technique to work. |
| **Prompt text pinned in the distinct serif font at the top** | _Visual hierarchy_                                           | Keeping the generated prompt visible (not scrolled away) while writing reduces the chance the user drifts off the intended reflective angle.                                                        |

## 4.4 Feedback, Streaks & Gamification Restraint

| **UI Element / Decision**                                               | **Principle Applied**                                       | **Why We Use It**                                                                                                                                                                                                                                 |
| ----------------------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Before/after slider delta shown as simple bar or arrow, not a chart** | _Feedback mechanisms_                                       | The delta needs to be instantly legible in a few seconds of glance time at the end of a session - a full chart adds interpretation effort exactly when the user's cognitive bandwidth is lowest.                                                  |
| **Streak shown small and secondary, not gamified with points/levels**   | _Business: retention without backfire risk_                 | Streaks work as a habit cue (Fogg's Ability lever), but leaderboard-style or points-heavy gamification reintroduces social-comparison stress - the exact dynamic the app exists to reduce.                                                        |
| **Neutral (non-red) treatment of a broken streak**                      | _Behavioral triggers + self-compassion principle_           | Punitive streak-loss UI (red color, shrinking animation) directly contradicts the 'self-compassion over self-critique' principle already built into the journaling-prompt generator; the UI has to match the same philosophy the prompts espouse. |
| **No social comparison elements anywhere in the app**                   | _Business consideration specific to mental-health category_ | Unlike most habit apps, social proof and comparison are proven-effective growth levers that this product must deliberately forgo - they conflict with the core value proposition.                                                                 |

## 4.5 Crisis Resource Screen

| **UI Element / Decision**                                  | **Principle Applied**                                                       | **Why We Use It**                                                                                                                                                                                                            |
| ---------------------------------------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Reserved high-contrast warning color, calm layout**      | _Safety-critical accessibility_                                             | This is the one screen where visual urgency is appropriate - but 'urgent' still needs to read as 'calm and competent,' not alarming, to avoid adding distress on top of an already acute moment.                             |
| **Large, tappable resource contact info; no auto-dismiss** | _Crisis-handling safeguard (from the prompt-generator's hard safety rules)_ | This mirrors the CRISIS_PROTOCOL_TRIGGERED handoff already defined in the journaling-prompt system prompt - the UI must not let a user accidentally swipe past this screen the way they might dismiss a normal notification. |

## 4.6 Accessibility Baseline

| **UI Element / Decision**                                        | **Principle Applied**                      | **Why We Use It**                                                                                                                                                       |
| ---------------------------------------------------------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **WCAG 2.2 AA contrast ratios (4.5:1 / 3:1)**                    | _Accessibility_                            | This is the practical, testable bar most production apps target; falling short excludes low-vision users entirely rather than degrading their experience.               |
| **44x44pt minimum tap targets**                                  | _Accessibility + motor-impairment support_ | Below this size, tap accuracy drops sharply for users with limited fine motor control, and error-prone taps are especially costly during an emotionally sensitive flow. |
| **Full VoiceOver/TalkBack labeling on all interactive elements** | _Accessibility_                            | Screen-reader users should be able to complete a full session - this cannot be an afterthought given the personal nature of the content being narrated aloud.           |

# 5\. Quick-Reference Summary

If only one page of this report gets reread before a demo or a design review, use this one.

- One primary action per screen - never compete for attention.
- Calm, desaturated palette; one accent color reserved for CTA + streak only.
- Distinct typeface for writing areas - signals reflection, not form-filling.
- No visible timers/counters during journaling - removes performance pressure.
- Streaks are neutral, never punitive - no red, no shrinking, no guilt copy.
- Zero social comparison features anywhere in the app.
- Crisis screen is calm but unmissable - no auto-dismiss, no ambiguity.
- WCAG 2.2 AA minimum across every screen, not just marketing surfaces.

# 6\. Where to Run This Prompt

The prompt in Section 3 is model-agnostic. Free options to test it:

- Google AI Studio (aistudio.google.com) - paste into the system-instructions field; good for testing text-only screen specs.
- Claude.ai - paste as the first message; useful if you want the output as React/Tailwind code via an Artifact.
- v0.dev (Vercel) - paste directly as the build instruction; generates working React components from the same prompt.
- Figma AI / Figma First Draft - best if the goal is an editable visual mockup rather than code.

Regardless of platform, validate the output against Section 4 before treating it as final - an AI generator can easily add a navigation item, a leaderboard, or a countdown timer that looks reasonable in isolation but directly contradicts a rationale documented above.