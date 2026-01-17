import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, CameraOff, Loader2, Check, AlertCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCameraDetection } from '@/hooks/useCameraDetection';

interface CameraViewProps {
  habitDescription: string;
  referenceFrames: string[];
  dailyGoal: number;
  completedCount: number;
  onActionDetected: () => void;
}

export const CameraView = ({ 
  habitDescription, 
  referenceFrames,
  dailyGoal,
  completedCount,
  onActionDetected,
}: CameraViewProps) => {
  const {
    videoRef,
    canvasRef,
    state,
    motionHistory,
    startCamera,
    stopCamera,
    startDetection,
  } = useCameraDetection(referenceFrames || []);

  const [countdown, setCountdown] = useState<number | null>(null);
  const [justCompleted, setJustCompleted] = useState(false);
  const [detectionProgress, setDetectionProgress] = useState(0);

  const isAllComplete = completedCount >= dailyGoal;

  // Start detection when camera is active
  useEffect(() => {
    if (state.isActive && !state.isLoading) {
      startDetection();
    }
  }, [state.isActive, state.isLoading, startDetection]);

  // Monitor motion for sustained activity with matching
  useEffect(() => {
    if (isAllComplete || justCompleted) return;

    const recentMotion = motionHistory.slice(-20);
    if (recentMotion.length < 10) return;

    const avgMotion = recentMotion.reduce((a, b) => a + b, 0) / recentMotion.length;
    
    // Combine motion and match score for detection
    const combinedScore = avgMotion * (1 + state.matchScore / 100);
    const progress = Math.min(combinedScore / 20, 1) * 100;
    
    setDetectionProgress(progress);

    // Trigger when enough motion is detected with good matching
    const hasEnoughMotion = avgMotion > 8;
    const hasGoodMatch = state.matchScore > 30 || !referenceFrames || referenceFrames.length === 0;
    const sustainedActivity = recentMotion.filter(m => m > 6).length > 12;

    if (hasEnoughMotion && hasGoodMatch && sustainedActivity) {
      if (countdown === null) {
        setCountdown(3);
      }
    } else {
      setCountdown(null);
    }
  }, [motionHistory, state.matchScore, isAllComplete, justCompleted, countdown, referenceFrames]);

  // Countdown timer
  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      setJustCompleted(true);
      onActionDetected();
      
      // Reset after 2 seconds to allow next rep
      setTimeout(() => {
        setJustCompleted(false);
        setDetectionProgress(0);
      }, 2000);
      setCountdown(null);
      return;
    }

    const timer = setTimeout(() => {
      setCountdown(countdown - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, onActionDetected]);

  const handleToggleCamera = async () => {
    if (state.isActive) {
      stopCamera();
    } else {
      await startCamera();
    }
  };

  return (
    <div className="glass-card rounded-3xl overflow-hidden">
      {/* Header with rep counter */}
      <div className="p-6 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${state.isActive ? 'bg-success animate-pulse' : 'bg-muted'}`} />
            <h3 className="font-display font-semibold text-lg">Habit Camera</h3>
          </div>
          
          {/* Rep counter */}
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-2xl font-display font-bold">
                <span className={completedCount > 0 ? 'text-success' : 'text-foreground'}>
                  {completedCount}
                </span>
                <span className="text-muted-foreground">/{dailyGoal}</span>
              </div>
              <p className="text-xs text-muted-foreground">Today's reps</p>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleCamera}
              className="rounded-xl"
            >
              {state.isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : state.isActive ? (
                <CameraOff className="w-4 h-4" />
              ) : (
                <Camera className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Tracking: <span className="text-foreground">{habitDescription}</span>
        </p>
      </div>

      {/* Camera Feed */}
      <div className="relative aspect-video bg-muted/30">
        {state.isActive ? (
          <>
            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-cover"
              autoPlay
              muted
              playsInline
            />
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full object-cover pointer-events-none opacity-50"
            />
            
            {/* Detection overlay */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Corner decorations */}
              <div className="absolute top-4 left-4 w-12 h-12 border-t-2 border-l-2 border-primary/50 rounded-tl-lg" />
              <div className="absolute top-4 right-4 w-12 h-12 border-t-2 border-r-2 border-primary/50 rounded-tr-lg" />
              <div className="absolute bottom-4 left-4 w-12 h-12 border-b-2 border-l-2 border-primary/50 rounded-bl-lg" />
              <div className="absolute bottom-4 right-4 w-12 h-12 border-b-2 border-r-2 border-primary/50 rounded-br-lg" />

              {/* Status badge */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2">
                <div className="px-4 py-2 rounded-full bg-background/80 backdrop-blur-sm text-sm font-medium flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${state.motionLevel > 5 ? 'bg-success' : 'bg-warning'}`} />
                  {state.motionLevel > 5 ? 
                    (state.matchScore > 40 ? 'Habit Recognized!' : 'Motion Detected') : 
                    'Waiting for movement...'}
                </div>
              </div>

              {/* Match indicator */}
              {referenceFrames.length > 0 && state.motionLevel > 3 && (
                <div className="absolute top-14 left-1/2 -translate-x-1/2">
                  <div className="px-3 py-1 rounded-full bg-background/60 backdrop-blur-sm text-xs flex items-center gap-2">
                    <Sparkles className="w-3 h-3 text-accent" />
                    Match: {Math.round(state.matchScore)}%
                  </div>
                </div>
              )}

              {/* Motion level indicator */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-48">
                <div className="h-2 bg-background/50 rounded-full overflow-hidden backdrop-blur-sm">
                  <motion.div
                    className="h-full bg-gradient-to-r from-primary via-accent to-secondary"
                    animate={{ width: `${Math.min(state.motionLevel * 3, 100)}%` }}
                  />
                </div>
              </div>

              {/* Countdown overlay */}
              <AnimatePresence>
                {countdown !== null && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm"
                  >
                    <motion.div
                      key={countdown}
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 1.5, opacity: 0 }}
                      className="text-8xl font-display font-bold gradient-text"
                    >
                      {countdown}
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Just completed overlay */}
              <AnimatePresence>
                {justCompleted && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 flex flex-col items-center justify-center bg-success/20 backdrop-blur-sm"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', damping: 15 }}
                      className="w-24 h-24 rounded-full bg-success flex items-center justify-center mb-4"
                    >
                      <Check className="w-12 h-12 text-success-foreground" />
                    </motion.div>
                    <motion.p
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-2xl font-display font-bold text-success"
                    >
                      {completedCount + 1}/{dailyGoal} Complete!
                    </motion.p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* All complete overlay */}
              <AnimatePresence>
                {isAllComplete && !justCompleted && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 flex flex-col items-center justify-center bg-success/20 backdrop-blur-sm"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', damping: 15 }}
                      className="text-6xl mb-4"
                    >
                      🎉
                    </motion.div>
                    <p className="text-2xl font-display font-bold text-success">
                      All {dailyGoal} reps done!
                    </p>
                    <p className="text-success/80 mt-1">See you tomorrow!</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            {state.error ? (
              <>
                <AlertCircle className="w-12 h-12 text-destructive" />
                <p className="text-destructive text-center px-8">{state.error}</p>
              </>
            ) : (
              <>
                <Camera className="w-12 h-12 text-muted-foreground" />
                <p className="text-muted-foreground text-center px-8">
                  Enable camera to track your habit automatically
                </p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Detection Progress */}
      {state.isActive && !isAllComplete && !justCompleted && (
        <div className="p-4 border-t border-border/50">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">Action Detection</span>
            <span className="font-medium">{Math.round(detectionProgress)}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-primary via-accent to-secondary"
              animate={{ width: `${detectionProgress}%` }}
              transition={{ type: 'spring', damping: 25 }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Perform your habit movement to complete rep {completedCount + 1} of {dailyGoal}
          </p>
        </div>
      )}
    </div>
  );
};
