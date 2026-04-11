import { useState, useCallback, useEffect } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { ASSET_URLS } from '@/lib/gameConstants';
import { useMenuGamepad } from '@/hooks/useMenuGamepad';
import { playMusic, markUserInteraction } from '@/lib/musicEngine';

const sections = [
  {
    title: 'CONTROLS',
    items: [
      { icon: '🕹️', label: 'Move', desc: 'Drag the joystick (bottom-left), use WASD / Arrow Keys, or use the left analog stick on a controller.' },
      { icon: '🔥', label: 'Shoot (Hold J / A Button)', desc: 'Hold SHOOT to charge the shot meter, then release at the right moment. Green zone = perfect shot. Red zone = powerful but inaccurate. When FIRE is full, pressing SHOOT triggers an instant unstoppable Power Shot!' },
      { icon: '🤝', label: 'Pass (K / B Button)', desc: 'Tap PASS to send the ball to the best open teammate. Chain passes together to build FLOW STATE for a speed and accuracy boost.' },
      { icon: '💨', label: 'Steal (L / X Button)', desc: 'Tap STEAL when near an opponent with the ball. Successful steals build your FIRE meter.' },
      { icon: '🔄', label: 'Switch (Tab / RB)', desc: 'Tap SWITCH to cycle control to another teammate — great for intercepting passes or getting into a better scoring position.' },
      { icon: '🦘', label: 'Jump (Q / Y Button)', desc: 'Tap JUMP to leap into the air — aerial shots get a power boost, and you can grab high rebounds off the backboard.' },
      { icon: '🌀', label: 'Spin (E / LB)', desc: 'Tap SPIN while carrying the ball to perform a 360° evasive spin move — grants brief steal immunity and a speed burst to blow past defenders.' },
    ],
  },
  {
    title: 'COMBO MOVES',
    items: [
      { icon: '⚡', label: 'Aerial Shot (Jump → Shoot)', desc: 'Jump first, then press SHOOT while airborne for a high-arc shot with +30% power and near-perfect accuracy. Great for shooting over defenders!' },
      { icon: '🌀', label: 'Spin Shot (Spin → Shoot)', desc: 'Start a spin move, then press SHOOT during the spin for a zero-spread unstoppable shot with +40% power. Defenders cannot block it!' },
      { icon: '💫', label: 'No-Look Pass (Spin → Pass)', desc: 'Spin first, then press PASS for a lightning-fast no-look pass. The receiver gets a speed burst toward the goal — perfect for fast breaks!' },
      { icon: '🔥', label: 'Aerial Tornado (Jump + Spin → Shoot)', desc: 'The ultimate combo! Jump, then spin, then shoot — triggers a slow-motion 2x power shot with massive arc, camera shake, and a huge FIRE meter boost. Crowd goes wild!' },
    ],
  },
  {
    title: 'SCORING ZONES',
    items: [
      { icon: '🟠', label: 'Mid Zone — 1 Point', desc: 'The open field area around the goals. Easier to shoot from, but only worth 1 point.' },
      { icon: '🔴', label: 'Core Zone — 3 Points', desc: 'The center circle at midcourt, plus the shaft corridors running from center to each goal. High-risk, high-reward — worth 3 points!' },
      { icon: '🚫', label: 'Run-In Zone Rule', desc: 'Running into the goal area from the RED CENTER ZONE is illegal! If you carry the ball into the goal end zone from the center, the opposing team gets 1 point and possession from center court. Run-ins are ONLY allowed from the SIDE ZONES next to the goal posts.' },
      { icon: '💡', label: 'Tip', desc: 'Shoot from the Core Zone or shaft corridors to score 3 points. Use side lanes for run-ins. Pass through the core before shooting for a chain bonus that widens your green zone.' },
    ],
  },
  {
    title: 'SPECIAL MECHANICS',
    items: [
      { icon: '🔥', label: 'FIRE Meter', desc: 'Build your FIRE meter by landing perfect (green zone) shots, making steals, and scoring goals. When the meter is full, the SHOOT button glows gold — press it for an unstoppable Power Shot that cannot be blocked!' },
      { icon: '⚡', label: 'Flow State', desc: 'Chain 4 or more consecutive passes to trigger FLOW STATE — your team moves faster and shoots more accurately for a short burst.' },
      { icon: '🧱', label: 'Backboard & Rebounds', desc: 'Missed shots that go high hit the 4ft LED glass backboard above the 6ft goal and bounce back into play. Jump (Q) to grab the rebound before the opponent does!' },
      { icon: '💡', label: 'LED Backboard', desc: 'When a goal is scored, the LED backboard above the crossbar lights up in the scoring team\'s colors with a pulsing strobe effect! The net also deforms realistically when the ball hits it.' },
      { icon: '🔥', label: 'ON FIRE Streak', desc: 'Score 3 unanswered goals in a row and your team goes ON FIRE! All players get a 20% speed boost and auto-perfect shots for 15 seconds. Fire aura particles surround your players and the screen pulses orange. The announcer screams "ON FIRE!" — dominate before it expires!' },
      { icon: '📢', label: 'Announcer Callouts', desc: 'The announcer reacts to big plays in real-time! Score from downtown, pull off a steal, land a combo move, or go ON FIRE — each triggers a dramatic on-screen callout with hype text and visual effects.' },
    ],
  },
  {
    title: 'MATCH RULES',
    items: [
      { icon: '⏱️', label: 'Match Duration', desc: '3 minutes total, split into two 90-second halves. Highest score wins. Tied at the end? Sudden Death overtime!' },
      { icon: '💀', label: 'Sudden Death', desc: 'If the score is tied at the end of regulation, the game enters Sudden Death overtime with a dramatic red vignette and pulsing edges. Next goal wins! The announcer calls it out and the tension is real.' },
      { icon: '⏰', label: 'Shot Clock', desc: '10 seconds to take a shot or lose possession — keep the pressure on!' },
      { icon: '⏳', label: '3-Second Rule', desc: 'You cannot hold the ball for more than 3 seconds — pass, shoot, or spin before the timer runs out or you lose possession.' },
      { icon: '📊', label: 'Difficulty', desc: 'Rookie: wider green zone, slower AI. Pro: balanced. All-Star: tight green zone, fast and aggressive AI.' },
    ],
  },
];

