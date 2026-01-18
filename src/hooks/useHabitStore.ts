import { useState, useEffect, useCallback } from 'react';

export interface HabitData {
  habitName: string;
  habitDescription: string;
  petName: string;
  dailyGoal: number;
  movementDuration: number; // Duration in seconds for each rep
  referenceFrames: string[]; // Base64 encoded reference frames from calibration
  createdAt: string;
}

export interface DailyRecord {
  date: string;
  completedCount: number;
  completions: string[]; // timestamps of each completion
}

export interface HabitState {
  habit: HabitData | null;
  streak: number;
  longestStreak: number;
  dailyRecords: DailyRecord[];
  todayCompletedCount: number;
  lastCompletedDate: string | null;
}

const STORAGE_KEY = 'habit-buddy-data';
const DEMO_OFFSET_KEY = 'habit-buddy-demo-offset';

// Get demo day offset (for testing)
const getDemoOffset = (): number => {
  const offset = localStorage.getItem(DEMO_OFFSET_KEY);
  return offset ? parseInt(offset, 10) : 0;
};

// Get today's date key - resets at midnight (11:59 PM)
const getTodayKey = () => {
  const now = new Date();
  now.setDate(now.getDate() + getDemoOffset());
  return now.toISOString().split('T')[0];
};

// Get yesterday's date key (accounting for demo offset)
const getYesterdayKey = () => {
  const now = new Date();
  now.setDate(now.getDate() + getDemoOffset() - 1);
  return now.toISOString().split('T')[0];
};

// Get current demo date
const getDemoDate = () => {
  const now = new Date();
  now.setDate(now.getDate() + getDemoOffset());
  return now;
};

