import { motion } from 'framer-motion';
import { Flame, Trophy, Zap } from 'lucide-react';

interface StreakDisplayProps {
  streak: number;
  longestStreak: number;
  todayCompleted: boolean;
}

export const StreakDisplay = ({ streak, longestStreak, todayCompleted }: StreakDisplayProps) => {
  const getMessage = () => {
    if (!todayCompleted) return "Complete today's habit to keep your streak!";
    if (streak === 0) return "Start your journey today!";
    if (streak === 1) return "Great start! Day 1 complete!";
    if (streak < 7) return "Building momentum! Keep going!";
    if (streak < 14) return "One week strong! 💪";
    if (streak < 30) return "Two weeks! You're unstoppable!";
    return "Legendary consistency! 🌟";
  };

  const getNextMilestone = () => {
    if (streak < 3) return { days: 3, reward: 'Sound Reactions' };
    if (streak < 7) return { days: 7, reward: 'Head Nods' };
    if (streak < 14) return { days: 14, reward: 'Chittering' };
    if (streak < 30) return { days: 30, reward: 'Month Master Badge' };
    return null;
  };

  const nextMilestone = getNextMilestone();
  const progress = nextMilestone ? (streak / nextMilestone.days) * 100 : 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-3xl p-8"
    >
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">
            Current Streak
          </p>
          <motion.div
            key={streak}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 15 }}
            className="flex items-baseline gap-2"
          >
            <span className="text-7xl font-display font-bold gradient-text">
              {streak}
            </span>
            <span className="text-2xl text-muted-foreground font-medium">
              {streak === 1 ? 'day' : 'days'}
            </span>
          </motion.div>
        </div>
        
        <motion.div
          animate={{
            scale: todayCompleted ? [1, 1.2, 1] : 1,
          }}
          transition={{
            duration: 0.5,
            repeat: todayCompleted ? 0 : Infinity,
            repeatDelay: 2,
          }}
          className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
            todayCompleted
              ? 'bg-gradient-to-br from-success/20 to-success/10'
              : 'bg-gradient-to-br from-primary/20 to-accent/10'
          }`}
        >
          <Flame className={`w-8 h-8 ${todayCompleted ? 'text-success' : 'text-primary'}`} />
        </motion.div>
      </div>

      <p className="text-lg text-foreground mb-6">{getMessage()}</p>

      {/* Progress to next milestone */}
      {nextMilestone && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Next milestone</span>
            <span className="font-medium flex items-center gap-1">
              <Zap className="w-4 h-4 text-accent" />
              {nextMilestone.reward}
            </span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(progress, 100)}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-primary via-accent to-secondary"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {streak} / {nextMilestone.days} days to unlock
          </p>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-border/50">
        <div className="text-center p-4 rounded-2xl bg-muted/30">
          <Trophy className="w-5 h-5 text-warning mx-auto mb-2" />
          <p className="text-2xl font-display font-bold">{longestStreak}</p>
          <p className="text-xs text-muted-foreground">Longest Streak</p>
        </div>
        <div className="text-center p-4 rounded-2xl bg-muted/30">
          <div className={`w-5 h-5 mx-auto mb-2 rounded-full ${todayCompleted ? 'bg-success' : 'bg-muted'}`} />
          <p className="text-2xl font-display font-bold">{todayCompleted ? '✓' : '○'}</p>
          <p className="text-xs text-muted-foreground">Today's Status</p>
        </div>
      </div>
    </motion.div>
  );
};
