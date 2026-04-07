import React, { createContext, useContext, useState, useCallback } from 'react';
import type { GoalEvent } from '@/lib/gameConstants';

export type Difficulty = 'rookie' | 'pro' | 'allstar';

interface GameContextType {
  homeTeam: string;
  awayTeam: string;
  setHomeTeam: (t: string) => void;
  setAwayTeam: (t: string) => void;
  difficulty: Difficulty;
  setDifficulty: (d: Difficulty) => void;
  finalScore: { home: number; away: number };
  setFinalScore: (s: { home: number; away: number }) => void;
  goalEvents: GoalEvent[];
  setGoalEvents: (e: GoalEvent[]) => void;
  matchComplete: boolean;
  setMatchComplete: (b: boolean) => void;
  resetMatch: () => void;
}

const GameContext = createContext<GameContextType | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [homeTeam, setHomeTeam] = useState('inferno');
  const [awayTeam, setAwayTeam] = useState('vortex');
  const [difficulty, setDifficulty] = useState<Difficulty>('pro');
  const [finalScore, setFinalScore] = useState({ home: 0, away: 0 });
  const [goalEvents, setGoalEvents] = useState<GoalEvent[]>([]);
  const [matchComplete, setMatchComplete] = useState(false);

  const resetMatch = useCallback(() => {
    setFinalScore({ home: 0, away: 0 });
    setGoalEvents([]);
    setMatchComplete(false);
  }, []);

  return (
    <GameContext.Provider value={{
      homeTeam, awayTeam, setHomeTeam, setAwayTeam,
      difficulty, setDifficulty,
      finalScore, setFinalScore,
      goalEvents, setGoalEvents,
      matchComplete, setMatchComplete,
      resetMatch,
    }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGameContext() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGameContext must be used within GameProvider');
  return ctx;
}