export const useHabitStore = () => {
  const [state, setState] = useState<HabitState>({
    habit: null,
    streak: 0,
    longestStreak: 0,
    dailyRecords: [],
    todayCompletedCount: 0,
    lastCompletedDate: null,
  });

  // Load from localStorage on mount and check for day change
  useEffect(() => {
    const loadState = () => {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          const todayKey = getTodayKey();
          
          // Migrate old daily records that don't have completions array
          const migratedRecords = (parsed.dailyRecords || []).map((r: any) => ({
            ...r,
            completedCount: r.completedCount || (r.completed ? 1 : 0),
            completions: r.completions || (r.completedAt ? [r.completedAt] : []),
          }));
          
          const todayRecord = migratedRecords.find((r: DailyRecord) => r.date === todayKey);
          
          // Check if we need to reset streak (missed yesterday)
          let newStreak = parsed.streak || 0;
          const yesterdayKey = getYesterdayKey();
          
          if (parsed.lastCompletedDate && parsed.lastCompletedDate !== todayKey) {
            // If last completion wasn't yesterday, reset streak
            if (parsed.lastCompletedDate !== yesterdayKey) {
              newStreak = 0;
            }
          }
          
          setState({
            ...parsed,
            streak: newStreak,
            dailyRecords: migratedRecords,
            todayCompletedCount: todayRecord?.completedCount || 0,
          });
        } catch (e) {
          console.error('Failed to parse saved habit data:', e);
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    };

    loadState();

    // Check for day change every minute (foreground)
    const interval = window.setInterval(() => {
      loadState();
    }, 60000);

    // Also refresh when the tab becomes active again (background timers can be throttled)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        loadState();
      }
    };

    window.addEventListener('focus', loadState);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', loadState);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  // Save to localStorage when state changes
  useEffect(() => {
    if (state.habit) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  }, [state]);

  const setHabit = useCallback((habit: HabitData) => {
    setState(prev => ({
      ...prev,
      habit,
      streak: 0,
      longestStreak: 0,
      dailyRecords: [],
      todayCompletedCount: 0,
      lastCompletedDate: null,
    }));
  }, []);

  const updateMovementDuration = useCallback((newDuration: number) => {
    setState(prev => {
      if (!prev.habit) return prev;
      return {
        ...prev,
        habit: {
          ...prev.habit,
          movementDuration: newDuration,
        },
      };
    });
  }, []);

  const recordCompletion = useCallback(() => {
    setState(prev => {
      if (!prev.habit) return prev;
      
      const todayKey = getTodayKey();
      const dailyGoal = prev.habit.dailyGoal;
      const currentCount = prev.todayCompletedCount;
      
      // Already completed all for this period
      if (currentCount >= dailyGoal) return prev;

      const newCount = currentCount + 1;
      const isGoalComplete = newCount >= dailyGoal;

      // Find or create today's record
      const existingRecord = prev.dailyRecords.find(r => r.date === todayKey);
      const newCompletion = new Date().toISOString();
      
      let updatedRecords: DailyRecord[];
      if (existingRecord) {
        updatedRecords = prev.dailyRecords.map(r => 
          r.date === todayKey 
            ? { ...r, completedCount: newCount, completions: [...(r.completions || []), newCompletion] }
            : r
        );
      } else {
        updatedRecords = [...prev.dailyRecords, {
          date: todayKey,
          completedCount: newCount,
          completions: [newCompletion],
        }];
      }

      // Calculate streak only when daily goal is complete
      let newStreak = prev.streak;
      let newLongest = prev.longestStreak;
      let newLastDate = prev.lastCompletedDate;

      if (isGoalComplete) {
        const yesterdayKey = getYesterdayKey();

        if (prev.lastCompletedDate === yesterdayKey) {
          // Completed yesterday, streak continues
          newStreak = prev.streak + 1;
        } else if (prev.lastCompletedDate === todayKey) {
          // Already completed today, no change
          newStreak = prev.streak;
        } else {
          // Start fresh streak
          newStreak = 1;
        }

        newLongest = Math.max(prev.longestStreak, newStreak);
        newLastDate = todayKey;
      }

      return {
        ...prev,
        streak: newStreak,
        longestStreak: newLongest,
        dailyRecords: updatedRecords,
        todayCompletedCount: newCount,
        lastCompletedDate: newLastDate,
      };
    });
  }, []);

  const isTodayComplete = useCallback(() => {
    if (!state.habit) return false;
    return state.todayCompletedCount >= state.habit.dailyGoal;
  }, [state.habit, state.todayCompletedCount]);

  const resetHabit = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setState({
      habit: null,
      streak: 0,
      longestStreak: 0,
      dailyRecords: [],
      todayCompletedCount: 0,
      lastCompletedDate: null,
    });
  }, []);

  const getTimeRemaining = useCallback(() => {
    const now = new Date();
    const midnight = new Date();
    midnight.setHours(23, 59, 59, 999);
    const diff = midnight.getTime() - now.getTime();

    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);

    return { hours, minutes, seconds, totalMs: diff };
  }, []);

  // Handle deadline expiry - break streak if reps not complete
  const handleDeadlineExpired = useCallback(() => {
    setState(prev => {
      if (!prev.habit) return prev;
      
      // Only break streak if daily goal wasn't met
      if (prev.todayCompletedCount < prev.habit.dailyGoal) {
        return {
          ...prev,
          streak: 0, // Reset streak
          todayCompletedCount: 0, // Reset today's count
        };
      }
      return prev;
    });
  }, []);

  // Demo: Skip forward 24 hours
  const skipDay = useCallback(() => {
    const currentOffset = getDemoOffset();
    const newOffset = currentOffset + 1;
    localStorage.setItem(DEMO_OFFSET_KEY, String(newOffset));
    
    // Calculate new date keys with new offset
    const now = new Date();
    const newTodayDate = new Date(now);
    newTodayDate.setDate(newTodayDate.getDate() + newOffset);
    const newTodayKey = newTodayDate.toISOString().split('T')[0];
    
    const newYesterdayDate = new Date(now);
    newYesterdayDate.setDate(newYesterdayDate.getDate() + newOffset - 1);
    const newYesterdayKey = newYesterdayDate.toISOString().split('T')[0];
    
    setState(prev => {
      if (!prev.habit) return prev;
      
      const todayRecord = prev.dailyRecords.find(r => r.date === newTodayKey);
      
      // Check streak logic - if last completion wasn't yesterday, reset
      let newStreak = prev.streak;
      if (prev.lastCompletedDate !== newYesterdayKey && prev.lastCompletedDate !== newTodayKey) {
        newStreak = 0;
      }
      
      return {
        ...prev,
        streak: newStreak,
        todayCompletedCount: todayRecord?.completedCount || 0,
      };
    });
  }, []);

  // Get current demo date for display
  const getCurrentDemoDate = useCallback(() => getDemoDate(), []);

  // Demo: Reset day offset
  const resetDemoMode = useCallback(() => {
    localStorage.removeItem(DEMO_OFFSET_KEY);
    window.location.reload();
  }, []);

  // Get current demo day offset
  const getDemoDay = useCallback(() => getDemoOffset(), []);

  return {
    ...state,
    setHabit,
    updateMovementDuration,
    recordCompletion,
    isTodayComplete,
    resetHabit,
    getTimeRemaining,
    handleDeadlineExpired,
    skipDay,
    resetDemoMode,
    getDemoDay,
    getCurrentDemoDate,
  };
};
