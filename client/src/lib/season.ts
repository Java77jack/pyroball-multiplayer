import { TEAMS, type GoalEvent } from './gameConstants';

export type SeasonDifficulty = 'rookie' | 'pro' | 'allstar';
export type SeasonPhase = 'regular-season' | 'playoffs' | 'completed';
export type SeasonStage = 'regular' | 'semifinal' | 'final';
export type FixtureStatus = 'pending' | 'completed';
export type FixtureDecision = 'regulation' | 'firestorm';

export interface MatchScore {
  home: number;
  away: number;
}

export interface SeasonFixtureResult {
  homeScore: number;
  awayScore: number;
  winnerTeamId: string | null;
  decidedBy: FixtureDecision;
  goalCount: number;
}

export interface SeasonFixture {
  id: string;
  week: number;
  stage: SeasonStage;
  homeTeamId: string;
  awayTeamId: string;
  isUserFixture: boolean;
  status: FixtureStatus;
  result?: SeasonFixtureResult;
}

export interface TeamRecord {
  rank: number;
  teamId: string;
  played: number;
  wins: number;
  losses: number;
  ties: number;
  standingPoints: number;
  pointsFor: number;
  pointsAgainst: number;
  pointDiff: number;
}

export interface SeasonLeader {
  key: 'best-record' | 'top-offense' | 'toughest-defense' | 'best-differential';
  label: string;
  teamId: string;
  value: string;
  detail: string;
}

export interface PlayoffBracketGame {
  slot: string;
  fixture: SeasonFixture | null;
  homeTeamId: string | null;
  awayTeamId: string | null;
}

export interface PlayoffBracketView {
  mode: 'projected' | 'live' | 'completed';
  projectedTeams: string[];
  semifinalGames: PlayoffBracketGame[];
  finalGame: PlayoffBracketGame | null;
  championTeamId: string | null;
}

export interface SeasonState {
  version: number;
  seasonId: string;
  userTeamId: string;
  difficulty: SeasonDifficulty;
  phase: SeasonPhase;
  currentWeek: number;
  currentFixtureId: string | null;
  regularSeasonWeeks: number;
  championTeamId: string | null;
  playoffTeams: string[];
  standings: TeamRecord[];
  fixtures: SeasonFixture[];
  justCompletedFixtureId: string | null;
}

export const SEASON_STORAGE_KEY = 'pyroball-ignition-season-v1';
const STANDINGS_WIN_POINTS = 2;
const STANDINGS_TIE_POINTS = 1;
const TEAM_IDS = Object.keys(TEAMS);

function buildFixtureId(stage: SeasonStage, week: number, index: number) {
  return `${stage}-${week}-${index}`;
}

function clampScore(value: number) {
  return Math.max(0, Math.round(value));
}

function hashString(input: string) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(input: string, salt = 0) {
  let seed = (hashString(input) + salt * 1013904223) >>> 0;
  seed ^= seed << 13;
  seed ^= seed >>> 17;
  seed ^= seed << 5;
  return (seed >>> 0) / 4294967296;
}

function getTeamPower(teamId: string) {
  const teamIndex = TEAM_IDS.indexOf(teamId);
  if (teamIndex === -1) return 1;
  return 0.92 + ((teamIndex + 1) / TEAM_IDS.length) * 0.28;
}

function createEmptyRecord(teamId: string): TeamRecord {
  return {
    rank: 0,
    teamId,
    played: 0,
    wins: 0,
    losses: 0,
    ties: 0,
    standingPoints: 0,
    pointsFor: 0,
    pointsAgainst: 0,
    pointDiff: 0,
  };
}

function cloneRecord(record: TeamRecord): TeamRecord {
  return { ...record };
}

function isTie(result: SeasonFixtureResult) {
  return result.homeScore === result.awayScore;
}

function updateStandingPoints(record: TeamRecord) {
  record.standingPoints = record.wins * STANDINGS_WIN_POINTS + record.ties * STANDINGS_TIE_POINTS;
  record.pointDiff = record.pointsFor - record.pointsAgainst;
}

