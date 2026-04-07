import { useRef, useCallback, useEffect } from 'react';
import type { Vec2 } from '@/lib/gameConstants';

interface JoystickProps {
  onMove: (v: Vec2) => void;
}

export default function Joystick({ onMove }: JoystickProps) {
  const baseRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef(false);
  const centerRef = useRef({ x: 0, y: 0 });
  const touchIdRef = useRef<number | null>(null);

  const RADIUS = 48;

  const updateKnob = useCallback((clientX: number, clientY: number) => {
    if (!knobRef.current) return;
    const dx = clientX - centerRef.current.x;
    const dy = clientY - centerRef.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const clampedDist = Math.min(dist, RADIUS);
    const angle = Math.atan2(dy, dx);
    const nx = Math.cos(angle) * clampedDist;
    const ny = Math.sin(angle) * clampedDist;

    knobRef.current.style.transform = `translate(${nx}px, ${ny}px)`;
    knobRef.current.style.boxShadow = `0 0 ${15 + clampedDist * 0.3}px rgba(255,150,0,${0.2 + (clampedDist / RADIUS) * 0.3})`;

    onMove({ x: nx / RADIUS, y: ny / RADIUS });
  }, [onMove]);

  const handleStart = useCallback((clientX: number, clientY: number) => {
    const base = baseRef.current;
    if (!base) return;
    const rect = base.getBoundingClientRect();
    centerRef.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    activeRef.current = true;
    updateKnob(clientX, clientY);
  }, [updateKnob]);

  const handleEnd = useCallback(() => {
    activeRef.current = false;
    touchIdRef.current = null;
    if (knobRef.current) {
      knobRef.current.style.transform = 'translate(0px, 0px)';
      knobRef.current.style.boxShadow = '0 0 15px rgba(255,150,0,0.2)';
    }
    onMove({ x: 0, y: 0 });
  }, [onMove]);

  // Global touch move/end handlers for better tracking
  useEffect(() => {
    const handleTouchMove = (e: TouchEvent) => {
      if (touchIdRef.current === null || !activeRef.current) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === touchIdRef.current) {
          e.preventDefault();
          updateKnob(e.changedTouches[i].clientX, e.changedTouches[i].clientY);
          break;
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (touchIdRef.current === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === touchIdRef.current) {
          handleEnd();
          break;
        }
      }
    };

    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
    document.addEventListener('touchcancel', handleTouchEnd);
    return () => {
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [updateKnob, handleEnd]);

  return (
    <div
      ref={baseRef}
      className="relative rounded-full"
      style={{
        width: RADIUS * 2 + 24,
        height: RADIUS * 2 + 24,
        background: 'radial-gradient(circle, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.01) 100%)',
        border: '1.5px solid rgba(255,255,255,0.1)',
        backdropFilter: 'blur(4px)',
      }}
      onTouchStart={(e) => {
        e.preventDefault();
        const t = e.changedTouches[0];
        touchIdRef.current = t.identifier;
        handleStart(t.clientX, t.clientY);
      }}
      onMouseDown={(e) => handleStart(e.clientX, e.clientY)}
      onMouseMove={(e) => { if (activeRef.current) updateKnob(e.clientX, e.clientY); }}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
    >
      {/* Direction indicators */}
      {['top', 'right', 'bottom', 'left'].map((dir) => (
        <div
          key={dir}
          className="absolute"
          style={{
            width: 4, height: 4, borderRadius: '50%',
            background: 'rgba(255,255,255,0.1)',
            ...(dir === 'top' ? { top: 8, left: '50%', marginLeft: -2 } : {}),
            ...(dir === 'bottom' ? { bottom: 8, left: '50%', marginLeft: -2 } : {}),
            ...(dir === 'left' ? { left: 8, top: '50%', marginTop: -2 } : {}),
            ...(dir === 'right' ? { right: 8, top: '50%', marginTop: -2 } : {}),
          }}
        />
      ))}
      
      {/* Knob */}
      <div
        ref={knobRef}
        className="absolute rounded-full"
        style={{
          width: 44,
          height: 44,
          top: '50%',
          left: '50%',
          marginTop: -22,
          marginLeft: -22,
          background: 'radial-gradient(circle at 40% 40%, rgba(255,200,50,0.5) 0%, rgba(255,100,0,0.25) 100%)',
          border: '2px solid rgba(255,180,0,0.4)',
          boxShadow: '0 0 15px rgba(255,150,0,0.2)',
          transition: 'transform 0.04s ease-out',
        }}
      />
    </div>
  );
}
