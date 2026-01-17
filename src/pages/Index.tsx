import { useEffect } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useHabitStore } from '@/hooks/useHabitStore';
import { OnboardingModal } from '@/components/OnboardingModal';
import { HabitHeader } from '@/components/HabitHeader';
import { CountdownTimer } from '@/components/CountdownTimer';
import { StreakDisplay } from '@/components/StreakDisplay';
import { CameraView } from '@/components/CameraView';
import { MilestoneCards } from '@/components/MilestoneCards';

const Index = () => {
  const {
    habit,
    streak,
    longestStreak,
    todayCompleted,
    setHabit,
    markTodayComplete,
    resetHabit,
  } = useHabitStore();

  const handleActionDetected = () => {
    markTodayComplete();
    
    // Trigger confetti celebration
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#a855f7', '#ec4899', '#00d4aa'],
    });
  };

  // Check for streak break on load
  useEffect(() => {
    // Future: could add logic to check if streak should reset
  }, []);

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
        <CountdownTimer todayCompleted={todayCompleted} />

        {/* Main grid */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left column - Streak */}
          <StreakDisplay
            streak={streak}
            longestStreak={longestStreak}
            todayCompleted={todayCompleted}
          />

          {/* Right column - Camera */}
          <CameraView
            habitDescription={habit.habitDescription}
            onActionDetected={handleActionDetected}
            todayCompleted={todayCompleted}
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

        {/* Manual check-in button (fallback) */}
        {!todayCompleted && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center"
          >
            <button
              onClick={handleActionDetected}
              className="px-6 py-3 rounded-2xl bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors text-sm"
            >
              Camera not working? Click here for manual check-in
            </button>
          </motion.div>
        )}

        {/* Footer */}
        <footer className="text-center text-sm text-muted-foreground pt-8 pb-4">
          <p>Built with AI-powered pose detection • Keep showing up! 🔥</p>
        </footer>
      </div>
    </div>
  );
};

export default Index;
