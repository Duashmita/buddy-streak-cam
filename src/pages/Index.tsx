import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useHabitStore } from '@/hooks/useHabitStore';
import { OnboardingModal } from '@/components/OnboardingModal';
import { HabitHeader } from '@/components/HabitHeader';
import { CountdownTimer } from '@/components/CountdownTimer';
import { StreakDisplay } from '@/components/StreakDisplay';
import { CameraView } from '@/components/CameraView';
import { MilestoneCards } from '@/components/MilestoneCards';
import { DurationEditor } from '@/components/DurationEditor';

const Index = () => {
  const {
    habit,
    streak,
    longestStreak,
    todayCompletedCount,
    setHabit,
    updateMovementDuration,
    recordCompletion,
    isTodayComplete,
    resetHabit,
    handleDeadlineExpired,
  } = useHabitStore();

  const [shouldStopCamera, setShouldStopCamera] = useState(false);

  const handleActionDetected = () => {
    const wasComplete = isTodayComplete();
    recordCompletion();
    
    // Trigger confetti for each rep
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.7 },
      colors: ['#a855f7', '#ec4899', '#00d4aa'],
    });

    // Extra confetti when completing all reps
    if (!wasComplete && habit && todayCompletedCount + 1 >= habit.dailyGoal) {
      setTimeout(() => {
        confetti({
          particleCount: 150,
          spread: 100,
          origin: { y: 0.5 },
          colors: ['#a855f7', '#ec4899', '#00d4aa', '#fbbf24'],
        });
      }, 300);
    }
  };

  if (!habit) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        {/* Background effects */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-secondary/20 rounded-full blur-[100px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-accent/10 rounded-full blur-[80px]" />
        </div>
        
        <OnboardingModal isOpen={true} onComplete={setHabit} />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-secondary/10 rounded-full blur-[100px]" />
      </div>

      {/* Main content */}
      <div className="relative max-w-6xl mx-auto p-6 space-y-8">
        <HabitHeader habitName={habit.habitName} onReset={resetHabit} />

        {/* Countdown Timer */}
        <CountdownTimer 
          dailyGoal={habit.dailyGoal} 
          completedCount={todayCompletedCount}
          onDeadlineExpired={() => {
            handleDeadlineExpired();
            setShouldStopCamera(true);
          }}
        />

        {/* Main grid */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left column - Streak */}
          <StreakDisplay
            streak={streak}
            longestStreak={longestStreak}
            dailyGoal={habit.dailyGoal}
            completedCount={todayCompletedCount}
          />

          {/* Right column - Camera */}
          <CameraView
            habitDescription={habit.habitDescription || habit.habitName}
            referenceFrames={habit.referenceFrames}
            dailyGoal={habit.dailyGoal}
            completedCount={todayCompletedCount}
            movementDuration={habit.movementDuration}
            shouldStopCamera={shouldStopCamera}
            onActionDetected={handleActionDetected}
          />
        </div>

        {/* Milestones */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <MilestoneCards streak={streak} />
        </motion.section>

        {/* Action buttons */}
        {!isTodayComplete() && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <button
              onClick={handleActionDetected}
              className="px-6 py-3 rounded-2xl bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors text-sm"
            >
              Camera not working? Click for manual check-in ({todayCompletedCount + 1}/{habit.dailyGoal})
            </button>
            
            {/* Save & Leave button - only show if at least 1 rep done */}
            {todayCompletedCount >= 1 && (
              <button
                onClick={() => {
                  // Stop camera and scroll up
                  setShouldStopCamera(true);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="px-6 py-3 rounded-2xl bg-success/20 hover:bg-success/30 text-success hover:text-success transition-colors text-sm border border-success/30"
              >
                ✓ Save {todayCompletedCount} rep{todayCompletedCount > 1 ? 's' : ''} & take a break
              </button>
            )}
          </motion.div>
        )}

        {/* Duration Editor */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex justify-center"
        >
          <DurationEditor
            currentDuration={habit.movementDuration}
            onDurationChange={updateMovementDuration}
          />
        </motion.div>

        {/* Footer */}
        <footer className="text-center text-sm text-muted-foreground pt-8 pb-4">
          <p>Built with AI-powered motion detection • Keep showing up! 🔥</p>
        </footer>
      </div>
    </div>
  );
};

export default Index;
