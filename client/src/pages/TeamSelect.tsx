import { useState, useCallback, useRef, useEffect } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { TEAMS, ASSET_URLS } from '@/lib/gameConstants';
import { useGameContext } from '@/contexts/GameContext';
import type { Difficulty } from '@/contexts/GameContext';
import { playMenuSelect } from '@/lib/soundEngine';
import { playMusic, markUserInteraction } from '@/lib/musicEngine';
import { useMenuGamepad } from '@/hooks/useMenuGamepad';

const teamList = Object.values(TEAMS);

const teamAnimations: Record<string, {
  bgEffect: string;
  particles: 'fire' | 'swirl' | 'sparkle' | 'sparks';
}> = {
  inferno:   { bgEffect: 'radial-gradient(ellipse at 50% 60%, rgba(255,69,0,0.25) 0%, rgba(255,100,0,0.08) 40%, transparent 70%)', particles: 'fire' },
  vortex:    { bgEffect: 'radial-gradient(ellipse at 50% 50%, rgba(0,180,216,0.2) 0%, rgba(62,146,204,0.06) 40%, transparent 70%)', particles: 'swirl' },
  empire:    { bgEffect: 'radial-gradient(ellipse at 50% 50%, rgba(255,215,0,0.15) 0%, rgba(255,184,0,0.05) 40%, transparent 70%)', particles: 'sparkle' },
  sledge:    { bgEffect: 'radial-gradient(ellipse at 50% 70%, rgba(255,184,0,0.15) 0%, rgba(192,192,192,0.06) 40%, transparent 70%)', particles: 'sparks' },
  glaciers:  { bgEffect: 'radial-gradient(ellipse at 50% 50%, rgba(79,195,247,0.2) 0%, rgba(224,240,255,0.06) 40%, transparent 70%)', particles: 'swirl' },
  blueclaws: { bgEffect: 'radial-gradient(ellipse at 50% 50%, rgba(33,150,243,0.2) 0%, rgba(13,71,161,0.08) 40%, transparent 70%)', particles: 'swirl' },
  nightraid: { bgEffect: 'radial-gradient(ellipse at 50% 50%, rgba(206,147,216,0.2) 0%, rgba(123,31,162,0.08) 40%, transparent 70%)', particles: 'sparkle' },
  seawolves: { bgEffect: 'radial-gradient(ellipse at 50% 50%, rgba(0,191,165,0.2) 0%, rgba(0,77,64,0.08) 40%, transparent 70%)', particles: 'swirl' },
  rebellion: { bgEffect: 'radial-gradient(ellipse at 50% 60%, rgba(255,23,68,0.25) 0%, rgba(211,47,47,0.08) 40%, transparent 70%)', particles: 'fire' },
  railers:   { bgEffect: 'radial-gradient(ellipse at 50% 70%, rgba(207,216,220,0.15) 0%, rgba(144,164,174,0.06) 40%, transparent 70%)', particles: 'sparks' },
  havoc:     { bgEffect: 'radial-gradient(ellipse at 50% 50%, rgba(255,234,0,0.2) 0%, rgba(255,214,0,0.06) 40%, transparent 70%)', particles: 'sparkle' },
  wrath:     { bgEffect: 'radial-gradient(ellipse at 50% 60%, rgba(213,0,0,0.25) 0%, rgba(139,0,0,0.08) 40%, transparent 70%)', particles: 'fire' },
  sizzle:    { bgEffect: 'radial-gradient(ellipse at 50% 50%, rgba(255,64,129,0.2) 0%, rgba(233,30,99,0.06) 40%, transparent 70%)', particles: 'sparkle' },
  hoppers:   { bgEffect: 'radial-gradient(ellipse at 50% 50%, rgba(118,255,3,0.2) 0%, rgba(100,221,23,0.06) 40%, transparent 70%)', particles: 'swirl' },
  gauchos:   { bgEffect: 'radial-gradient(ellipse at 50% 50%, rgba(255,183,77,0.2) 0%, rgba(212,165,116,0.06) 40%, transparent 70%)', particles: 'sparks' },
  engineers: { bgEffect: 'radial-gradient(ellipse at 50% 60%, rgba(255,109,0,0.25) 0%, rgba(191,54,12,0.08) 40%, transparent 70%)', particles: 'fire' },
};

