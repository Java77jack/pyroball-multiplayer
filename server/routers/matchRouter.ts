import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { matches, playerStats, userStats } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export const matchRouter = router({
  // Save match results and player stats
  saveMatchResult: protectedProcedure
    .input(
      z.object({
        homeTeamId: z.number(),
        awayTeamId: z.number(),
        homeTeamScore: z.number(),
        awayTeamScore: z.number(),
        duration: z.number(),
        playerStats: z.array(
          z.object({
            playerId: z.number(),
            goalsScored: z.number(),
            assists: z.number(),
            steals: z.number(),
            blocks: z.number(),
            shotAccuracy: z.number(),
          })
        ),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      try {
        // Determine winner
        const winnerId =
          input.homeTeamScore > input.awayTeamScore
            ? ctx.user.id
            : input.awayTeamScore > input.homeTeamScore
              ? ctx.user.id
              : null;

        // Create match record
        const [matchResult] = await db
          .insert(matches)
          .values({
            roomId: 0, // TODO: Link to actual room when multiplayer is implemented
            homeTeamScore: input.homeTeamScore,
            awayTeamScore: input.awayTeamScore,
            winnerId: winnerId,
            duration: input.duration,
            endedAt: new Date(),
          })
          .$returningId();

        if (!matchResult) {
          throw new Error("Failed to create match record");
        }

        // Save player stats for this match
        for (const stat of input.playerStats) {
          await db.insert(playerStats).values({
            matchId: matchResult.id,
            playerId: stat.playerId,
            goalsScored: stat.goalsScored,
            assists: stat.assists,
            steals: stat.steals,
            blocks: stat.blocks,
            shotAccuracy: stat.shotAccuracy,
          });

          // Update career stats
          const existing = await db
            .select()
            .from(userStats)
            .where(eq(userStats.userId, stat.playerId))
            .limit(1);

          if (existing.length > 0) {
            // Update existing stats
            const isWinner = stat.playerId === winnerId;
            await db
              .update(userStats)
              .set({
                wins: isWinner ? existing[0].wins + 1 : existing[0].wins,
                losses: !isWinner && input.homeTeamScore !== input.awayTeamScore ? existing[0].losses + 1 : existing[0].losses,
                totalGoals: existing[0].totalGoals + stat.goalsScored,
                totalAssists: existing[0].totalAssists + stat.assists,
                totalSteals: existing[0].totalSteals + stat.steals,
                totalBlocks: existing[0].totalBlocks + stat.blocks,
                matchesPlayed: existing[0].matchesPlayed + 1,
              })
              .where(eq(userStats.userId, stat.playerId));
          } else {
            // Create new stats record
            const isWinner = stat.playerId === winnerId;
            await db.insert(userStats).values({
              userId: stat.playerId,
              wins: isWinner ? 1 : 0,
              losses: !isWinner && input.homeTeamScore !== input.awayTeamScore ? 1 : 0,
              totalGoals: stat.goalsScored,
              totalAssists: stat.assists,
              totalSteals: stat.steals,
              totalBlocks: stat.blocks,
              matchesPlayed: 1,
            });
          }
        }

        return {
          success: true,
          matchId: matchResult.id,
        };
      } catch (error) {
        console.error("[Match] Failed to save match result:", error);
        throw error;
      }
    }),
});
