import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { createRoom, getRoomByCode, getAvailableRooms } from "./db";
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

  rooms: router({
    list: publicProcedure.query(async () => {
      return await getAvailableRooms();
    }),
    create: protectedProcedure
      .input(z.object({
        difficulty: z.enum(["rookie", "pro", "allstar"]),
      }))
      .mutation(async ({ input, ctx }) => {
        const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        await createRoom(roomCode, ctx.user.id, input.difficulty);
        return { roomCode };
      }),
    get: publicProcedure
      .input(z.object({ roomCode: z.string() }))
      .query(async ({ input }) => {
        return await getRoomByCode(input.roomCode);
      }),
    join: protectedProcedure
      .input(z.object({ roomCode: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const room = await getRoomByCode(input.roomCode);
        if (!room) throw new Error("Room not found");
        if (room.status !== "waiting") throw new Error("Room is not available");
        return { success: true, room };
      }),
  }),
});

export type AppRouter = typeof appRouter;
