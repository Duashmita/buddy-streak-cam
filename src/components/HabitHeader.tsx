import { motion } from 'framer-motion';
import { RotateCcw } from 'lucide-react';
import habpetIcon from '@/assets/habpet-icon.png';
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
  petName: string;
  onReset: () => void;
}

export const HabitHeader = ({ habitName, petName, onReset }: HabitHeaderProps) => {
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
          className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center float overflow-hidden"
        >
          <img src={habpetIcon} alt="Habpet" className="w-10 h-10 object-contain" />
        </motion.div>
        <div>
          <h1 className="text-3xl font-display font-bold gradient-text">
            Habpet
          </h1>
          <p className="text-muted-foreground">
            Name: <span className="text-foreground font-medium">{petName}</span>
          </p>
          <p className="text-muted-foreground text-sm">
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
