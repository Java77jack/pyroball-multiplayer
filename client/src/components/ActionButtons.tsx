import { useRef, useCallback } from 'react';

interface ActionButtonsProps {
  hasBall: boolean;
  fireReady: boolean;
  onShootStart: () => void;
  onShootRelease: () => void;
  onPass: () => void;
  onSteal: () => void;
  onSwitch: () => void;
  onJump: () => void;
  onSpin: () => void;
}

function GameButton({ 
  label, color, glowColor, size, onAction, disabled, subLabel,
}: { 
  label: string; color: string; glowColor: string; size: number; onAction: () => void;
  disabled?: boolean; subLabel?: string;
}) {
  const pressedRef = useRef(false);

  const handlePress = useCallback(() => {
    if (pressedRef.current || disabled) return;
    pressedRef.current = true;
    onAction();
    setTimeout(() => { pressedRef.current = false; }, 80);
  }, [onAction, disabled]);

  return (
    <button
      className="rounded-full flex flex-col items-center justify-center active:scale-90 transition-transform select-none"
      style={{
        width: size,
        height: size,
        background: disabled
          ? 'radial-gradient(circle at 40% 40%, rgba(60,60,80,0.6) 0%, rgba(40,40,60,0.4) 100%)'
          : `radial-gradient(circle at 40% 40%, ${color}ee 0%, ${color}88 100%)`,
        border: `2px solid ${disabled ? 'rgba(80,80,100,0.3)' : color}`,
        boxShadow: disabled ? 'none' : `0 0 14px ${glowColor}33, inset 0 1px 0 rgba(255,255,255,0.2)`,
        opacity: disabled ? 0.35 : 1,
      }}
      onTouchStart={(e) => { e.preventDefault(); handlePress(); }}
      onMouseDown={handlePress}
    >
      <span 
        className="select-none pointer-events-none"
        style={{
          fontFamily: 'Rajdhani, sans-serif',
          fontSize: size > 48 ? 11 : 9,
          fontWeight: 700,
          letterSpacing: '0.05em',
          color: disabled ? 'rgba(255,255,255,0.3)' : '#ffffff',
          lineHeight: 1,
        }}
      >
        {label}
      </span>
      {subLabel && (
        <span
          className="select-none pointer-events-none"
          style={{
            fontFamily: 'Space Grotesk, sans-serif',
            fontSize: 7,
            color: disabled ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.5)',
            lineHeight: 1,
            marginTop: 1,
          }}
        >
          {subLabel}
        </span>
      )}
    </button>
  );
}

// Special shoot button with hold-to-charge behavior
// When FIRE meter is full, it glows orange/gold and fires a power shot on press
function ShootButton({
  onShootStart,
  onShootRelease,
  disabled,
  fireReady,
}: {
  onShootStart: () => void;
  onShootRelease: () => void;
  disabled: boolean;
  fireReady: boolean;
}) {
  const chargingRef = useRef(false);
  const size = 52;

  const color = fireReady ? '#FF8C00' : '#FF4500';
  const glowColor = fireReady ? '#FFD700' : '#FF6B00';

  const handleStart = useCallback(() => {
    if (disabled || chargingRef.current) return;
    chargingRef.current = true;
    onShootStart();
  }, [onShootStart, disabled]);

  const handleEnd = useCallback(() => {
    if (!chargingRef.current) return;
    chargingRef.current = false;
    onShootRelease();
  }, [onShootRelease]);

  return (
    <button
      className="rounded-full flex flex-col items-center justify-center active:scale-90 transition-transform select-none"
      style={{
        width: size,
        height: size,
        background: disabled
          ? 'radial-gradient(circle at 40% 40%, rgba(60,60,80,0.6) 0%, rgba(40,40,60,0.4) 100%)'
          : fireReady
          ? 'radial-gradient(circle at 40% 40%, #FF8C00ee 0%, #FF4500cc 50%, #CC2200aa 100%)'
          : `radial-gradient(circle at 40% 40%, ${color}ee 0%, ${color}88 100%)`,
        border: `2px solid ${disabled ? 'rgba(80,80,100,0.3)' : fireReady ? '#FFD700' : color}`,
        boxShadow: disabled
          ? 'none'
          : fireReady
          ? `0 0 20px rgba(255,180,0,0.7), 0 0 40px rgba(255,100,0,0.4), inset 0 1px 0 rgba(255,255,255,0.3)`
          : `0 0 14px ${glowColor}33, inset 0 1px 0 rgba(255,255,255,0.2)`,
        opacity: disabled ? 0.35 : 1,
        animation: fireReady && !disabled ? 'shootPulse 0.7s ease-in-out infinite alternate' : 'none',
        transition: 'box-shadow 0.3s ease, border-color 0.3s ease',
      }}
      onTouchStart={(e) => { e.preventDefault(); handleStart(); }}
      onTouchEnd={(e) => { e.preventDefault(); handleEnd(); }}
      onTouchCancel={(e) => { e.preventDefault(); handleEnd(); }}
      onMouseDown={handleStart}
      onMouseUp={handleEnd}
      onMouseLeave={() => { if (chargingRef.current) handleEnd(); }}
    >
      <span 
        className="select-none pointer-events-none"
        style={{
          fontFamily: 'Rajdhani, sans-serif',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.05em',
          color: disabled ? 'rgba(255,255,255,0.3)' : '#ffffff',
          lineHeight: 1,
        }}
      >
        {fireReady ? '🔥' : 'SHOOT'}
      </span>
      <span
        className="select-none pointer-events-none"
        style={{
          fontFamily: 'Space Grotesk, sans-serif',
          fontSize: 7,
          color: disabled ? 'rgba(255,255,255,0.2)' : fireReady ? 'rgba(255,220,0,0.9)' : 'rgba(255,255,255,0.5)',
          lineHeight: 1,
          marginTop: 1,
          fontWeight: fireReady ? 700 : 400,
        }}
      >
        {fireReady ? 'FIRE!' : 'HOLD J'}
      </span>
    </button>
  );
}

