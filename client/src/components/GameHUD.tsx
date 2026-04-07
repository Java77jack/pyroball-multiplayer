import { TEAMS, MATCH, ON_FIRE, type GameState } from '@/lib/gameConstants';

interface GameHUDProps {
  gameState: GameState;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function GameHUD({ gameState }: GameHUDProps) {
  const home = TEAMS[gameState.homeTeam];
  const away = TEAMS[gameState.awayTeam];
  const shotClockUrgent = gameState.shotClock <= 3;
  const fireReady = gameState.specialMeter >= 1.0;
  const firePct = Math.round(gameState.specialMeter * 100);
  const isOnFire = gameState.onFireTeam !== null;
  const onFirePct = isOnFire ? (gameState.onFireTimer / ON_FIRE.DURATION) * 100 : 0;

  // Find the ball carrier's hold timer for possession indicator
  const carrier = gameState.players.find(p => p.hasBall && p.id < 3);
  const holdRatio = carrier ? carrier.holdTimer / MATCH.POSSESSION_TIMER : 0;
  const holdUrgent = holdRatio > 0.65;

  // Sudden death pulsing timer
  const isSuddenDeath = gameState.isOvertime;
  const sdPulse = isSuddenDeath ? Math.sin(Date.now() / 200) * 0.3 + 0.7 : 1;

  return (
    <div className="w-full px-3 py-2 relative">
      {/* ---- ANNOUNCER CALLOUTS (stacked from bottom-center) ---- */}
      {gameState.announcer.length > 0 && (
        <div
          className="absolute left-1/2 z-[60] pointer-events-none flex flex-col items-center gap-1"
          style={{ top: 68, transform: 'translateX(-50%)' }}
        >
          {gameState.announcer.map((callout, i) => {
            const fadeAlpha = Math.min(1, callout.timer * 3);
            const popScale = 0.85 + Math.min(0.15, callout.timer * 0.3);
            const fontSize = callout.size === 'large' ? 22 : callout.size === 'medium' ? 17 : 13;
            return (
              <div
                key={`${callout.text}-${i}`}
                style={{
                  opacity: fadeAlpha,
                  transform: `scale(${popScale})`,
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    fontFamily: 'Rajdhani, sans-serif',
                    fontWeight: 900,
                    fontSize,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase' as const,
                    color: callout.color,
                    textShadow: `0 0 12px ${callout.glow}, 0 0 24px ${callout.glow}, 0 2px 4px rgba(0,0,0,0.8)`,
                    whiteSpace: 'nowrap',
                    lineHeight: 1.1,
                  }}
                >
                  {callout.text}
                </div>
                {callout.subtext && (
                  <div
                    style={{
                      fontFamily: 'Space Grotesk, sans-serif',
                      fontWeight: 600,
                      fontSize: fontSize * 0.55,
                      letterSpacing: '0.15em',
                      color: 'rgba(255,255,255,0.7)',
                      textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                      marginTop: 1,
                    }}
                  >
                    {callout.subtext}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ---- EVENT OVERLAY (violations, turnovers, goals, flow state) ---- */}
      {gameState.currentEvent && gameState.eventTimer > 0 && (() => {
        const evt = gameState.currentEvent;
        // Hide PASS events and events that the announcer already handles
        if (evt.type === 'PASS' || evt.type === 'ON_FIRE' || evt.type === 'FIRE_EXPIRED' || evt.type === 'SUDDEN_DEATH') return null;
        // Also hide GOAL/STEAL/COMBO since announcer handles them now
        if (evt.type === 'GOAL' || evt.type === 'STEAL' || evt.type === 'COMBO') return null;
        return (
          <div
            className="absolute left-1/2 -translate-x-1/2 z-50 flex items-center justify-center"
            style={{
              top: gameState.announcer.length > 0 ? 120 : 70,
              opacity: Math.min(1, gameState.eventTimer * 2),
              transform: `translateX(-50%) scale(${0.8 + Math.min(0.2, gameState.eventTimer * 0.5)})`,
              pointerEvents: 'none',
            }}
          >
            <div
              style={{
                background: evt.type === 'OVERTIME'
                  ? 'rgba(255, 100, 0, 0.95)'
                  : evt.type === 'FLOW_STATE'
                  ? 'linear-gradient(135deg, rgba(255, 215, 0, 0.95), rgba(255, 140, 0, 0.95))'
                  : 'rgba(239, 68, 68, 0.95)',
                color: evt.type === 'FLOW_STATE' ? '#1a1a1a' : '#ffffff',
                padding: '6px 20px',
                borderRadius: 6,
                fontFamily: 'Rajdhani, sans-serif',
                fontWeight: 700,
                fontSize: 16,
                letterSpacing: '0.1em',
                textTransform: 'uppercase' as const,
                boxShadow: evt.type === 'FLOW_STATE'
                  ? '0 4px 20px rgba(255, 215, 0, 0.5)'
                  : '0 4px 20px rgba(0,0,0,0.5)',
              }}
            >
              {evt.type === 'TURNOVER' && (
                <>
                  {evt.reason === 'SHOT_CLOCK' && 'SHOT CLOCK VIOLATION'}
                  {evt.reason === 'POSSESSION' && '3-SECOND VIOLATION'}
                </>
              )}
              {evt.type === 'PENALTY' && 'PENALTY'}
              {evt.type === 'OVERTIME' && 'SUDDEN DEATH'}
              {evt.type === 'FLOW_STATE' && 'FLOW STATE!'}
            </div>
          </div>
        );
      })()}

      {/* Score bar */}
      <div className="flex items-center justify-between"
        style={{
          background: isSuddenDeath
            ? `rgba(${Math.round(80 * sdPulse)},0,0,0.75)`
            : 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(8px)',
          borderRadius: 8,
          padding: '6px 12px',
          border: isSuddenDeath
            ? `1px solid rgba(255,${Math.round(69 * sdPulse)},0,0.4)`
            : '1px solid rgba(255,255,255,0.08)',
          transition: 'background 0.3s, border 0.3s',
        }}
      >
        {/* Home team */}
        <div className="flex items-center gap-2">
          <img src={home?.logo} alt={home?.name} className="object-contain" style={{ width: 22, height: 22, filter: `drop-shadow(0 0 4px ${home?.glow}66)` }} />
          <span className="text-white font-bold text-sm" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            {home?.name?.toUpperCase()}
          </span>
          {gameState.onFireTeam === 'home' && (
            <span style={{
              fontSize: 10,
              animation: 'firePulse 0.4s ease-in-out infinite alternate',
              filter: 'drop-shadow(0 0 4px #FF4500)',
            }}>🔥</span>
          )}
        </div>

        {/* Score */}
        <div className="flex items-center gap-3">
          <span className="font-bold text-2xl tabular-nums" style={{
            fontFamily: 'Rajdhani, sans-serif',
            minWidth: 28,
            textAlign: 'right',
            color: gameState.onFireTeam === 'home' ? '#FF4500' : '#ffffff',
            textShadow: gameState.onFireTeam === 'home' ? '0 0 8px rgba(255,69,0,0.6)' : 'none',
          }}>
            {gameState.score.home}
          </span>
          
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-bold" style={{
              fontFamily: 'Space Grotesk, sans-serif',
              color: isSuddenDeath ? '#FF4500' : 'rgba(255,255,255,0.6)',
              animation: isSuddenDeath ? 'sdPulse 0.5s ease-in-out infinite alternate' : 'none',
            }}>
              {isSuddenDeath ? 'SUDDEN DEATH' : gameState.half === 1 ? '1ST' : '2ND'}
            </span>
            <span className="font-bold text-sm tabular-nums" style={{
              fontFamily: 'Rajdhani, sans-serif',
              color: isSuddenDeath && gameState.timer <= 10 ? '#FF4500' : '#ffffff',
              animation: isSuddenDeath && gameState.timer <= 10 ? 'sdTimerPulse 0.3s ease-in-out infinite alternate' : 'none',
            }}>
              {formatTime(gameState.timer)}
            </span>
          </div>

          <span className="font-bold text-2xl tabular-nums" style={{
            fontFamily: 'Rajdhani, sans-serif',
            minWidth: 28,
            textAlign: 'left',
            color: gameState.onFireTeam === 'away' ? '#FF4500' : '#ffffff',
            textShadow: gameState.onFireTeam === 'away' ? '0 0 8px rgba(255,69,0,0.6)' : 'none',
          }}>
            {gameState.score.away}
          </span>
        </div>

        {/* Away team */}
        <div className="flex items-center gap-2">
          {gameState.onFireTeam === 'away' && (
            <span style={{
              fontSize: 10,
              animation: 'firePulse 0.4s ease-in-out infinite alternate',
              filter: 'drop-shadow(0 0 4px #FF4500)',
            }}>🔥</span>
          )}
          <span className="text-white font-bold text-sm" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            {away?.name?.toUpperCase()}
          </span>
          <img src={away?.logo} alt={away?.name} className="object-contain" style={{ width: 22, height: 22, filter: `drop-shadow(0 0 4px ${away?.glow}66)` }} />
        </div>
      </div>

      {/* Shot clock + Possession timer + ON FIRE timer + Fire meter */}
      <div className="flex items-center justify-between mt-1 px-1">
        {/* Shot clock — hidden in practice mode (shotClock >= 999) */}
        {gameState.shotClock < 900 && (
        <div className="flex items-center gap-2">
          <div className="relative" style={{ width: 28, height: 28 }}>
            <svg width="28" height="28" viewBox="0 0 28 28">
              <circle cx="14" cy="14" r="12" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2" />
              <circle
                cx="14" cy="14" r="12"
                fill="none"
                stroke={shotClockUrgent ? '#EF4444' : '#FFB800'}
                strokeWidth="2"
                strokeDasharray={`${(gameState.shotClock / MATCH.SHOT_CLOCK) * 75.4} 75.4`}
                strokeLinecap="round"
                transform="rotate(-90 14 14)"
                style={{ transition: 'stroke-dasharray 0.3s ease' }}
              />
            </svg>
            <span
              className="absolute inset-0 flex items-center justify-center font-bold text-[10px] tabular-nums"
              style={{
                fontFamily: 'Rajdhani, sans-serif',
                color: shotClockUrgent ? '#EF4444' : '#FFB800',
              }}
            >
              {gameState.shotClock}
            </span>
          </div>
          <span className="text-white/40 text-[9px]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>SHOT</span>
        </div>
        )}

        {/* Possession timer (3-second hold indicator) */}
        {carrier && (
          <div className="flex items-center gap-2">
            <span className="text-[9px]" style={{
              fontFamily: 'Space Grotesk, sans-serif',
              color: holdUrgent ? '#EF4444' : 'rgba(255,255,255,0.4)',
            }}>HOLD</span>
            <div className="relative" style={{ width: 50, height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3 }}>
              <div
                className="absolute top-0 left-0 h-full rounded-full"
                style={{
                  width: `${Math.min(100, holdRatio * 100)}%`,
                  background: holdUrgent
                    ? 'linear-gradient(90deg, #EF4444, #FF6B6B)'
                    : 'linear-gradient(90deg, #FFB800, #FF6B00)',
                  transition: 'width 0.1s linear',
                }}
              />
            </div>
          </div>
        )}

        {/* ON FIRE timer badge */}
        {isOnFire && (
          <div className="flex items-center gap-1">
            <span style={{
              fontSize: 10,
              animation: 'firePulse 0.3s ease-in-out infinite alternate',
              filter: 'drop-shadow(0 0 4px #FF4500)',
            }}>🔥</span>
            <div className="flex flex-col gap-0.5">
              <div className="relative" style={{ width: 40, height: 5, background: 'rgba(255,69,0,0.2)', borderRadius: 3, overflow: 'hidden' }}>
                <div
                  className="absolute top-0 left-0 h-full rounded-full"
                  style={{
                    width: `${onFirePct}%`,
                    background: 'linear-gradient(90deg, #FF4500, #FFD700)',
                    boxShadow: '0 0 6px rgba(255,69,0,0.6)',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
              <span className="text-[7px] font-bold text-center" style={{
                fontFamily: 'Rajdhani, sans-serif',
                color: '#FF4500',
                textShadow: '0 0 4px rgba(255,69,0,0.5)',
                letterSpacing: '0.1em',
              }}>
                ON FIRE
              </span>
            </div>
          </div>
        )}

        {/* Flow state indicator */}
        {gameState.flowState > 0 && (
          <div className="flex items-center gap-1">
            <span className="text-[9px] font-bold" style={{
              fontFamily: 'Space Grotesk, sans-serif',
              color: '#FFD700',
              textShadow: '0 0 6px rgba(255,215,0,0.5)',
            }}>FLOW</span>
          </div>
        )}

        {/* FIRE meter — shows charge level and pulses when ready */}
        <div className="flex items-center gap-1.5">
          {/* Fire icon */}
          <span
            style={{
              fontSize: 11,
              filter: fireReady ? 'drop-shadow(0 0 4px #FF4500)' : 'none',
              animation: fireReady ? 'firePulse 0.6s ease-in-out infinite alternate' : 'none',
            }}
          >
            🔥
          </span>
          <div className="flex flex-col gap-0.5">
            <div className="relative" style={{ width: 52, height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
              <div
                className="absolute top-0 left-0 h-full rounded-full"
                style={{
                  width: `${gameState.specialMeter * 100}%`,
                  background: fireReady
                    ? 'linear-gradient(90deg, #FF4500, #FFD700)'
                    : 'linear-gradient(90deg, #FF4500, #FF8800)',
                  boxShadow: fireReady ? '0 0 8px rgba(255,100,0,0.8)' : 'none',
                  transition: 'width 0.3s ease',
                }}
              />
              {/* Segment markers */}
              {[25, 50, 75].map(pct => (
                <div
                  key={pct}
                  className="absolute top-0 h-full"
                  style={{
                    left: `${pct}%`,
                    width: 1,
                    background: 'rgba(0,0,0,0.4)',
                  }}
                />
              ))}
            </div>
            <span
              className="text-[8px] text-center font-bold"
              style={{
                fontFamily: 'Rajdhani, sans-serif',
                color: fireReady ? '#FFD700' : 'rgba(255,255,255,0.35)',
                letterSpacing: '0.05em',
                textShadow: fireReady ? '0 0 4px rgba(255,215,0,0.5)' : 'none',
              }}
            >
              {fireReady ? 'FIRE READY!' : `FIRE ${firePct}%`}
            </span>
          </div>
        </div>
      </div>

      {/* ---- COMBO LABEL ---- */}
      {gameState.lastCombo && gameState.lastComboTimer > 0 && (
        <div
          className="absolute left-1/2 z-50 pointer-events-none"
          style={{
            top: 110,
            transform: `translateX(-50%) scale(${0.85 + Math.min(0.15, gameState.lastComboTimer * 0.2)})`,
            opacity: Math.min(1, gameState.lastComboTimer * 3),
            transition: 'opacity 0.1s',
          }}
        >
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(255,100,0,0.95), rgba(255,215,0,0.95))',
              color: '#1a1a1a',
              padding: '4px 16px',
              borderRadius: 6,
              fontFamily: 'Rajdhani, sans-serif',
              fontWeight: 800,
              fontSize: 15,
              letterSpacing: '0.15em',
              textTransform: 'uppercase' as const,
              boxShadow: '0 0 20px rgba(255,150,0,0.6), 0 4px 12px rgba(0,0,0,0.5)',
              whiteSpace: 'nowrap',
              border: '1px solid rgba(255,255,255,0.3)',
            }}
          >
            ⚡ {gameState.lastCombo}
          </div>
        </div>
      )}

      <style>{`
        @keyframes firePulse {
          from { transform: scale(1); }
          to { transform: scale(1.3); }
        }
        @keyframes comboSlide {
          from { transform: translateX(-50%) translateY(-8px) scale(0.8); opacity: 0; }
          to { transform: translateX(-50%) translateY(0) scale(1); opacity: 1; }
        }
        @keyframes sdPulse {
          from { opacity: 0.6; transform: scale(1); }
          to { opacity: 1; transform: scale(1.05); }
        }
        @keyframes sdTimerPulse {
          from { color: #FF4500; transform: scale(1); }
          to { color: #FF0000; transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
}