function applyFixtureToRecords(records: Map<string, TeamRecord>, fixture: SeasonFixture) {
  if (!fixture.result || fixture.status !== 'completed') return;

  const homeRecord = records.get(fixture.homeTeamId);
  const awayRecord = records.get(fixture.awayTeamId);
  if (!homeRecord || !awayRecord) return;

  const { homeScore, awayScore } = fixture.result;

  homeRecord.played += 1;
  awayRecord.played += 1;
  homeRecord.pointsFor += homeScore;
  homeRecord.pointsAgainst += awayScore;
  awayRecord.pointsFor += awayScore;
  awayRecord.pointsAgainst += homeScore;

  if (homeScore > awayScore) {
    homeRecord.wins += 1;
    awayRecord.losses += 1;
  } else if (awayScore > homeScore) {
    awayRecord.wins += 1;
    homeRecord.losses += 1;
  } else {
    homeRecord.ties += 1;
    awayRecord.ties += 1;
  }

  updateStandingPoints(homeRecord);
  updateStandingPoints(awayRecord);
}

function getHeadToHeadWins(teamId: string, opponentId: string, fixtures: SeasonFixture[]) {
  return fixtures.reduce((wins, fixture) => {
    if (fixture.status !== 'completed' || !fixture.result) return wins;

    const involvesTeams =
      (fixture.homeTeamId === teamId && fixture.awayTeamId === opponentId) ||
      (fixture.homeTeamId === opponentId && fixture.awayTeamId === teamId);
    if (!involvesTeams) return wins;

    if (fixture.result.winnerTeamId === teamId) return wins + 1;
    return wins;
  }, 0);
}

function sortStandings(records: TeamRecord[], fixtures: SeasonFixture[]) {
  return [...records].sort((a, b) => {
    if (b.standingPoints !== a.standingPoints) return b.standingPoints - a.standingPoints;
    if (b.wins !== a.wins) return b.wins - a.wins;

    const aHeadToHead = getHeadToHeadWins(a.teamId, b.teamId, fixtures);
    const bHeadToHead = getHeadToHeadWins(b.teamId, a.teamId, fixtures);
    if (aHeadToHead !== bHeadToHead) return bHeadToHead - aHeadToHead;

    if (b.pointDiff !== a.pointDiff) return b.pointDiff - a.pointDiff;
    if (b.pointsFor !== a.pointsFor) return b.pointsFor - a.pointsFor;
    return TEAMS[a.teamId].name.localeCompare(TEAMS[b.teamId].name);
  }).map((record, index) => ({ ...record, rank: index + 1 }));
}

export function calculateStandings(fixtures: SeasonFixture[], teamIds = TEAM_IDS): TeamRecord[] {
  const records = new Map<string, TeamRecord>(teamIds.map((teamId) => [teamId, createEmptyRecord(teamId)]));

  fixtures
    .filter((fixture) => fixture.stage === 'regular')
    .forEach((fixture) => applyFixtureToRecords(records, fixture));

  return sortStandings(Array.from(records.values()).map(cloneRecord), fixtures);
}

function completeFixture(fixture: SeasonFixture, result: SeasonFixtureResult): SeasonFixture {
  return {
    ...fixture,
    status: 'completed',
    result,
  };
}

function createFixtureResult(
  fixture: SeasonFixture,
  score: MatchScore,
  goalEvents: GoalEvent[] = [],
): SeasonFixtureResult {
  const isPlayoffGame = fixture.stage !== 'regular';
  const homeScore = clampScore(score.home);
  const awayScore = clampScore(score.away);

  if (homeScore === awayScore && isPlayoffGame) {
    const homeSeed = seededRandom(`${fixture.id}:firestorm`, 1) + getTeamPower(fixture.homeTeamId) * 0.03;
    const awaySeed = seededRandom(`${fixture.id}:firestorm`, 2) + getTeamPower(fixture.awayTeamId) * 0.03;
    const homeWins = homeSeed >= awaySeed;

    return {
      homeScore,
      awayScore,
      winnerTeamId: homeWins ? fixture.homeTeamId : fixture.awayTeamId,
      decidedBy: 'firestorm',
      goalCount: goalEvents.length,
    };
  }

  return {
    homeScore,
    awayScore,
    winnerTeamId:
      homeScore > awayScore ? fixture.homeTeamId : awayScore > homeScore ? fixture.awayTeamId : null,
    decidedBy: 'regulation',
    goalCount: goalEvents.length,
  };
}

