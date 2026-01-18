import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, AlertTriangle, PartyPopper, XCircle } from 'lucide-react';

interface CountdownTimerProps {
  dailyGoal: number;
  completedCount: number;
  deadlineTime?: string; // HH:MM format
  onDeadlineExpired?: () => void;
}

export const CountdownTimer = ({ 
  dailyGoal, 
  completedCount, 
  deadlineTime = '23:59',
  onDeadlineExpired,
}: CountdownTimerProps) => {
  const [timeRemaining, setTimeRemaining] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [hasExpired, setHasExpired] = useState(false);
  const [showExpiredAnimation, setShowExpiredAnimation] = useState(false);

  const isComplete = completedCount >= dailyGoal;

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const [deadlineHours, deadlineMinutes] = deadlineTime.split(':').map(Number);
      
      const deadline = new Date();
      deadline.setHours(deadlineHours, deadlineMinutes, 0, 0);
      
      let diff = deadline.getTime() - now.getTime();
      
      // If deadline has passed
      if (diff <= 0) {
        setTimeRemaining({ hours: 0, minutes: 0, seconds: 0 });
        
        // Only trigger expiry once, and only if not complete
        if (!hasExpired && !isComplete) {
          setHasExpired(true);
          setShowExpiredAnimation(true);
          onDeadlineExpired?.();
          
          // Hide animation after 5 seconds
          setTimeout(() => {
            setShowExpiredAnimation(false);
          }, 5000);
        }
        return;
      }

      setTimeRemaining({
        hours: Math.floor(diff / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [deadlineTime, hasExpired, isComplete, onDeadlineExpired]);

  // Reset expired state at deadline time (new period starts)
  useEffect(() => {
    const checkNewPeriod = () => {
      const now = new Date();
      const [deadlineHours, deadlineMinutes] = deadlineTime.split(':').map(Number);
      
      // Check if we just passed the deadline (within 1 minute)
      if (now.getHours() === deadlineHours && now.getMinutes() === deadlineMinutes) {
        // Only reset if we previously expired - this starts a new period
        if (hasExpired) {
          setHasExpired(false);
          setShowExpiredAnimation(false);
        }
      }
    };
    
    const interval = setInterval(checkNewPeriod, 60000);
    return () => clearInterval(interval);
  }, [deadlineTime, hasExpired]);

  const isUrgent = timeRemaining.hours < 2 && !isComplete && !hasExpired;
  const formatNumber = (n: number) => String(n).padStart(2, '0');

  // Show expired animation
  if (showExpiredAnimation && !isComplete) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card rounded-2xl p-8 text-center border border-destructive/50 bg-destructive/10"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.2, 1] }}
          transition={{ duration: 0.5 }}
          className="w-20 h-20 mx-auto mb-4 rounded-full bg-destructive/20 flex items-center justify-center"
        >
          <XCircle className="w-12 h-12 text-destructive" />
        </motion.div>
        <motion.h3
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-2xl font-display font-bold text-destructive mb-2"
        >
          Time's Up! ⏰
        </motion.h3>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-muted-foreground"
        >
          You completed {completedCount}/{dailyGoal} reps.
          {completedCount === 0 ? ' Your streak has been reset.' : ' Keep trying tomorrow!'}
        </motion.p>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-4 text-sm text-destructive/70"
        >
          New period starts at {deadlineTime}
        </motion.div>
      </motion.div>
    );
  }

  // Show expired state (after animation)
  if (hasExpired && !isComplete) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-2xl p-6 text-center border border-destructive/30 bg-destructive/5"
      >
        <div className="flex items-center justify-center gap-3 mb-2">
          <XCircle className="w-5 h-5 text-destructive" />
          <span className="text-destructive font-semibold">
            Deadline Passed • {completedCount}/{dailyGoal} reps
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          Come back tomorrow for a fresh start!
        </p>
      </motion.div>
    );
  }

  if (isComplete) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-2xl p-6 text-center border border-success/30 bg-success/5"
      >
        <div className="flex items-center justify-center gap-3 mb-2">
          <PartyPopper className="w-5 h-5 text-success" />
          <span className="text-success font-semibold">
            {completedCount}/{dailyGoal} Reps Complete! 🎉
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          Amazing work! Come back tomorrow to continue your streak
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass-card rounded-2xl p-6 text-center ${
        isUrgent ? 'border border-destructive/50 bg-destructive/5' : ''
      }`}
    >
      <div className="flex items-center justify-center gap-2 mb-3">
        {isUrgent ? (
          <AlertTriangle className="w-5 h-5 text-destructive animate-pulse" />
        ) : (
          <Clock className="w-5 h-5 text-muted-foreground" />
        )}
        <span className={`font-medium ${isUrgent ? 'text-destructive' : 'text-muted-foreground'}`}>
          Time Remaining • {completedCount}/{dailyGoal} reps done
        </span>
      </div>

      <div className="flex items-center justify-center gap-2 font-mono text-4xl font-bold">
        <motion.span
          key={`h-${timeRemaining.hours}`}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={isUrgent ? 'text-destructive' : 'text-foreground'}
        >
          {formatNumber(timeRemaining.hours)}
        </motion.span>
        <span className="text-muted-foreground">:</span>
        <motion.span
          key={`m-${timeRemaining.minutes}`}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={isUrgent ? 'text-destructive' : 'text-foreground'}
        >
          {formatNumber(timeRemaining.minutes)}
        </motion.span>
        <span className="text-muted-foreground">:</span>
        <motion.span
          key={`s-${timeRemaining.seconds}`}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={isUrgent ? 'text-destructive' : 'text-foreground'}
        >
          {formatNumber(timeRemaining.seconds)}
        </motion.span>
      </div>

      <p className="text-sm text-muted-foreground mt-3">
        {isUrgent
          ? `Complete ${dailyGoal - completedCount} more rep${dailyGoal - completedCount > 1 ? 's' : ''} to save your streak!`
          : `Complete all ${dailyGoal} reps before ${deadlineTime}`}
      </p>
    </motion.div>
  );
};