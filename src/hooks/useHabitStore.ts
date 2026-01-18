import { useState, useEffect, useCallback } from 'react';

export interface HabitData {
  habitName: string;
  habitDescription: string;
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

// Get today's date key - resets at midnight (11:59 PM)
const getTodayKey = () => new Date().toISOString().split('T')[0];

export const useHabitStore = () => {
  const [state, setState] = useState<HabitState>({
    habit: null,
    streak: 0,
    longestStreak: 0,
    dailyRecords: [],
    todayCompletedCount: 0,
    lastCompletedDate: null,
  });

  // Load from localStorage on mount
  useEffect(() => {
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
        setState({
          ...parsed,
          dailyRecords: migratedRecords,
          todayCompletedCount: todayRecord?.completedCount || 0,
        });
      } catch (e) {
        console.error('Failed to parse saved habit data:', e);
        // Clear corrupted data
        localStorage.removeItem(STORAGE_KEY);
      }
    }
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
        // Get yesterday's date key
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayKey = yesterday.toISOString().split('T')[0];

        if (prev.lastCompletedDate === yesterdayKey) {
          newStreak = prev.streak + 1;
        } else if (prev.lastCompletedDate !== todayKey) {
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

  return {
    ...state,
    setHabit,
    updateMovementDuration,
    recordCompletion,
    isTodayComplete,
    resetHabit,
    getTimeRemaining,
    handleDeadlineExpired,
  };
};