function simulateFixtureResult(fixture: SeasonFixture): SeasonFixtureResult {
  const baseKey = `${fixture.id}:${fixture.homeTeamId}:${fixture.awayTeamId}`;
  const homeStrength = getTeamPower(fixture.homeTeamId);
  const awayStrength = getTeamPower(fixture.awayTeamId);

  const homeScore = clampScore(
    4 + homeStrength * 4.2 + seededRandom(baseKey, 1) * 7 + 0.6 - seededRandom(baseKey, 2) * 1.5,
  );
  const awayScore = clampScore(
    4 + awayStrength * 4.0 + seededRandom(baseKey, 3) * 7 - seededRandom(baseKey, 4) * 1.5,
  );

  return createFixtureResult(
    fixture,
    { home: homeScore, away: awayScore },
    new Array(Math.max(homeScore, awayScore)).fill(null) as unknown as GoalEvent[],
  );
}

function createRoundRobinFixtures(teamIds: string[], userTeamId: string): SeasonFixture[] {
  const teams = [...teamIds];
  if (teams.length % 2 !== 0) {
    teams.push('__bye__');
  }

  const fixed = teams[0];
  let rotating = teams.slice(1);
  const fixtures: SeasonFixture[] = [];
  const rounds = teams.length - 1;
  const matchesPerRound = teams.length / 2;

  for (let round = 0; round < rounds; round++) {
    const lineup = [fixed, ...rotating];

    for (let index = 0; index < matchesPerRound; index++) {
      const teamA = lineup[index];
      const teamB = lineup[lineup.length - 1 - index];
      if (teamA === '__bye__' || teamB === '__bye__') continue;

      const shouldSwapHomeAway = (round + index) % 2 === 1;
      const homeTeamId = shouldSwapHomeAway ? teamB : teamA;
      const awayTeamId = shouldSwapHomeAway ? teamA : teamB;

      fixtures.push({
        id: buildFixtureId('regular', round + 1, index + 1),
        week: round + 1,
        stage: 'regular',
        homeTeamId,
        awayTeamId,
        isUserFixture: homeTeamId === userTeamId || awayTeamId === userTeamId,
        status: 'pending',
      });
    }

    rotating = [rotating[rotating.length - 1], ...rotating.slice(0, -1)];
  }

  return fixtures;
}

function createSemifinalFixtures(playoffTeams: string[], userTeamId: string, week: number): SeasonFixture[] {
  if (playoffTeams.length < 4) return [];

  const pairings: Array<[string, string]> = [
    [playoffTeams[0], playoffTeams[3]],
    [playoffTeams[1], playoffTeams[2]],
  ];

  return pairings.map(([homeTeamId, awayTeamId], index) => ({
    id: buildFixtureId('semifinal', week, index + 1),
    week,
    stage: 'semifinal',
    homeTeamId,
    awayTeamId,
    isUserFixture: homeTeamId === userTeamId || awayTeamId === userTeamId,
    status: 'pending',
  }));
}

function createFinalFixture(
  semifinalFixtures: SeasonFixture[],
  userTeamId: string,
  week: number,
): SeasonFixture | null {
  const winners = semifinalFixtures
    .filter((fixture) => fixture.status === 'completed' && fixture.result?.winnerTeamId)
    .map((fixture) => fixture.result!.winnerTeamId as string);

  if (winners.length !== 2) return null;

  return {
    id: buildFixtureId('final', week, 1),
    week,
    stage: 'final',
    homeTeamId: winners[0],
    awayTeamId: winners[1],
    isUserFixture: winners.includes(userTeamId),
    status: 'pending',
  };
}

function replaceFixture(fixtures: SeasonFixture[], updatedFixture: SeasonFixture): SeasonFixture[] {
  return fixtures.map((fixture) => (fixture.id === updatedFixture.id ? updatedFixture : fixture));
}

function getPendingUserFixture(fixtures: SeasonFixture[]) {
  return fixtures
    .filter((fixture) => fixture.isUserFixture && fixture.status === 'pending')
    .sort((a, b) => a.week - b.week)[0] ?? null;
}

function simulateWeek(fixtures: SeasonFixture[], week: number, stage: SeasonStage) {
  let nextFixtures = [...fixtures];

  nextFixtures
    .filter((fixture) => fixture.week === week && fixture.stage === stage && fixture.status === 'pending' && !fixture.isUserFixture)
    .forEach((fixture) => {
      nextFixtures = replaceFixture(nextFixtures, completeFixture(fixture, simulateFixtureResult(fixture)));
    });

  return nextFixtures;
}

