import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, CameraOff, Loader2, Check, AlertCircle, Sparkles, Brain } from 'lucide-react';
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
  const safeReferenceFrames = useMemo(() => referenceFrames || [], [referenceFrames]);
  
  const {
    videoRef,
    canvasRef,
    state,
    motionHistory,
    startCamera,
    stopCamera,
    startDetection,
    hasLearnedPattern,
  } = useCameraDetection(safeReferenceFrames);

  const [countdown, setCountdown] = useState<number | null>(null);
  const [justCompleted, setJustCompleted] = useState(false);
  const [matchStreak, setMatchStreak] = useState(0);

  const isAllComplete = completedCount >= dailyGoal;

  // Cleanup camera on unmount only - don't auto-start
  useEffect(() => {
    return () => {
      console.log('[CameraView] Cleanup - stopping camera');
      stopCamera();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle manual camera start
  const handleStartCamera = async () => {
    console.log('[CameraView] Manual camera start requested');
    const success = await startCamera();
    console.log('[CameraView] Camera start result:', success);
    
    if (success) {
      console.log('[CameraView] Starting detection...');
      startDetection();
    }
  };

  // Track consecutive pattern matches
  useEffect(() => {
    if (state.patternMatch) {
      setMatchStreak(prev => prev + 1);
    } else {
      setMatchStreak(0);
    }
  }, [state.patternMatch]);

  // Monitor for sustained pattern matching to trigger completion
  useEffect(() => {
    if (isAllComplete || justCompleted) return;

    // Much easier to trigger - only need ~1 second of matching
    if (matchStreak > 10 && state.matchScore > 35) {
      if (countdown === null) {
        setCountdown(3);
      }
    } else if (matchStreak < 5) {
      setCountdown(null);
    }
  }, [matchStreak, state.matchScore, isAllComplete, justCompleted, countdown]);

  // Countdown timer
  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      setJustCompleted(true);
      setMatchStreak(0);
      onActionDetected();
      
      // Reset after 2 seconds to allow next rep
      setTimeout(() => {
        setJustCompleted(false);
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
      await handleStartCamera();
    }
  };

  const getStatusMessage = () => {
    if (!hasLearnedPattern && safeReferenceFrames.length === 0) {
      return { text: 'No pattern learned - any motion works', color: 'text-muted-foreground' };
    }
    if (state.patternMatch) {
      return { text: '✨ Pattern Matched! Keep going...', color: 'text-success' };
    }
    if (state.matchScore > 40) {
      return { text: 'Getting close! Adjust your movement', color: 'text-warning' };
    }
    if (state.motionLevel > 5) {
      return { text: 'Motion detected, matching pattern...', color: 'text-muted-foreground' };
    }
    return { text: 'Perform your learned habit movement', color: 'text-muted-foreground' };
  };

  const statusMessage = getStatusMessage();

  return (
    <div className="glass-card rounded-3xl overflow-hidden">
      {/* Header with rep counter */}
      <div className="p-6 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full transition-colors ${
              state.patternMatch ? 'bg-success animate-pulse' : 
              state.isActive ? 'bg-primary animate-pulse' : 'bg-muted'
            }`} />
            <h3 className="font-display font-semibold text-lg">Habit Camera</h3>
            {hasLearnedPattern && (
              <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-medium flex items-center gap-1">
                <Brain className="w-3 h-3" />
                Pattern Learned
              </span>
            )}
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
        {/* Always render video/canvas so refs are available - hide when not active */}
        <video
          ref={videoRef}
          className={`absolute inset-0 w-full h-full object-cover ${state.isActive ? '' : 'hidden'}`}
          autoPlay
          muted
          playsInline
        />
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 w-full h-full object-cover pointer-events-none ${state.isActive ? '' : 'hidden'}`}
          style={{ mixBlendMode: 'screen', opacity: 0.6 }}
        />
        
        {state.isActive ? (
          <>
            {/* Detection overlay */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Corner decorations - color changes based on match */}
              <div className={`absolute top-4 left-4 w-12 h-12 border-t-2 border-l-2 rounded-tl-lg transition-colors ${
                state.patternMatch ? 'border-success' : 'border-primary/50'
              }`} />
              <div className={`absolute top-4 right-4 w-12 h-12 border-t-2 border-r-2 rounded-tr-lg transition-colors ${
                state.patternMatch ? 'border-success' : 'border-primary/50'
              }`} />
              <div className={`absolute bottom-4 left-4 w-12 h-12 border-b-2 border-l-2 rounded-bl-lg transition-colors ${
                state.patternMatch ? 'border-success' : 'border-primary/50'
              }`} />
              <div className={`absolute bottom-4 right-4 w-12 h-12 border-b-2 border-r-2 rounded-br-lg transition-colors ${
                state.patternMatch ? 'border-success' : 'border-primary/50'
              }`} />

              {/* Status badge */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2">
                <motion.div 
                  animate={{ scale: state.patternMatch ? [1, 1.05, 1] : 1 }}
                  transition={{ repeat: state.patternMatch ? Infinity : 0, duration: 0.5 }}
                  className={`px-4 py-2 rounded-full bg-background/80 backdrop-blur-sm text-sm font-medium ${statusMessage.color}`}
                >
                  {statusMessage.text}
                </motion.div>
              </div>

              {/* Match score indicator */}
              {hasLearnedPattern && state.motionLevel > 3 && (
                <div className="absolute top-14 left-1/2 -translate-x-1/2">
                  <div className={`px-3 py-1 rounded-full backdrop-blur-sm text-xs flex items-center gap-2 ${
                    state.patternMatch ? 'bg-success/80 text-success-foreground' : 'bg-background/60'
                  }`}>
                    <Sparkles className="w-3 h-3" />
                    Match: {Math.round(state.matchScore)}%
                  </div>
                </div>
              )}

              {/* Motion level bar */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-48">
                <div className="h-2 bg-background/50 rounded-full overflow-hidden backdrop-blur-sm">
                  <motion.div
                    className={`h-full transition-colors ${
                      state.patternMatch 
                        ? 'bg-success' 
                        : 'bg-gradient-to-r from-primary via-accent to-secondary'
                    }`}
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
                    className="absolute inset-0 flex items-center justify-center bg-success/30 backdrop-blur-sm"
                  >
                    <motion.div
                      key={countdown}
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 1.5, opacity: 0 }}
                      className="text-8xl font-display font-bold text-success"
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
                    className="absolute inset-0 flex flex-col items-center justify-center bg-success/30 backdrop-blur-sm"
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
            {state.isLoading ? (
              <>
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
                <p className="text-muted-foreground text-center px-8">
                  Starting camera...
                </p>
              </>
            ) : state.error ? (
              <>
                <AlertCircle className="w-12 h-12 text-destructive" />
                <p className="text-destructive text-center px-8">{state.error}</p>
                <Button onClick={handleStartCamera} variant="outline" className="mt-2">
                  <Camera className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
              </>
            ) : (
              <>
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                >
                  <Camera className="w-16 h-16 text-primary" />
                </motion.div>
                <p className="text-foreground font-medium text-center px-8">
                  Click to enable camera tracking
                </p>
                {hasLearnedPattern && (
                  <p className="text-primary text-sm flex items-center gap-1">
                    <Brain className="w-4 h-4" />
                    Your movement pattern is ready!
                  </p>
                )}
                <Button onClick={handleStartCamera} className="mt-2 bg-gradient-to-r from-primary to-accent">
                  <Camera className="w-4 h-4 mr-2" />
                  Start Camera
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Detection Progress */}
      {state.isActive && !isAllComplete && !justCompleted && (
        <div className="p-4 border-t border-border/50">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">
              {hasLearnedPattern ? 'Pattern Recognition' : 'Motion Detection'}
            </span>
            <span className={`font-medium ${state.patternMatch ? 'text-success' : ''}`}>
              {Math.round(state.matchScore)}%
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              className={`h-full transition-colors ${
                state.patternMatch ? 'bg-success' : 'bg-gradient-to-r from-primary via-accent to-secondary'
              }`}
              animate={{ width: `${state.matchScore}%` }}
              transition={{ type: 'spring', damping: 25 }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {hasLearnedPattern 
              ? `Perform your learned movement to complete rep ${completedCount + 1} of ${dailyGoal}`
              : `Move around to complete rep ${completedCount + 1} of ${dailyGoal}`
            }
          </p>
        </div>
      )}
    </div>
  );
};
