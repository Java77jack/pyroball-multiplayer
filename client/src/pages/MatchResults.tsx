import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { TEAMS, ASSET_URLS } from '@/lib/gameConstants';
import { useGameContext } from '@/contexts/GameContext';
import { useMenuGamepad } from '@/hooks/useMenuGamepad';
import { playMusic, markUserInteraction } from '@/lib/musicEngine';
import {
  getCurrentSeasonFixture,
  getPlayoffBracket,
  getRecentFixture,
  getSeasonLeaders,
} from '@/lib/season';

export default function MatchResults() {
  const [, navigate] = useLocation();
  const {
    homeTeam,
    awayTeam,
    finalScore,
    goalEvents,
    resetMatch,
    season,
    completeCurrentSeasonMatch,
  } = useGameContext();

  const hasRecordedSeasonRef = useRef(false);
  const [focusIdx, setFocusIdx] = useState(0);

  useEffect(() => {
    markUserInteraction();
    playMusic('results');
  }, []);

  useEffect(() => {
    if (hasRecordedSeasonRef.current) return;
    hasRecordedSeasonRef.current = true;
    completeCurrentSeasonMatch();
  }, [completeCurrentSeasonMatch]);

  const activeSeason = season;
  const isSeasonMatch = Boolean(activeSeason);
  const recentFixture = getRecentFixture(activeSeason);
  const nextFixture = getCurrentSeasonFixture(activeSeason);
  const seasonLeaders = getSeasonLeaders(activeSeason);
  const playoffBracket = getPlayoffBracket(activeSeason);

  const home = TEAMS[homeTeam];
  const away = TEAMS[awayTeam];
  const homeWins = finalScore.home > finalScore.away;
  const isDraw = finalScore.home === finalScore.away;
  const winner = homeWins ? home : away;

  const homeZoneGoals = { 1: 0, 2: 0, 3: 0 };
  const awayZoneGoals = { 1: 0, 2: 0, 3: 0 };
  goalEvents.forEach((event) => {
    if (event.teamId === homeTeam) {
      homeZoneGoals[event.zone as 1 | 2 | 3] += 1;
    } else {
      awayZoneGoals[event.zone as 1 | 2 | 3] += 1;
    }
  });

  const seasonSummary = useMemo(() => {
    if (!activeSeason || !recentFixture) {
      return {
        eyebrow: 'Season Update',
        title: nextFixture
          ? `Next up: ${TEAMS[nextFixture.awayTeamId].name} @ ${TEAMS[nextFixture.homeTeamId].name}`
          : 'The season schedule is complete.',
        body: nextFixture
          ? 'Return to the season hub to review standings, league leaders, and launch the next scheduled fixture.'
          : 'Head back to the season hub to review the final standings and postseason outcome.',
      };
    }

    if (recentFixture.stage === 'final') {
      const championTeamId = activeSeason.championTeamId ?? recentFixture.result?.winnerTeamId ?? null;
      const championName = championTeamId ? TEAMS[championTeamId].name : 'A champion';
      return {
        eyebrow: 'Ignition Final',
        title: `${championName} captured the championship`,
        body:
          championTeamId === activeSeason.userTeamId
            ? 'Your playoff run is complete. Return to the season hub to celebrate the title and review the final league leaders.'
            : 'The postseason has concluded. Return to the season hub to view the completed bracket and final season leaders.',
      };
    }

    if (recentFixture.stage === 'semifinal') {
      const finalGame = playoffBracket?.finalGame ?? null;
      if (finalGame?.homeTeamId && finalGame?.awayTeamId) {
        return {
          eyebrow: 'Playoff Advancement',
          title: `Championship set: ${TEAMS[finalGame.awayTeamId].name} @ ${TEAMS[finalGame.homeTeamId].name}`,
          body:
            finalGame.fixture?.status === 'completed'
              ? 'The bracket has already resolved. Return to the season hub to review the full postseason story.'
              : 'The semifinal is complete. Return to the season hub to review the updated bracket and launch the ignition final.',
        };
      }

      return {
        eyebrow: 'Playoff Advancement',
        title: 'The bracket has shifted after the semifinal',
        body: 'Return to the season hub to review the updated playoff field and your next postseason step.',
      };
    }

    return {
      eyebrow: 'Season Update',
      title: nextFixture
        ? `Next up: ${TEAMS[nextFixture.awayTeamId].name} @ ${TEAMS[nextFixture.homeTeamId].name}`
        : 'Regular season complete',
      body: nextFixture
        ? 'Return to the season hub to review standings, league leaders, and launch the next scheduled fixture.'
        : 'The regular season has wrapped. Return to the season hub to inspect the playoff bracket and final table.',
    };
  }, [activeSeason, nextFixture, playoffBracket, recentFixture]);

  const leaderCards = seasonLeaders.slice(0, 2);

  const handlePrimaryAction = useCallback(() => {
    resetMatch();
    navigate(isSeasonMatch ? '/season' : '/team-select');
  }, [isSeasonMatch, navigate, resetMatch]);

  const handleSecondaryAction = useCallback(() => {
    resetMatch();
    navigate('/');
  }, [navigate, resetMatch]);

  const handleGamepadSelect = useCallback((idx: number) => {
    if (idx === 0) handlePrimaryAction();
    else handleSecondaryAction();
  }, [handlePrimaryAction, handleSecondaryAction]);

  useMenuGamepad({
    itemCount: 2,
    selectedIndex: focusIdx,
    onSelect: handleGamepadSelect,
    onNavigate: setFocusIdx,
    onBack: handleSecondaryAction,
  });

  const primaryLabel = isSeasonMatch ? 'CONTINUE SEASON' : 'PLAY AGAIN';

  return (
    <div
      className="relative flex h-screen w-screen flex-col items-center overflow-hidden"
      style={{ background: '#0a0a1a' }}
    >
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `url(${ASSET_URLS.menuBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.2,
        }}
      />
      <div
        className="absolute inset-0 z-0"
        style={{
          background: 'radial-gradient(ellipse at center top, rgba(255,180,0,0.1) 0%, rgba(10,10,26,0.95) 60%)',
        }}
      />

      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: 2 + Math.random() * 2,
              height: 2 + Math.random() * 2,
              background: `rgba(255, ${150 + Math.random() * 105}, 0, ${0.3 + Math.random() * 0.4})`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `sparkle ${2 + Math.random() * 3}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 flex w-full max-w-md flex-col items-center px-6 pb-8 pt-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <p className="mb-2 text-sm tracking-[0.3em] text-white/40" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            {recentFixture?.stage === 'final' ? 'IGNITION FINAL' : recentFixture?.stage === 'semifinal' ? 'PLAYOFF RESULT' : 'MATCH OVER'}
          </p>

          <div className="mb-3 text-5xl">🏆</div>

          <h1
            className="text-3xl font-bold tracking-wider"
            style={{
              fontFamily: 'Rajdhani, sans-serif',
              color: isDraw ? '#FFB800' : winner?.secondary,
              filter: `drop-shadow(0 0 10px ${isDraw ? 'rgba(255,180,0,0.3)' : `${winner?.glow}44`})`,
            }}
          >
            {isDraw ? 'DRAW!' : `${winner?.name.toUpperCase()} WINS!`}
          </h1>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-6 flex w-full items-center justify-center gap-6 rounded-xl py-4"
          style={{
            background: 'rgba(0,0,0,0.4)',
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <div className="flex flex-col items-center">
            <img src={home?.logo} alt={home?.name} className="mb-1 h-10 w-10 object-contain" style={{ filter: `drop-shadow(0 0 6px ${home?.glow}66)` }} />
            <span className="text-xs text-white/60" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{home?.name}</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-4xl font-bold tabular-nums text-white" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              {finalScore.home}
            </span>
            <span className="text-2xl text-white/20">—</span>
            <span className="text-4xl font-bold tabular-nums text-white" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              {finalScore.away}
            </span>
          </div>
          <div className="flex flex-col items-center">
            <img src={away?.logo} alt={away?.name} className="mb-1 h-10 w-10 object-contain" style={{ filter: `drop-shadow(0 0 6px ${away?.glow}66)` }} />
            <span className="text-xs text-white/60" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{away?.name}</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="mt-4 w-full overflow-hidden rounded-xl"
          style={{
            background: 'rgba(0,0,0,0.3)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div className="px-4 py-2" style={{ background: 'rgba(255,255,255,0.03)' }}>
            <span className="text-xs tracking-wider text-white/40" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              SCORING BREAKDOWN
            </span>
          </div>

          {[
            { label: 'Core Zone (3PT)', home: homeZoneGoals[3], away: awayZoneGoals[3], color: '#FF4400' },
            { label: 'Mid Zone (1PT)', home: homeZoneGoals[1], away: awayZoneGoals[1], color: '#FF8800' },
          ].map((stat) => (
            <div key={stat.label} className="flex items-center justify-between border-t border-white/5 px-4 py-2.5">
              <span className="min-w-[20px] text-center text-sm font-bold tabular-nums text-white" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                {stat.home}
              </span>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full" style={{ background: stat.color }} />
                <span className="text-xs text-white/50" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  {stat.label}
                </span>
              </div>
              <span className="min-w-[20px] text-center text-sm font-bold tabular-nums text-white" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                {stat.away}
              </span>
            </div>
          ))}

          <div className="flex items-center justify-between border-t border-white/10 px-4 py-2.5" style={{ background: 'rgba(255,255,255,0.02)' }}>
            <span className="text-sm font-bold tabular-nums text-white" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              {goalEvents.filter((event) => event.teamId === homeTeam).length}
            </span>
            <span className="text-xs font-bold text-white/60" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              TOTAL GOALS
            </span>
            <span className="text-sm font-bold tabular-nums text-white" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              {goalEvents.filter((event) => event.teamId === awayTeam).length}
            </span>
          </div>
        </motion.div>

        {isSeasonMatch && (
          <>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.58 }}
              className="mt-4 w-full rounded-xl border border-orange-400/15 bg-orange-500/8 p-4"
            >
              <p className="text-xs uppercase tracking-[0.25em] text-orange-200">{seasonSummary.eyebrow}</p>
              <p className="mt-2 text-lg font-bold text-white" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                {seasonSummary.title}
              </p>
              <p className="mt-1 text-sm text-white/70">{seasonSummary.body}</p>
            </motion.div>

            {leaderCards.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.68 }}
                className="mt-4 grid w-full gap-3 sm:grid-cols-2"
              >
                {leaderCards.map((leader) => (
                  <div
                    key={leader.key}
                    className="rounded-xl border border-white/10 bg-white/5 p-4"
                  >
                    <p className="text-[11px] uppercase tracking-[0.25em] text-white/45">{leader.label}</p>
                    <p className="mt-2 text-lg font-black text-white" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                      {leader.value}
                    </p>
                    <p className="mt-1 font-semibold text-orange-200">{TEAMS[leader.teamId].name}</p>
                    <p className="mt-1 text-xs text-white/55">{leader.detail}</p>
                  </div>
                ))}
              </motion.div>
            )}
          </>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.78 }}
          className="mt-6 flex w-full flex-col gap-3"
        >
          <button
            onClick={handlePrimaryAction}
            onMouseEnter={() => setFocusIdx(0)}
            className="w-full rounded-lg py-3.5 text-lg font-bold tracking-wider text-white transition-all active:scale-95"
            style={{
              fontFamily: 'Rajdhani, sans-serif',
              background: 'linear-gradient(135deg, #FF4500 0%, #FF6B00 100%)',
              boxShadow:
                focusIdx === 0
                  ? '0 4px 30px rgba(255,69,0,0.6), 0 0 20px rgba(255,69,0,0.3)'
                  : '0 4px 20px rgba(255,69,0,0.3)',
              border:
                focusIdx === 0
                  ? '2px solid rgba(255,255,255,0.6)'
                  : '1px solid rgba(255,180,0,0.3)',
              transform: focusIdx === 0 ? 'scale(1.03)' : 'scale(1)',
            }}
          >
            {primaryLabel}
          </button>
          <button
            onClick={handleSecondaryAction}
            onMouseEnter={() => setFocusIdx(1)}
            className="w-full rounded-lg py-3 text-base font-bold tracking-wider transition-all active:scale-95"
            style={{
              fontFamily: 'Rajdhani, sans-serif',
              color: focusIdx === 1 ? '#FFFFFF' : 'rgba(255,255,255,0.7)',
              background: focusIdx === 1 ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)',
              border: focusIdx === 1 ? '2px solid rgba(255,255,255,0.4)' : '1px solid rgba(255,255,255,0.1)',
              transform: focusIdx === 1 ? 'scale(1.03)' : 'scale(1)',
            }}
          >
            MAIN MENU
          </button>
        </motion.div>
      </div>

      <style>{`
        @keyframes sparkle {
          0%, 100% { opacity: 0; transform: scale(0.5); }
          50% { opacity: 1; transform: scale(1.5); }
        }
      `}</style>
    </div>
  );
}
