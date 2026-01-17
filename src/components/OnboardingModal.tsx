import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight, Zap, Camera, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { HabitData } from '@/hooks/useHabitStore';

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: (habit: HabitData) => void;
}

const steps = [
  {
    id: 'welcome',
    icon: Sparkles,
    title: 'Welcome to Habit Buddy',
    description: 'Your AI-powered companion for building consistent habits',
  },
  {
    id: 'habit',
    icon: Target,
    title: 'What habit would you like to keep consistent?',
    description: 'Enter the habit you want to track daily',
  },
  {
    id: 'illustration',
    icon: Camera,
    title: 'Illustrate your habit',
    description: 'Describe the physical action so our AI can recognize when you perform it',
  },
];

export const OnboardingModal = ({ isOpen, onComplete }: OnboardingModalProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [habitName, setHabitName] = useState('');
  const [habitDescription, setHabitDescription] = useState('');

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Complete onboarding
      onComplete({
        habitName,
        habitDescription,
        habitIllustration: habitDescription,
        createdAt: new Date().toISOString(),
      });
    }
  };

  const canProceed = () => {
    if (currentStep === 0) return true;
    if (currentStep === 1) return habitName.trim().length > 0;
    if (currentStep === 2) return habitDescription.trim().length > 0;
    return true;
  };

  const placeholderExamples = [
    "e.g., Morning stretching routine",
    "e.g., 20 push-ups",
    "e.g., Meditation for 5 minutes",
    "e.g., Practice guitar",
    "e.g., Read for 15 minutes",
  ];

  const illustrationExamples = [
    "I stand up straight, raise my arms above my head, then bend forward to touch my toes",
    "I get into plank position, lower my body, then push back up",
    "I sit cross-legged with my hands on my knees, eyes closed",
    "I hold the guitar and move my fingers on the fretboard",
    "I sit with a book open in front of me, turning pages",
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-background/80 backdrop-blur-xl"
          />
          
          {/* Glow effects */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-3xl" />
          </div>

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-lg glass-card rounded-3xl p-8 overflow-hidden"
          >
            {/* Progress bar */}
            <div className="flex gap-2 mb-8">
              {steps.map((_, index) => (
                <motion.div
                  key={index}
                  className="h-1 flex-1 rounded-full overflow-hidden bg-muted"
                >
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: index <= currentStep ? '100%' : '0%' }}
                    transition={{ duration: 0.3 }}
                    className="h-full bg-gradient-to-r from-primary via-accent to-secondary"
                  />
                </motion.div>
              ))}
            </div>

            {/* Step content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                {/* Icon */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1, type: 'spring' }}
                  className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center glow-primary"
                >
                  {(() => {
                    const Icon = steps[currentStep].icon;
                    return <Icon className="w-8 h-8 text-primary" />;
                  })()}
                </motion.div>

                {/* Title */}
                <div>
                  <h2 className="text-2xl font-display font-bold text-foreground mb-2">
                    {steps[currentStep].title}
                  </h2>
                  <p className="text-muted-foreground">
                    {steps[currentStep].description}
                  </p>
                </div>

                {/* Inputs based on step */}
                {currentStep === 1 && (
                  <div className="space-y-4">
                    <Input
                      placeholder={placeholderExamples[Math.floor(Math.random() * placeholderExamples.length)]}
                      value={habitName}
                      onChange={(e) => setHabitName(e.target.value)}
                      className="bg-muted/50 border-border/50 text-lg h-14 rounded-xl focus:ring-2 focus:ring-primary/50"
                    />
                    <div className="flex flex-wrap gap-2">
                      {['Exercise', 'Meditation', 'Reading', 'Practice'].map((suggestion) => (
                        <button
                          key={suggestion}
                          onClick={() => setHabitName(suggestion)}
                          className="px-3 py-1.5 text-sm rounded-full bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {currentStep === 2 && (
                  <div className="space-y-4">
                    <Textarea
                      placeholder={illustrationExamples[Math.floor(Math.random() * illustrationExamples.length)]}
                      value={habitDescription}
                      onChange={(e) => setHabitDescription(e.target.value)}
                      className="bg-muted/50 border-border/50 min-h-32 rounded-xl focus:ring-2 focus:ring-primary/50 resize-none"
                    />
                    <div className="flex items-start gap-3 p-4 rounded-xl bg-secondary/10 border border-secondary/20">
                      <Zap className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
                      <p className="text-sm text-muted-foreground">
                        <strong className="text-foreground">Pro tip:</strong> Be specific about your body movements. 
                        The camera will detect when you perform this action to mark your habit complete.
                      </p>
                    </div>
                  </div>
                )}

                {currentStep === 0 && (
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { icon: '📷', label: 'Camera Tracking' },
                      { icon: '🔥', label: 'Streak Building' },
                      { icon: '🏆', label: 'Milestones' },
                    ].map((feature) => (
                      <div
                        key={feature.label}
                        className="p-4 rounded-xl bg-muted/30 text-center"
                      >
                        <span className="text-2xl mb-2 block">{feature.icon}</span>
                        <span className="text-xs text-muted-foreground">{feature.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-8"
            >
              <Button
                onClick={handleNext}
                disabled={!canProceed()}
                className="w-full h-14 rounded-xl text-lg font-semibold bg-gradient-to-r from-primary via-accent to-secondary hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {currentStep === steps.length - 1 ? (
                  <>
                    Start Tracking
                    <Sparkles className="w-5 h-5 ml-2" />
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
