import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, CameraOff, Loader2, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCameraDetection } from '@/hooks/useCameraDetection';

interface CameraViewProps {
  habitDescription: string;
  onActionDetected: () => void;
  todayCompleted: boolean;
}

export const CameraView = ({ habitDescription, onActionDetected, todayCompleted }: CameraViewProps) => {
  const {
    videoRef,
    canvasRef,
    state,
    motionHistory,
    startCamera,
    stopCamera,
    startDetection,
  } = useCameraDetection();

  const [hasTriggered, setHasTriggered] = useState(false);
  const [detectionProgress, setDetectionProgress] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);

  // Start detection when camera is active
  useEffect(() => {
    if (state.isActive && !state.isLoading) {
      startDetection();
    }
  }, [state.isActive, state.isLoading, startDetection]);

  // Monitor motion for sustained activity
  useEffect(() => {
    if (todayCompleted || hasTriggered) return;

    const recentMotion = motionHistory.slice(-20);
    if (recentMotion.length < 10) return;

    const avgMotion = recentMotion.reduce((a, b) => a + b, 0) / recentMotion.length;
    const progress = Math.min(avgMotion / 15, 1) * 100;
    
    setDetectionProgress(progress);

    // If sustained high motion detected (>10% of pixels changing consistently)
    if (avgMotion > 10 && recentMotion.filter(m => m > 8).length > 15) {
      if (countdown === null) {
        setCountdown(3);
      }
    } else {
      setCountdown(null);
    }
  }, [motionHistory, todayCompleted, hasTriggered, countdown]);

  // Countdown timer
  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      setHasTriggered(true);
      onActionDetected();
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
      {/* Header */}
      <div className="p-6 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${state.isActive ? 'bg-success animate-pulse' : 'bg-muted'}`} />
            <h3 className="font-display font-semibold text-lg">Habit Camera</h3>
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
              <>
                <CameraOff className="w-4 h-4 mr-2" />
                Stop
              </>
            ) : (
              <>
                <Camera className="w-4 h-4 mr-2" />
                Start
              </>
            )}
          </Button>
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
                  {state.motionLevel > 5 ? 'Motion Detected' : 'Waiting for movement...'}
                </div>
              </div>

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
                      {countdown === 0 ? '✓' : countdown}
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Completed overlay */}
              <AnimatePresence>
                {(todayCompleted || hasTriggered) && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 flex items-center justify-center bg-success/20 backdrop-blur-sm"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', damping: 15 }}
                      className="w-24 h-24 rounded-full bg-success flex items-center justify-center"
                    >
                      <Check className="w-12 h-12 text-success-foreground" />
                    </motion.div>
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
      {state.isActive && !todayCompleted && !hasTriggered && (
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
            Move around and perform your habit for a few seconds to complete today's goal
          </p>
        </div>
      )}
    </div>
  );
};
