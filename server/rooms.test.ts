import { describe, expect, it, beforeEach, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock database
vi.mock("./db", () => ({
  createRoom: vi.fn(async (roomCode: string, hostId: number, difficulty: string) => {
    return { id: 1, roomCode, hostId, difficulty, status: "waiting" };
  }),
  getRoomByCode: vi.fn(async (roomCode: string) => {
    if (roomCode === "VALID01") {
      return { id: 1, roomCode, hostId: 1, difficulty: "pro", status: "waiting" };
    }
    if (roomCode === "PLAYING") {
      return { id: 2, roomCode, hostId: 2, difficulty: "pro", status: "playing" };
    }
    return null;
  }),
  getAvailableRooms: vi.fn(async () => [
    { id: 1, roomCode: "ROOM001", hostId: 1, difficulty: "pro", status: "waiting" },
    { id: 2, roomCode: "ROOM002", hostId: 2, difficulty: "rookie", status: "waiting" },
  ]),
  updateRoomStatus: vi.fn(async (roomId: number, status: string) => {
    return { success: true };
  }),
}));

function createAuthContext(userId: number = 1): TrpcContext {
  return {
    user: {
      id: userId,
      openId: `user-${userId}`,
      email: `user${userId}@example.com`,
      name: `User ${userId}`,
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("rooms.list", () => {
  it("returns available rooms", async () => {
    const caller = appRouter.createCaller({} as TrpcContext);
    const rooms = await caller.rooms.list();

    expect(rooms).toHaveLength(2);
    expect(rooms[0].roomCode).toBe("ROOM001");
    expect(rooms[1].roomCode).toBe("ROOM002");
  });
});

describe("rooms.create", () => {
  it("creates a new room with valid difficulty", async () => {
    const ctx = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.rooms.create({ difficulty: "pro" });

    expect(result).toHaveProperty("roomCode");
    expect(result.roomCode).toMatch(/^[A-Z0-9]{6,8}$/);
  });

  it("requires authentication", async () => {
    const caller = appRouter.createCaller({} as TrpcContext);

    try {
      await caller.rooms.create({ difficulty: "pro" });
      expect.fail("Should have thrown");
    } catch (error: any) {
      expect(error.message).toContain("login");
    }
  });

  it("accepts all difficulty levels", async () => {
    const ctx = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    for (const difficulty of ["rookie", "pro", "allstar"] as const) {
      const result = await caller.rooms.create({ difficulty });
      expect(result).toHaveProperty("roomCode");
    }
  });
});

describe("rooms.get", () => {
  it("retrieves a room by code", async () => {
    const caller = appRouter.createCaller({} as TrpcContext);
    const room = await caller.rooms.get({ roomCode: "VALID01" });

    expect(room).toBeDefined();
    expect(room?.roomCode).toBe("VALID01");
    expect(room?.status).toBe("waiting");
  });

  it("returns null for non-existent room", async () => {
    const caller = appRouter.createCaller({} as TrpcContext);
    const room = await caller.rooms.get({ roomCode: "INVALID" });

    expect(room).toBeNull();
  });
});

describe("rooms.join", () => {
  it("allows joining a waiting room", async () => {
    const ctx = createAuthContext(2);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.rooms.join({ roomCode: "VALID01" });

    expect(result.success).toBe(true);
    expect(result.room?.roomCode).toBe("VALID01");
  });

  it("prevents joining a playing room", async () => {
    const ctx = createAuthContext(2);
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.rooms.join({ roomCode: "PLAYING" });
      expect.fail("Should have thrown");
    } catch (error: any) {
      expect(error.message).toContain("not available");
    }
  });

  it("throws error for non-existent room", async () => {
    const ctx = createAuthContext(2);
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.rooms.join({ roomCode: "INVALID" });
      expect.fail("Should have thrown");
    } catch (error: any) {
      expect(error.message).toContain("not found");
    }
  });

  it("requires authentication", async () => {
    const caller = appRouter.createCaller({} as TrpcContext);

    try {
      await caller.rooms.join({ roomCode: "VALID01" });
      expect.fail("Should have thrown");
    } catch (error: any) {
      expect(error.message).toContain("login");
    }
  });
});
