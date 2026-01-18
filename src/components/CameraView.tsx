import { useEffect, useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, CameraOff, Loader2, Check, AlertCircle, Sparkles, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCameraDetection } from '@/hooks/useCameraDetection';

interface CameraViewProps {
  habitDescription: string;
  referenceFrames: string[];
  dailyGoal: number;
  completedCount: number;
  movementDuration?: number;
  shouldStopCamera?: boolean;
  onActionDetected: () => void;
}

export const CameraView = ({ 
  habitDescription, 
  referenceFrames,
  dailyGoal,
  completedCount,
  movementDuration = 30,
  shouldStopCamera = false,
  onActionDetected,
}: CameraViewProps) => {
  const safeReferenceFrames = useMemo(() => referenceFrames || [], [referenceFrames]);
  
  const {
    videoRef,
    canvasRef,
    state,
    startCamera,
    stopCamera,
    startDetection,
    hasLearnedPattern,
  } = useCameraDetection(safeReferenceFrames);

  const [repTimer, setRepTimer] = useState<number | null>(null);
  const [justCompleted, setJustCompleted] = useState(false);
  const [matchStreak, setMatchStreak] = useState(0);

  // Keep frequently-changing detection signals in refs so the countdown timer
  // isn't constantly reset by fast matchScore updates.
  const matchZoneRef = useRef(false);
  const isActiveRef = useRef(false);

  useEffect(() => {
    // Timer only ticks when match is 99%+ (UI shows 100%)
    const isInMatchZone = state.matchScore >= 99;

    matchZoneRef.current = isInMatchZone;
    isActiveRef.current = state.isActive;
  }, [state.matchScore, state.isActive]);

  const isAllComplete = completedCount >= dailyGoal;

  // Cleanup camera on unmount only
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Stop camera when parent requests it
  useEffect(() => {
    if (shouldStopCamera && state.isActive) {
      stopCamera();
    }
  }, [shouldStopCamera, state.isActive, stopCamera]);

  const handleStartCamera = async () => {
    const success = await startCamera();
    if (success) {
      startDetection();
    }
  };

  // Track consecutive matches with stickiness
  useEffect(() => {
    const isInMatchZone = state.patternMatch || (state.matchScore >= 70 && state.motionLevel >= 0.3);
    if (isInMatchZone) {
      setMatchStreak(prev => Math.min(prev + 1, 180));
    } else {
      setMatchStreak(prev => Math.max(prev - 2, 0));
    }
  }, [state.patternMatch, state.matchScore, state.motionLevel]);

  // Start the rep timer immediately when the UI shows ~100% match
  useEffect(() => {
    if (isAllComplete || justCompleted) return;
    if (repTimer !== null) return;

    // The UI rounds the score, so treat 99%+ as "100%" for instant start.
    const instantTrigger = state.matchScore >= 99;
    const sustainedTrigger = matchStreak > 12 && state.matchScore > 50;

    if (instantTrigger || sustainedTrigger) {
      setRepTimer(movementDuration);
    }
  }, [matchStreak, state.matchScore, isAllComplete, justCompleted, repTimer, movementDuration]);

  // Rep timer countdown (ticks once per second, pauses immediately if match drops below 99%)
  const isTimerRunning = repTimer !== null && repTimer > 0;

  useEffect(() => {
    if (!isTimerRunning) return;

    const interval = window.setInterval(() => {
      if (!isActiveRef.current) return;

      // Pause immediately if match drops below 99%
      if (!matchZoneRef.current) return;

      setRepTimer(prev => (prev === null ? null : Math.max(prev - 1, 0)));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isTimerRunning]);

  // Complete immediately when timer hits 0
  useEffect(() => {
    if (repTimer !== 0) return;

    setJustCompleted(true);
    setMatchStreak(0);
    setRepTimer(null);
    onActionDetected();

    const t = window.setTimeout(() => {
      setJustCompleted(false);
    }, 2000);

    return () => window.clearTimeout(t);
  }, [repTimer, onActionDetected]);

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

  const formatTime = (seconds: number) => {
    if (seconds >= 60) {
      return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
    }
    return seconds.toString();
  };

  return (
    <div className="glass-card rounded-3xl overflow-hidden">
      {/* Header */}
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
          
          <div className="flex items-center gap-4">
            {!isAllComplete && !justCompleted && (
              <div className="text-right">
                <div className="text-2xl font-display font-bold">
                  <span className={completedCount > 0 ? 'text-success' : 'text-foreground'}>
                    {completedCount}
                  </span>
                  <span className="text-muted-foreground">/{dailyGoal}</span>
                </div>
                <p className="text-xs text-muted-foreground">Today's reps</p>
              </div>
            )}
            
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

      {/* Camera Feed with side timer */}
      <div className="flex">
        {/* Timer sidebar */}
        {state.isActive && repTimer !== null && !justCompleted && (
          <div className="w-24 flex-shrink-0 bg-muted/20 border-r border-border/30 flex flex-col items-center justify-center p-4">
            <p className="text-xs text-muted-foreground mb-1">Time left</p>
            <motion.div
              key={repTimer}
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="text-3xl font-display font-bold text-primary"
            >
              {formatTime(repTimer)}
            </motion.div>
            <div className="mt-3 w-full h-24 bg-muted/30 rounded-full overflow-hidden relative">
              <motion.div
                className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-primary to-accent"
                animate={{ height: `${((movementDuration - repTimer) / movementDuration) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">Keep moving!</p>
          </div>
        )}

        {/* Main camera area */}
        <div className="relative aspect-video bg-muted/30 flex-1">
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
                {/* Corner decorations */}
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
                        Rep Complete! 🎉
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