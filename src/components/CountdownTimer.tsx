import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, AlertTriangle } from 'lucide-react';

interface CountdownTimerProps {
  todayCompleted: boolean;
}

export const CountdownTimer = ({ todayCompleted }: CountdownTimerProps) => {
  const [timeRemaining, setTimeRemaining] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const midnight = new Date();
      midnight.setHours(23, 59, 59, 999);
      const diff = midnight.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining({ hours: 0, minutes: 0, seconds: 0 });
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
  }, []);

  const isUrgent = timeRemaining.hours < 2 && !todayCompleted;
  const formatNumber = (n: number) => String(n).padStart(2, '0');

  if (todayCompleted) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-2xl p-6 text-center border border-success/30 bg-success/5"
      >
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="w-3 h-3 rounded-full bg-success animate-pulse" />
          <span className="text-success font-semibold">Today's Goal Complete!</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Come back tomorrow to continue your streak
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
          Time Remaining Today
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
          ? "Don't break your streak! Complete your habit now!"
          : 'Complete your habit before midnight to save your streak'}
      </p>
    </motion.div>
  );
};