function simulateEntireBracket(fixtures: SeasonFixture[], userTeamId: string, startingWeek: number) {
  let nextFixtures = [...fixtures];
  const pendingSemis = nextFixtures.filter((fixture) => fixture.stage === 'semifinal' && fixture.status === 'pending');

  pendingSemis.forEach((fixture) => {
    nextFixtures = replaceFixture(nextFixtures, completeFixture(fixture, simulateFixtureResult(fixture)));
  });

  let finalFixture: SeasonFixture | null = nextFixtures.find((fixture) => fixture.stage === 'final') ?? null;
  if (!finalFixture) {
    const semifinalFixtures = nextFixtures.filter((fixture) => fixture.stage === 'semifinal');
    finalFixture = createFinalFixture(semifinalFixtures, userTeamId, startingWeek + 1);
    if (finalFixture) {
      nextFixtures = [...nextFixtures, finalFixture];
    }
  }

  if (finalFixture && finalFixture.status === 'pending') {
    nextFixtures = replaceFixture(nextFixtures, completeFixture(finalFixture, simulateFixtureResult(finalFixture)));
  }

  return nextFixtures;
}

function buildCompletedSeason(season: SeasonState, fixtures: SeasonFixture[]): SeasonState {
  const finalFixture = fixtures.find((fixture) => fixture.stage === 'final' && fixture.status === 'completed');
  const championTeamId = finalFixture?.result?.winnerTeamId ?? season.playoffTeams[0] ?? season.standings[0]?.teamId ?? null;

  return {
    ...season,
    phase: 'completed',
    currentFixtureId: null,
    currentWeek: finalFixture?.week ?? season.currentWeek,
    championTeamId,
    fixtures,
    standings: calculateStandings(fixtures),
  };
}

function advanceFromRegularSeason(season: SeasonState): SeasonState {
  const nextUserFixture = getPendingUserFixture(season.fixtures.filter((fixture) => fixture.stage === 'regular'));
  if (nextUserFixture) {
    return {
      ...season,
      phase: 'regular-season',
      currentWeek: nextUserFixture.week,
      currentFixtureId: nextUserFixture.id,
      standings: calculateStandings(season.fixtures),
    };
  }

  const standings = calculateStandings(season.fixtures);
  const playoffTeams = standings.slice(0, 4).map((record) => record.teamId);
  const semifinalWeek = season.regularSeasonWeeks + 1;
  const semifinalFixtures = createSemifinalFixtures(playoffTeams, season.userTeamId, semifinalWeek);
  let fixtures = [...season.fixtures, ...semifinalFixtures];

  if (!playoffTeams.includes(season.userTeamId)) {
    fixtures = simulateEntireBracket(fixtures, season.userTeamId, semifinalWeek);
    return buildCompletedSeason({ ...season, standings, playoffTeams }, fixtures);
  }

  const currentFixture = semifinalFixtures.find((fixture) => fixture.isUserFixture) ?? null;
  if (!currentFixture) {
    fixtures = simulateEntireBracket(fixtures, season.userTeamId, semifinalWeek);
    return buildCompletedSeason({ ...season, standings, playoffTeams }, fixtures);
  }

  return {
    ...season,
    phase: 'playoffs',
    currentWeek: semifinalWeek,
    currentFixtureId: currentFixture.id,
    playoffTeams,
    standings,
    fixtures,
    championTeamId: null,
  };
}

function advanceFromPlayoffs(season: SeasonState): SeasonState {
  const semifinalFixtures = season.fixtures.filter((fixture) => fixture.stage === 'semifinal');
  const finalFixture = season.fixtures.find((fixture) => fixture.stage === 'final') ?? null;

  const pendingSemifinal = semifinalFixtures.find((fixture) => fixture.status === 'pending');
  if (pendingSemifinal) {
    return {
      ...season,
      phase: 'playoffs',
      currentWeek: pendingSemifinal.week,
      currentFixtureId: pendingSemifinal.id,
    };
  }

  if (!finalFixture) {
    const createdFinal = createFinalFixture(semifinalFixtures, season.userTeamId, season.regularSeasonWeeks + 2);
    if (!createdFinal) {
      return buildCompletedSeason(season, season.fixtures);
    }

    let fixtures = [...season.fixtures, createdFinal];
    if (!createdFinal.isUserFixture) {
      fixtures = simulateEntireBracket(fixtures, season.userTeamId, season.regularSeasonWeeks + 1);
      return buildCompletedSeason(season, fixtures);
    }

    return {
      ...season,
      phase: 'playoffs',
      currentWeek: createdFinal.week,
      currentFixtureId: createdFinal.id,
      fixtures,
    };
  }

  if (finalFixture.status === 'pending') {
    if (!finalFixture.isUserFixture) {
      const fixtures = simulateEntireBracket(season.fixtures, season.userTeamId, season.regularSeasonWeeks + 1);
      return buildCompletedSeason(season, fixtures);
    }

    return {
      ...season,
      phase: 'playoffs',
      currentWeek: finalFixture.week,
      currentFixtureId: finalFixture.id,
    };
  }

  return buildCompletedSeason(season, season.fixtures);
}

