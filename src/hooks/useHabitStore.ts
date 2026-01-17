import { useState, useEffect, useCallback } from 'react';

export interface HabitData {
  habitName: string;
  habitDescription: string;
  habitIllustration: string;
  createdAt: string;
}

export interface DailyRecord {
  date: string;
  completed: boolean;
  completedAt?: string;
}

export interface HabitState {
  habit: HabitData | null;
  streak: number;
  longestStreak: number;
  dailyRecords: DailyRecord[];
  todayCompleted: boolean;
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
    todayCompleted: false,
    lastCompletedDate: null,
  });

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const today = getTodayKey();
        const todayRecord = parsed.dailyRecords?.find((r: DailyRecord) => r.date === today);
        setState({
          ...parsed,
          todayCompleted: todayRecord?.completed || false,
        });
      } catch (e) {
        console.error('Failed to parse saved habit data:', e);
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
      todayCompleted: false,
      lastCompletedDate: null,
    }));
  }, []);

  const markTodayComplete = useCallback(() => {
    const today = getTodayKey();
    
    setState(prev => {
      if (prev.todayCompleted) return prev;

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayKey = yesterday.toISOString().split('T')[0];

      // Calculate new streak
      let newStreak = 1;
      if (prev.lastCompletedDate === yesterdayKey) {
        newStreak = prev.streak + 1;
      }

      const newLongest = Math.max(prev.longestStreak, newStreak);

      const newRecord: DailyRecord = {
        date: today,
        completed: true,
        completedAt: new Date().toISOString(),
      };

      return {
        ...prev,
        streak: newStreak,
        longestStreak: newLongest,
        dailyRecords: [...prev.dailyRecords.filter(r => r.date !== today), newRecord],
        todayCompleted: true,
        lastCompletedDate: today,
      };
    });
  }, []);

  const resetHabit = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setState({
      habit: null,
      streak: 0,
      longestStreak: 0,
      dailyRecords: [],
      todayCompleted: false,
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
    markTodayComplete,
    resetHabit,
    getTimeRemaining,
  };
};
