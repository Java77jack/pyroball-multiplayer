import { useEffect, useMemo, useState } from 'react';
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
            className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-bold tracking-wider text-white/80 transition hover:bg-white/10"
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
                {teamEntries.map(([teamId, team]) => {
                  const isSelected = teamId === selectedTeam;
                  return (
                    <button
                      key={teamId}
                      onClick={() => setSelectedTeam(teamId)}
                      className="rounded-xl border px-4 py-4 text-left transition"
                      style={{
                        borderColor: isSelected ? 'rgba(255,130,0,0.75)' : 'rgba(255,255,255,0.08)',
                        background: isSelected
                          ? 'linear-gradient(135deg, rgba(255,110,0,0.18), rgba(255,170,0,0.08))'
                          : 'rgba(255,255,255,0.03)',
                        boxShadow: isSelected ? '0 0 30px rgba(255,110,0,0.18)' : 'none',
                      }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-lg font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>{team.name}</span>
                        <span className="text-[10px] uppercase tracking-[0.25em] text-white/40">{team.id}</span>
                      </div>
                      <p className="mt-2 text-sm text-white/55">{team.primary.toUpperCase()} primary • {team.secondary.toUpperCase()} trim</p>
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
                {DIFFICULTIES.map((value) => {
                  const isSelected = value === selectedDifficulty;
                  return (
                    <button
                      key={value}
                      onClick={() => setSelectedDifficulty(value)}
                      className="rounded-xl border px-4 py-3 text-left font-bold uppercase tracking-[0.25em] transition"
                      style={{
                        borderColor: isSelected ? 'rgba(255,184,0,0.75)' : 'rgba(255,255,255,0.1)',
                        background: isSelected ? 'rgba(255,184,0,0.14)' : 'rgba(255,255,255,0.03)',
                        color: isSelected ? '#fff' : 'rgba(255,255,255,0.72)',
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
                className="mt-6 w-full rounded-xl bg-gradient-to-r from-orange-500 via-orange-400 to-amber-300 px-4 py-4 text-lg font-black uppercase tracking-[0.25em] text-black shadow-[0_0_40px_rgba(255,128,0,0.25)] transition hover:scale-[1.01]"
                style={{ fontFamily: 'Rajdhani, sans-serif' }}
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
                        className="mt-4 rounded-xl bg-gradient-to-r from-orange-500 via-orange-400 to-amber-300 px-5 py-3 text-base font-black uppercase tracking-[0.25em] text-black transition hover:scale-[1.01]"
                        style={{ fontFamily: 'Rajdhani, sans-serif' }}
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
                    className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-bold uppercase tracking-[0.25em] text-white/80 transition hover:bg-white/10"
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
                <div className="grid grid-cols-[56px,1.5fr,88px,88px,88px,88px] bg-white/8 px-3 py-3 text-xs font-bold uppercase tracking-[0.2em] text-white/45">
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
