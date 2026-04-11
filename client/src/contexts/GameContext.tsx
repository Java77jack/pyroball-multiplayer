import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { GoalEvent } from '@/lib/gameConstants';
import {
  SEASON_STORAGE_KEY,
  createSeason,
  getCurrentSeasonFixture,
  recordCurrentSeasonFixture,
  shouldRecordSeasonMatch,
  type SeasonDifficulty,
  type SeasonFixture,
  type SeasonState,
} from '@/lib/season';

export type Difficulty = SeasonDifficulty;

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
  season: SeasonState | null;
  startSeason: (userTeamId: string, difficulty: Difficulty) => void;
  clearSeason: () => void;
  launchCurrentSeasonMatch: () => SeasonFixture | null;
  completeCurrentSeasonMatch: () => SeasonState | null;
}

function loadStoredSeason(): SeasonState | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(SEASON_STORAGE_KEY);
    if (!stored) return null;

    const parsed = JSON.parse(stored) as SeasonState;
    if (parsed?.version !== 1) return null;
    return parsed;
  } catch {
    return null;
  }
}

const GameContext = createContext<GameContextType | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [homeTeam, setHomeTeam] = useState('inferno');
  const [awayTeam, setAwayTeam] = useState('vortex');
  const [difficulty, setDifficulty] = useState<Difficulty>('pro');
  const [finalScore, setFinalScore] = useState({ home: 0, away: 0 });
  const [goalEvents, setGoalEvents] = useState<GoalEvent[]>([]);
  const [matchComplete, setMatchComplete] = useState(false);
  const [season, setSeason] = useState<SeasonState | null>(() => loadStoredSeason());

  const resetMatch = useCallback(() => {
    setFinalScore({ home: 0, away: 0 });
    setGoalEvents([]);
    setMatchComplete(false);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (season) {
      localStorage.setItem(SEASON_STORAGE_KEY, JSON.stringify(season));
      return;
    }

    localStorage.removeItem(SEASON_STORAGE_KEY);
  }, [season]);

  const startSeason = useCallback((userTeamId: string, selectedDifficulty: Difficulty) => {
    const nextSeason = createSeason(userTeamId, selectedDifficulty);
    const currentFixture = getCurrentSeasonFixture(nextSeason);

    setSeason(nextSeason);
    setDifficulty(selectedDifficulty);
    if (currentFixture) {
      setHomeTeam(currentFixture.homeTeamId);
      setAwayTeam(currentFixture.awayTeamId);
    }
    resetMatch();
  }, [resetMatch]);

  const clearSeason = useCallback(() => {
    setSeason(null);
    resetMatch();
  }, [resetMatch]);

  const launchCurrentSeasonMatch = useCallback(() => {
    if (!season) return null;

    const currentFixture = getCurrentSeasonFixture(season);
    if (!currentFixture) return null;

    setHomeTeam(currentFixture.homeTeamId);
    setAwayTeam(currentFixture.awayTeamId);
    setDifficulty(season.difficulty);
    resetMatch();

    return currentFixture;
  }, [resetMatch, season]);

  const completeCurrentSeasonMatch = useCallback(() => {
    if (!season || !shouldRecordSeasonMatch(season, homeTeam, awayTeam)) {
      return season;
    }

    const nextSeason = recordCurrentSeasonFixture(season, finalScore, goalEvents);
    setSeason(nextSeason);
    return nextSeason;
  }, [season, homeTeam, awayTeam, finalScore, goalEvents]);

  return (
    <GameContext.Provider value={{
      homeTeam,
      awayTeam,
      setHomeTeam,
      setAwayTeam,
      difficulty,
      setDifficulty,
      finalScore,
      setFinalScore,
      goalEvents,
      setGoalEvents,
      matchComplete,
      setMatchComplete,
      resetMatch,
      season,
      startSeason,
      clearSeason,
      launchCurrentSeasonMatch,
      completeCurrentSeasonMatch,
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
