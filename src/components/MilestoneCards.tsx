import { motion } from 'framer-motion';
import { Lock, Unlock, HelpCircle } from 'lucide-react';

interface MilestoneCardsProps {
  streak: number;
}

const milestones = [
  {
    id: 'blink-sound',
    day: 1,
    title: 'Blinking & Sound Unlocked',
    description: 'Buddy blinks and makes sounds when you complete a rep!',
    emoji: '✨🔊',
  },
  {
    id: 'color-change',
    day: 3,
    title: 'Changes Color on Interaction',
    description: 'Buddy changes color when you interact with it!',
    emoji: '🌈',
  },
  {
    id: 'wag-tail',
    day: 7,
    title: 'Wags Tail & New Sound',
    description: 'Buddy wags its tail and unlocks a new excited sound!',
    emoji: '🐕💫',
  },
  {
    id: 'petting',
    day: 14,
    title: 'Reacts to Petting',
    description: 'Buddy responds to gentle petting with happy reactions!',
    emoji: '🤗💕',
  },
  {
    id: 'everything',
    day: 30,
    title: 'Everything Unlocked',
    description: 'All of Buddy\'s abilities are now fully unlocked!',
    emoji: '🎉🏆',
  },
];

export const MilestoneCards = ({ streak }: MilestoneCardsProps) => {
  // Find the index of the next milestone to unlock
  const nextMilestoneIndex = milestones.findIndex(m => streak < m.day);
  
  return (
    <div className="space-y-4">
      <h3 className="font-display font-semibold text-lg">Milestone Unlocks</h3>
      
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {milestones.map((milestone, index) => {
          const isUnlocked = streak >= milestone.day;
          const isNext = index === nextMilestoneIndex;
          const isAfterNext = index === nextMilestoneIndex + 1;
          const isMystery = index > nextMilestoneIndex + 1;
          
          // Don't show milestones beyond the one after next
          if (isMystery) return null;
          
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
                  : 'border border-border/30 opacity-70'
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
                    : isAfterNext
                    ? 'bg-muted/50 text-muted-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {isUnlocked ? (
                  <>
                    <Unlock className="w-3 h-3" />
                    Unlocked
                  </>
                ) : isAfterNext ? (
                  <>
                    <HelpCircle className="w-3 h-3" />
                    Mystery
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
                {isAfterNext ? (
                  <>
                    <span className="text-3xl mb-3 block">❓</span>
                    <h4 className="font-display font-semibold mb-1">???</h4>
                    <p className="text-sm text-muted-foreground">Complete the next milestone to reveal...</p>
                  </>
                ) : (
                  <>
                    <span className="text-3xl mb-3 block">{milestone.emoji}</span>
                    <h4 className="font-display font-semibold mb-1">{milestone.title}</h4>
                    <p className="text-sm text-muted-foreground">{milestone.description}</p>
                  </>
                )}
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
