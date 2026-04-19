import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';

interface PlayerStats {
  id: number;
  userId: number;
  wins: number;
  losses: number;
  totalGoals: number;
  totalAssists: number;
  totalSteals: number;
  totalBlocks: number;
  matchesPlayed: number;
}

interface MatchEntry {
  matchId: number;
  homeTeamScore: number;
  awayTeamScore: number;
  winnerId: number | null;
  duration: number | null;
  createdAt: Date;
  goalsScored: number;
  assists: number;
  steals: number;
  blocks: number;
  shotAccuracy: number;
}

export default function PlayerProfile() {
  const [location, navigate] = useLocation();
  const { user } = useAuth();
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [matchHistory, setMatchHistory] = useState<MatchEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Extract userId from URL
  const urlMatch = location.match(/\/profile\/(\d+)/);
  const userId = urlMatch ? parseInt(urlMatch[1]) : user?.id;

  const { data: statsData } = trpc.stats.getPlayer.useQuery(
    { userId: userId || 0 },
    { enabled: !!userId }
  );

  const { data: historyData } = trpc.stats.matchHistory.useQuery(
    { userId: userId || 0, limit: 20 },
    { enabled: !!userId }
  );

  useEffect(() => {
    if (statsData) {
      setStats(statsData as PlayerStats);
    }
    if (historyData) {
      setMatchHistory(historyData as MatchEntry[]);
    }
    setIsLoading(false);
  }, [statsData, historyData]);

  if (!userId) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-b from-slate-950 to-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-slate-400 mb-4">Player not found</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-orange-500 hover:bg-orange-600 rounded-lg font-semibold"
          >
            Back to Menu
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-950 to-slate-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate('/leaderboard')}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm transition"
          >
            ← Back to Leaderboard
          </button>
          <h1 className="text-3xl font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Player Profile
          </h1>
          <div className="w-24" />
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-16">
            <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : stats ? (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                <div className="text-slate-400 text-sm mb-2">Wins</div>
                <div className="text-3xl font-bold text-green-400">{stats.wins}</div>
              </div>
              <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                <div className="text-slate-400 text-sm mb-2">Losses</div>
                <div className="text-3xl font-bold text-red-400">{stats.losses}</div>
              </div>
              <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                <div className="text-slate-400 text-sm mb-2">Goals</div>
                <div className="text-3xl font-bold text-blue-400">{stats.totalGoals}</div>
              </div>
              <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                <div className="text-slate-400 text-sm mb-2">Assists</div>
                <div className="text-3xl font-bold text-purple-400">{stats.totalAssists}</div>
              </div>
              <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                <div className="text-slate-400 text-sm mb-2">Steals</div>
                <div className="text-3xl font-bold text-yellow-400">{stats.totalSteals}</div>
              </div>
              <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                <div className="text-slate-400 text-sm mb-2">Blocks</div>
                <div className="text-3xl font-bold text-cyan-400">{stats.totalBlocks}</div>
              </div>
              <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                <div className="text-slate-400 text-sm mb-2">Matches</div>
                <div className="text-3xl font-bold text-slate-300">{stats.matchesPlayed}</div>
              </div>
              <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                <div className="text-slate-400 text-sm mb-2">Win Rate</div>
                <div className="text-3xl font-bold text-orange-400">
                  {stats.matchesPlayed > 0
                    ? ((stats.wins / stats.matchesPlayed) * 100).toFixed(1)
                    : '0'}
                  %
                </div>
              </div>
            </div>

            {/* Match History */}
            <div>
              <h2 className="text-2xl font-bold mb-4" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                Recent Matches
              </h2>
              {matchHistory.length === 0 ? (
                <div className="bg-slate-800 rounded-lg p-8 text-center text-slate-400">
                  No matches yet
                </div>
              ) : (
                <div className="space-y-3">
                  {matchHistory.map((match) => (
                    <div
                      key={match.matchId}
                      className="bg-slate-800 rounded-lg p-4 border border-slate-700 hover:border-slate-600 transition"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-semibold mb-2">
                            {match.homeTeamScore} - {match.awayTeamScore}
                          </div>
                          <div className="text-sm text-slate-400">
                            {new Date(match.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="grid grid-cols-5 gap-4 text-right">
                          <div>
                            <div className="text-xs text-slate-400">Goals</div>
                            <div className="font-semibold text-blue-400">{match.goalsScored}</div>
                          </div>
                          <div>
                            <div className="text-xs text-slate-400">Assists</div>
                            <div className="font-semibold text-purple-400">{match.assists}</div>
                          </div>
                          <div>
                            <div className="text-xs text-slate-400">Steals</div>
                            <div className="font-semibold text-yellow-400">{match.steals}</div>
                          </div>
                          <div>
                            <div className="text-xs text-slate-400">Blocks</div>
                            <div className="font-semibold text-cyan-400">{match.blocks}</div>
                          </div>
                          <div>
                            <div className="text-xs text-slate-400">Accuracy</div>
                            <div className="font-semibold text-orange-400">{match.shotAccuracy}%</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="text-center py-16">
            <p className="text-slate-400 text-lg">Player not found</p>
          </div>
        )}
      </div>
    </div>
  );
}
