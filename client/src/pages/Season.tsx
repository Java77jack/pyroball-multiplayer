import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { useGameContext, type Difficulty } from '@/contexts/GameContext';
import { TEAMS } from '@/lib/gameConstants';
import {
  getCompletedFixtures,
  getCurrentSeasonFixture,
  getFixtureLabel,
  getPlayoffBracket,
  getSeasonLeaders,
  getSeasonProgress,
  getUpcomingFixtures,
  getUserTeamRecord,
  type PlayoffBracketGame,
} from '@/lib/season';
import { initAudio, playMenuSelect } from '@/lib/soundEngine';
import { useMenuGamepad } from '@/hooks/useMenuGamepad';

const DIFFICULTIES: Difficulty[] = ['rookie', 'pro', 'allstar'];

function formatFixtureTeams(homeTeamId: string, awayTeamId: string) {
  return `${TEAMS[awayTeamId].name} @ ${TEAMS[homeTeamId].name}`;
}

function formatGameTeams(game: PlayoffBracketGame | null) {
  if (!game) return 'TBD';
  if (!game.homeTeamId || !game.awayTeamId) return 'TBD';
  return `${TEAMS[game.awayTeamId].name} @ ${TEAMS[game.homeTeamId].name}`;
}

function getBracketStatus(game: PlayoffBracketGame | null) {
  if (!game) return 'Awaiting bracket';
  if (!game.homeTeamId || !game.awayTeamId) return 'Waiting for qualifier';
  if (game.fixture?.status === 'completed' && game.fixture.result) {
    return `${game.fixture.result.awayScore} - ${game.fixture.result.homeScore}`;
  }
  return 'Upcoming';
}

