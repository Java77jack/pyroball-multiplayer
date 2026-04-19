import { useEffect, useRef, useState } from 'react';

/**
 * GamepadDebugOverlay — Visual debugging tool for gamepad connectivity and input
 * 
 * Shows:
 * - Controller connection status
 * - Button press visualization
 * - Stick input display
 * - Troubleshooting information
 */

interface GamepadDebugState {
  isConnected: boolean;
  gamepadId: string | null;
  buttons: boolean[];
  axes: number[];
  timestamp: number;
}

export function GamepadDebugOverlay() {
  const [debugState, setDebugState] = useState<GamepadDebugState>({
    isConnected: false,
    gamepadId: null,
    buttons: [],
    axes: [],
    timestamp: 0,
  });

  const rafRef = useRef<number>(0);

  useEffect(() => {
    const poll = () => {
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      let gp: Gamepad | null = null;

      for (const g of gamepads) {
        if (g && g.connected) {
          gp = g;
          break;
        }
      }

      if (gp) {
        setDebugState({
          isConnected: true,
          gamepadId: gp.id,
          buttons: Array.from(gp.buttons).map(b => b.pressed),
          axes: Array.from(gp.axes),
          timestamp: Date.now(),
        });
      } else {
        setDebugState(prev => ({
          ...prev,
          isConnected: false,
          gamepadId: null,
          buttons: [],
          axes: [],
        }));
      }

      rafRef.current = requestAnimationFrame(poll);
    };

    rafRef.current = requestAnimationFrame(poll);

    const handleConnect = (e: GamepadEvent) => {
      console.log(`[DEBUG] Gamepad connected: ${e.gamepad.id}`);
    };

    const handleDisconnect = (e: GamepadEvent) => {
      console.log(`[DEBUG] Gamepad disconnected: ${e.gamepad.id}`);
    };

    window.addEventListener('gamepadconnected', handleConnect);
    window.addEventListener('gamepaddisconnected', handleDisconnect);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('gamepadconnected', handleConnect);
      window.removeEventListener('gamepaddisconnected', handleDisconnect);
    };
  }, []);

  const buttonNames = [
    'A (0)', 'B (1)', 'X (2)', 'Y (3)',
    'LB (4)', 'RB (5)', 'LT (6)', 'RT (7)',
    'Back (8)', 'Start (9)', 'L3 (10)', 'R3 (11)',
    'D-Up (12)', 'D-Down (13)', 'D-Left (14)', 'D-Right (15)',
  ];

  return (
    <div className="fixed bottom-4 right-4 z-50 font-mono text-xs bg-black/90 border border-cyan-500/50 rounded p-3 max-w-sm text-cyan-400 space-y-2">
      {/* Title */}
      <div className="text-cyan-300 font-bold border-b border-cyan-500/30 pb-2">
        🎮 GAMEPAD DEBUG
      </div>

      {/* Connection Status */}
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${debugState.isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
        <span>
          {debugState.isConnected ? '✓ CONNECTED' : '✗ DISCONNECTED'}
        </span>
      </div>

      {/* Gamepad ID */}
      {debugState.gamepadId && (
        <div className="text-cyan-300 text-xs break-words">
          <span className="text-cyan-500">ID:</span> {debugState.gamepadId}
        </div>
      )}

      {debugState.isConnected ? (
        <>
          {/* Left Stick */}
          <div className="border-t border-cyan-500/20 pt-2">
            <div className="text-cyan-300 mb-1">Left Stick:</div>
            <div className="flex gap-4">
              <div>
                <span className="text-cyan-500">X:</span> {debugState.axes[0]?.toFixed(2) ?? '0.00'}
              </div>
              <div>
                <span className="text-cyan-500">Y:</span> {debugState.axes[1]?.toFixed(2) ?? '0.00'}
              </div>
            </div>
            {/* Visual stick indicator */}
            <div className="w-16 h-16 border border-cyan-500/30 rounded mt-1 relative bg-black/50">
              <div
                className="absolute w-2 h-2 bg-cyan-400 rounded-full"
                style={{
                  left: `${((debugState.axes[0] ?? 0) + 1) * 32}px`,
                  top: `${((debugState.axes[1] ?? 0) + 1) * 32}px`,
                  transform: 'translate(-50%, -50%)',
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center text-cyan-500/30 text-xs pointer-events-none">
                ⊕
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="border-t border-cyan-500/20 pt-2">
            <div className="text-cyan-300 mb-1">Buttons Pressed:</div>
            <div className="grid grid-cols-2 gap-1">
              {debugState.buttons.map((pressed, idx) => (
                <div
                  key={idx}
                  className={`px-2 py-1 rounded text-xs ${
                    pressed
                      ? 'bg-green-500/30 text-green-400 font-bold'
                      : 'bg-cyan-500/10 text-cyan-500/50'
                  }`}
                >
                  {buttonNames[idx]}
                </div>
              ))}
            </div>
          </div>

          {/* Last Update */}
          <div className="text-cyan-500/50 text-xs border-t border-cyan-500/20 pt-2">
            Updated: {new Date(debugState.timestamp).toLocaleTimeString()}
          </div>
        </>
      ) : (
        <div className="border-t border-cyan-500/20 pt-2 text-red-400 text-xs space-y-1">
          <div>🔴 No gamepad detected</div>
          <div className="text-cyan-500/70">
            <strong>Troubleshooting:</strong>
          </div>
          <ul className="list-disc list-inside space-y-1 text-cyan-500/60">
            <li>Connect your controller</li>
            <li>Press any button on controller</li>
            <li>Try different USB port</li>
            <li>Check browser console (F12)</li>
            <li>Refresh page after connecting</li>
          </ul>
        </div>
      )}
    </div>
  );
}