export function createSeason(userTeamId: string, difficulty: SeasonDifficulty): SeasonState {
  const fixtures = createRoundRobinFixtures(TEAM_IDS, userTeamId);
  const currentFixture = getPendingUserFixture(fixtures);

  return {
    version: 1,
    seasonId: `season-${Date.now()}`,
    userTeamId,
    difficulty,
    phase: 'regular-season',
    currentWeek: currentFixture?.week ?? 1,
    currentFixtureId: currentFixture?.id ?? null,
    regularSeasonWeeks: TEAM_IDS.length - 1,
    championTeamId: null,
    playoffTeams: [],
    standings: calculateStandings(fixtures),
    fixtures,
    justCompletedFixtureId: null,
  };
}

export function getCurrentSeasonFixture(season: SeasonState | null) {
  if (!season?.currentFixtureId) return null;
  return season.fixtures.find((fixture) => fixture.id === season.currentFixtureId) ?? null;
}

export function getFixtureLabel(fixture: SeasonFixture) {
  if (fixture.stage === 'regular') return `Week ${fixture.week}`;
  if (fixture.stage === 'semifinal') return 'Semifinal';
  return 'Ignition Final';
}

export function getUserTeamRecord(season: SeasonState | null) {
  if (!season) return null;
  return season.standings.find((record) => record.teamId === season.userTeamId) ?? null;
}

export function getRecentFixture(season: SeasonState | null) {
  if (!season?.justCompletedFixtureId) return null;
  return season.fixtures.find((fixture) => fixture.id === season.justCompletedFixtureId) ?? null;
}

export function getUpcomingFixtures(season: SeasonState | null, teamId: string, limit = 5) {
  if (!season) return [];
  return season.fixtures
    .filter(
      (fixture) =>
        fixture.status === 'pending' &&
        (fixture.homeTeamId === teamId || fixture.awayTeamId === teamId),
    )
    .sort((a, b) => a.week - b.week)
    .slice(0, limit);
}

export function getCompletedFixtures(season: SeasonState | null, teamId: string, limit = 5) {
  if (!season) return [];
  return season.fixtures
    .filter(
      (fixture) =>
        fixture.status === 'completed' &&
        (fixture.homeTeamId === teamId || fixture.awayTeamId === teamId),
    )
    .sort((a, b) => b.week - a.week)
    .slice(0, limit);
}

export function recordCurrentSeasonFixture(
  season: SeasonState,
  score: MatchScore,
  goalEvents: GoalEvent[] = [],
): SeasonState {
  const currentFixture = getCurrentSeasonFixture(season);
  if (!currentFixture || currentFixture.status === 'completed') {
    return season;
  }

  let fixtures = replaceFixture(
    season.fixtures,
    completeFixture(currentFixture, createFixtureResult(currentFixture, score, goalEvents)),
  );

  fixtures = simulateWeek(fixtures, currentFixture.week, currentFixture.stage);

  const baseSeason: SeasonState = {
    ...season,
    fixtures,
    standings: calculateStandings(fixtures),
    justCompletedFixtureId: currentFixture.id,
  };

  if (currentFixture.stage === 'regular') {
    return advanceFromRegularSeason(baseSeason);
  }

  return advanceFromPlayoffs(baseSeason);
}

export function shouldRecordSeasonMatch(
  season: SeasonState | null,
  homeTeamId: string,
  awayTeamId: string,
) {
  const fixture = getCurrentSeasonFixture(season);
  if (!fixture || fixture.status === 'completed') return false;
  return fixture.homeTeamId === homeTeamId && fixture.awayTeamId === awayTeamId;
}

export function getSeasonProgress(season: SeasonState | null) {
  if (!season) return 0;
  const completed = season.fixtures.filter((fixture) => fixture.status === 'completed').length;
  return season.fixtures.length === 0 ? 0 : completed / season.fixtures.length;
}

function compareStandingsByRank(a: TeamRecord, b: TeamRecord) {
  return a.rank - b.rank || b.pointDiff - a.pointDiff || b.pointsFor - a.pointsFor;
}

