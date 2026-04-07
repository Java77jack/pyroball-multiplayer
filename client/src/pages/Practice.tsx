import { useState, useCallback, useEffect } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { useGameContext } from '@/contexts/GameContext';
import { useMenuGamepad } from '@/hooks/useMenuGamepad';
import { initAudio, playMenuSelect } from '@/lib/soundEngine';
import { playMusic, markUserInteraction } from '@/lib/musicEngine';
import { TEAMS, ASSET_URLS } from '@/lib/gameConstants';

// ========== DRILL DEFINITIONS ==========
export interface DrillDef {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  icon: string;
  color: string;
  glow: string;
  goal: string;
  controls: string;
  targetCount: number;
  timeLimit: number; // seconds, 0 = unlimited
}

export const DRILLS: DrillDef[] = [
  {
    id: 'aerial_shot',
    name: 'AERIAL SHOT',
    subtitle: 'Jump → Shoot',
    description: 'Launch yourself skyward and fire from above. Time your jump, then shoot at the peak for maximum arc and power.',
    icon: '🚀',
    color: '#00B4D8',
    glow: 'rgba(0,180,216,0.6)',
    goal: 'Score 7 aerial shots',
    controls: 'Y → A (or Q → J)',
    targetCount: 7,
    timeLimit: 120,
  },
  {
    id: 'spin_shot',
    name: 'SPIN SHOT',
    subtitle: 'Spin → Shoot',
    description: 'Spin past defenders and fire an unstoppable shot. The spin window gives you +40% power and zero spread.',
    icon: '🌀',
    color: '#FF6B00',
    glow: 'rgba(255,107,0,0.6)',
    goal: 'Score 5 spin shots',
    controls: 'LB → A (or E → J)',
    targetCount: 5,
    timeLimit: 120,
  },
  {
    id: 'no_look_pass',
    name: 'NO-LOOK PASS',
    subtitle: 'Spin → Pass',
    description: 'Spin and dish to a teammate for a speed burst. Chain into a goal for maximum style points.',
    icon: '👀',
    color: '#9B59B6',
    glow: 'rgba(155,89,182,0.6)',
    goal: 'Complete 5 no-look passes',
    controls: 'LB → B (or E → K)',
    targetCount: 5,
    timeLimit: 120,
  },
  {
    id: 'aerial_tornado',
    name: 'AERIAL TORNADO',
    subtitle: 'Jump + Spin → Shoot',
    description: 'The ultimate combo. Jump, spin mid-air, then fire for 2x power and slow-motion glory.',
    icon: '🌪️',
    color: '#FF4500',
    glow: 'rgba(255,69,0,0.6)',
    goal: 'Land 3 aerial tornados',
    controls: 'Y + LB → A (or Q + E → J)',
    targetCount: 3,
    timeLimit: 180,
  },
  {
    id: 'chain_combo',
    name: 'CHAIN COMBO',
    subtitle: 'Pass → Switch → Score',
    description: 'No-look pass to a teammate, switch to them, then score. Master the full fast-break sequence.',
    icon: '⛓️',
    color: '#FFB800',
    glow: 'rgba(255,184,0,0.6)',
    goal: 'Complete 3 chain combos',
    controls: 'LB→B, RB, then Shoot',
    targetCount: 3,
    timeLimit: 180,
  },
  {
    id: 'on_fire_sprint',
    name: 'ON FIRE SPRINT',
    subtitle: 'Score 3 in a row!',
    description: 'Score 3 unanswered goals to trigger ON FIRE mode. Use any combo moves you\'ve learned to dominate.',
    icon: '🔥',
    color: '#FF0000',
    glow: 'rgba(255,0,0,0.6)',
    goal: 'Trigger ON FIRE mode',
    controls: 'Use all combos!',
    targetCount: 1,
    timeLimit: 0,
  },
];