export default function Season() {
  const [, navigate] = useLocation();
  const {
    season,
    startSeason,
    clearSeason,
    launchCurrentSeasonMatch,
  } = useGameContext();

  const [selectedTeam, setSelectedTeam] = useState(season?.userTeamId ?? 'inferno');
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>(season?.difficulty ?? 'pro');

  useEffect(() => {
    if (!season) return;
    setSelectedTeam(season.userTeamId);
    setSelectedDifficulty(season.difficulty);
  }, [season]);

  const currentFixture = getCurrentSeasonFixture(season);
  const record = getUserTeamRecord(season);
  const recentFixtures = getCompletedFixtures(season, season?.userTeamId ?? selectedTeam, 4);
  const upcomingFixtures = getUpcomingFixtures(season, season?.userTeamId ?? selectedTeam, 5);
  const progress = getSeasonProgress(season);
  const leaders = getSeasonLeaders(season);
  const bracket = getPlayoffBracket(season);

  const teamEntries = useMemo(() => Object.entries(TEAMS), []);

  const handleCreateSeason = () => {
    initAudio();
    playMenuSelect();
    startSeason(selectedTeam, selectedDifficulty);
  };

  const handlePlayNextMatch = () => {
    initAudio();
    playMenuSelect();
    const fixture = launchCurrentSeasonMatch();
    if (fixture) {
      navigate('/vs');
    }
  };

  const handleBack = () => {
    initAudio();
    playMenuSelect();
    navigate('/');
  };

  const handleReset = () => {
    initAudio();
    playMenuSelect();
    clearSeason();
  };

  // ============================================================
  // GAMEPAD NAVIGATION
  // ============================================================
  // Pre-season: navigate team grid (16 teams, 3 columns) + difficulty (3 items) + create button (1)
  // Active season: navigate action buttons (Play Next / Reset / Back)
  //
  // We use a single linear focus index and map it to the correct section.

  const [focusIdx, setFocusIdx] = useState(0);

  // Pre-season layout:
  //   Items 0..15 = team grid (3 columns)
  //   Items 16..18 = difficulty options
  //   Item 19 = Create Season button
  //   Item 20 = Back to Main Menu
  const PRE_SEASON_TEAM_COUNT = teamEntries.length; // 16
  const PRE_SEASON_TOTAL = PRE_SEASON_TEAM_COUNT + DIFFICULTIES.length + 1 + 1; // 16 + 3 + 1 + 1 = 21

  // Active season layout:
  //   Item 0 = Play Next Match (or nothing if season complete)
  //   Item 1 = Reset Season
  //   Item 2 = Back to Main Menu
  const activeSeasonItems = currentFixture ? 3 : 2; // no "Play Next" if season complete

  const totalItems = !season ? PRE_SEASON_TOTAL : activeSeasonItems;

  // Clamp focus when switching modes
  useEffect(() => {
    setFocusIdx(0);
  }, [!!season]);

  const handleGamepadSelect = useCallback((idx: number) => {
    if (!season) {
      // Pre-season
      if (idx < PRE_SEASON_TEAM_COUNT) {
        // Select team
        const teamId = teamEntries[idx][0];
        playMenuSelect();
        setSelectedTeam(teamId);
      } else if (idx < PRE_SEASON_TEAM_COUNT + DIFFICULTIES.length) {
        // Select difficulty
        const di = idx - PRE_SEASON_TEAM_COUNT;
        playMenuSelect();
        setSelectedDifficulty(DIFFICULTIES[di]);
      } else if (idx === PRE_SEASON_TEAM_COUNT + DIFFICULTIES.length) {
        // Create Season
        handleCreateSeason();
      } else {
        // Back
        handleBack();
      }
    } else {
      // Active season
      if (currentFixture) {
        if (idx === 0) handlePlayNextMatch();
        else if (idx === 1) handleReset();
        else handleBack();
      } else {
        if (idx === 0) handleReset();
        else handleBack();
      }
    }
  }, [season, selectedTeam, selectedDifficulty, currentFixture, teamEntries]);

  const handleGamepadNavigate = useCallback((idx: number) => {
    setFocusIdx(idx);
    if (!season) {
      // Sync team/difficulty selection as user navigates
      if (idx < PRE_SEASON_TEAM_COUNT) {
        setSelectedTeam(teamEntries[idx][0]);
      } else if (idx < PRE_SEASON_TEAM_COUNT + DIFFICULTIES.length) {
        setSelectedDifficulty(DIFFICULTIES[idx - PRE_SEASON_TEAM_COUNT]);
      }
    }
  }, [season, teamEntries]);

  // Custom gamepad navigation with section-aware up/down for the pre-season grid
  // We need to handle the grid → difficulty → button transitions manually
  useEffect(() => {
    if (season) return; // Active season uses simple list via useMenuGamepad below

    const NAV_COOLDOWN = 180;
    const DEAD = 0.4;
    const prevButtons: { current: boolean[] } = { current: [] };
    const prevAxes: { current: number[] } = { current: [] };
    const lastNav: { current: number } = { current: 0 };
    let rafId = 0;

    const poll = () => {
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      let gp: Gamepad | null = null;
      for (const g of gamepads) { if (g && g.connected) { gp = g; break; } }

      if (gp) {
        const buttons = gp.buttons.map(b => b.pressed);
        const axes = gp.axes.slice(0, 4);
        const prev = prevButtons.current;
        const now = performance.now();
        const justPressed = (i: number) => buttons[i] && !prev[i];

        // A = confirm
        if (justPressed(0)) {
          handleGamepadSelect(focusIdx);
        }

        // B = back
        if (justPressed(1)) {
          handleBack();
        }

        // Navigation
        const canNav = now - lastNav.current > NAV_COOLDOWN;
        if (canNav) {
          const dUp = buttons[12]; const dDown = buttons[13];
          const dLeft = buttons[14]; const dRight = buttons[15];
          const lx = axes[0] ?? 0; const ly = axes[1] ?? 0;
          const stickUp = ly < -DEAD; const stickDown = ly > DEAD;
          const stickLeft = lx < -DEAD; const stickRight = lx > DEAD;

          const pLx = prevAxes.current[0] ?? 0; const pLy = prevAxes.current[1] ?? 0;
          const newUp = (dUp && !prev[12]) || (stickUp && !(pLy < -DEAD));
          const newDown = (dDown && !prev[13]) || (stickDown && !(pLy > DEAD));
          const newLeft = (dLeft && !prev[14]) || (stickLeft && !(pLx < -DEAD));
          const newRight = (dRight && !prev[15]) || (stickRight && !(pLx > DEAD));

          let newIdx = focusIdx;
          const COLS = 3;

          if (focusIdx < PRE_SEASON_TEAM_COUNT) {
            // In team grid
            if (newLeft) newIdx = Math.max(0, focusIdx - 1);
            else if (newRight) newIdx = Math.min(PRE_SEASON_TEAM_COUNT - 1, focusIdx + 1);
            else if (newUp) {
              const above = focusIdx - COLS;
              newIdx = above >= 0 ? above : focusIdx;
            }
            else if (newDown) {
              const below = focusIdx + COLS;
              newIdx = below < PRE_SEASON_TEAM_COUNT ? below : PRE_SEASON_TEAM_COUNT; // jump to difficulty
            }
          } else if (focusIdx < PRE_SEASON_TEAM_COUNT + DIFFICULTIES.length) {
            // In difficulty row
            const di = focusIdx - PRE_SEASON_TEAM_COUNT;
            if (newLeft) newIdx = di > 0 ? focusIdx - 1 : focusIdx;
            else if (newRight) newIdx = di < DIFFICULTIES.length - 1 ? focusIdx + 1 : focusIdx;
            else if (newUp) {
              // Jump back to last row of team grid
              const lastRowStart = Math.floor((PRE_SEASON_TEAM_COUNT - 1) / COLS) * COLS;
              newIdx = Math.min(lastRowStart + di, PRE_SEASON_TEAM_COUNT - 1);
            }
            else if (newDown) newIdx = PRE_SEASON_TEAM_COUNT + DIFFICULTIES.length; // Create Season
          } else if (focusIdx === PRE_SEASON_TEAM_COUNT + DIFFICULTIES.length) {
            // Create Season button
            if (newUp) newIdx = PRE_SEASON_TEAM_COUNT + 1; // middle difficulty
            else if (newDown) newIdx = PRE_SEASON_TEAM_COUNT + DIFFICULTIES.length + 1; // Back
          } else {
            // Back button
            if (newUp) newIdx = PRE_SEASON_TEAM_COUNT + DIFFICULTIES.length; // Create Season
          }

          if (newIdx !== focusIdx) {
            lastNav.current = now;
            handleGamepadNavigate(newIdx);
          }
        }

        prevButtons.current = buttons;
        prevAxes.current = axes;
      }

      rafId = requestAnimationFrame(poll);
    };

    rafId = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(rafId);
  }, [season, focusIdx, handleGamepadSelect, handleGamepadNavigate]);

  // Active season: simple vertical list navigation
  useMenuGamepad({
    itemCount: season ? activeSeasonItems : 0, // disabled when pre-season (handled above)
    selectedIndex: focusIdx,
    onSelect: handleGamepadSelect,
    onNavigate: setFocusIdx,
    onBack: handleBack,
  });

  // Helper: is this team grid item focused?
  const isTeamFocused = (idx: number) => !season && focusIdx === idx;
  const isDiffFocused = (di: number) => !season && focusIdx === PRE_SEASON_TEAM_COUNT + di;
  const isCreateFocused = !season && focusIdx === PRE_SEASON_TEAM_COUNT + DIFFICULTIES.length;
  const isBackFocused = !season && focusIdx === PRE_SEASON_TEAM_COUNT + DIFFICULTIES.length + 1;

  return (
    <div className="min-h-screen w-full bg-[#050510] px-4 py-6 text-white md:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-orange-300">Pyroball: Ignition</p>
            <h1 className="text-4xl font-black md:text-5xl" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              Season Hub
            </h1>
            <p className="mt-2 max-w-3xl text-white/65">
              Build a full campaign, advance through the regular season schedule, track league leaders, and chase the ignition playoff bracket.
            </p>
          </div>

          <button
            onClick={handleBack}
            className="rounded-lg border px-4 py-2 text-sm font-bold tracking-wider transition hover:bg-white/10"
            style={{
              borderColor: (!season && isBackFocused) || (season && focusIdx === (currentFixture ? 2 : 1))
                ? 'rgba(255,180,0,0.8)' : 'rgba(255,255,255,0.15)',
              background: (!season && isBackFocused) || (season && focusIdx === (currentFixture ? 2 : 1))
                ? 'rgba(255,180,0,0.15)' : 'rgba(255,255,255,0.05)',
              color: 'rgba(255,255,255,0.8)',
            }}
          >
            Back to Main Menu
          </button>
        </div>

        {!season ? (
          <div className="grid gap-6 lg:grid-cols-[1.25fr,0.9fr]">
            <section className="rounded-2xl border border-orange-500/20 bg-gradient-to-br from-[#171726] to-[#0a0a14] p-5 shadow-[0_0_40px_rgba(255,90,0,0.08)]">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>Choose Your Franchise</h2>
                  <p className="text-sm text-white/60">The season uses a 15-week round robin followed by a four-team playoff.</p>
                </div>
                <div className="rounded-lg border border-orange-400/25 bg-orange-500/10 px-3 py-2 text-xs uppercase tracking-[0.25em] text-orange-200">
                  {TEAMS[selectedTeam].name}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {teamEntries.map(([teamId, team], idx) => {
                  const isSelected = teamId === selectedTeam;
                  const isFocused = isTeamFocused(idx);
                  const stats = team.stats;
                  return (
                    <button
                      key={teamId}
                      onClick={() => { playMenuSelect(); setSelectedTeam(teamId); setFocusIdx(idx); }}
                      className="rounded-xl border px-4 py-4 text-left transition flex flex-col items-center"
                      style={{
                        borderColor: isFocused
                          ? 'rgba(255,220,0,0.9)'
                          : isSelected ? 'rgba(255,130,0,0.75)' : 'rgba(255,255,255,0.08)',
                        background: isSelected
                          ? 'linear-gradient(135deg, rgba(255,110,0,0.18), rgba(255,170,0,0.08))'
                          : isFocused
                            ? 'rgba(255,200,0,0.08)'
                            : 'rgba(255,255,255,0.03)',
                        boxShadow: isFocused
                          ? '0 0 20px rgba(255,200,0,0.25)'
                          : isSelected ? '0 0 30px rgba(255,110,0,0.18)' : 'none',
                        outline: isFocused ? '2px solid rgba(255,220,0,0.6)' : 'none',
                        outlineOffset: 2,
                      }}
                    >
                      {/* Team Logo */}
                      <div className="mb-3 flex justify-center">
                        <img
                          src={team.logo}
                          alt={team.name}
                          className="h-16 w-16 object-contain drop-shadow-lg"
                          style={{
                            filter: `drop-shadow(0 0 8px ${team.glow}66)`,
                          }}
                        />
                      </div>
                      
                      {/* Team Name */}
                      <span className="text-center text-lg font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>{team.name}</span>
                      
                      {/* Stats Grid */}
                      <div className="mt-3 grid w-full grid-cols-2 gap-2 text-xs">
                        <div className="rounded bg-white/5 p-2 text-center">
                          <div className="text-white/60">Speed</div>
                          <div className="font-bold text-orange-300">{stats.speed}/10</div>
                        </div>
                        <div className="rounded bg-white/5 p-2 text-center">
                          <div className="text-white/60">Scoring</div>
                          <div className="font-bold text-orange-300">{stats.scoring}/10</div>
                        </div>
                        <div className="rounded bg-white/5 p-2 text-center">
                          <div className="text-white/60">Rebound</div>
                          <div className="font-bold text-orange-300">{stats.rebounding}/10</div>
                        </div>
                        <div className="rounded bg-white/5 p-2 text-center">
                          <div className="text-white/60">Aggress</div>
                          <div className="font-bold text-orange-300">{stats.aggressiveness}/10</div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            <aside className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <h2 className="text-2xl font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>Season Settings</h2>
              <p className="mt-2 text-sm text-white/60">
                Difficulty affects your controlled fixtures. Every other game on the league calendar is simulated automatically each week.
              </p>

              <div className="mt-6 grid gap-3">
                {DIFFICULTIES.map((value, di) => {
                  const isSelected = value === selectedDifficulty;
                  const isFocused = isDiffFocused(di);
                  return (
                    <button
                      key={value}
                      onClick={() => { playMenuSelect(); setSelectedDifficulty(value); setFocusIdx(PRE_SEASON_TEAM_COUNT + di); }}
                      className="rounded-xl border px-4 py-3 text-left font-bold uppercase tracking-[0.25em] transition"
                      style={{
                        borderColor: isFocused
                          ? 'rgba(255,220,0,0.9)'
                          : isSelected ? 'rgba(255,184,0,0.75)' : 'rgba(255,255,255,0.1)',
                        background: isSelected ? 'rgba(255,184,0,0.14)' : isFocused ? 'rgba(255,200,0,0.08)' : 'rgba(255,255,255,0.03)',
                        color: isSelected ? '#fff' : 'rgba(255,255,255,0.72)',
                        outline: isFocused ? '2px solid rgba(255,220,0,0.6)' : 'none',
                        outlineOffset: 2,
                      }}
                    >
                      {value}
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 rounded-xl border border-orange-400/15 bg-orange-500/8 p-4 text-sm text-white/70">
                <p><strong className="text-white">Format:</strong> Single round-robin regular season.</p>
                <p className="mt-2"><strong className="text-white">Advancement:</strong> Top four teams reach the ignition playoffs.</p>
                <p className="mt-2"><strong className="text-white">Leaders:</strong> Best record, offense, defense, and scoring differential update across the season.</p>
                <p className="mt-2"><strong className="text-white">Tiebreakers:</strong> Standing points, wins, head-to-head, point differential, then points scored.</p>
              </div>

              <button
                onClick={handleCreateSeason}
                className="mt-6 w-full rounded-xl px-4 py-4 text-lg font-black uppercase tracking-[0.25em] text-black transition hover:scale-[1.01]"
                style={{
                  fontFamily: 'Rajdhani, sans-serif',
                  background: isCreateFocused
                    ? 'linear-gradient(to right, #ffd700, #ffaa00, #ff8800)'
                    : 'linear-gradient(to right, #f97316, #fb923c, #fbbf24)',
                  boxShadow: isCreateFocused
                    ? '0 0 40px rgba(255,200,0,0.4)'
                    : '0 0 40px rgba(255,128,0,0.25)',
                  outline: isCreateFocused ? '3px solid rgba(255,220,0,0.8)' : 'none',
                  outlineOffset: 2,
                }}
              >
                Create Season
              </button>
            </aside>
          </div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[1.15fr,0.85fr]">
            <section className="flex flex-col gap-6">
              <div className="rounded-2xl border border-orange-500/20 bg-gradient-to-br from-[#19192a] to-[#0a0a14] p-5 shadow-[0_0_40px_rgba(255,90,0,0.08)]">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-orange-200">Active Campaign</p>
                    <h2 className="mt-1 text-3xl font-black" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                      {TEAMS[season.userTeamId].name}
                    </h2>
                    <p className="mt-2 text-white/65">
                      {season.phase === 'completed'
                        ? 'Your season is complete. Review the final table, postseason outcome, and launch another run whenever you are ready.'
                        : 'The next scheduled fixture is ready. Continue the calendar, monitor the race, and push into the postseason.'}
                    </p>
                  </div>

                  <div className="grid gap-2 text-sm text-white/75">
                    <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                      <span className="block text-xs uppercase tracking-[0.25em] text-white/40">Phase</span>
                      <strong className="text-white">{season.phase.replace('-', ' ')}</strong>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                      <span className="block text-xs uppercase tracking-[0.25em] text-white/40">Difficulty</span>
                      <strong className="text-white">{season.difficulty}</strong>
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-4">
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <span className="block text-xs uppercase tracking-[0.25em] text-white/45">Record</span>
                    <strong className="text-3xl" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                      {record ? `${record.wins}-${record.losses}-${record.ties}` : '0-0-0'}
                    </strong>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <span className="block text-xs uppercase tracking-[0.25em] text-white/45">Rank</span>
                    <strong className="text-3xl" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                      {record?.rank ?? '--'}
                    </strong>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <span className="block text-xs uppercase tracking-[0.25em] text-white/45">Points</span>
                    <strong className="text-3xl" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                      {record?.standingPoints ?? 0}
                    </strong>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <span className="block text-xs uppercase tracking-[0.25em] text-white/45">Progress</span>
                    <strong className="text-3xl" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                      {Math.round(progress * 100)}%
                    </strong>
                  </div>
                </div>

                <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/8">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-orange-500 via-orange-400 to-amber-300"
                    style={{ width: `${Math.max(4, Math.round(progress * 100))}%` }}
                  />
                </div>

                <div className="mt-5 rounded-xl border border-orange-400/15 bg-orange-500/8 p-4">
                  {currentFixture ? (
                    <>
                      <p className="text-xs uppercase tracking-[0.3em] text-orange-200">Next Fixture</p>
                      <h3 className="mt-2 text-2xl font-black" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                        {getFixtureLabel(currentFixture)}
                      </h3>
                      <p className="mt-2 text-white/70">
                        {formatFixtureTeams(currentFixture.homeTeamId, currentFixture.awayTeamId)}
                      </p>
                      <button
                        onClick={handlePlayNextMatch}
                        className="mt-4 rounded-xl px-5 py-3 text-base font-black uppercase tracking-[0.25em] text-black transition hover:scale-[1.01]"
                        style={{
                          fontFamily: 'Rajdhani, sans-serif',
                          background: season && focusIdx === 0
                            ? 'linear-gradient(to right, #ffd700, #ffaa00, #ff8800)'
                            : 'linear-gradient(to right, #f97316, #fb923c, #fbbf24)',
                          boxShadow: season && focusIdx === 0
                            ? '0 0 30px rgba(255,200,0,0.4)'
                            : 'none',
                          outline: season && focusIdx === 0 ? '3px solid rgba(255,220,0,0.8)' : 'none',
                          outlineOffset: 2,
                        }}
                      >
                        Play Next Match
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="text-xs uppercase tracking-[0.3em] text-orange-200">Season Complete</p>
                      <h3 className="mt-2 text-2xl font-black" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                        {season.championTeamId ? `${TEAMS[season.championTeamId].name} claimed the title` : 'Season concluded'}
                      </h3>
                      <p className="mt-2 text-white/70">
                        {season.championTeamId === season.userTeamId
                          ? 'You brought the ignition trophy home.'
                          : 'The postseason has finished. Review the bracket, inspect the final leaders, or start a new campaign.'}
                      </p>
                    </>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    onClick={handleReset}
                    className="rounded-xl border px-4 py-2 text-sm font-bold uppercase tracking-[0.25em] transition hover:bg-white/10"
                    style={{
                      borderColor: season && focusIdx === (currentFixture ? 1 : 0)
                        ? 'rgba(255,220,0,0.8)' : 'rgba(255,255,255,0.15)',
                      background: season && focusIdx === (currentFixture ? 1 : 0)
                        ? 'rgba(255,200,0,0.12)' : 'rgba(255,255,255,0.05)',
                      color: 'rgba(255,255,255,0.8)',
                      outline: season && focusIdx === (currentFixture ? 1 : 0) ? '2px solid rgba(255,220,0,0.6)' : 'none',
                      outlineOffset: 2,
                    }}
                  >
                    Reset Season
                  </button>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-[1fr,1fr]">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <div className="flex items-center justify-between gap-4">
                    <h2 className="text-2xl font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>League Leaders</h2>
                    <span className="text-xs uppercase tracking-[0.25em] text-white/45">Season snapshot</span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {leaders.map((leader) => {
                      const team = TEAMS[leader.teamId];
                      const isUser = leader.teamId === season.userTeamId;
                      return (
                        <div
                          key={leader.key}
                          className="rounded-xl border px-4 py-4"
                          style={{
                            borderColor: isUser ? 'rgba(255,145,0,0.45)' : 'rgba(255,255,255,0.08)',
                            background: isUser
                              ? 'linear-gradient(135deg, rgba(255,125,0,0.12), rgba(255,255,255,0.03))'
                              : 'rgba(255,255,255,0.03)',
                          }}
                        >
                          <p className="text-[11px] uppercase tracking-[0.25em] text-white/45">{leader.label}</p>
                          <h3 className="mt-2 text-xl font-black" style={{ fontFamily: 'Rajdhani, sans-serif' }}>{leader.value}</h3>
                          <p className="mt-1 font-semibold text-white/85">{team.name}</p>
                          <p className="mt-1 text-sm text-white/55">{leader.detail}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <div className="flex items-center justify-between gap-4">
                    <h2 className="text-2xl font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>Playoff Bracket</h2>
                    <span className="text-xs uppercase tracking-[0.25em] text-white/45">
                      {bracket?.mode === 'projected' ? 'Projected field' : bracket?.mode === 'completed' ? 'Final results' : 'Live bracket'}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-4 lg:grid-cols-[1fr,0.8fr]">
                    <div className="space-y-3">
                      {(bracket?.semifinalGames ?? []).map((game) => {
                        const winnerTeamId = game.fixture?.result?.winnerTeamId ?? null;
                        return (
                          <div key={game.slot} className="rounded-xl border border-white/10 bg-black/20 p-4">
                            <p className="text-[11px] uppercase tracking-[0.25em] text-orange-200">{game.slot}</p>
                            <h3 className="mt-2 text-lg font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                              {formatGameTeams(game)}
                            </h3>
                            <p className="mt-1 text-sm text-white/60">{getBracketStatus(game)}</p>
                            {winnerTeamId && (
                              <p className="mt-2 text-sm font-semibold text-emerald-300">Winner: {TEAMS[winnerTeamId].name}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="rounded-2xl border border-orange-400/15 bg-gradient-to-br from-orange-500/10 to-white/5 p-4">
                      <p className="text-[11px] uppercase tracking-[0.25em] text-orange-200">Championship</p>
                      <h3 className="mt-2 text-2xl font-black" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                        {formatGameTeams(bracket?.finalGame ?? null)}
                      </h3>
                      <p className="mt-2 text-sm text-white/60">{getBracketStatus(bracket?.finalGame ?? null)}</p>

                      <div className="mt-5 rounded-xl border border-white/10 bg-black/20 p-4">
                        <p className="text-[11px] uppercase tracking-[0.25em] text-white/45">Ignition Champion</p>
                        <p className="mt-2 text-xl font-black" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                          {bracket?.championTeamId ? TEAMS[bracket.championTeamId].name : 'To be decided'}
                        </p>
                        <p className="mt-2 text-sm text-white/55">
                          {bracket?.championTeamId
                            ? bracket.championTeamId === season.userTeamId
                              ? 'You completed the playoff run and captured the trophy.'
                              : 'The postseason concluded and crowned a champion.'
                            : bracket?.mode === 'projected'
                              ? 'Top four teams will lock in the field once the regular season ends.'
                              : 'Win and advance through the bracket to seize the title.'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="text-2xl font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>Team Schedule</h2>
                  <span className="text-xs uppercase tracking-[0.25em] text-white/45">Upcoming & Recent</span>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-[0.25em] text-orange-200">Upcoming</p>
                    <div className="mt-3 flex flex-col gap-3">
                      {upcomingFixtures.length > 0 ? upcomingFixtures.map((fixture) => (
                        <div key={fixture.id} className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
                          <p className="text-xs uppercase tracking-[0.25em] text-white/40">{getFixtureLabel(fixture)}</p>
                          <p className="mt-1 font-semibold">{formatFixtureTeams(fixture.homeTeamId, fixture.awayTeamId)}</p>
                        </div>
                      )) : (
                        <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white/55">No remaining fixtures.</div>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-bold uppercase tracking-[0.25em] text-orange-200">Recent Results</p>
                    <div className="mt-3 flex flex-col gap-3">
                      {recentFixtures.length > 0 ? recentFixtures.map((fixture) => (
                        <div key={fixture.id} className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
                          <p className="text-xs uppercase tracking-[0.25em] text-white/40">{getFixtureLabel(fixture)}</p>
                          <p className="mt-1 font-semibold">{formatFixtureTeams(fixture.homeTeamId, fixture.awayTeamId)}</p>
                          <p className="mt-1 text-sm text-white/60">
                            {fixture.result ? `${fixture.result.awayScore} - ${fixture.result.homeScore}` : 'Pending'}
                          </p>
                        </div>
                      )) : (
                        <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white/55">No completed fixtures yet.</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <aside className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-2xl font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>Standings</h2>
                <span className="text-xs uppercase tracking-[0.25em] text-white/45">Top 4 reach playoffs</span>
              </div>

              <div className="mt-4 overflow-hidden rounded-xl border border-white/10">
                <div className="grid grid-cols-[56px,1.5fr,88px,88px,88px,88px] bg-white/5 px-3 py-3 text-xs font-bold uppercase tracking-[0.2em] text-white/50">
                  <span>Rank</span>
                  <span>Team</span>
                  <span>W-L-T</span>
                  <span>PTS</span>
                  <span>PF</span>
                  <span>PD</span>
                </div>
                <div className="max-h-[780px] overflow-y-auto">
                  {season.standings.map((entry) => {
                    const isUser = entry.teamId === season.userTeamId;
                    const inPlayoffCut = entry.rank <= 4;
                    return (
                      <div
                        key={entry.teamId}
                        className="grid grid-cols-[56px,1.5fr,88px,88px,88px,88px] items-center border-t border-white/6 px-3 py-3 text-sm"
                        style={{
                          background: isUser
                            ? 'rgba(255,128,0,0.12)'
                            : inPlayoffCut
                              ? 'rgba(255,255,255,0.03)'
                              : 'transparent',
                        }}
                      >
                        <span className="font-bold text-white/75">{entry.rank}</span>
                        <span className="font-semibold">{TEAMS[entry.teamId].name}</span>
                        <span className="text-white/70">{entry.wins}-{entry.losses}-{entry.ties}</span>
                        <span className="text-white/70">{entry.standingPoints}</span>
                        <span className="text-white/70">{entry.pointsFor}</span>
                        <span className={entry.pointDiff >= 0 ? 'text-emerald-300' : 'text-rose-300'}>
                          {entry.pointDiff >= 0 ? `+${entry.pointDiff}` : entry.pointDiff}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