// Particle components
function FireParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="absolute rounded-full" style={{
          width: 2 + Math.random() * 3, height: 4 + Math.random() * 6,
          background: `rgba(${200 + Math.random() * 55}, ${50 + Math.random() * 80}, 0, ${0.5 + Math.random() * 0.5})`,
          left: `${20 + Math.random() * 60}%`, bottom: `${Math.random() * 30}%`,
          borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
          animation: `fireRise ${1.5 + Math.random() * 2}s ease-out infinite`,
          animationDelay: `${Math.random() * 2}s`,
        }} />
      ))}
    </div>
  );
}

function SwirlParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="absolute rounded-full" style={{
          width: 2 + Math.random() * 3, height: 2 + Math.random() * 3,
          background: `rgba(${Math.random() > 0.5 ? '0,180,216' : '144,224,239'}, ${0.4 + Math.random() * 0.5})`,
          left: `${50 + (Math.random() - 0.5) * 60}%`, top: `${50 + (Math.random() - 0.5) * 60}%`,
          animation: `swirlOrbit ${3 + Math.random() * 4}s linear infinite`,
          animationDelay: `${Math.random() * 3}s`,
        }} />
      ))}
    </div>
  );
}

function SparkleParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(10)].map((_, i) => (
        <div key={i} className="absolute" style={{
          width: 2 + Math.random() * 3, height: 2 + Math.random() * 3,
          background: `rgba(255, ${200 + Math.random() * 55}, ${Math.random() * 50}, ${0.6 + Math.random() * 0.4})`,
          left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`,
          borderRadius: '50%', boxShadow: '0 0 4px rgba(255,215,0,0.8)',
          animation: `sparkleFlash ${0.8 + Math.random() * 1.5}s ease-in-out infinite`,
          animationDelay: `${Math.random() * 2}s`,
        }} />
      ))}
    </div>
  );
}

function SparksParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="absolute rounded-full" style={{
          width: 2 + Math.random() * 2, height: 2 + Math.random() * 2,
          background: `rgba(255, ${150 + Math.random() * 100}, 0, ${0.6 + Math.random() * 0.4})`,
          left: `${40 + Math.random() * 20}%`, bottom: `${10 + Math.random() * 20}%`,
          animation: `sparkBurst ${0.6 + Math.random() * 1}s ease-out infinite`,
          animationDelay: `${Math.random() * 1.2}s`,
        }} />
      ))}
    </div>
  );
}

const particleComponents: Record<string, React.FC> = {
  fire: FireParticles, swirl: SwirlParticles, sparkle: SparkleParticles, sparks: SparksParticles,
};

const DIFFICULTY_OPTIONS: { id: Difficulty; label: string; desc: string; color: string; glow: string }[] = [
  { id: 'rookie', label: 'ROOKIE', desc: 'Slower AI, wider shot window', color: '#22C55E', glow: 'rgba(34,197,94,0.4)' },
  { id: 'pro', label: 'PRO', desc: 'Balanced challenge', color: '#FF8800', glow: 'rgba(255,136,0,0.4)' },
  { id: 'allstar', label: 'ALL-STAR', desc: 'Faster AI, tighter shot window', color: '#EF4444', glow: 'rgba(239,68,68,0.4)' },
];

export default function TeamSelect() {
  const [, navigate] = useLocation();
  const { setHomeTeam, setAwayTeam, difficulty, setDifficulty, resetMatch } = useGameContext();
  const [step, setStep] = useState<'home' | 'away'>('home');
  const [selectedHome, setSelectedHome] = useState<string | null>(null);
  const [selectedAway, setSelectedAway] = useState<string | null>(null);
  const [carouselIdx, setCarouselIdx] = useState(0);
  const [section, setSection] = useState<'carousel' | 'difficulty' | 'start'>('carousel');
  const carouselRef = useRef<HTMLDivElement>(null);

  // Start team select music
  useEffect(() => {
    markUserInteraction();
    playMusic('teamSelect');
  }, []);

  // Available teams for current step
  const availableTeams = step === 'away'
    ? teamList.filter(t => t.id !== selectedHome)
    : teamList;

  // Keep carouselIdx in bounds
  useEffect(() => {
    if (carouselIdx >= availableTeams.length) setCarouselIdx(0);
  }, [availableTeams.length, carouselIdx]);

  // Scroll carousel to center the focused card
  useEffect(() => {
    if (carouselRef.current) {
      const container = carouselRef.current;
      const cards = container.children;
      if (cards[carouselIdx]) {
        const card = cards[carouselIdx] as HTMLElement;
        const scrollLeft = card.offsetLeft - container.offsetWidth / 2 + card.offsetWidth / 2;
        container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
      }
    }
  }, [carouselIdx]);

  const handleSelect = (teamId: string) => {
    playMenuSelect();
    if (step === 'home') {
      setSelectedHome(teamId);
      setStep('away');
      setCarouselIdx(0);
      setSection('carousel');
    } else {
      setSelectedAway(teamId);
      setSection('difficulty');
    }
  };

  const handleStart = () => {
    if (selectedHome && selectedAway) {
      playMenuSelect();
      setHomeTeam(selectedHome);
      setAwayTeam(selectedAway);
      resetMatch();
      navigate('/vs');
    }
  };

  // Gamepad navigation — custom polling so we can handle multi-section layout
  const [gpIdx, setGpIdx] = useState(0);
  const gpPrevButtons = useRef<boolean[]>([]);
  const gpPrevAxes = useRef<number[]>([]);
  const gpLastNav = useRef(0);

  // Map gpIdx to section + local index
  useEffect(() => {
    if (section === 'carousel') {
      setCarouselIdx(gpIdx);
    }
  }, [gpIdx, section]);

  useEffect(() => {
    const NAV_COOLDOWN = 180;
    const DEAD = 0.4;
    let rafId = 0;

    const poll = () => {
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      let gp: Gamepad | null = null;
      for (const g of gamepads) { if (g && g.connected) { gp = g; break; } }

      if (gp) {
        const buttons = gp.buttons.map(b => b.pressed);
        const axes = gp.axes.slice(0, 4);
        const prev = gpPrevButtons.current;
        const now = performance.now();
        const justPressed = (idx: number) => buttons[idx] && !prev[idx];

        // A button = confirm
        if (justPressed(0)) {
          if (section === 'carousel') {
            handleSelect(availableTeams[carouselIdx]?.id);
          } else if (section === 'difficulty') {
            const di = gpIdx;
            if (di >= 0 && di < 3) {
              playMenuSelect();
              setDifficulty(DIFFICULTY_OPTIONS[di].id);
              // After selecting difficulty, move to start
              setSection('start');
            }
          } else if (section === 'start') {
            handleStart();
          }
        }

        // B button = back
        if (justPressed(1)) {
          if (section === 'start') {
            setSection('difficulty');
            setGpIdx(DIFFICULTY_OPTIONS.findIndex(o => o.id === difficulty));
          } else if (section === 'difficulty') {
            setSection('carousel');
            setSelectedAway(null);
            setGpIdx(carouselIdx);
          } else if (step === 'away') {
            setStep('home');
            setSelectedAway(null);
            setCarouselIdx(0);
            setGpIdx(0);
          } else {
            navigate('/');
          }
        }

        // Navigation
        const canNav = now - gpLastNav.current > NAV_COOLDOWN;
        if (canNav) {
          const dUp = buttons[12]; const dDown = buttons[13];
          const dLeft = buttons[14]; const dRight = buttons[15];
          const lx = axes[0] ?? 0; const ly = axes[1] ?? 0;
          const stickUp = ly < -DEAD; const stickDown = ly > DEAD;
          const stickLeft = lx < -DEAD; const stickRight = lx > DEAD;

          const prevLx = gpPrevAxes.current[0] ?? 0;
          const prevLy = gpPrevAxes.current[1] ?? 0;
          const newUp = (dUp && !prev[12]) || (stickUp && !(prevLy < -DEAD));
          const newDown = (dDown && !prev[13]) || (stickDown && !(prevLy > DEAD));
          const newLeft = (dLeft && !prev[14]) || (stickLeft && !(prevLx < -DEAD));
          const newRight = (dRight && !prev[15]) || (stickRight && !(prevLx > DEAD));

          let navigated = false;

          if (section === 'carousel') {
            if (newLeft) {
              const ni = (carouselIdx - 1 + availableTeams.length) % availableTeams.length;
              setCarouselIdx(ni); setGpIdx(ni); navigated = true;
            } else if (newRight) {
              const ni = (carouselIdx + 1) % availableTeams.length;
              setCarouselIdx(ni); setGpIdx(ni); navigated = true;
            } else if (newDown && selectedAway) {
              // Move down to difficulty section
              setSection('difficulty');
              setGpIdx(DIFFICULTY_OPTIONS.findIndex(o => o.id === difficulty));
              navigated = true;
            }
          } else if (section === 'difficulty') {
            if (newLeft) {
              setGpIdx(Math.max(0, gpIdx - 1)); navigated = true;
            } else if (newRight) {
              setGpIdx(Math.min(2, gpIdx + 1)); navigated = true;
            } else if (newUp) {
              setSection('carousel'); setGpIdx(carouselIdx); navigated = true;
            } else if (newDown) {
              setSection('start'); navigated = true;
            }
          } else if (section === 'start') {
            if (newUp) {
              setSection('difficulty');
              setGpIdx(DIFFICULTY_OPTIONS.findIndex(o => o.id === difficulty));
              navigated = true;
            }
          }

          if (navigated) gpLastNav.current = now;
        }

        gpPrevButtons.current = buttons;
        gpPrevAxes.current = axes;
      }

      rafId = requestAnimationFrame(poll);
    };

    rafId = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(rafId);
  }, [section, carouselIdx, gpIdx, availableTeams, selectedAway, step, difficulty, navigate]);

  // Touch/mouse drag for carousel
  const [dragStart, setDragStart] = useState<number | null>(null);

  const focusedTeam = availableTeams[carouselIdx];

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden relative" style={{ background: '#0a0a1a' }}>
      {/* Background */}
      <div className="absolute inset-0 z-0" style={{
        backgroundImage: `url(${ASSET_URLS.menuBg})`,
        backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.15,
      }} />
      <div className="absolute inset-0 z-0" style={{
        background: 'linear-gradient(180deg, rgba(10,10,26,0.5) 0%, rgba(10,10,26,0.95) 100%)',
      }} />

      {/* Ambient glow from focused team */}
      {focusedTeam && (
        <div className="absolute inset-0 z-0 transition-all duration-500" style={{
          background: `radial-gradient(ellipse at 50% 70%, ${focusedTeam.glow}22 0%, transparent 60%)`,
        }} />
      )}

      {/* Header */}
      <div className="relative z-10 pt-6 pb-2 px-6">
        <button
          onClick={() => step === 'away' && selectedHome ? (setStep('home'), setSelectedAway(null)) : navigate('/')}
          className="text-white/50 text-sm mb-2 hover:text-white/80 transition-colors"
          style={{ fontFamily: 'Space Grotesk, sans-serif' }}
        >
          ← Back
        </button>
        <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Rajdhani, sans-serif', letterSpacing: '0.05em' }}>
          {step === 'home' ? 'SELECT YOUR TEAM' : 'SELECT OPPONENT'}
        </h1>
        <p className="text-white/40 text-xs mt-1" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
          {step === 'home' ? 'Choose the team you want to play as' : 'Choose who you want to face'}
        </p>
      </div>

      {/* Carousel */}
      <div className="relative z-10 flex-1 flex flex-col justify-center">
        {/* Cards row */}
        <div
          ref={carouselRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide py-4 justify-center items-center"
          style={{ scrollSnapType: 'x mandatory', scrollbarWidth: 'none', msOverflowStyle: 'none', paddingLeft: 'calc(50vw - 90px)', paddingRight: 'calc(50vw - 90px)' }}
          onTouchStart={e => setDragStart(e.touches[0].clientX)}
          onTouchEnd={e => {
            if (dragStart !== null) {
              const diff = dragStart - e.changedTouches[0].clientX;
              if (Math.abs(diff) > 40) {
                const next = diff > 0
                  ? Math.min(carouselIdx + 1, availableTeams.length - 1)
                  : Math.max(carouselIdx - 1, 0);
                setCarouselIdx(next);
                setGpIdx(next);
              }
              setDragStart(null);
            }
          }}
        >
          {availableTeams.map((team, i) => {
            const isFocused = carouselIdx === i;
            const isSelected = step === 'home' ? selectedHome === team.id : selectedAway === team.id;
            const anim = teamAnimations[team.id];
            const ParticleComp = particleComponents[anim.particles];

            return (
              <motion.button
                key={team.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{
                  opacity: isFocused ? 1 : 0.5,
                  scale: isFocused ? 1 : 0.78,
                  y: isFocused ? -8 : 0,
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                onClick={() => {
                  if (isFocused) {
                    handleSelect(team.id);
                  } else {
                    setCarouselIdx(i);
                    setGpIdx(i);
                  }
                }}
                className="relative rounded-2xl overflow-hidden flex-shrink-0 active:scale-95 transition-transform"
                style={{
                  width: '180px',
                  height: '240px',
                  scrollSnapAlign: 'center',
                  background: `linear-gradient(160deg, ${team.primary}22 0%, rgba(10,10,26,0.95) 100%)`,
                  border: isSelected
                    ? `2px solid ${team.secondary}`
                    : isFocused
                      ? `2px solid ${team.secondary}88`
                      : '1px solid rgba(255,255,255,0.08)',
                  boxShadow: isFocused
                    ? `0 8px 40px ${team.glow}44, 0 0 20px ${team.glow}22`
                    : 'none',
                }}
              >
                {/* Background glow */}
                {isFocused && <div className="absolute inset-0" style={{ background: anim.bgEffect }} />}

                {/* Particles on focused card */}
                {isFocused && <ParticleComp />}

                {/* Logo */}
                <div className="absolute inset-0 flex items-center justify-center p-4">
                  <img
                    src={team.logo}
                    alt={`${team.name} logo`}
                    className="object-contain"
                    style={{
                      width: '75%', height: '55%',
                      filter: isFocused
                        ? `drop-shadow(0 0 15px ${team.glow}66)`
                        : 'brightness(0.6) saturate(0.5)',
                      transition: 'filter 0.3s ease',
                    }}
                  />
                </div>

                {/* Team name */}
                <div className="absolute bottom-0 left-0 right-0 p-2.5" style={{
                  background: 'linear-gradient(transparent, rgba(0,0,0,0.85))',
                }}>
                  <h3 className="text-center font-bold tracking-[0.12em] text-sm" style={{
                    fontFamily: 'Rajdhani, sans-serif',
                    color: isFocused ? team.secondary : 'rgba(255,255,255,0.4)',
                    textShadow: isFocused ? `0 0 10px ${team.glow}66` : 'none',
                    transition: 'color 0.3s ease',
                  }}>
                    {team.name.toUpperCase()}
                  </h3>
                </div>

                {/* Selection checkmark */}
                <AnimatePresence>
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center"
                      style={{ background: team.secondary, boxShadow: `0 0 12px ${team.glow}88` }}
                    >
                      <span className="text-[10px] font-bold" style={{ color: team.id === 'empire' ? '#1a1a1a' : '#fff' }}>✓</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            );
          })}
        </div>

        {/* Carousel dots */}
        <div className="flex justify-center gap-2 mt-3">
          {availableTeams.map((_, i) => (
            <button
              key={i}
              onClick={() => { setCarouselIdx(i); setGpIdx(i); }}
              className="rounded-full transition-all duration-300"
              style={{
                width: carouselIdx === i ? 24 : 8,
                height: 8,
                background: carouselIdx === i
                  ? (availableTeams[i]?.secondary || '#FF4500')
                  : 'rgba(255,255,255,0.2)',
                boxShadow: carouselIdx === i ? `0 0 8px ${availableTeams[i]?.glow || 'rgba(255,69,0,0.4)'}` : 'none',
              }}
            />
          ))}
        </div>

        {/* Navigation hint */}
        <p className="text-center text-white/25 text-[10px] mt-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
          ← → to browse &middot; A / Enter to select
        </p>
      </div>

      {/* Difficulty selector + Start button */}
      <AnimatePresence>
        {selectedAway && (
          <motion.div
            className="relative z-10 px-6 pb-6 pt-2"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
          >
            <div className="mb-3">
              <p className="text-white/40 text-xs tracking-[0.2em] mb-2 text-center" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                DIFFICULTY
              </p>
              <div className="flex gap-2">
                {DIFFICULTY_OPTIONS.map((opt, di) => {
                  const isActive = difficulty === opt.id;
                  const isFocusedDiff = section === 'difficulty' && (gpIdx - availableTeams.length) === di;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => { playMenuSelect(); setDifficulty(opt.id); }}
                      className="flex-1 py-2 rounded-lg font-bold text-sm tracking-wider transition-all active:scale-95"
                      style={{
                        fontFamily: 'Rajdhani, sans-serif',
                        color: isActive ? '#fff' : 'rgba(255,255,255,0.4)',
                        background: isActive
                          ? `linear-gradient(135deg, ${opt.color}33 0%, ${opt.color}11 100%)`
                          : 'rgba(255,255,255,0.04)',
                        border: isFocusedDiff
                          ? `2px solid rgba(255,255,255,0.6)`
                          : isActive
                            ? `1.5px solid ${opt.color}88`
                            : '1px solid rgba(255,255,255,0.08)',
                        boxShadow: isActive ? `0 0 15px ${opt.glow}` : 'none',
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-white/25 text-[10px] text-center mt-1" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                {DIFFICULTY_OPTIONS.find(o => o.id === difficulty)?.desc}
              </p>
            </div>

            <button
              onClick={handleStart}
              className="w-full py-3.5 rounded-xl font-bold text-lg tracking-[0.15em] text-white active:scale-95 transition-all"
              style={{
                fontFamily: 'Rajdhani, sans-serif',
                background: 'linear-gradient(135deg, #FF4500 0%, #FF6B00 100%)',
                boxShadow: section === 'start'
                  ? '0 4px 30px rgba(255,69,0,0.6), inset 0 1px 0 rgba(255,255,255,0.15), 0 0 0 2px rgba(255,255,255,0.5)'
                  : '0 4px 25px rgba(255,69,0,0.4), inset 0 1px 0 rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,180,0,0.3)',
              }}
            >
              START MATCH
            </button>
            <p className="text-center text-white/30 text-xs mt-1.5" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              {TEAMS[selectedHome!]?.name} vs {TEAMS[selectedAway]?.name}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Keyframe animations */}
      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        @keyframes fireRise {
          0% { opacity: 0; transform: translateY(0) scale(1); }
          20% { opacity: 1; }
          100% { opacity: 0; transform: translateY(-60px) scale(0.3) translateX(${Math.random() > 0.5 ? '' : '-'}${5 + Math.random() * 15}px); }
        }
        @keyframes swirlOrbit {
          0% { transform: rotate(0deg) translateX(20px) rotate(0deg) scale(1); opacity: 0.6; }
          50% { opacity: 1; transform: rotate(180deg) translateX(30px) rotate(-180deg) scale(1.3); }
          100% { transform: rotate(360deg) translateX(20px) rotate(-360deg) scale(1); opacity: 0.6; }
        }
        @keyframes sparkleFlash {
          0%, 100% { opacity: 0; transform: scale(0.3); }
          50% { opacity: 1; transform: scale(1.5); }
        }
        @keyframes sparkBurst {
          0% { opacity: 0; transform: translate(0, 0) scale(1); }
          15% { opacity: 1; }
          100% { opacity: 0; transform: translate(${Math.random() > 0.5 ? '' : '-'}${10 + Math.random() * 30}px, -${20 + Math.random() * 40}px) scale(0.2); }
        }
      `}</style>
    </div>
  );
}
