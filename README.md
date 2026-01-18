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

## 🧠 How the Motion Detection Works

HabPet uses **local computer vision** — no cloud AI, no machine learning models. Everything runs in your browser using standard Web APIs.

### The Algorithm

| Phase | What Happens |
|-------|--------------|
| **Recording** | Captures ~30 frames while you perform your habit during onboarding |
| **Learning** | Compares consecutive frames pixel-by-pixel to build a "motion signature" |
| **Detection** | Webcam frames are compared in real-time using frame-differencing |
| **Matching** | Your live motion is scored against the learned signature |

### Step-by-Step Breakdown

#### 1. Pattern Learning (`learnPatternFromFrames`)
When you record your habit during onboarding:
```
For each pair of consecutive frames:
  1. Load frame onto a 160×120 canvas (downscaled for performance)
  2. Compare RGB values of each pixel to the previous frame
  3. Calculate the average difference → "motion intensity"
  4. Store the sequence of intensities as the pattern
```

The result is a `MotionPattern` object:
```typescript
{
  motionSequence: number[],  // Array of motion values between frames
  avgIntensity: number,      // Average movement strength
  peakMotion: number,        // Highest spike of movement
  duration: number           // Number of frame comparisons
}
```

#### 2. Live Detection (`detectMotion`)
Runs ~60 times per second via `requestAnimationFrame`:
```
1. Capture current webcam frame
2. Compare to previous frame pixel-by-pixel
3. Count pixels where RGB difference > 25 (motion threshold)
4. Calculate: motionScore = (changedPixels / totalPixels) × 100
5. Draw visual overlay based on detection state
```

#### 3. Pattern Matching (`calculatePatternMatch`)
Compares your live motion to the learned pattern:
```
1. Take last 20-30 motion values from history
2. Compare average intensity (within 3× range = match)
3. Compare peak motion (within 4× range = match)
4. Check activity level (>20% of learned intensity = bonus)
5. Weighted combination → matchScore (0-100%)
```

The scoring formula:
```
matchScore = (intensityScore × 0.25) + (peakScore × 0.25) + (activityBonus × 0.5)
```

#### 4. Rep Completion
```
If matchScore >= 99%:
  → Start countdown timer (default 30 seconds)
  
While timer running:
  If matchScore drops below 99%:
    → Pause timer immediately
  
When timer reaches 0:
  → Rep complete! Increment count, trigger confetti
```

### Why Frame Differencing?

Frame differencing is simple but effective for this use case:
- **Fast**: No ML model loading, runs at 60fps
- **Private**: All processing stays in browser
- **Lightweight**: Only compares pixel values, minimal CPU
- **Good enough**: Detects "movement similar to what you recorded"

It's not recognizing *what* you're doing (like pose estimation would), but rather *how much* you're moving and whether that movement *feels similar* to your recording.

## 🏗️ Code Architecture

```
src/
├── pages/
│   └── Index.tsx              # Main app orchestrator
├── hooks/
│   ├── useHabitStore.ts       # State management + localStorage
│   └── useCameraDetection.ts  # All motion detection logic
├── components/
│   ├── CameraView.tsx         # Camera UI + rep timer
│   ├── OnboardingModal.tsx    # Setup wizard + recording
│   ├── StreakDisplay.tsx      # Streak visualization
│   ├── CountdownTimer.tsx     # Daily deadline timer
│   ├── MilestoneCards.tsx     # Achievement cards
│   └── DurationEditor.tsx     # Rep duration settings
└── assets/
    └── habpet-icon.png        # App icon
```

### Data Flow

```
User opens app
       │
       ▼
┌──────────────────┐
│  useHabitStore   │ ◄── localStorage (persistence)
│  - habit data    │
│  - streak count  │
│  - daily records │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│    Index.tsx     │ ◄── Orchestrates everything
└────────┬─────────┘
         │
         ├────────────────────┐
         ▼                    ▼
┌──────────────────┐  ┌──────────────────┐
│  StreakDisplay   │  │   CameraView     │
│  (read-only UI)  │  │   - video feed   │
└──────────────────┘  │   - rep timer    │
                      │   - overlays     │
                      └────────┬─────────┘
                               │
                               ▼
                      ┌──────────────────┐
                      │useCameraDetection│
                      │ - pattern learn  │
                      │ - motion detect  │
                      │ - match scoring  │
                      └──────────────────┘
```

### Key State Management

**useHabitStore** (persisted to localStorage):
```typescript
{
  habit: {
    habitName: string,
    petName: string,
    dailyGoal: number,
    movementDuration: number,
    referenceFrames: string[]  // Base64 encoded
  },
  streak: number,
  longestStreak: number,
  todayCompletedCount: number,
  dailyRecords: DailyRecord[],
  lastCompletedDate: string
}
```

**useCameraDetection** (runtime only):
```typescript
{
  isActive: boolean,      // Camera running?
  motionLevel: number,    // Current motion (0-100)
  matchScore: number,     // Pattern match (0-100)
  patternMatch: boolean,  // Above threshold?
  learnedPattern: MotionPattern | null
}
```

### Streak Logic

```typescript
On rep completion:
  if (todayCompletedCount >= dailyGoal) {
    if (lastCompletedDate === yesterday) {
      streak++  // Continue streak
    } else {
      streak = 1  // Start new streak
    }
  }

On day change:
  if (lastCompletedDate !== yesterday && lastCompletedDate !== today) {
    streak = 0  // Missed a day, reset
  }
```

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

# Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Building for Production

```bash
npm run build
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

The app includes a demo mode for testing streak logic:

- **Skip 24h**: Fast-forward to the next day
- **Reset Demo**: Return to the current real date

Access these controls at the bottom of the main screen.

## 📄 License

MIT License — feel free to use, modify, and distribute.
