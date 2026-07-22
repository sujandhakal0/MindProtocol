# MindProtocol

A daily 15-minute mental-reset journaling app for college students and early-career professionals. Guided AI-powered sessions help you check in with yourself, name what you're feeling, and leave with a small shift.

Built for a 2026 hackathon. Designed with trauma-informed UX principles. Private by default — all data stays on your device.

## Features

- **Guided Daily Sessions** — Structured 5-step flow: mood sliders, diagnostic conversation, journaling prompts, post-session sliders, and reflection
- **AI-Powered Prompts** — Groq-hosted LLM generates personalized journaling prompts based on your responses
- **Crisis Detection** — Dual-layer safety: local keyword matching + LLM classifier with Nepal-specific hotlines and therapist directory
- **Voice Input** — Speech-to-text via Web Speech API (web) and `@react-native-voice/voice` (native)
- **Ambient Audio** — 4 bundled lo-fi tracks with play/pause toggle during journaling
- **Insights Dashboard** — Daily, weekly, and monthly trend views with streak tracking
- **Cross-Platform** — iOS, Android, and Web via Expo

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Expo ~57, React Native 0.86, React 19 |
| Language | TypeScript 6.0 |
| Routing | Expo Router (file-based) |
| State | Zustand |
| Storage | expo-sqlite (native), localStorage (web) |
| AI | Groq API (`llama-3.3-70b-versatile`, `llama-3.1-8b-instant`) |
| HTTP | Axios |
| Audio | expo-av |
| Voice | @react-native-voice/voice, Web Speech API |
| Notifications | expo-notifications (local daily) |
| Animations | react-native-reanimated, react-native-gesture-handler |

## Project Structure

```
MindProtocol/
├── app/                          # Expo application
│   ├── constants/
│   │   ├── theme.ts              # Colors, spacing, shadows, fonts
│   │   └── systemPrompt.ts       # AI prompts (journaling, crisis, follow-up, reflection)
│   ├── data/
│   │   └── therapists.ts         # Nepal-based therapist directory
│   ├── lib/
│   │   ├── db.ts                 # Database entry point
│   │   ├── db.native.ts          # SQLite layer (iOS/Android)
│   │   ├── db.web.ts             # localStorage fallback
│   │   ├── groq.ts               # Groq API integration
│   │   ├── notifications.ts      # Local push notification scheduling
│   │   └── useVoiceInput.ts      # Cross-platform speech-to-text hook
│   ├── stores/
│   │   ├── userStore.ts          # User profile state
│   │   └── sessionStore.ts       # Current session state
│   └── app/                      # Expo Router screens
│       ├── _layout.tsx           # Root layout (DB init, auth, notifications)
│       ├── index.tsx             # Entry: onboarding or tabs
│       ├── onboarding.tsx        # 3-step onboarding flow
│       ├── session-time.tsx      # Daily reminder time picker
│       ├── crisis.tsx            # Crisis resources screen
│       └── (tabs)/
│           ├── index.tsx         # Home — "Start today's session"
│           ├── session.tsx       # Full session flow (5 steps)
│           └── dashboard.tsx     # Insights dashboard
├── logo/                         # Branding assets
├── audio/                        # Ambient audio tracks
└── uidessign.md                  # UI/UX design rationale
```

## Getting Started

### Prerequisites

- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- For iOS: Xcode + CocoaPods
- For Android: Android Studio + SDK
- For Web: modern browser (Chrome/Edge for voice input)

### Installation

```bash
git clone git@github.com:sujandhakal0/MindProtocol.git
cd MindProtocol/app
npm install
```

### Environment Variables

Create `app/.env` with your Groq API key:

```
EXPO_PUBLIC_GROQ_API_KEY=gsk_your_key_here
```

Get a free API key at [console.groq.com](https://console.groq.com).

### Run

```bash
# From the app/ directory

npm start          # Expo dev server (QR code)
npm run ios        # iOS simulator
npm run android    # Android emulator
npm run web        # Browser
```

## How It Works

### Session Flow

1. **Pre-Session Sliders** — Rate mood, mental noise, focus, and energy (0–100)
2. **Diagnostic Conversation** — Answer 4 progressive deepening questions with AI follow-ups
3. **Journaling** — Write through 3 AI-generated prompts (Externalize → Name → Reframe)
4. **Post-Session Sliders** — Re-rate the same metrics
5. **Completion** — View your shift and receive an AI-generated reflection

### AI Architecture

| Prompt | Model | Purpose |
|---|---|---|
| Journaling Prompts | `llama-3.3-70b-versatile` | Generate 3 progressive writing prompts |
| Crisis Check | `llama-3.1-8b-instant` | Binary SAFE/CRISIS classifier |
| Follow-up Questions | `llama-3.1-8b-instant` | Adaptive diagnostic deepening |
| Session Reflection | `llama-3.1-8b-instant` | Post-session summary sentence |

### Safety

- **Local keyword detection** runs instantly without network for suicidal ideation, self-harm, hopelessness, and violence keywords
- **LLM classifier** catches ambiguous distress the keywords miss
- **Crisis screen** shows Nepal-specific hotlines (Samaritans Nepal, TPO Nepal, Mental Health Nepal) and 5 therapist listings with contact info and pricing
- No gamification, no social features, no performance pressure

### Data

- **iOS/Android**: SQLite database (`mindprotocol.db`) with tables for user profile, sessions, and streaks
- **Web**: localStorage with identical API
- **Nothing leaves the device** — all AI calls are stateless (no user data sent to Groq beyond the current message)

## Design Principles

- **Trauma-informed** — No guilt copy for missed days, no visible word counts or timers, reduced-motion-safe
- **One action per screen** — Minimized cognitive load throughout
- **WCAG 2.2 AA** — 4.5:1 contrast ratios, 44x44pt tap targets, screen reader support
- **Desaturated palette** — Calming teal/blue primary with a single warm accent for CTAs

## License

MIT — see [app/LICENSE](app/LICENSE)

## Author

Sujan Dhakal
