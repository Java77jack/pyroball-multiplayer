import { eq, and } from "drizzle-orm";
import { getDb } from "./db";
import { 
  seasons, 
  standings, 
  seasonMatches, 
  playoffs, 
  pyroCup 
} from "../drizzle/schema";
import { TEAM_IDS } from "../shared/teams";

/**
 * Create a new season
 */
export async function createSeason(seasonNumber: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const startDate = new Date();
  const endDate = new Date(startDate.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 days

  const result = await db.insert(seasons).values({
    seasonNumber,
    status: "upcoming",
    startDate,
    endDate,
  });

  const seasonId = result[0].insertId as number;

  // Initialize standings for all teams
  for (const teamId of TEAM_IDS) {
    await db.insert(standings).values({
      seasonId,
      teamId,
      wins: 0,
      losses: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      rank: 0,
    });
  }

  return { seasonId, seasonNumber };
}

/**
 * Generate round-robin schedule for a season
 */
export async function generateSchedule(seasonId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const teams = TEAM_IDS;
  const matches: Array<{
    seasonId: number;
    week: number;
    homeTeamId: string;
    awayTeamId: string;
  }> = [];

  let week = 1;

  // Round-robin: each team plays every other team twice (home and away)
  for (let i = 0; i < teams.length; i++) {
    for (let j = 0; j < teams.length; j++) {
      if (i !== j) {
        matches.push({
          seasonId,
          week: week,
          homeTeamId: teams[i],
          awayTeamId: teams[j],
        });

        // Move to next week after each team has played once
        if ((i + 1) % (teams.length - 1) === 0 && i !== teams.length - 1) {
          week++;
        }
      }
    }
  }

  // Insert all matches
  for (const match of matches) {
    await db.insert(seasonMatches).values(match);
  }

  return { totalMatches: matches.length, weeks: week };
}

/**
 * Simulate a season match (AI vs AI)
 */
export async function simulateSeasonMatch(matchId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const match = await db
    .select()
    .from(seasonMatches)
    .where(eq(seasonMatches.id, matchId))
    .limit(1);

  if (match.length === 0) {
    throw new Error("Match not found");
  }

  const m = match[0];

  // Simulate score (random between 0-5 goals per team)
  const homeScore = Math.floor(Math.random() * 6);
  const awayScore = Math.floor(Math.random() * 6);

  // Update match result
  await db
    .update(seasonMatches)
    .set({
      homeScore,
      awayScore,
      status: "finished",
      matchDate: new Date(),
    })
    .where(eq(seasonMatches.id, matchId));

  // Update standings
  const homeStanding = await db
    .select()
    .from(standings)
    .where(
      and(
        eq(standings.seasonId, m.seasonId),
        eq(standings.teamId, m.homeTeamId)
      )
    )
    .limit(1);

  const awayStanding = await db
    .select()
    .from(standings)
    .where(
      and(
        eq(standings.seasonId, m.seasonId),
        eq(standings.teamId, m.awayTeamId)
      )
    )
    .limit(1);

  if (homeStanding.length > 0 && awayStanding.length > 0) {
    const homeWon = homeScore > awayScore;

    await db
      .update(standings)
      .set({
        wins: homeStanding[0].wins + (homeWon ? 1 : 0),
        losses: homeStanding[0].losses + (homeWon ? 0 : 1),
        pointsFor: homeStanding[0].pointsFor + homeScore,
        pointsAgainst: homeStanding[0].pointsAgainst + awayScore,
      })
      .where(eq(standings.id, homeStanding[0].id));

    await db
      .update(standings)
      .set({
        wins: awayStanding[0].wins + (homeWon ? 0 : 1),
        losses: awayStanding[0].losses + (homeWon ? 1 : 0),
        pointsFor: awayStanding[0].pointsFor + awayScore,
        pointsAgainst: awayStanding[0].pointsAgainst + homeScore,
      })
      .where(eq(standings.id, awayStanding[0].id));
  }

  return { homeScore, awayScore, winner: homeScore > awayScore ? m.homeTeamId : m.awayTeamId };
}

/**
 * Get current standings for a season
 */
export async function getStandings(seasonId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const standingsList = await db
    .select()
    .from(standings)
    .where(eq(standings.seasonId, seasonId))
    .orderBy(standings.wins);

  // Rank teams by wins, then by point differential
  const ranked = standingsList
    .sort((a, b) => {
      const aWins = b.wins - a.wins;
      if (aWins !== 0) return aWins;
      const aDiff = b.pointsFor - b.pointsAgainst - (a.pointsFor - a.pointsAgainst);
      return aDiff;
    })
    .map((s, idx) => ({ ...s, rank: idx + 1 }));

  // Update ranks in database
  for (const s of ranked) {
    await db
      .update(standings)
      .set({ rank: s.rank })
      .where(eq(standings.id, s.id));
  }

  return ranked;
}

/**
 * Generate playoff bracket (top 4 teams)
 */
export async function generatePlayoffs(seasonId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const standings_list = await getStandings(seasonId);
  const top4 = standings_list.slice(0, 4);

  if (top4.length < 4) {
    throw new Error("Not enough teams for playoffs");
  }

  // Semifinals: #1 vs #4, #2 vs #3
  const semifinal1 = await db.insert(playoffs).values({
    seasonId,
    round: 1,
    matchNumber: 1,
    homeTeamId: top4[0].teamId,
    awayTeamId: top4[3].teamId,
    status: "scheduled",
  });

  const semifinal2 = await db.insert(playoffs).values({
    seasonId,
    round: 1,
    matchNumber: 2,
    homeTeamId: top4[1].teamId,
    awayTeamId: top4[2].teamId,
    status: "scheduled",
  });

  return {
    semifinal1: semifinal1[0].insertId,
    semifinal2: semifinal2[0].insertId,
  };
}

/**
 * Simulate playoff match
 */
export async function simulatePlayoffMatch(playoffId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const playoff = await db
    .select()
    .from(playoffs)
    .where(eq(playoffs.id, playoffId))
    .limit(1);

  if (playoff.length === 0) {
    throw new Error("Playoff match not found");
  }

  const p = playoff[0];

  // Simulate score
  const homeScore = Math.floor(Math.random() * 6);
  const awayScore = Math.floor(Math.random() * 6);
  const winner = homeScore > awayScore ? p.homeTeamId : p.awayTeamId;

  await db
    .update(playoffs)
    .set({
      homeScore,
      awayScore,
      winnerId: winner,
      status: "finished",
      matchDate: new Date(),
    })
    .where(eq(playoffs.id, playoffId));

  // If this was a semifinal, create finals match
  if (p.round === 1) {
    const otherSemifinal = await db
      .select()
      .from(playoffs)
      .where(
        and(
          eq(playoffs.seasonId, p.seasonId),
          eq(playoffs.round, 1),
          eq(playoffs.matchNumber, p.matchNumber === 1 ? 2 : 1)
        )
      )
      .limit(1);

    if (
      otherSemifinal.length > 0 &&
      otherSemifinal[0].winnerId
    ) {
      // Create finals
      await db.insert(playoffs).values({
        seasonId: p.seasonId,
        round: 2,
        matchNumber: 1,
        homeTeamId: winner,
        awayTeamId: otherSemifinal[0].winnerId,
        status: "scheduled",
      });
    }
  }

  return { homeScore, awayScore, winner };
}

/**
 * Create Pyro Cup finals
 */
export async function createPyroCupFinals(seasonId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get the two finalists from round 2 playoffs
  const finals = await db
    .select()
    .from(playoffs)
    .where(
      and(
        eq(playoffs.seasonId, seasonId),
        eq(playoffs.round, 2)
      )
    )
    .limit(1);

  if (finals.length === 0) {
    throw new Error("No finals match found");
  }

  const f = finals[0];

  await db.insert(pyroCup).values({
    seasonId,
    team1Id: f.homeTeamId,
    team2Id: f.awayTeamId,
    status: "scheduled",
  });

  return { team1Id: f.homeTeamId, team2Id: f.awayTeamId };
}

/**
 * Simulate Pyro Cup finals
 */
export async function simulatePyroCupFinals(pyroCupId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const cup = await db
    .select()
    .from(pyroCup)
    .where(eq(pyroCup.id, pyroCupId))
    .limit(1);

  if (cup.length === 0) {
    throw new Error("Pyro Cup match not found");
  }

  const c = cup[0];

  // Simulate championship match (slightly higher scores for drama)
  const team1Score = Math.floor(Math.random() * 7);
  const team2Score = Math.floor(Math.random() * 7);
  const winner = team1Score > team2Score ? c.team1Id : c.team2Id;

  await db
    .update(pyroCup)
    .set({
      team1Score,
      team2Score,
      winnerId: winner,
      status: "finished",
      matchDate: new Date(),
    })
    .where(eq(pyroCup.id, pyroCupId));

  return { team1Score, team2Score, champion: winner };
}

/**
 * Simulate entire season (all matches)
 */
export async function simulateFullSeason(seasonId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Update season status
  await db
    .update(seasons)
    .set({ status: "active" })
    .where(eq(seasons.id, seasonId));

  // Get all unfinished matches
  const matches = await db
    .select()
    .from(seasonMatches)
    .where(
      and(
        eq(seasonMatches.seasonId, seasonId),
        eq(seasonMatches.status, "scheduled")
      )
    );

  // Simulate each match
  for (const match of matches) {
    await simulateSeasonMatch(match.id);
  }

  // Generate playoffs
  await db
    .update(seasons)
    .set({ status: "playoffs" })
    .where(eq(seasons.id, seasonId));

  const { semifinal1, semifinal2 } = await generatePlayoffs(seasonId);

  // Simulate semifinals
  await simulatePlayoffMatch(semifinal1);
  await simulatePlayoffMatch(semifinal2);

  // Create and simulate Pyro Cup
  await createPyroCupFinals(seasonId);

  const pyroCups = await db
    .select()
    .from(pyroCup)
    .where(eq(pyroCup.seasonId, seasonId))
    .limit(1);

  if (pyroCups.length > 0) {
    await simulatePyroCupFinals(pyroCups[0].id);
  }

  // Mark season as finished
  await db
    .update(seasons)
    .set({ status: "finished", endDate: new Date() })
    .where(eq(seasons.id, seasonId));

  return { success: true, seasonId };
}