// ========== PRACTICE DRILL SELECT SCREEN ==========
export default function Practice() {
  const [, navigate] = useLocation();
  const { homeTeam } = useGameContext();
  const [focusIdx, setFocusIdx] = useState(0);
  const [selectedDrill, setSelectedDrill] = useState<DrillDef | null>(null);
  const teamData = TEAMS[homeTeam] || TEAMS.inferno;

  useEffect(() => {
    markUserInteraction();
    playMusic('teamSelect');
  }, []);

  const handleSelect = useCallback((idx: number) => {
    initAudio();
    markUserInteraction();
    playMenuSelect();
    setSelectedDrill(DRILLS[idx]);
  }, []);

  const handleBack = useCallback(() => {
    if (selectedDrill) {
      setSelectedDrill(null);
    } else {
      navigate('/');
    }
  }, [selectedDrill, navigate]);

  const handleStartDrill = useCallback(() => {
    if (selectedDrill) {
      playMenuSelect();
      navigate(`/practice-game?drill=${selectedDrill.id}`);
    }
  }, [selectedDrill, navigate]);

  // Gamepad navigation
  useMenuGamepad({
    itemCount: selectedDrill ? 2 : DRILLS.length,
    selectedIndex: focusIdx,
    onSelect: selectedDrill ? (idx: number) => {
      if (idx === 0) handleStartDrill();
      else handleBack();
    } : handleSelect,
    onNavigate: setFocusIdx,
    onBack: handleBack,
    columns: selectedDrill ? 1 : 2,
  });

  // Reset focus when toggling between list and detail
  useEffect(() => {
    setFocusIdx(0);
  }, [selectedDrill]);

  // ========== DRILL DETAIL VIEW ==========
  if (selectedDrill) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center overflow-hidden relative" style={{ background: '#050510' }}>
        {/* Background */}
        <div className="absolute inset-0 z-0" style={{
          backgroundImage: `url(${ASSET_URLS.arenaBg})`,
          backgroundSize: 'cover', backgroundPosition: 'center',
          opacity: 0.15, filter: 'blur(4px)',
        }} />
        <div className="absolute inset-0 z-[1]" style={{
          background: `radial-gradient(ellipse at center, ${selectedDrill.glow.replace('0.6', '0.15')}, transparent 70%)`,
        }} />

        <motion.div
          className="relative z-10 flex flex-col items-center gap-6 max-w-lg w-full px-6"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Drill icon & name */}
          <div className="text-center">
            <div className="text-5xl mb-2">{selectedDrill.icon}</div>
            <h1 className="text-3xl font-black tracking-wider" style={{
              fontFamily: 'Rajdhani, sans-serif',
              color: selectedDrill.color,
              textShadow: `0 0 20px ${selectedDrill.glow}`,
            }}>{selectedDrill.name}</h1>
            <p className="text-white/50 text-sm mt-1" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              {selectedDrill.subtitle}
            </p>
          </div>

          {/* Description card */}
          <div className="w-full rounded-xl p-5" style={{
            background: 'rgba(255,255,255,0.05)',
            border: `1px solid ${selectedDrill.color}33`,
            backdropFilter: 'blur(8px)',
          }}>
            <p className="text-white/80 text-sm leading-relaxed mb-4" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              {selectedDrill.description}
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg p-3" style={{ background: 'rgba(0,0,0,0.3)' }}>
                <div className="text-white/40 text-[10px] uppercase tracking-widest mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Objective</div>
                <div className="text-white font-bold text-sm" style={{ fontFamily: 'Rajdhani, sans-serif' }}>{selectedDrill.goal}</div>
              </div>
              <div className="rounded-lg p-3" style={{ background: 'rgba(0,0,0,0.3)' }}>
                <div className="text-white/40 text-[10px] uppercase tracking-widest mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Controls</div>
                <div className="text-white font-bold text-sm" style={{ fontFamily: 'Rajdhani, sans-serif' }}>{selectedDrill.controls}</div>
              </div>
              <div className="rounded-lg p-3" style={{ background: 'rgba(0,0,0,0.3)' }}>
                <div className="text-white/40 text-[10px] uppercase tracking-widest mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Time Limit</div>
                <div className="text-white font-bold text-sm" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                  {selectedDrill.timeLimit > 0 ? `${Math.floor(selectedDrill.timeLimit / 60)}:${(selectedDrill.timeLimit % 60).toString().padStart(2, '0')}` : 'UNLIMITED'}
                </div>
              </div>
              <div className="rounded-lg p-3" style={{ background: 'rgba(0,0,0,0.3)' }}>
                <div className="text-white/40 text-[10px] uppercase tracking-widest mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Team</div>
                <div className="font-bold text-sm" style={{ fontFamily: 'Rajdhani, sans-serif', color: teamData.secondary }}>{teamData.name}</div>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex flex-col gap-3 w-full max-w-xs">
            <motion.button
              onClick={handleStartDrill}
              onMouseEnter={() => setFocusIdx(0)}
              className="w-full py-4 rounded-lg font-bold text-xl tracking-wider text-white active:scale-95 transition-transform"
              style={{
                fontFamily: 'Rajdhani, sans-serif',
                background: `linear-gradient(135deg, ${selectedDrill.color} 0%, ${selectedDrill.color}CC 100%)`,
                boxShadow: focusIdx === 0
                  ? `0 4px 40px ${selectedDrill.glow}, inset 0 1px 0 rgba(255,255,255,0.3)`
                  : `0 4px 20px ${selectedDrill.glow.replace('0.6', '0.3')}`,
                border: focusIdx === 0 ? '2px solid rgba(255,255,255,0.7)' : '1px solid rgba(255,255,255,0.2)',
                transform: focusIdx === 0 ? 'scale(1.05)' : 'scale(1)',
              }}
            >
              START DRILL
            </motion.button>
            <button
              onClick={handleBack}
              onMouseEnter={() => setFocusIdx(1)}
              className="w-full py-3 rounded-lg font-bold text-lg tracking-wider active:scale-95 transition-all"
              style={{
                fontFamily: 'Rajdhani, sans-serif',
                color: focusIdx === 1 ? '#FFFFFF' : 'rgba(255,255,255,0.5)',
                background: focusIdx === 1 ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)',
                border: focusIdx === 1 ? '2px solid rgba(255,255,255,0.4)' : '1px solid rgba(255,255,255,0.1)',
              }}
            >
              BACK
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ========== DRILL LIST VIEW ==========
  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden relative" style={{ background: '#050510' }}>
      {/* Background */}
      <div className="absolute inset-0 z-0" style={{
        backgroundImage: `url(${ASSET_URLS.arenaBg})`,
        backgroundSize: 'cover', backgroundPosition: 'center',
        opacity: 0.12, filter: 'blur(4px)',
      }} />
      <div className="absolute inset-0 z-[1]" style={{
        background: 'linear-gradient(180deg, rgba(5,5,16,0.3) 0%, rgba(5,5,16,0.95) 100%)',
      }} />

      {/* Header */}
      <div className="relative z-10 pt-4 px-6">
        <button
          onClick={handleBack}
          className="text-white/50 hover:text-white text-sm mb-2 transition-colors"
          style={{ fontFamily: 'Space Grotesk, sans-serif' }}
        >
          ← Back
        </button>
        <h1 className="text-3xl font-black tracking-wider" style={{
          fontFamily: 'Rajdhani, sans-serif',
          background: 'linear-gradient(135deg, #FF4500, #FFB800)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>PRACTICE MODE</h1>
        <p className="text-white/40 text-sm" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
          Master combo moves with structured drills
        </p>
      </div>

      {/* Drill grid */}
      <motion.div
        className="relative z-10 flex-1 overflow-y-auto px-6 py-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div className="grid grid-cols-2 gap-3 max-w-2xl mx-auto">
          {DRILLS.map((drill, idx) => {
            const isFocused = focusIdx === idx;
            return (
              <motion.button
                key={drill.id}
                onClick={() => handleSelect(idx)}
                onMouseEnter={() => setFocusIdx(idx)}
                className="text-left rounded-xl p-4 transition-all active:scale-95"
                style={{
                  background: isFocused
                    ? `linear-gradient(135deg, ${drill.color}22, ${drill.color}11)`
                    : 'rgba(255,255,255,0.03)',
                  border: isFocused
                    ? `2px solid ${drill.color}88`
                    : '1px solid rgba(255,255,255,0.08)',
                  boxShadow: isFocused
                    ? `0 4px 30px ${drill.glow.replace('0.6', '0.3')}, inset 0 0 20px ${drill.glow.replace('0.6', '0.05')}`
                    : 'none',
                  transform: isFocused ? 'scale(1.03)' : 'scale(1)',
                }}
                whileHover={{ scale: 1.03 }}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{drill.icon}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm tracking-wider truncate" style={{
                      fontFamily: 'Rajdhani, sans-serif',
                      color: isFocused ? drill.color : 'rgba(255,255,255,0.8)',
                    }}>{drill.name}</h3>
                    <p className="text-white/40 text-[11px] mt-0.5" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                      {drill.subtitle}
                    </p>
                    <p className="text-white/25 text-[10px] mt-1 line-clamp-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                      {drill.goal}
                    </p>
                  </div>
                </div>

                {/* Difficulty indicator */}
                <div className="flex gap-1 mt-3">
                  {[...Array(drill.targetCount > 5 ? 3 : drill.targetCount > 3 ? 2 : 1)].map((_, i) => (
                    <div key={i} className="h-1 flex-1 rounded-full" style={{
                      background: isFocused ? drill.color : 'rgba(255,255,255,0.15)',
                      opacity: isFocused ? 1 : 0.5,
                    }} />
                  ))}
                </div>
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      {/* Bottom hint */}
      <div className="relative z-10 pb-4 text-center">
        <p className="text-white/20 text-[10px]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
          D-Pad / Arrows to browse · A / Enter to select · B / Esc to go back
        </p>
      </div>
    </div>
  );
}
