import { eq, desc, and } from "drizzle-orm";
import { getDb } from "./db";
import { 
  userStats, 
  playerProfiles, 
  achievements, 
  playerAchievements, 
  users 
} from "../drizzle/schema";

/**
 * Get or create player profile
 */
export async function getOrCreateProfile(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db
    .select()
    .from(playerProfiles)
    .where(eq(playerProfiles.userId, userId))
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  // Create new profile
  await db.insert(playerProfiles).values({
    userId,
    displayName: null,
    bio: null,
    favoriteTeam: null,
    rating: 1000,
    level: 1,
  });

  return await getOrCreateProfile(userId);
}

/**
 * Get player profile with stats
 */
export async function getPlayerProfile(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const profile = await db
    .select()
    .from(playerProfiles)
    .where(eq(playerProfiles.userId, userId))
    .limit(1);

  if (profile.length === 0) {
    return null;
  }

  const stats = await db
    .select()
    .from(userStats)
    .where(eq(userStats.userId, userId))
    .limit(1);

  const user = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return {
    profile: profile[0],
    stats: stats[0] || null,
    user: user[0] || null,
  };
}

/**
 * Get player achievements
 */
export async function getPlayerAchievements(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const playerAchievementsList = await db
    .select({
      achievement: achievements,
      unlockedAt: playerAchievements.unlockedAt,
    })
    .from(playerAchievements)
    .innerJoin(achievements, eq(playerAchievements.achievementId, achievements.id))
    .where(eq(playerAchievements.playerId, userId))
    .orderBy(desc(playerAchievements.unlockedAt));

  return playerAchievementsList;
}

/**
 * Unlock achievement for player
 */
export async function unlockAchievement(userId: number, achievementSlug: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get achievement by slug
  const achievement = await db
    .select()
    .from(achievements)
    .where(eq(achievements.slug, achievementSlug))
    .limit(1);

  if (achievement.length === 0) {
    throw new Error(`Achievement not found: ${achievementSlug}`);
  }

  // Check if already unlocked
  const existing = await db
    .select()
    .from(playerAchievements)
    .where(
      and(
        eq(playerAchievements.playerId, userId),
        eq(playerAchievements.achievementId, achievement[0].id)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    return { alreadyUnlocked: true };
  }

  // Unlock achievement
  await db.insert(playerAchievements).values({
    playerId: userId,
    achievementId: achievement[0].id,
  });

  return { success: true, achievement: achievement[0] };
}

/**
 * Get leaderboard
 */
export async function getLeaderboard(limit: number = 100, offset: number = 0) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const leaderboard = await db
    .select({
      userId: userStats.userId,
      displayName: playerProfiles.displayName,
      rating: playerProfiles.rating,
      level: playerProfiles.level,
      wins: userStats.wins,
      losses: userStats.losses,
      totalGoals: userStats.totalGoals,
      matchesPlayed: userStats.matchesPlayed,
    })
    .from(userStats)
    .innerJoin(playerProfiles, eq(userStats.userId, playerProfiles.userId))
    .orderBy(desc(playerProfiles.rating))
    .limit(limit)
    .offset(offset);

  return leaderboard;
}

/**
 * Update player rating (after match)
 */
export async function updatePlayerRating(userId: number, ratingChange: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const profile = await db
    .select()
    .from(playerProfiles)
    .where(eq(playerProfiles.userId, userId))
    .limit(1);

  if (profile.length === 0) {
    throw new Error("Player profile not found");
  }

  const newRating = Math.max(0, profile[0].rating + ratingChange);
  const newLevel = Math.floor(newRating / 500) + 1;

  await db
    .update(playerProfiles)
    .set({
      rating: newRating,
      level: newLevel,
    })
    .where(eq(playerProfiles.userId, userId));

  return { rating: newRating, level: newLevel };
}

/**
 * Update player stats after match
 */
export async function updatePlayerStats(
  userId: number,
  stats: {
    goals: number;
    assists: number;
    steals: number;
    blocks: number;
    won: boolean;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get or create user stats
  const existing = await db
    .select()
    .from(userStats)
    .where(eq(userStats.userId, userId))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(userStats).values({
      userId,
      wins: stats.won ? 1 : 0,
      losses: stats.won ? 0 : 1,
      totalGoals: stats.goals,
      totalAssists: stats.assists,
      totalSteals: stats.steals,
      totalBlocks: stats.blocks,
      matchesPlayed: 1,
    });
  } else {
    await db
      .update(userStats)
      .set({
        wins: existing[0].wins + (stats.won ? 1 : 0),
        losses: existing[0].losses + (stats.won ? 0 : 1),
        totalGoals: existing[0].totalGoals + stats.goals,
        totalAssists: existing[0].totalAssists + stats.assists,
        totalSteals: existing[0].totalSteals + stats.steals,
        totalBlocks: existing[0].totalBlocks + stats.blocks,
        matchesPlayed: existing[0].matchesPlayed + 1,
      })
      .where(eq(userStats.userId, userId));
  }

  return { success: true };
}
