import { getSessionCookieOptions } from "./_core/cookies";
import { COOKIE_NAME } from "../shared/const";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { getUserStats, getLeaderboard, getPlayerMatchHistory, getMatchDetails, getMatchPlayerStats } from "./db";
import { matchRouter } from "./routers/matchRouter";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  stats: router({
    // Get current user's stats
    me: protectedProcedure.query(async ({ ctx }) => {
      return await getUserStats(ctx.user.id);
    }),

    // Get any player's stats
    getPlayer: publicProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => {
        return await getUserStats(input.userId);
      }),

    // Get global leaderboard
    leaderboard: publicProcedure
      .input(z.object({ limit: z.number().default(50) }))
      .query(async ({ input }) => {
        return await getLeaderboard(input.limit);
      }),

    // Get player's match history
    matchHistory: publicProcedure
      .input(z.object({ userId: z.number(), limit: z.number().default(20) }))
      .query(async ({ input }) => {
        return await getPlayerMatchHistory(input.userId, input.limit);
      }),

    // Get match details with all player stats
    matchDetails: publicProcedure
      .input(z.object({ matchId: z.number() }))
      .query(async ({ input }) => {
        const match = await getMatchDetails(input.matchId);
        const playerStats = await getMatchPlayerStats(input.matchId);
        return { match, playerStats };
      }),
  }),

  match: matchRouter,
});

export type AppRouter = typeof appRouter;
