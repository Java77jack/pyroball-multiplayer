import { useEffect, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useLocation } from 'wouter';

interface LeaderboardEntry {
  id: number;
  name: string | null;
  wins: number;
  losses: number;
  totalGoals: number;
  totalAssists: number;
  matchesPlayed: number;
}

export default function Leaderboard() {
  const [, navigate] = useLocation();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { data: leaderboardData, isLoading: isQueryLoading } = trpc.stats.leaderboard.useQuery({ limit: 100 });

  useEffect(() => {
    if (leaderboardData) {
      setLeaderboard(leaderboardData);
      setIsLoading(false);
    }
  }, [leaderboardData]);

  const getWinRate = (wins: number, losses: number) => {
    const total = wins + losses;
    if (total === 0) return '0%';
    return ((wins / total) * 100).toFixed(1);
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-950 to-slate-900 text-white p-6">
      {/* Header */}
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              🏆 LEADERBOARD
            </h1>
            <p className="text-slate-400">Global rankings and stats</p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-orange-500 hover:bg-orange-600 rounded-lg font-semibold transition"
          >
            Back to Menu
          </button>
        </div>

        {/* Loading State */}
        {isLoading || isQueryLoading ? (
          <div className="flex justify-center items-center py-16">
            <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-slate-400 text-lg">No players yet. Be the first to play!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-4 px-4 font-semibold text-slate-300">Rank</th>
                  <th className="text-left py-4 px-4 font-semibold text-slate-300">Player</th>
                  <th className="text-center py-4 px-4 font-semibold text-slate-300">Wins</th>
                  <th className="text-center py-4 px-4 font-semibold text-slate-300">Losses</th>
                  <th className="text-center py-4 px-4 font-semibold text-slate-300">Win Rate</th>
                  <th className="text-center py-4 px-4 font-semibold text-slate-300">Goals</th>
                  <th className="text-center py-4 px-4 font-semibold text-slate-300">Assists</th>
                  <th className="text-center py-4 px-4 font-semibold text-slate-300">Matches</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry, index) => (
                  <tr
                    key={entry.id}
                    className="border-b border-slate-800 hover:bg-slate-800/50 transition cursor-pointer"
                    onClick={() => navigate(`/profile/${entry.id}`)}
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        {index === 0 && <span className="text-2xl">🥇</span>}
                        {index === 1 && <span className="text-2xl">🥈</span>}
                        {index === 2 && <span className="text-2xl">🥉</span>}
                        {index > 2 && <span className="font-semibold text-slate-400">#{index + 1}</span>}
                      </div>
                    </td>
                    <td className="py-4 px-4 font-semibold">{entry.name || `Player ${entry.id}`}</td>
                    <td className="py-4 px-4 text-center text-green-400 font-semibold">{entry.wins}</td>
                    <td className="py-4 px-4 text-center text-red-400 font-semibold">{entry.losses}</td>
                    <td className="py-4 px-4 text-center text-orange-400 font-semibold">
                      {getWinRate(entry.wins, entry.losses)}
                    </td>
                    <td className="py-4 px-4 text-center text-blue-400">{entry.totalGoals}</td>
                    <td className="py-4 px-4 text-center text-purple-400">{entry.totalAssists}</td>
                    <td className="py-4 px-4 text-center text-slate-400">{entry.matchesPlayed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