function createBracketGame(
  slot: string,
  fixture: SeasonFixture | null,
  fallbackTeams: [string | null, string | null],
): PlayoffBracketGame {
  return {
    slot,
    fixture,
    homeTeamId: fixture?.homeTeamId ?? fallbackTeams[0],
    awayTeamId: fixture?.awayTeamId ?? fallbackTeams[1],
  };
}

function formatRecord(record: TeamRecord) {
  return `${record.wins}-${record.losses}-${record.ties}`;
}

export function getSeasonLeaders(season: SeasonState | null): SeasonLeader[] {
  if (!season || season.standings.length === 0) return [];

  const byRank = [...season.standings].sort(compareStandingsByRank);
  const byOffense = [...season.standings].sort(
    (a, b) => b.pointsFor - a.pointsFor || b.pointDiff - a.pointDiff || a.rank - b.rank,
  );
  const byDefense = [...season.standings].sort(
    (a, b) => a.pointsAgainst - b.pointsAgainst || b.pointDiff - a.pointDiff || a.rank - b.rank,
  );
  const byDifferential = [...season.standings].sort(
    (a, b) => b.pointDiff - a.pointDiff || b.pointsFor - a.pointsFor || a.rank - b.rank,
  );

  const bestRecord = byRank[0];
  const topOffense = byOffense[0];
  const toughestDefense = byDefense[0];
  const bestDifferential = byDifferential[0];

  return [
    {
      key: 'best-record',
      label: 'Best Record',
      teamId: bestRecord.teamId,
      value: formatRecord(bestRecord),
      detail: `${bestRecord.standingPoints} standing pts`,
    },
    {
      key: 'top-offense',
      label: 'Top Offense',
      teamId: topOffense.teamId,
      value: `${topOffense.pointsFor} PF`,
      detail: `${formatRecord(topOffense)} record`,
    },
    {
      key: 'toughest-defense',
      label: 'Toughest Defense',
      teamId: toughestDefense.teamId,
      value: `${toughestDefense.pointsAgainst} PA`,
      detail: `${toughestDefense.pointDiff >= 0 ? `+${toughestDefense.pointDiff}` : toughestDefense.pointDiff} diff`,
    },
    {
      key: 'best-differential',
      label: 'Best Differential',
      teamId: bestDifferential.teamId,
      value: bestDifferential.pointDiff >= 0 ? `+${bestDifferential.pointDiff}` : `${bestDifferential.pointDiff}`,
      detail: `${bestDifferential.pointsFor}-${bestDifferential.pointsAgainst}`,
    },
  ];
}

export function getPlayoffBracket(season: SeasonState | null): PlayoffBracketView | null {
  if (!season) return null;

  const projectedTeams = (season.playoffTeams.length > 0
    ? season.playoffTeams
    : [...season.standings].sort(compareStandingsByRank).slice(0, 4).map((entry) => entry.teamId)
  ).slice(0, 4);

  const semifinalFixtures = season.fixtures
    .filter((fixture) => fixture.stage === 'semifinal')
    .sort((a, b) => a.week - b.week || a.id.localeCompare(b.id));

  const semifinalFallbacks: Array<[string | null, string | null]> = [
    [projectedTeams[0] ?? null, projectedTeams[3] ?? null],
    [projectedTeams[1] ?? null, projectedTeams[2] ?? null],
  ];

  const semifinalGames = semifinalFallbacks.map((fallbackTeams, index) =>
    createBracketGame(`Semifinal ${index + 1}`, semifinalFixtures[index] ?? null, fallbackTeams),
  );

  const semifinalWinners: Array<string | null> = semifinalGames.map(
    (game) => game.fixture?.result?.winnerTeamId ?? null,
  );

  const finalFixture = season.fixtures
    .filter((fixture) => fixture.stage === 'final')
    .sort((a, b) => a.week - b.week || a.id.localeCompare(b.id))[0] ?? null;

  const mode: PlayoffBracketView['mode'] =
    season.phase === 'completed'
      ? 'completed'
      : semifinalFixtures.length === 0 && !finalFixture
        ? 'projected'
        : 'live';

  return {
    mode,
    projectedTeams,
    semifinalGames,
    finalGame: createBracketGame('Ignition Final', finalFixture, [semifinalWinners[0], semifinalWinners[1]]),
    championTeamId: season.championTeamId,
  };
}
