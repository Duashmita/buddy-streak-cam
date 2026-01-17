import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight, Zap, Camera, Target, Video, Check, RotateCcw } from 'lucide-react';
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
    id: 'frequency',
    icon: Zap,
    title: 'How many times per day?',
    description: 'Set your daily goal for this habit',
  },
  {
    id: 'calibration',
    icon: Camera,
    title: 'Show me your habit!',
    description: 'Record yourself performing the habit so I can recognize it',
  },
];

export const OnboardingModal = ({ isOpen, onComplete }: OnboardingModalProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [habitName, setHabitName] = useState('');
  const [habitDescription, setHabitDescription] = useState('');
  const [dailyGoal, setDailyGoal] = useState(1);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedFrames, setRecordedFrames] = useState<string[]>([]);
  const [cameraReady, setCameraReady] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Start camera when on calibration step
  useEffect(() => {
    if (currentStep === 3 && isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    
    return () => stopCamera();
  }, [currentStep, isOpen]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraReady(true);
      }
    } catch (error) {
      console.error('Camera error:', error);
    }
  };

  const stopCamera = () => {
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
    setIsRecording(false);
  };

  const startRecording = () => {
    setIsRecording(true);
    setRecordedFrames([]);
    
    let frameCount = 0;
    const maxFrames = 30; // Capture 30 frames over 3 seconds
    
    recordingIntervalRef.current = setInterval(() => {
      if (videoRef.current && canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          canvasRef.current.width = 320;
          canvasRef.current.height = 240;
          ctx.drawImage(videoRef.current, 0, 0, 320, 240);
          const frame = canvasRef.current.toDataURL('image/jpeg', 0.5);
          setRecordedFrames(prev => [...prev, frame]);
        }
      }
      
      frameCount++;
      if (frameCount >= maxFrames) {
        stopRecordingSession();
      }
    }, 100);
  };

  const stopRecordingSession = () => {
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
    setIsRecording(false);
  };

  const resetRecording = () => {
    setRecordedFrames([]);
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete({
        habitName,
        habitDescription,
        dailyGoal,
        referenceFrames: recordedFrames,
        createdAt: new Date().toISOString(),
      });
    }
  };

  const canProceed = () => {
    if (currentStep === 0) return true;
    if (currentStep === 1) return habitName.trim().length > 0;
    if (currentStep === 2) return dailyGoal >= 1 && dailyGoal <= 10;
    if (currentStep === 3) return recordedFrames.length >= 20;
    return true;
  };

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
            className="relative w-full max-w-lg glass-card rounded-3xl p-8 overflow-hidden max-h-[90vh] overflow-y-auto"
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

                {/* Step 0: Welcome */}
                {currentStep === 0 && (
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { icon: '📷', label: 'Camera Learning' },
                      { icon: '🔥', label: 'Daily Streaks' },
                      { icon: '🎯', label: 'Rep Tracking' },
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

                {/* Step 1: Habit Name */}
                {currentStep === 1 && (
                  <div className="space-y-4">
                    <Input
                      placeholder="e.g., Push-ups, Meditation, Reading..."
                      value={habitName}
                      onChange={(e) => setHabitName(e.target.value)}
                      className="bg-muted/50 border-border/50 text-lg h-14 rounded-xl focus:ring-2 focus:ring-primary/50"
                    />
                    <Textarea
                      placeholder="Describe the movement (optional)..."
                      value={habitDescription}
                      onChange={(e) => setHabitDescription(e.target.value)}
                      className="bg-muted/50 border-border/50 min-h-20 rounded-xl focus:ring-2 focus:ring-primary/50 resize-none"
                    />
                    <div className="flex flex-wrap gap-2">
                      {['Push-ups', 'Squats', 'Stretching', 'Meditation'].map((suggestion) => (
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

                {/* Step 2: Frequency */}
                {currentStep === 2 && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-center gap-6">
                      <button
                        onClick={() => setDailyGoal(Math.max(1, dailyGoal - 1))}
                        className="w-14 h-14 rounded-full bg-muted hover:bg-muted/80 text-2xl font-bold transition-colors"
                      >
                        −
                      </button>
                      <div className="text-center">
                        <span className="text-6xl font-display font-bold gradient-text">
                          {dailyGoal}
                        </span>
                        <p className="text-muted-foreground mt-1">
                          {dailyGoal === 1 ? 'time' : 'times'} per day
                        </p>
                      </div>
                      <button
                        onClick={() => setDailyGoal(Math.min(10, dailyGoal + 1))}
                        className="w-14 h-14 rounded-full bg-muted hover:bg-muted/80 text-2xl font-bold transition-colors"
                      >
                        +
                      </button>
                    </div>
                    
                    <div className="flex items-center gap-2 p-4 rounded-xl bg-secondary/10 border border-secondary/20">
                      <Zap className="w-5 h-5 text-secondary shrink-0" />
                      <p className="text-sm text-muted-foreground">
                        Complete all {dailyGoal} {dailyGoal === 1 ? 'rep' : 'reps'} to maintain your streak!
                      </p>
                    </div>
                  </div>
                )}

                {/* Step 3: Calibration */}
                {currentStep === 3 && (
                  <div className="space-y-4">
                    {/* Camera preview */}
                    <div className="relative aspect-video bg-muted/30 rounded-2xl overflow-hidden">
                      <video
                        ref={videoRef}
                        className="absolute inset-0 w-full h-full object-cover"
                        autoPlay
                        muted
                        playsInline
                      />
                      <canvas ref={canvasRef} className="hidden" />
                      
                      {/* Recording indicator */}
                      {isRecording && (
                        <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-destructive/90 text-destructive-foreground text-sm font-medium">
                          <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                          Recording... {Math.round(recordedFrames.length / 30 * 100)}%
                        </div>
                      )}

                      {/* Frame counter */}
                      {recordedFrames.length > 0 && !isRecording && (
                        <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/90 text-success-foreground text-sm font-medium">
                          <Check className="w-4 h-4" />
                          {recordedFrames.length} frames captured
                        </div>
                      )}

                      {/* Corner decorations */}
                      <div className={`absolute inset-0 pointer-events-none transition-colors ${isRecording ? 'border-4 border-destructive/50' : ''}`}>
                        <div className="absolute top-4 left-4 w-12 h-12 border-t-2 border-l-2 border-primary/50 rounded-tl-lg" />
                        <div className="absolute top-4 right-4 w-12 h-12 border-t-2 border-r-2 border-primary/50 rounded-tr-lg" />
                        <div className="absolute bottom-4 left-4 w-12 h-12 border-b-2 border-l-2 border-primary/50 rounded-bl-lg" />
                        <div className="absolute bottom-4 right-4 w-12 h-12 border-b-2 border-r-2 border-primary/50 rounded-br-lg" />
                      </div>
                    </div>

                    {/* Controls */}
                    <div className="flex gap-3">
                      {recordedFrames.length === 0 ? (
                        <Button
                          onClick={startRecording}
                          disabled={!cameraReady || isRecording}
                          className="flex-1 h-12 rounded-xl bg-destructive hover:bg-destructive/90"
                        >
                          <Video className="w-5 h-5 mr-2" />
                          {isRecording ? 'Recording...' : 'Start Recording (3s)'}
                        </Button>
                      ) : (
                        <>
                          <Button
                            onClick={resetRecording}
                            variant="outline"
                            className="h-12 rounded-xl"
                          >
                            <RotateCcw className="w-5 h-5 mr-2" />
                            Redo
                          </Button>
                          <Button
                            onClick={handleNext}
                            className="flex-1 h-12 rounded-xl bg-gradient-to-r from-primary via-accent to-secondary"
                          >
                            <Check className="w-5 h-5 mr-2" />
                            Looks Good!
                          </Button>
                        </>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground text-center">
                      Position yourself in view and perform your habit movement. 
                      I'll learn to recognize it!
                    </p>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Actions */}
            {currentStep !== 3 && (
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
                  Continue
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