export default function ActionButtons({ hasBall, fireReady, onShootStart, onShootRelease, onPass, onSteal, onSwitch, onJump, onSpin }: ActionButtonsProps) {
  return (
    <>
      <style>{`
        @keyframes shootPulse {
          from { transform: scale(1); }
          to { transform: scale(1.08); }
        }
      `}</style>
      <div className="relative" style={{ width: 170, height: 170 }}>
        {/* Top - SHOOT (hold to charge) / FIRE (when meter full) */}
        <div className="absolute" style={{ top: 0, left: '50%', transform: 'translateX(-50%)' }}>
          <ShootButton
            onShootStart={onShootStart}
            onShootRelease={onShootRelease}
            disabled={!hasBall}
            fireReady={fireReady && hasBall}
          />
        </div>

        {/* Right - PASS (active when has ball) */}
        <div className="absolute" style={{ right: 0, top: '50%', transform: 'translateY(-50%)' }}>
          <GameButton
            label="PASS"
            subLabel="K"
            color="#3B82F6"
            glowColor="#60A5FA"
            size={46}
            onAction={onPass}
            disabled={!hasBall}
          />
        </div>

        {/* Left - STEAL (active when doesn't have ball) */}
        <div className="absolute" style={{ left: 0, top: '50%', transform: 'translateY(-50%)' }}>
          <GameButton
            label="STEAL"
            subLabel="L"
            color="#DC2626"
            glowColor="#EF4444"
            size={46}
            onAction={onSteal}
            disabled={hasBall}
          />
        </div>

        {/* Bottom - SWITCH (always active) */}
        <div className="absolute" style={{ bottom: 0, left: '50%', transform: 'translateX(-50%)' }}>
          <GameButton
            label="SWITCH"
            subLabel="TAB"
            color="#22C55E"
            glowColor="#4ADE80"
            size={42}
            onAction={onSwitch}
          />
        </div>

        {/* Top-Right - JUMP (always active) */}
        <div className="absolute" style={{ top: 8, right: 4 }}>
          <GameButton
            label="JUMP"
            subLabel="Q"
            color="#A855F7"
            glowColor="#C084FC"
            size={42}
            onAction={onJump}
          />
        </div>

        {/* Top-Left - SPIN (active when has ball) */}
        <div className="absolute" style={{ top: 8, left: 4 }}>
          <GameButton
            label="SPIN"
            subLabel="E"
            color="#F59E0B"
            glowColor="#FBBF24"
            size={42}
            onAction={onSpin}
            disabled={!hasBall}
          />
        </div>
      </div>
    </>
  );
}
