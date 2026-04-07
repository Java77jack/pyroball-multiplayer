import { useState, useCallback, useEffect } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { TEAMS, ASSET_URLS } from '@/lib/gameConstants';
import { useGameContext } from '@/contexts/GameContext';
import { useMenuGamepad } from '@/hooks/useMenuGamepad';
import { playMusic, markUserInteraction } from '@/lib/musicEngine';

export default function MatchResults() {
  const [, navigate] = useLocation();
  const { homeTeam, awayTeam, finalScore, goalEvents, resetMatch } = useGameContext();

  // Start results music
  useEffect(() => {
    markUserInteraction();
    playMusic('results');
  }, []);

  const home = TEAMS[homeTeam];
  const away = TEAMS[awayTeam];
  const homeWins = finalScore.home > finalScore.away;
  const isDraw = finalScore.home === finalScore.away;
  const winner = homeWins ? home : away;

  // Calculate zone stats
  const homeZoneGoals = { 1: 0, 2: 0, 3: 0 };
  const awayZoneGoals = { 1: 0, 2: 0, 3: 0 };
  goalEvents.forEach(e => {
    if (e.teamId === homeTeam) {
      homeZoneGoals[e.zone as 1 | 2 | 3]++;
    } else {
      awayZoneGoals[e.zone as 1 | 2 | 3]++;
    }
  });

  const [focusIdx, setFocusIdx] = useState(0);

  const handlePlayAgain = () => {
    resetMatch();
    navigate('/team-select');
  };

  const handleGamepadSelect = useCallback((idx: number) => {
    if (idx === 0) handlePlayAgain();
    else navigate('/');
  }, []);

  useMenuGamepad({
    itemCount: 2,
    selectedIndex: focusIdx,
    onSelect: handleGamepadSelect,
    onNavigate: setFocusIdx,
    onBack: () => navigate('/'),
  });

  return (
    <div
      className="h-screen w-screen flex flex-col items-center overflow-hidden relative"
      style={{ background: '#0a0a1a' }}
    >
      {/* Background */}
      <div className="absolute inset-0 z-0" style={{
        backgroundImage: `url(${ASSET_URLS.menuBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        opacity: 0.2,
      }} />
      <div className="absolute inset-0 z-0" style={{
        background: 'radial-gradient(ellipse at center top, rgba(255,180,0,0.1) 0%, rgba(10,10,26,0.95) 60%)',
      }} />

      {/* Celebration particles */}
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

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center w-full max-w-sm px-6 pt-12">
        {/* Match Over */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <p className="text-white/40 text-sm tracking-[0.3em] mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            MATCH OVER
          </p>

          {/* Trophy */}
          <div className="text-5xl mb-3">🏆</div>

          {/* Winner */}
          <h1
            className="text-3xl font-bold tracking-wider"
            style={{
              fontFamily: 'Rajdhani, sans-serif',
              color: isDraw ? '#FFB800' : winner?.secondary,
              filter: `drop-shadow(0 0 10px ${isDraw ? 'rgba(255,180,0,0.3)' : winner?.glow + '44'})`,
            }}
          >
            {isDraw ? 'DRAW!' : `${winner?.name.toUpperCase()} WINS!`}
          </h1>
        </motion.div>

        {/* Score */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex items-center justify-center gap-6 mt-6 w-full py-4 rounded-xl"
          style={{
            background: 'rgba(0,0,0,0.4)',
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <div className="flex flex-col items-center">
            <img src={home?.logo} alt={home?.name} className="w-10 h-10 object-contain mb-1" style={{ filter: `drop-shadow(0 0 6px ${home?.glow}66)` }} />
            <span className="text-white/60 text-xs" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{home?.name}</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-white font-bold text-4xl tabular-nums" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              {finalScore.home}
            </span>
            <span className="text-white/20 text-2xl">—</span>
            <span className="text-white font-bold text-4xl tabular-nums" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              {finalScore.away}
            </span>
          </div>
          <div className="flex flex-col items-center">
            <img src={away?.logo} alt={away?.name} className="w-10 h-10 object-contain mb-1" style={{ filter: `drop-shadow(0 0 6px ${away?.glow}66)` }} />
            <span className="text-white/60 text-xs" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{away?.name}</span>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="w-full mt-4 rounded-xl overflow-hidden"
          style={{
            background: 'rgba(0,0,0,0.3)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div className="px-4 py-2" style={{ background: 'rgba(255,255,255,0.03)' }}>
            <span className="text-white/40 text-xs tracking-wider" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              SCORING BREAKDOWN
            </span>
          </div>

          {[
            { label: 'Core Zone (3PT)', home: homeZoneGoals[3], away: awayZoneGoals[3], color: '#FF4400' },
            { label: 'Mid Zone (1PT)', home: homeZoneGoals[1], away: awayZoneGoals[1], color: '#FF8800' },
          ].map((stat) => (
            <div key={stat.label} className="flex items-center justify-between px-4 py-2.5 border-t border-white/5">
              <span className="text-white font-bold text-sm tabular-nums" style={{ fontFamily: 'Rajdhani, sans-serif', minWidth: 20, textAlign: 'center' }}>
                {stat.home}
              </span>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ background: stat.color }} />
                <span className="text-white/50 text-xs" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  {stat.label}
                </span>
              </div>
              <span className="text-white font-bold text-sm tabular-nums" style={{ fontFamily: 'Rajdhani, sans-serif', minWidth: 20, textAlign: 'center' }}>
                {stat.away}
              </span>
            </div>
          ))}

          <div className="flex items-center justify-between px-4 py-2.5 border-t border-white/10" style={{ background: 'rgba(255,255,255,0.02)' }}>
            <span className="text-white font-bold text-sm tabular-nums" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              {goalEvents.filter(e => e.teamId === homeTeam).length}
            </span>
            <span className="text-white/60 text-xs font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              TOTAL GOALS
            </span>
            <span className="text-white font-bold text-sm tabular-nums" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              {goalEvents.filter(e => e.teamId === awayTeam).length}
            </span>
          </div>
        </motion.div>

        {/* Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="flex flex-col gap-3 w-full mt-6"
        >
          <button
            onClick={handlePlayAgain}
            onMouseEnter={() => setFocusIdx(0)}
            className="w-full py-3.5 rounded-lg font-bold text-lg tracking-wider text-white active:scale-95 transition-all"
            style={{
              fontFamily: 'Rajdhani, sans-serif',
              background: 'linear-gradient(135deg, #FF4500 0%, #FF6B00 100%)',
              boxShadow: focusIdx === 0
                ? '0 4px 30px rgba(255,69,0,0.6), 0 0 20px rgba(255,69,0,0.3)'
                : '0 4px 20px rgba(255,69,0,0.3)',
              border: focusIdx === 0
                ? '2px solid rgba(255,255,255,0.6)'
                : '1px solid rgba(255,180,0,0.3)',
              transform: focusIdx === 0 ? 'scale(1.03)' : 'scale(1)',
            }}
          >
            PLAY AGAIN
          </button>
          <button
            onClick={() => navigate('/')}
            onMouseEnter={() => setFocusIdx(1)}
            className="w-full py-3 rounded-lg font-bold text-base tracking-wider active:scale-95 transition-all"
            style={{
              fontFamily: 'Rajdhani, sans-serif',
              color: focusIdx === 1 ? '#FFFFFF' : 'rgba(255,255,255,0.7)',
              background: focusIdx === 1
                ? 'rgba(255,255,255,0.12)'
                : 'rgba(255,255,255,0.06)',
              border: focusIdx === 1
                ? '2px solid rgba(255,255,255,0.4)'
                : '1px solid rgba(255,255,255,0.1)',
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
