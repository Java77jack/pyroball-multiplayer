import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { TEAMS, ASSET_URLS } from '@/lib/gameConstants';
import { useGameContext } from '@/contexts/GameContext';
import { playGoalHorn } from '@/lib/soundEngine';

export default function VSScreen() {
  const [, navigate] = useLocation();
  const { homeTeam, awayTeam } = useGameContext();
  const [phase, setPhase] = useState<'enter' | 'clash' | 'flash' | 'exit'>('enter');
  const skippedRef = useRef(false);

  const home = TEAMS[homeTeam];
  const away = TEAMS[awayTeam];

  const skipToGame = () => {
    if (skippedRef.current) return;
    skippedRef.current = true;
    navigate('/game');
  };

  useEffect(() => {
    // Phase timeline
    const t1 = setTimeout(() => setPhase('clash'), 1200);   // Logos slam together
    const t2 = setTimeout(() => {
      setPhase('flash');
      try { playGoalHorn(); } catch {}
    }, 2000);  // White flash + VS ignites
    const t3 = setTimeout(() => setPhase('exit'), 3400);    // Start exit
    const t4 = setTimeout(() => skipToGame(), 3900);   // Navigate to game

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [navigate]);

  // Keyboard skip (Enter, Space, Escape)
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
        skipToGame();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // Gamepad skip (A button or Start button)
  useEffect(() => {
    const prevButtons = { current: [] as boolean[] };
    let rafId = 0;

    const poll = () => {
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      let gp: Gamepad | null = null;
      for (const g of gamepads) { if (g && g.connected) { gp = g; break; } }

      if (gp) {
        const buttons = gp.buttons.map(b => b.pressed);
        const prev = prevButtons.current;
        const justPressed = (idx: number) => buttons[idx] && !prev[idx];

        // A button (0) or Start button (9) to skip
        if (justPressed(0) || justPressed(9)) {
          skipToGame();
        }

        prevButtons.current = buttons;
      }

      rafId = requestAnimationFrame(poll);
    };

    rafId = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <div
      className="h-screen w-screen overflow-hidden relative cursor-pointer"
      style={{ background: '#050510' }}
      onClick={skipToGame}
    >
      {/* Background arena image — HQ arena */}
      <div className="absolute inset-0 z-0" style={{
        backgroundImage: `url(${ASSET_URLS.arenaHQ})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        opacity: 0.25,
      }} />
      {/* Dark overlay for readability */}
      <div className="absolute inset-0 z-0" style={{
        background: 'radial-gradient(ellipse at center, rgba(5,5,16,0.3) 0%, rgba(5,5,16,0.7) 100%)',
      }} />

      {/* Diagonal split background */}
      <motion.div
        className="absolute inset-0 z-[1]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Home team side (left/top) */}
        <div className="absolute inset-0" style={{
          clipPath: 'polygon(0 0, 100% 0, 45% 100%, 0 100%)',
          background: `linear-gradient(135deg, ${home?.primary}44 0%, ${home?.secondary}15 60%, transparent 100%)`,
        }} />
        {/* Away team side (right/bottom) */}
        <div className="absolute inset-0" style={{
          clipPath: 'polygon(55% 0, 100% 0, 100% 100%, 0 100%)',
          background: `linear-gradient(315deg, ${away?.primary}44 0%, ${away?.secondary}15 60%, transparent 100%)`,
        }} />
        {/* Center diagonal slash */}
        <motion.div
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: phase === 'clash' || phase === 'flash' || phase === 'exit' ? 1 : 0 }}
          transition={{ duration: 0.3 }}
          style={{
            clipPath: 'polygon(45% 0, 55% 0, 55% 100%, 45% 100%)',
            background: 'linear-gradient(180deg, rgba(255,180,0,0.3) 0%, rgba(255,69,0,0.4) 50%, rgba(255,180,0,0.3) 100%)',
          }}
        />
      </motion.div>

      {/* Spark particles along the diagonal */}
      <AnimatePresence>
        {(phase === 'clash' || phase === 'flash') && (
          <div className="absolute inset-0 z-[5] pointer-events-none">
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute rounded-full"
                initial={{
                  x: '50%',
                  y: `${10 + (i / 20) * 80}%`,
                  scale: 0,
                  opacity: 1,
                }}
                animate={{
                  x: `${50 + (Math.random() - 0.5) * 60}%`,
                  y: `${10 + (i / 20) * 80 + (Math.random() - 0.5) * 20}%`,
                  scale: [0, 1.5, 0],
                  opacity: [1, 1, 0],
                }}
                transition={{
                  duration: 0.6 + Math.random() * 0.5,
                  delay: Math.random() * 0.3,
                  ease: 'easeOut',
                }}
                style={{
                  width: 2 + Math.random() * 4,
                  height: 2 + Math.random() * 4,
                  background: `rgba(255, ${150 + Math.random() * 105}, ${Math.random() * 50}, 1)`,
                  boxShadow: '0 0 6px rgba(255,180,0,0.8)',
                }}
              />
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Home team logo (left side) */}
      <motion.div
        className="absolute z-[10] flex items-center justify-center"
        style={{ left: '5%', top: '50%', width: '40%', height: '40%' }}
        initial={{ x: '-120%', y: '-50%', rotate: -15, scale: 1.2 }}
        animate={
          phase === 'enter'
            ? { x: '0%', y: '-50%', rotate: -5, scale: 1 }
            : phase === 'clash'
            ? { x: '15%', y: '-50%', rotate: 0, scale: 1.1 }
            : phase === 'flash'
            ? { x: '10%', y: '-50%', rotate: -3, scale: 1.05 }
            : { x: '-120%', y: '-50%', rotate: -15, scale: 0.8, opacity: 0 }
        }
        transition={
          phase === 'enter'
            ? { type: 'spring', stiffness: 100, damping: 15, duration: 1 }
            : phase === 'clash'
            ? { type: 'spring', stiffness: 300, damping: 12 }
            : phase === 'exit'
            ? { duration: 0.4, ease: 'easeIn' }
            : { duration: 0.3 }
        }
      >
        <img
          src={home?.logo}
          alt={home?.name}
          className="w-full h-full object-contain pointer-events-none"
          style={{
            filter: `drop-shadow(0 0 20px ${home?.glow}88) drop-shadow(0 0 40px ${home?.glow}44)`,
          }}
        />
      </motion.div>

      {/* Home team name */}
      <motion.div
        className="absolute z-[10]"
        style={{ left: '8%', bottom: '22%' }}
        initial={{ opacity: 0, x: -50 }}
        animate={
          phase === 'exit'
            ? { opacity: 0, x: -80 }
            : { opacity: phase === 'enter' ? 0 : 1, x: 0 }
        }
        transition={{ delay: phase === 'clash' ? 0.2 : 0, duration: 0.4 }}
      >
        <h2
          className="font-bold tracking-[0.15em]"
          style={{
            fontFamily: 'Rajdhani, sans-serif',
            fontSize: 28,
            color: home?.secondary,
            textShadow: `0 0 15px ${home?.glow}66, 0 2px 4px rgba(0,0,0,0.8)`,
          }}
        >
          {home?.name.toUpperCase()}
        </h2>
      </motion.div>

      {/* Away team logo (right side) */}
      <motion.div
        className="absolute z-[10] flex items-center justify-center"
        style={{ right: '5%', top: '50%', width: '40%', height: '40%' }}
        initial={{ x: '120%', y: '-50%', rotate: 15, scale: 1.2 }}
        animate={
          phase === 'enter'
            ? { x: '0%', y: '-50%', rotate: 5, scale: 1 }
            : phase === 'clash'
            ? { x: '-15%', y: '-50%', rotate: 0, scale: 1.1 }
            : phase === 'flash'
            ? { x: '-10%', y: '-50%', rotate: 3, scale: 1.05 }
            : { x: '120%', y: '-50%', rotate: 15, scale: 0.8, opacity: 0 }
        }
        transition={
          phase === 'enter'
            ? { type: 'spring', stiffness: 100, damping: 15, duration: 1 }
            : phase === 'clash'
            ? { type: 'spring', stiffness: 300, damping: 12 }
            : phase === 'exit'
            ? { duration: 0.4, ease: 'easeIn' }
            : { duration: 0.3 }
        }
      >
        <img
          src={away?.logo}
          alt={away?.name}
          className="w-full h-full object-contain pointer-events-none"
          style={{
            filter: `drop-shadow(0 0 20px ${away?.glow}88) drop-shadow(0 0 40px ${away?.glow}44)`,
          }}
        />
      </motion.div>

      {/* Away team name */}
      <motion.div
        className="absolute z-[10]"
        style={{ right: '8%', bottom: '22%' }}
        initial={{ opacity: 0, x: 50 }}
        animate={
          phase === 'exit'
            ? { opacity: 0, x: 80 }
            : { opacity: phase === 'enter' ? 0 : 1, x: 0 }
        }
        transition={{ delay: phase === 'clash' ? 0.2 : 0, duration: 0.4 }}
      >
        <h2
          className="font-bold tracking-[0.15em] text-right"
          style={{
            fontFamily: 'Rajdhani, sans-serif',
            fontSize: 28,
            color: away?.secondary,
            textShadow: `0 0 15px ${away?.glow}66, 0 2px 4px rgba(0,0,0,0.8)`,
          }}
        >
          {away?.name.toUpperCase()}
        </h2>
      </motion.div>

      {/* VS text */}
      <motion.div
        className="absolute z-[15] left-1/2 top-1/2"
        style={{ transform: 'translate(-50%, -50%)' }}
        initial={{ scale: 0, opacity: 0, rotate: -20 }}
        animate={
          phase === 'clash' || phase === 'flash'
            ? { scale: [0, 1.6, 1], opacity: 1, rotate: 0 }
            : phase === 'exit'
            ? { scale: 2, opacity: 0, rotate: 10 }
            : { scale: 0, opacity: 0, rotate: -20 }
        }
        transition={
          phase === 'clash'
            ? { type: 'tween', duration: 0.5, ease: 'easeOut' }
            : { duration: 0.3 }
        }
      >
        <div className="relative">
          {/* Glow behind VS */}
          <div
            className="absolute inset-0 blur-xl"
            style={{
              background: 'radial-gradient(circle, rgba(255,180,0,0.6) 0%, rgba(255,69,0,0.3) 50%, transparent 70%)',
              transform: 'scale(3)',
            }}
          />
          <h1
            className="relative font-black"
            style={{
              fontFamily: 'Rajdhani, sans-serif',
              fontSize: 90,
              lineHeight: 1,
              color: '#fff',
              textShadow: '0 0 30px rgba(255,180,0,0.8), 0 0 60px rgba(255,69,0,0.5), 0 4px 8px rgba(0,0,0,0.9)',
              WebkitTextStroke: '2px rgba(255,140,0,0.6)',
            }}
          >
            VS
          </h1>
        </div>
      </motion.div>

      {/* White flash overlay */}
      <AnimatePresence>
        {phase === 'flash' && (
          <motion.div
            className="absolute inset-0 z-[20] pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.8, 0] }}
            transition={{ duration: 0.5, times: [0, 0.15, 1] }}
            style={{ background: 'white' }}
          />
        )}
      </AnimatePresence>

      {/* Top bar — PYROBALL FIRST FIRE */}
      <motion.div
        className="absolute top-0 left-0 right-0 z-[12] flex items-center justify-center py-6 pointer-events-none"
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: phase !== 'exit' ? 1 : 0, y: phase !== 'exit' ? 0 : -30 }}
        transition={{ delay: 0.5, duration: 0.5 }}
      >
        <div className="text-center">
          <p
            className="text-white/40 text-xs tracking-[0.4em]"
            style={{ fontFamily: 'Space Grotesk, sans-serif' }}
          >
            PYROBALL
          </p>
          <p
            className="text-white/60 text-sm tracking-[0.2em] font-bold"
            style={{ fontFamily: 'Rajdhani, sans-serif' }}
          >
            FIRST FIRE
          </p>
        </div>
      </motion.div>

      {/* Bottom bar — PRESS A TO SKIP / MATCH STARTING */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 z-[12] flex items-center justify-center py-6 pointer-events-none"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
      >
        <div className="flex items-center gap-3">
          <motion.div
            className="h-px bg-white/20"
            initial={{ width: 0 }}
            animate={{ width: 40 }}
            transition={{ delay: 0.6, duration: 0.5 }}
          />
          <p
            className="text-white/50 text-xs tracking-[0.3em]"
            style={{ fontFamily: 'Space Grotesk, sans-serif' }}
          >
            {phase === 'flash' || phase === 'exit' ? 'MATCH STARTING' : 'PRESS A / ENTER TO SKIP'}
          </p>
          <motion.div
            className="h-px bg-white/20"
            initial={{ width: 0 }}
            animate={{ width: 40 }}
            transition={{ delay: 0.6, duration: 0.5 }}
          />
        </div>
      </motion.div>

      {/* Horizontal light streaks */}
      <div className="absolute inset-0 z-[2] pointer-events-none overflow-hidden">
        {[...Array(4)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute"
            style={{
              height: 1,
              background: `linear-gradient(90deg, transparent 0%, rgba(255,180,0,${0.1 + Math.random() * 0.15}) 50%, transparent 100%)`,
              top: `${20 + i * 20}%`,
              left: '-100%',
              width: '300%',
            }}
            animate={{ x: ['0%', '30%'] }}
            transition={{
              duration: 3 + i,
              repeat: Infinity,
              repeatType: 'reverse',
              ease: 'linear',
            }}
          />
        ))}
      </div>
    </div>
  );
}
