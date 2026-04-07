import { useState, useCallback, useEffect } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { initAudio, playMenuSelect } from '@/lib/soundEngine';
import { playMusic, markUserInteraction, preloadMusic } from '@/lib/musicEngine';
import { useMenuGamepad } from '@/hooks/useMenuGamepad';

const HERO_URL = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663476839256/L959pTVNCfBxbsJyQ7g7yz/pyroball-ignition-hero_09a654e1.webp';

const MENU_ITEMS = [
  { label: 'PLAY', route: '/team-select', primary: true },
  { label: 'PRACTICE', route: '/practice', primary: false },
  { label: 'TEAMS', route: '/team-select', primary: false },
  { label: 'HOW TO PLAY', route: '/how-to-play', primary: false },
];

export default function Home() {
  const [, navigate] = useLocation();
  const [focusIdx, setFocusIdx] = useState(0);

  // Start menu music on mount and preload all tracks
  useEffect(() => {
    preloadMusic();
    playMusic('menu');
  }, []);

  const handleSelect = useCallback((idx: number) => {
    const item = MENU_ITEMS[idx];
    if (item) {
      initAudio();
      markUserInteraction();
      playMenuSelect();
      navigate(item.route);
    }
  }, [navigate]);

  useMenuGamepad({
    itemCount: MENU_ITEMS.length,
    selectedIndex: focusIdx,
    onSelect: handleSelect,
    onNavigate: setFocusIdx,
  });

  return (
    <div
      className="h-screen w-screen flex flex-col items-center justify-between overflow-hidden relative"
      style={{ background: '#050510' }}
    >
      {/* Full-screen hero backdrop */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `url(${HERO_URL})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center top',
          opacity: 0.85,
        }}
      />

      {/* Bottom gradient for button readability */}
      <div
        className="absolute inset-0 z-[1]"
        style={{
          background: 'linear-gradient(180deg, rgba(5,5,16,0) 0%, rgba(5,5,16,0.15) 40%, rgba(5,5,16,0.7) 65%, rgba(5,5,16,0.95) 85%, rgba(5,5,16,1) 100%)',
        }}
      />

      {/* Top vignette for cinematic feel */}
      <div
        className="absolute inset-0 z-[1] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(5,5,16,0.6) 100%)',
        }}
      />

      {/* Ember particles */}
      <div className="absolute inset-0 z-[2] overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => {
          const size = 1.5 + Math.random() * 3;
          const leftPos = 10 + Math.random() * 80;
          const dur = 5 + Math.random() * 8;
          const delay = Math.random() * 6;
          const drift = (Math.random() - 0.5) * 60;
          return (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                width: size,
                height: size,
                background: `rgba(255, ${80 + Math.random() * 120}, 0, ${0.4 + Math.random() * 0.5})`,
                left: `${leftPos}%`,
                bottom: '-3%',
                animation: `ember-rise-${i} ${dur}s linear infinite`,
                animationDelay: `${delay}s`,
                boxShadow: `0 0 ${size * 2}px rgba(255,100,0,0.4)`,
              }}
            />
          );
        })}
      </div>

      {/* Horizontal light streaks (matching the image style) */}
      <div className="absolute inset-0 z-[2] overflow-hidden pointer-events-none">
        {[...Array(4)].map((_, i) => (
          <motion.div
            key={`streak-${i}`}
            className="absolute"
            style={{
              height: 1,
              background: `linear-gradient(90deg, transparent, rgba(255,${100 + i * 40},0,${0.15 + i * 0.05}), transparent)`,
              top: `${35 + i * 8}%`,
              left: '-20%',
              right: '-20%',
            }}
            animate={{
              opacity: [0, 0.6, 0],
              x: ['-10%', '10%', '-10%'],
            }}
            transition={{
              duration: 4 + i * 1.5,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: i * 0.8,
            }}
          />
        ))}
      </div>

      {/* Spacer to push content down — the hero image IS the top content */}
      <div className="relative z-10 flex-1" />

      {/* Menu buttons at bottom */}
      <motion.div
        className="relative z-10 flex flex-col items-center gap-3 pb-12 w-full px-8"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.5, ease: 'easeOut' }}
      >
        {MENU_ITEMS.map((item, idx) => {
          const isFocused = focusIdx === idx;
          const isPrimary = item.primary;

          if (isPrimary) {
            return (
              <motion.button
                key={item.label}
                onClick={() => handleSelect(idx)}
                onMouseEnter={() => setFocusIdx(idx)}
                className="w-full max-w-xs py-4 rounded-lg font-bold text-xl tracking-wider text-white active:scale-95 transition-transform"
                style={{
                  fontFamily: 'Rajdhani, sans-serif',
                  background: 'linear-gradient(135deg, #FF4500 0%, #FF6B00 50%, #FFB800 100%)',
                  boxShadow: isFocused
                    ? '0 4px 40px rgba(255,69,0,0.8), 0 0 80px rgba(255,69,0,0.3), inset 0 1px 0 rgba(255,255,255,0.3)'
                    : '0 4px 30px rgba(255,69,0,0.5), 0 0 60px rgba(255,69,0,0.15), inset 0 1px 0 rgba(255,255,255,0.2)',
                  border: isFocused
                    ? '2px solid rgba(255,255,255,0.7)'
                    : '1px solid rgba(255,180,0,0.4)',
                  transform: isFocused ? 'scale(1.05)' : 'scale(1)',
                }}
                animate={!isFocused ? {
                  boxShadow: [
                    '0 4px 30px rgba(255,69,0,0.5), 0 0 60px rgba(255,69,0,0.15)',
                    '0 4px 40px rgba(255,69,0,0.7), 0 0 80px rgba(255,69,0,0.25)',
                    '0 4px 30px rgba(255,69,0,0.5), 0 0 60px rgba(255,69,0,0.15)',
                  ],
                } : undefined}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              >
                {item.label}
              </motion.button>
            );
          }

          return (
            <button
              key={item.label}
              onClick={() => handleSelect(idx)}
              onMouseEnter={() => setFocusIdx(idx)}
              className="w-full max-w-xs py-3 rounded-lg font-bold text-lg tracking-wider active:scale-95 transition-all"
              style={{
                fontFamily: 'Rajdhani, sans-serif',
                color: isFocused ? '#FFFFFF' : 'rgba(255,255,255,0.7)',
                background: isFocused
                  ? 'linear-gradient(135deg, rgba(255,100,0,0.2) 0%, rgba(255,100,0,0.08) 100%)'
                  : item.label === 'TEAMS'
                    ? 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)'
                    : 'rgba(255,255,255,0.04)',
                boxShadow: isFocused
                  ? '0 2px 20px rgba(255,100,0,0.3)'
                  : '0 2px 12px rgba(0,0,0,0.3)',
                border: isFocused
                  ? '2px solid rgba(255,180,0,0.6)'
                  : '1px solid rgba(255,255,255,0.12)',
                backdropFilter: 'blur(12px)',
                transform: isFocused ? 'scale(1.03)' : 'scale(1)',
              }}
            >
              {item.label}
            </button>
          );
        })}

        {/* Version tag */}
        <p className="text-white/20 text-[10px] mt-2 tracking-widest" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
          v1.0 — FIRST FIRE
        </p>
      </motion.div>

      {/* CSS animations for ember particles */}
      <style>{`
        ${[...Array(20)].map((_, i) => {
          const drift = (Math.random() - 0.5) * 80;
          return `@keyframes ember-rise-${i} {
            0% { transform: translateY(0) translateX(0) scale(1); opacity: 0; }
            8% { opacity: 1; }
            50% { transform: translateY(-50vh) translateX(${drift * 0.5}px) scale(0.8); opacity: 0.7; }
            100% { transform: translateY(-105vh) translateX(${drift}px) scale(0.3); opacity: 0; }
          }`;
        }).join('\n')}
      `}</style>
    </div>
  );
}
