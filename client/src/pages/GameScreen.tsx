import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { useGameContext } from '@/contexts/GameContext';
import { useGameEngine } from '@/hooks/useGameEngine';
import { useGamepad } from '@/hooks/useGamepad';
import GameCanvas from '@/components/GameCanvas';
import GameHUD from '@/components/GameHUD';
import Joystick from '@/components/Joystick';
import { GamepadDebugOverlay } from '@/components/GamepadDebugOverlay';
import { playMusic, markUserInteraction } from '@/lib/musicEngine';
// Clean NBA 2K style — no page-level overlays

export default function GameScreen() {
  const [, navigate] = useLocation();
  const { homeTeam, awayTeam, difficulty, setFinalScore, setGoalEvents, setMatchComplete } = useGameContext();
  const { gameState, initGame, startGame, stopGame, setJoystick, triggerAction } = useGameEngine(homeTeam, awayTeam, difficulty);
  const keysRef = useRef<Set<string>>(new Set());
  const shootingRef = useRef(false);
  const gameStartedRef = useRef(false);
  const matchEndedRef = useRef(false);
  const [gamepadConnected, setGamepadConnected] = useState(false);

  // Start in-game music
  useEffect(() => {
    markUserInteraction();
    playMusic('inGame');
  }, []);

  useEffect(() => {
    initGame();
    return () => {
      stopGame();
    };
  }, [initGame, stopGame]);

  // Start game once initialized
  useEffect(() => {
    if (gameState && !gameStartedRef.current && !gameState.isPlaying && gameState.timer === 180) {
      gameStartedRef.current = true;
      startGame();
    }
  }, [gameState, startGame]);

  // Match end detection
  useEffect(() => {
    if (gameState && !gameState.isPlaying && gameState.timer <= 0 && gameStartedRef.current && !matchEndedRef.current) {
      matchEndedRef.current = true;
      setFinalScore(gameState.score);
      setGoalEvents(gameState.goalEvents);
      setMatchComplete(true);
      stopGame();
      const timer = setTimeout(() => navigate('/results'), 2000);
      return () => clearTimeout(timer);
    }
  }, [gameState?.isPlaying, gameState?.timer, stopGame, setFinalScore, setGoalEvents, setMatchComplete, navigate, gameState]);

  // Keyboard controls for desktop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key.toLowerCase());
      
      // Hold-to-charge shooting: J keydown starts charging
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
      // Hold-to-charge shooting: J keyup releases the shot
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
  }, [triggerAction]);

  // Keyboard joystick update loop — uses RAF for instant response
  useEffect(() => {
    let rafId = 0;
    const pollKeys = () => {
      const keys = keysRef.current;
      let x = 0, y = 0;
      if (keys.has('w') || keys.has('arrowup')) y = -1;
      if (keys.has('s') || keys.has('arrowdown')) y = 1;
      if (keys.has('a') || keys.has('arrowleft')) x = -1;
      if (keys.has('d') || keys.has('arrowright')) x = 1;
      
      if (x !== 0 && y !== 0) {
        const mag = Math.sqrt(x * x + y * y);
        x /= mag;
        y /= mag;
      }
      
      setJoystick({ x, y });
      rafId = requestAnimationFrame(pollKeys);
    };
    rafId = requestAnimationFrame(pollKeys);
    return () => cancelAnimationFrame(rafId);
  }, [setJoystick]);

  // ---- GAMEPAD SUPPORT ----
  const handleGamepadAction = useCallback((action: string) => {
    // Mirror the same keyboard action handlers
    if (action === 'shootStart') {
      if (!shootingRef.current) {
        shootingRef.current = true;
        triggerAction('shootStart');
      }
    } else if (action === 'shootRelease') {
      if (shootingRef.current) {
        shootingRef.current = false;
        triggerAction('shootRelease');
      }
    } else {
      triggerAction(action);
    }
  }, [triggerAction]);

  useGamepad({
    onMove: setJoystick,
    onAction: handleGamepadAction,
    enabled: true,
    onConnected: (gamepadId) => {
      console.log(`[Pyroball] Controller detected: ${gamepadId}`);
      setGamepadConnected(true);
    },
    onDisconnected: () => {
      console.log('[Pyroball] Controller disconnected');
      setGamepadConnected(false);
    },
  });

  // Check for initial gamepad connection on mount
  useEffect(() => {
    const checkInitialConnection = () => {
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      const anyConnected = Array.from(pads).some(p => p && p.connected);
      setGamepadConnected(anyConnected);
    };
    checkInitialConnection();
  }, []);

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

  if (!gameState) {
    return (
      <div className="h-screen w-screen flex items-center justify-center" style={{ background: '#0a0a1a' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-white/40 text-sm" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Loading match...</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="h-screen w-screen flex flex-col overflow-hidden relative"
      style={{ background: '#050510' }}
    >
      {/* HUD */}
      <div className="relative z-10">
        <GameHUD gameState={gameState} />
      </div>

      {/* Game Canvas — full bleed, no border/shadow */}
      <div className="relative z-10 flex-1 flex items-center justify-center">
        <GameCanvas gameState={gameState} />
      </div>

      {/* Gamepad Debug Overlay */}
      <GamepadDebugOverlay />

      {/* Controls hidden - keyboard/gamepad only */}
    </div>
  );
}
