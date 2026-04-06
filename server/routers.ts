import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { 
  getPlayerProfile, 
  getPlayerAchievements, 
  getLeaderboard, 
  updatePlayerRating, 
  updatePlayerStats, 
  unlockAchievement 
} from "./profileDb";
import { z } from "zod";

export const appRouter = router({
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

  profile: router({
    getProfile: publicProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => {
        return await getPlayerProfile(input.userId);
      }),
    getMyProfile: protectedProcedure.query(async ({ ctx }) => {
      return await getPlayerProfile(ctx.user.id);
    }),
    getAchievements: publicProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => {
        return await getPlayerAchievements(input.userId);
      }),
    getLeaderboard: publicProcedure
      .input(z.object({ limit: z.number().default(100), offset: z.number().default(0) }))
      .query(async ({ input }) => {
        return await getLeaderboard(input.limit, input.offset);
      }),
    updateRating: protectedProcedure
      .input(z.object({ ratingChange: z.number() }))
      .mutation(async ({ input, ctx }) => {
        return await updatePlayerRating(ctx.user.id, input.ratingChange);
      }),
    updateStats: protectedProcedure
      .input(z.object({
        goals: z.number(),
        assists: z.number(),
        steals: z.number(),
        blocks: z.number(),
        won: z.boolean(),
      }))
      .mutation(async ({ input, ctx }) => {
        return await updatePlayerStats(ctx.user.id, input);
      }),
    unlockAchievement: protectedProcedure
      .input(z.object({ achievementSlug: z.string() }))
      .mutation(async ({ input, ctx }) => {
        return await unlockAchievement(ctx.user.id, input.achievementSlug);
      }),
  }),
});

export type AppRouter = typeof appRouter;