export default function HowToPlay() {
  const [, navigate] = useLocation();
  const [focusIdx, setFocusIdx] = useState(0);

  // Start how-to-play music
  useEffect(() => {
    markUserInteraction();
    playMusic('howToPlay');
  }, []);

  const handleBack = useCallback(() => navigate('/'), [navigate]);

  useMenuGamepad({
    itemCount: 1,
    selectedIndex: focusIdx,
    onSelect: handleBack,
    onNavigate: setFocusIdx,
    onBack: handleBack,
  });

  return (
    <div
      className="h-screen w-screen flex flex-col overflow-hidden relative"
      style={{ background: '#0a0a1a' }}
    >
      {/* Background */}
      <div className="absolute inset-0 z-0" style={{
        backgroundImage: `url(${ASSET_URLS.arenaBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        opacity: 0.15,
      }} />
      <div className="absolute inset-0 z-0" style={{
        background: 'linear-gradient(180deg, rgba(10,10,26,0.7) 0%, rgba(10,10,26,0.98) 100%)',
      }} />

      {/* Header */}
      <div className="relative z-10 pt-10 pb-4 px-6 flex items-center gap-4">
        <button
          onClick={() => navigate('/')}
          className="text-white/50 text-sm"
          style={{ fontFamily: 'Space Grotesk, sans-serif' }}
        >
          ← Back
        </button>
        <h1
          className="text-2xl font-bold text-white"
          style={{ fontFamily: 'Rajdhani, sans-serif' }}
        >
          HOW TO PLAY
        </h1>
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 overflow-y-auto px-6 pb-10">
        {sections.map((section, si) => (
          <motion.div
            key={section.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: si * 0.12 }}
            className="mb-6"
          >
            <h2
              className="text-lg font-bold tracking-wider mb-3"
              style={{
                fontFamily: 'Rajdhani, sans-serif',
                background: 'linear-gradient(90deg, #FFB800, #FF4500)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              {section.title}
            </h2>

            <div className="flex flex-col gap-2">
              {section.items.map((item) => (
                <div
                  key={item.label}
                  className="flex items-start gap-3 p-3 rounded-lg"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <span className="text-lg mt-0.5">{item.icon}</span>
                  <div>
                    <h3 className="text-white font-bold text-sm" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                      {item.label}
                    </h3>
                    <p className="text-white/50 text-xs" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ))}

        {/* Court diagram note */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-4 rounded-lg overflow-hidden"
          style={{ border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div className="p-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <p className="text-white/50 text-xs text-center" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              🏟️ <strong style={{ color: 'rgba(255,255,255,0.7)' }}>APA Blueprint Court</strong> — 90ft × 50ft turf field. 20ft wide × 6ft tall goals with 4ft LED backboards, set 2ft from end lines. Core zone at center (3pts). Mid zone elsewhere (1pt). No run-ins from center red zone — use side lanes only!
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
