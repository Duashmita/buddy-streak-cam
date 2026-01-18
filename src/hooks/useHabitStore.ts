import { useState, useEffect, useCallback } from 'react';

export interface HabitData {
  habitName: string;
  habitDescription: string;
  dailyGoal: number;
  deadlineTime: string; // HH:MM format, e.g., "21:00"
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
        const today = getTodayKey();
        
        // Migrate old daily records that don't have completions array
        const migratedRecords = (parsed.dailyRecords || []).map((r: any) => ({
          ...r,
          completedCount: r.completedCount || (r.completed ? 1 : 0),
          completions: r.completions || (r.completedAt ? [r.completedAt] : []),
        }));
        
        const todayRecord = migratedRecords.find((r: DailyRecord) => r.date === today);
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

  const recordCompletion = useCallback(() => {
    const today = getTodayKey();
    
    setState(prev => {
      if (!prev.habit) return prev;
      
      const dailyGoal = prev.habit.dailyGoal;
      const currentCount = prev.todayCompletedCount;
      
      // Already completed all for today
      if (currentCount >= dailyGoal) return prev;

      const newCount = currentCount + 1;
      const isGoalComplete = newCount >= dailyGoal;

      // Find or create today's record
      const existingRecord = prev.dailyRecords.find(r => r.date === today);
      const newCompletion = new Date().toISOString();
      
      let updatedRecords: DailyRecord[];
      if (existingRecord) {
        updatedRecords = prev.dailyRecords.map(r => 
          r.date === today 
            ? { ...r, completedCount: newCount, completions: [...(r.completions || []), newCompletion] }
            : r
        );
      } else {
        updatedRecords = [...prev.dailyRecords, {
          date: today,
          completedCount: newCount,
          completions: [newCompletion],
        }];
      }

      // Calculate streak only when daily goal is complete
      let newStreak = prev.streak;
      let newLongest = prev.longestStreak;
      let newLastDate = prev.lastCompletedDate;

      if (isGoalComplete) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayKey = yesterday.toISOString().split('T')[0];

        if (prev.lastCompletedDate === yesterdayKey) {
          newStreak = prev.streak + 1;
        } else if (prev.lastCompletedDate !== today) {
          newStreak = 1;
        }

        newLongest = Math.max(prev.longestStreak, newStreak);
        newLastDate = today;
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

  return {
    ...state,
    setHabit,
    recordCompletion,
    isTodayComplete,
    resetHabit,
    getTimeRemaining,
  };
};
