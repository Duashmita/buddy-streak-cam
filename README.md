# HabPet 🐾

A habit tracking app that uses your webcam to detect when you complete your daily habits through motion recognition. Build streaks, stay accountable, and keep your virtual pet happy!

## ✨ Features

- **Motion-Based Habit Tracking** — Record yourself doing a habit, then the app recognizes when you repeat it
- **Streak System** — Build consecutive day streaks with visual progress
- **Daily Goals** — Set multiple reps per day (e.g., 3 sets of pushups)
- **Countdown Timer** — Each rep requires holding the movement for a configurable duration
- **Confetti Celebrations** — Visual rewards when you complete reps
- **Offline First** — All data stored locally in your browser
- **Privacy Focused** — No video is ever uploaded; everything runs locally

## 🧠 How It Works

HabPet uses **local computer vision** — no cloud AI, no machine learning models. Everything runs in your browser using standard Web APIs.

### The Algorithm

| Phase | What Happens |
|-------|--------------|
| **Recording** | Captures ~30 frames while you perform your habit during onboarding |
| **Learning** | Compares consecutive frames pixel-by-pixel to build a "motion signature" (intensity, peaks, duration) |
| **Detection** | Webcam frames are compared in real-time using the same frame-differencing technique |
| **Matching** | Your live motion is scored against the learned signature based on intensity and peak similarity |

### Technical Details

- **Frame Differencing**: Compares RGB pixel values between consecutive frames; pixels with >25 difference in any channel count as "changed"
- **Motion Score**: Percentage of changed pixels (sampled every 16th pixel for performance)
- **Pattern Matching**: Lenient comparison — requires ~20% of learned intensity and rough similarity to peaks
- **Match Threshold**: >40% similarity score + active motion = pattern detected; 99%+ starts the rep timer
- **Performance**: Runs at ~60fps using `requestAnimationFrame`, processes downscaled frames

### Privacy

All processing happens locally in your browser. Video frames are never uploaded or stored permanently. Reference frames are saved as base64 in localStorage for pattern matching only.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                           Index.tsx                             │
│                    (Main Page / Orchestrator)                   │
├─────────────────────────────────────────────────────────────────┤
│  useHabitStore()          │           CameraView.tsx            │
│  - Habit data             │           - Video/canvas refs       │
│  - Streak tracking        │           - UI overlays             │
│  - Daily records          │           - Rep timer               │
│  - LocalStorage sync      │                 │                   │
│         │                 │                 ▼                   │
│         ▼                 │      useCameraDetection()           │
│  OnboardingModal          │      - Frame differencing           │
│  - Habit setup            │      - Pattern learning             │
│  - Reference recording    │      - Motion matching              │
└─────────────────────────────────────────────────────────────────┘
```

### Key Files

| File | Purpose |
|------|---------|
| `src/pages/Index.tsx` | Main app page, orchestrates all components |
| `src/hooks/useHabitStore.ts` | State management, streak logic, localStorage persistence |
| `src/hooks/useCameraDetection.ts` | Camera access, motion detection, pattern matching |
| `src/components/CameraView.tsx` | Camera UI, rep timer, completion overlays |
| `src/components/OnboardingModal.tsx` | First-time setup and motion recording |
| `src/components/StreakDisplay.tsx` | Streak visualization |

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ or Bun
- A device with a webcam
- A modern browser (Chrome, Firefox, Safari, Edge)

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd habpet

# Install dependencies
npm install
# or
bun install

# Start development server
npm run dev
# or
bun dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Building for Production

```bash
npm run build
# or
bun run build
```

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| **React 18** | UI framework |
| **TypeScript** | Type safety |
| **Vite** | Build tool & dev server |
| **Tailwind CSS** | Styling |
| **Framer Motion** | Animations |
| **shadcn/ui** | UI components |
| **canvas-confetti** | Celebration effects |
| **date-fns** | Date formatting |

## 📱 Browser Support

- ✅ Chrome (recommended)
- ✅ Firefox
- ✅ Safari
- ✅ Edge
- ⚠️ Mobile browsers (camera access may vary)

## 🎮 Demo Mode

The app includes a demo mode for testing:

- **Skip 24h**: Fast-forward to the next day to test streak logic
- **Reset Demo**: Return to the current real date

Access these controls at the bottom of the main screen.

## 🔧 Configuration

### Movement Duration

Adjust how long you need to hold a movement to complete a rep (default: 30 seconds). Click the duration editor below the camera view.

### Daily Goal

Set during onboarding. To change, reset your habit and start fresh.

## 🌐 Deployment

### Using Lovable

Simply open your [Lovable Project](https://lovable.dev) and click on **Share → Publish**.

### Custom Domain

To connect a domain, navigate to **Project → Settings → Domains** and click **Connect Domain**.

Read more: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

## 📄 License

MIT License — feel free to use, modify, and distribute.

## 🤝 Contributing

Contributions welcome! Please open an issue first to discuss proposed changes.

---

Built with ❤️ using [Lovable](https://lovable.dev)
