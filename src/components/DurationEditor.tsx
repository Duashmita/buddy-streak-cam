import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, X, Clock, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DurationEditorProps {
  currentDuration: number; // in seconds
  onDurationChange: (newDuration: number) => void;
}

export const DurationEditor = ({ currentDuration, onDurationChange }: DurationEditorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tempDuration, setTempDuration] = useState(currentDuration);

  const handleOpen = () => {
    setTempDuration(currentDuration);
    setIsOpen(true);
  };

  const handleSave = () => {
    onDurationChange(tempDuration);
    setIsOpen(false);
  };

  const adjustDuration = (delta: number) => {
    const newValue = Math.max(1, Math.min(60, tempDuration + delta));
    setTempDuration(newValue);
  };

  return (
    <>
      <button
        onClick={handleOpen}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors text-sm"
      >
        <Settings className="w-4 h-4" />
        <span>Adjust Duration</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm"
            >
              <div className="glass-card rounded-2xl p-6 border border-border/50">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-primary" />
                    <h3 className="font-display font-semibold text-lg">Adjust Duration</h3>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1 rounded-lg hover:bg-muted transition-colors"
                  >
                    <X className="w-5 h-5 text-muted-foreground" />
                  </button>
                </div>

                {/* Duration selector */}
                <div className="flex flex-col items-center gap-4">
                  <p className="text-sm text-muted-foreground text-center">
                    Set how long each rep should take
                  </p>

                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => adjustDuration(-5)}
                      className="p-3 rounded-full bg-muted hover:bg-muted/80 transition-colors"
                    >
                      <Minus className="w-5 h-5" />
                    </button>

                    <div className="text-center min-w-[100px]">
                      <span className="text-4xl font-display font-bold text-primary">
                        {tempDuration}
                      </span>
                      <span className="text-xl text-muted-foreground ml-1">sec</span>
                    </div>

                    <button
                      onClick={() => adjustDuration(5)}
                      className="p-3 rounded-full bg-muted hover:bg-muted/80 transition-colors"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Quick presets */}
                  <div className="flex gap-2 flex-wrap justify-center">
                    {[5, 10, 15, 30, 60].map((preset) => (
                      <button
                        key={preset}
                        onClick={() => setTempDuration(preset)}
                        className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                          tempDuration === preset
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                        }`}
                      >
                        {preset}s
                      </button>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setIsOpen(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    className="flex-1 bg-primary hover:bg-primary/90"
                  >
                    Save Changes
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
