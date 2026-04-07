import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { useLocation, useSearch } from 'wouter';
import { useGameContext } from '@/contexts/GameContext';
import { usePracticeEngine } from '@/hooks/usePracticeEngine';
import { useGamepad } from '@/hooks/useGamepad';
import GameCanvas from '@/components/GameCanvas';
import GameHUD from '@/components/GameHUD';
import Joystick from '@/components/Joystick';
import ActionButtons from '@/components/ActionButtons';
import { playMusic, markUserInteraction } from '@/lib/musicEngine';
import { playMenuSelect } from '@/lib/soundEngine';
import { DRILLS, type DrillDef } from './Practice';
import { motion, AnimatePresence } from 'framer-motion';

export default function PracticeGame() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const { homeTeam } = useGameContext();
  const keysRef = useRef<Set<string>>(new Set());
  const shootingRef = useRef(false);
  const gameStartedRef = useRef(false);
  const [gamepadConnected, setGamepadConnected] = useState(false);
  const [showResults, setShowResults] = useState(false);
  // Gamepad focus for results overlay: 0 = RETRY, 1 = BACK TO DRILLS
  const [resultsFocus, setResultsFocus] = useState(0);

  // Parse drill from URL
  const drillId = useMemo(() => {
    const params = new URLSearchParams(search);
    return params.get('drill') || 'aerial_shot';
  }, [search]);

  const drill: DrillDef = useMemo(() => {
    return DRILLS.find(d => d.id === drillId) || DRILLS[0];
  }, [drillId]);

  const { gameState, drillProgress, initGame, startGame, stopGame, setJoystick, triggerAction } = usePracticeEngine(homeTeam, drill);

  // Start practice music
  useEffect(() => {
    markUserInteraction();
    playMusic('inGame');
  }, []);

  useEffect(() => {
    initGame();
    return () => { stopGame(); };
  }, [initGame, stopGame]);

  // Start game once initialized
  useEffect(() => {
    if (gameState && !gameStartedRef.current && !gameState.isPlaying && gameState.countdown === 3) {
      gameStartedRef.current = true;
      startGame();
    }
  }, [gameState, startGame]);

  // Show results when drill completes or fails
  useEffect(() => {
    if (drillProgress && (drillProgress.isComplete || drillProgress.isFailed) && !showResults) {
      const timer = setTimeout(() => {
        setShowResults(true);
        setResultsFocus(0); // Reset focus to RETRY
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [drillProgress, showResults]);

  // Keyboard controls — disabled when results overlay is showing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // When results overlay is showing, handle menu navigation instead
      if (showResults) {
        if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
          setResultsFocus(0);
        } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
          setResultsFocus(1);
        } else if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (resultsFocus === 0) handleRetry();
          else handleExit();
        } else if (e.key === 'Escape') {
          handleExit();
        }
        return;
      }

      keysRef.current.add(e.key.toLowerCase());
      if ((e.key === 'j' || e.key === 'J') && !shootingRef.current) {
        shootingRef.current = true;
        triggerAction('shootStart');
      }
      if (e.key === 'k' || e.key === 'K') triggerAction('pass');
      if (e.key === 'l' || e.key === 'L') triggerAction('steal');
      if (e.key === ' ' || e.key === 'Tab') { e.preventDefault(); triggerAction('switch'); }
      if (e.key === 'q' || e.key === 'Q') triggerAction('jump');
      if (e.key === 'e' || e.key === 'E') triggerAction('spin');
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase());
      if ((e.key === 'j' || e.key === 'J') && shootingRef.current) {
        shootingRef.current = false;
        triggerAction('shootRelease');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [triggerAction, showResults, resultsFocus]);

  // Keyboard joystick — disabled when results showing
  useEffect(() => {
    const interval = setInterval(() => {
      if (showResults) { setJoystick({ x: 0, y: 0 }); return; }
      const keys = keysRef.current;
      let x = 0, y = 0;
      if (keys.has('w') || keys.has('arrowup')) y = -1;
      if (keys.has('s') || keys.has('arrowdown')) y = 1;
      if (keys.has('a') || keys.has('arrowleft')) x = -1;
      if (keys.has('d') || keys.has('arrowright')) x = 1;
      if (x !== 0 && y !== 0) { const mag = Math.sqrt(x * x + y * y); x /= mag; y /= mag; }
      setJoystick({ x, y });
    }, 32);
    return () => clearInterval(interval);
  }, [setJoystick, showResults]);

  // Gamepad for gameplay — disabled when results showing
  const handleGamepadAction = useCallback((action: string) => {
    if (showResults) return; // Block gameplay actions when results showing
    if (action === 'shootStart') {
      if (!shootingRef.current) { shootingRef.current = true; triggerAction('shootStart'); }
    } else if (action === 'shootRelease') {
      if (shootingRef.current) { shootingRef.current = false; triggerAction('shootRelease'); }
    } else {
      triggerAction(action);
    }
  }, [triggerAction, showResults]);

  const handleGamepadMove = useCallback((v: { x: number; y: number }) => {
    if (showResults) return; // Block movement when results showing
    setJoystick(v);
  }, [setJoystick, showResults]);

  useGamepad({
    onMove: handleGamepadMove,
    onAction: handleGamepadAction,
    enabled: true,
    onConnected: () => setGamepadConnected(true),
    onDisconnected: () => setGamepadConnected(false),
  });

  useEffect(() => {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    setGamepadConnected(Array.from(pads).some(p => p && p.connected));
  }, []);

  // ========== GAMEPAD NAVIGATION FOR RESULTS OVERLAY ==========
  const resultsPrevButtons = useRef<boolean[]>([]);
  const resultsPrevAxes = useRef<number[]>([]);
  const resultsLastNav = useRef(0);

  useEffect(() => {
    if (!showResults) return;

    let rafId = 0;
    const NAV_COOLDOWN = 200;
    const DEAD = 0.4;

    const poll = () => {
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      let gp: Gamepad | null = null;
      for (const g of gamepads) { if (g && g.connected) { gp = g; break; } }

      if (gp) {
        const buttons = gp.buttons.map(b => b.pressed);
        const axes = gp.axes.slice(0, 4);
        const prev = resultsPrevButtons.current;
        const now = performance.now();
        const justPressed = (idx: number) => buttons[idx] && !prev[idx];

        // A button = confirm
        if (justPressed(0)) {
          playMenuSelect();
          if (resultsFocus === 0) handleRetry();
          else handleExit();
        }

        // B button = back to drills
        if (justPressed(1)) {
          playMenuSelect();
          handleExit();
        }

        // Navigation
        const canNav = now - resultsLastNav.current > NAV_COOLDOWN;
        if (canNav) {
          const dUp = buttons[12]; const dDown = buttons[13];
          const ly = axes[1] ?? 0;
          const stickUp = ly < -DEAD; const stickDown = ly > DEAD;
          const prevLy = resultsPrevAxes.current[1] ?? 0;

          const newUp = (dUp && !prev[12]) || (stickUp && !(prevLy < -DEAD));
          const newDown = (dDown && !prev[13]) || (stickDown && !(prevLy > DEAD));

          if (newUp && resultsFocus > 0) {
            setResultsFocus(0);
            resultsLastNav.current = now;
          } else if (newDown && resultsFocus < 1) {
            setResultsFocus(1);
            resultsLastNav.current = now;
          }
        }

        resultsPrevButtons.current = buttons;
        resultsPrevAxes.current = axes;
      }

      rafId = requestAnimationFrame(poll);
    };

    rafId = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(rafId);
  }, [showResults, resultsFocus]);

  const controlledPlayer = gameState?.players.find(p => p.isControlled && p.id < 3);
  const hasBall = controlledPlayer?.hasBall ?? false;
  const fireReady = (gameState?.specialMeter ?? 0) >= 1.0;

  const handleShootStart = useCallback(() => triggerAction('shootStart'), [triggerAction]);
  const handleShootRelease = useCallback(() => triggerAction('shootRelease'), [triggerAction]);
  const handlePass = useCallback(() => triggerAction('pass'), [triggerAction]);
  const handleSteal = useCallback(() => triggerAction('steal'), [triggerAction]);
  const handleSwitch = useCallback(() => triggerAction('switch'), [triggerAction]);
  const handleJump = useCallback(() => triggerAction('jump'), [triggerAction]);
  const handleSpin = useCallback(() => triggerAction('spin'), [triggerAction]);

  const handleRetry = useCallback(() => {
    setShowResults(false);
    shootingRef.current = false;
    gameStartedRef.current = false;
    // Clear any stale key state
    keysRef.current.clear();
    // Re-initialize and restart with a small delay to allow state to settle
    initGame();
    // Use a slightly longer delay to ensure initGame state propagates
    setTimeout(() => {
      gameStartedRef.current = true;
      startGame();
    }, 200);
  }, [initGame, startGame]);

  const handleExit = useCallback(() => {
    playMenuSelect();
    stopGame();
    navigate('/practice');
  }, [navigate, stopGame]);

  if (!gameState) {
    return (
      <div className="h-screen w-screen flex items-center justify-center" style={{ background: '#0a0a1a' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-white/40 text-sm" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Loading drill...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden relative" style={{ background: '#050510' }}>
      {/* HUD */}
      <div className="relative z-10">
        <GameHUD gameState={gameState} />
      </div>

      {/* Drill Progress Bar */}
      {drillProgress && (
        <div className="relative z-20 px-4 py-1">
          <div className="flex items-center gap-3 max-w-2xl mx-auto">
            {/* Drill name */}
            <div className="flex items-center gap-2">
              <span className="text-lg">{drill.icon}</span>
              <span className="text-xs font-bold tracking-wider" style={{
                fontFamily: 'Rajdhani, sans-serif',
                color: drill.color,
              }}>{drill.name}</span>
            </div>

            {/* Progress bar */}
            <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: `linear-gradient(90deg, ${drill.color}, ${drill.glow.replace('0.6', '1')})` }}
                animate={{ width: `${(drillProgress.completed / drillProgress.target) * 100}%` }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              />
            </div>

            {/* Counter */}
            <span className="text-white font-bold text-sm min-w-[40px] text-right" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              {drillProgress.completed}/{drillProgress.target}
            </span>

            {/* Time */}
            {drill.timeLimit > 0 && (
              <span className="text-sm font-mono min-w-[45px] text-right" style={{
                color: drillProgress.timeRemaining < 30 ? '#FF4444' : 'rgba(255,255,255,0.5)',
                fontFamily: 'Space Grotesk, sans-serif',
              }}>
                {Math.floor(drillProgress.timeRemaining / 60)}:{Math.floor(drillProgress.timeRemaining % 60).toString().padStart(2, '0')}
              </span>
            )}
          </div>

          {/* Feedback message */}
          <AnimatePresence>
            {drillProgress.feedback && (
              <motion.div
                className="text-center mt-1"
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <span className="text-sm font-bold" style={{
                  fontFamily: 'Rajdhani, sans-serif',
                  color: drillProgress.feedbackColor,
                  textShadow: `0 0 10px ${drillProgress.feedbackColor}66`,
                }}>
                  {drillProgress.feedback}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Drill instruction hint (shown during countdown) */}
      {gameState.countdown > 0 && (
        <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className="text-6xl font-black mb-4" style={{
              fontFamily: 'Rajdhani, sans-serif',
              color: drill.color,
              textShadow: `0 0 40px ${drill.glow}`,
            }}>
              {gameState.countdown}
            </div>
            <div className="text-white/60 text-lg font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              {drill.goal}
            </div>
            <div className="text-white/30 text-sm mt-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              {drill.controls}
            </div>
          </div>
        </div>
      )}

      {/* Game Canvas */}
      <div className="relative z-10 flex-1 flex items-center justify-center">
        <GameCanvas gameState={gameState} />
      </div>

      {/* Controls — hidden when results showing */}
      {!showResults && (
        <div className="relative z-10 flex items-end justify-between px-4 pb-4 pt-1" style={{ minHeight: 140 }}>
          <Joystick onMove={setJoystick} />
          <ActionButtons
            hasBall={hasBall}
            fireReady={fireReady}
            onShootStart={handleShootStart}
            onShootRelease={handleShootRelease}
            onPass={handlePass}
            onSteal={handleSteal}
            onSwitch={handleSwitch}
            onJump={handleJump}
            onSpin={handleSpin}
          />
        </div>
      )}

      {/* Desktop hint */}
      {!showResults && (
        <div className="hidden md:block fixed bottom-2 left-1/2 -translate-x-1/2 z-40">
          {gamepadConnected ? (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full" style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <span style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'rgba(255,255,255,0.3)', fontSize: 10 }}>
                {drill.controls}
              </span>
              <span className="text-green-400 text-[9px] font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>CONNECTED</span>
            </div>
          ) : (
            <div className="text-white/20 text-[10px] text-center" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              {drill.controls} | WASD: Move | Tab: Switch
            </div>
          )}
        </div>
      )}

      {/* ========== RESULTS OVERLAY ========== */}
      <AnimatePresence>
        {showResults && drillProgress && (
          <motion.div
            className="absolute inset-0 z-50 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ background: 'rgba(5,5,16,0.85)', backdropFilter: 'blur(8px)' }}
          >
            <motion.div
              className="flex flex-col items-center gap-6 max-w-md w-full px-6"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            >
              {/* Grade */}
              <div className="text-center">
                {drillProgress.isComplete ? (
                  <>
                    <div className="text-6xl font-black" style={{
                      fontFamily: 'Rajdhani, sans-serif',
                      color: drillProgress.grade === 'S' ? '#FFD700' : drillProgress.grade === 'A' ? '#00FF00' : '#FFB800',
                      textShadow: `0 0 40px ${drillProgress.grade === 'S' ? 'rgba(255,215,0,0.6)' : 'rgba(0,255,0,0.4)'}`,
                    }}>
                      {drillProgress.grade}
                    </div>
                    <div className="text-2xl font-bold text-white mt-2" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                      DRILL COMPLETE!
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-4xl font-black text-red-500" style={{
                      fontFamily: 'Rajdhani, sans-serif',
                      textShadow: '0 0 20px rgba(255,0,0,0.4)',
                    }}>
                      TIME'S UP
                    </div>
                    <div className="text-lg text-white/60 mt-2" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                      {drillProgress.completed}/{drillProgress.target} completed
                    </div>
                  </>
                )}
              </div>

              {/* Stats */}
              <div className="w-full rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-white/40 text-[10px] uppercase tracking-widest" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Completed</div>
                    <div className="text-white text-2xl font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>{drillProgress.completed}</div>
                  </div>
                  <div>
                    <div className="text-white/40 text-[10px] uppercase tracking-widest" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Attempts</div>
                    <div className="text-white text-2xl font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>{drillProgress.attempts}</div>
                  </div>
                  <div>
                    <div className="text-white/40 text-[10px] uppercase tracking-widest" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Accuracy</div>
                    <div className="text-white text-2xl font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                      {drillProgress.attempts > 0 ? Math.round((drillProgress.completed / drillProgress.attempts) * 100) : 0}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Gamepad hint */}
              {gamepadConnected && (
                <div className="text-white/30 text-[10px] text-center" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  D-Pad / Stick: Navigate &middot; A: Select &middot; B: Back
                </div>
              )}

              {/* Buttons with focus indicators */}
              <div className="flex flex-col gap-3 w-full max-w-xs">
                <button
                  onClick={handleRetry}
                  className="w-full py-4 rounded-lg font-bold text-xl tracking-wider text-white active:scale-95 transition-all"
                  style={{
                    fontFamily: 'Rajdhani, sans-serif',
                    background: `linear-gradient(135deg, ${drill.color} 0%, ${drill.color}CC 100%)`,
                    boxShadow: resultsFocus === 0
                      ? `0 4px 30px ${drill.glow}, 0 0 0 3px rgba(255,255,255,0.6)`
                      : `0 4px 30px ${drill.glow}`,
                    border: resultsFocus === 0 ? '2px solid rgba(255,255,255,0.8)' : '1px solid rgba(255,255,255,0.2)',
                    transform: resultsFocus === 0 ? 'scale(1.03)' : 'scale(1)',
                  }}
                >
                  RETRY
                </button>
                <button
                  onClick={handleExit}
                  className="w-full py-3 rounded-lg font-bold text-lg tracking-wider active:scale-95 transition-all"
                  style={{
                    fontFamily: 'Rajdhani, sans-serif',
                    color: resultsFocus === 1 ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.6)',
                    background: resultsFocus === 1 ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)',
                    border: resultsFocus === 1 ? '2px solid rgba(255,255,255,0.6)' : '1px solid rgba(255,255,255,0.1)',
                    boxShadow: resultsFocus === 1 ? '0 0 0 2px rgba(255,255,255,0.3)' : 'none',
                    transform: resultsFocus === 1 ? 'scale(1.03)' : 'scale(1)',
                  }}
                >
                  BACK TO DRILLS
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
