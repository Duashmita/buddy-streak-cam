import { motion } from 'framer-motion';
import { Volume2, Hand, Music, Lock, Unlock } from 'lucide-react';

interface MilestoneCardsProps {
  streak: number;
}

const milestones = [
  {
    id: 'sound',
    day: 3,
    title: 'Sound Reactions',
    description: 'Buddy pulses with sound when you approach',
    icon: Volume2,
    emoji: '🔊',
  },
  {
    id: 'nod',
    day: 7,
    title: 'Head Nods',
    description: 'Buddy nods its head to greet you',
    icon: Hand,
    emoji: '👋',
  },
  {
    id: 'chitter',
    day: 14,
    title: 'Chittering',
    description: 'Buddy makes happy chirping sounds',
    icon: Music,
    emoji: '🎵',
  },
];

export const MilestoneCards = ({ streak }: MilestoneCardsProps) => {
  return (
    <div className="space-y-4">
      <h3 className="font-display font-semibold text-lg">Milestone Unlocks</h3>
      
      <div className="grid gap-4 sm:grid-cols-3">
        {milestones.map((milestone, index) => {
          const isUnlocked = streak >= milestone.day;
          const isNext = !isUnlocked && (index === 0 || streak >= milestones[index - 1].day);
          
          return (
            <motion.div
              key={milestone.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`relative glass-card rounded-2xl p-5 overflow-hidden transition-all duration-300 ${
                isUnlocked
                  ? 'border border-primary/30 glow-primary'
                  : isNext
                  ? 'border border-border/50'
                  : 'opacity-50'
              }`}
            >
              {/* Background glow for unlocked */}
              {isUnlocked && (
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-accent/5" />
              )}

              {/* Badge */}
              <div
                className={`absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${
                  isUnlocked
                    ? 'bg-success/20 text-success'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {isUnlocked ? (
                  <>
                    <Unlock className="w-3 h-3" />
                    Unlocked
                  </>
                ) : (
                  <>
                    <Lock className="w-3 h-3" />
                    Day {milestone.day}
                  </>
                )}
              </div>

              {/* Content */}
              <div className="relative">
                <span className="text-3xl mb-3 block">{milestone.emoji}</span>
                <h4 className="font-display font-semibold mb-1">{milestone.title}</h4>
                <p className="text-sm text-muted-foreground">{milestone.description}</p>
              </div>

              {/* Progress indicator for next milestone */}
              {isNext && (
                <div className="mt-4 pt-4 border-t border-border/30">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="text-foreground font-medium">
                      {streak}/{milestone.day} days
                    </span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(streak / milestone.day) * 100}%` }}
                      className="h-full bg-gradient-to-r from-primary to-accent"
                    />
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
