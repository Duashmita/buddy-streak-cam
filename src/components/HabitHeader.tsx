import { motion } from 'framer-motion';
import { Settings, RotateCcw, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface HabitHeaderProps {
  habitName: string;
  onReset: () => void;
}

export const HabitHeader = ({ habitName, onReset }: HabitHeaderProps) => {
  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
    >
      <div className="flex items-center gap-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.2 }}
          className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center float"
        >
          <Target className="w-7 h-7 text-primary" />
        </motion.div>
        <div>
          <h1 className="text-3xl font-display font-bold gradient-text">
            Habit Buddy
          </h1>
          <p className="text-muted-foreground">
            Tracking: <span className="text-foreground font-medium">{habitName}</span>
          </p>
        </div>
      </div>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset Habit
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent className="glass-card border-border/50">
          <AlertDialogHeader>
            <AlertDialogTitle>Reset your habit?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete all your progress, including your streak and milestones.
              You'll need to set up a new habit from scratch.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-muted hover:bg-muted/80">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={onReset}
              className="bg-destructive hover:bg-destructive/90"
            >
              Reset Everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.header>
  );
};
