import { Server as HTTPServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { getDb } from "./db";
import { gameRooms, roomPlayers, users } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

export interface GameRoomState {
  id: number;
  roomCode: string;
  hostId: number;
  status: "waiting" | "playing" | "finished";
  difficulty: "rookie" | "pro" | "allstar";
  players: Map<string, PlayerInRoom>;
  spectators: Set<string>;
  gameState?: {
    homeScore: number;
    awayScore: number;
    ballPos: { x: number; y: number };
    players: Record<string, PlayerGameState>;
  };
}

export interface PlayerInRoom {
  userId: number;
  socketId: string;
  username: string;
  team: "home" | "away" | "spectator";
  isReady: boolean;
}

export interface PlayerGameState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  hasball: boolean;
  isJumping: boolean;
  isSpinning: boolean;
}

export interface GameAction {
  type: "move" | "shoot" | "pass" | "steal" | "jump" | "spin";
  playerId: number;
  timestamp: number;
  data?: Record<string, unknown>;
}

// In-memory room storage (in production, consider Redis for distributed systems)
const rooms = new Map<string, GameRoomState>();
const userSockets = new Map<number, string>(); // userId -> socketId

function generateRoomCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export function initializeSocket(httpServer: HTTPServer) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket: Socket) => {
    console.log(`[Socket] Player connected: ${socket.id}`);

    // ===== ROOM MANAGEMENT =====

    socket.on("room:list", (callback) => {
      const roomList = Array.from(rooms.values()).map((room) => ({
        roomCode: room.roomCode,
        hostId: room.hostId,
        status: room.status,
        difficulty: room.difficulty,
        playerCount: room.players.size,
        spectatorCount: room.spectators.size,
        maxPlayers: 4,
      }));
      callback(roomList);
    });

    socket.on("room:create", async (data: { userId: number; username: string; difficulty: string }, callback) => {
      const db = await getDb();
      if (!db) {
        callback({ success: false, error: "Database unavailable" });
        return;
      }

      try {
        const roomCode = generateRoomCode();
        const result = await db.insert(gameRooms).values({
          roomCode,
          hostId: data.userId,
          difficulty: data.difficulty as "rookie" | "pro" | "allstar",
          status: "waiting",
          maxPlayers: 4,
        });

        const roomId = (result as any).insertId;

        const room: GameRoomState = {
          id: roomId,
          roomCode,
          hostId: data.userId,
          status: "waiting",
          difficulty: data.difficulty as "rookie" | "pro" | "allstar",
          players: new Map(),
          spectators: new Set(),
        };

        rooms.set(roomCode, room);
        userSockets.set(data.userId, socket.id);

        // Add host to room
        room.players.set(socket.id, {
          userId: data.userId,
          socketId: socket.id,
          username: data.username,
          team: "home",
          isReady: false,
        });

        socket.join(roomCode);
        io.to(roomCode).emit("room:updated", {
          roomCode,
          players: Array.from(room.players.values()),
          status: room.status,
        });

        callback({ success: true, roomCode, roomId });
      } catch (error) {
        console.error("[Socket] Error creating room:", error);
        callback({ success: false, error: "Failed to create room" });
      }
    });

    socket.on("room:join", async (data: { roomCode: string; userId: number; username: string; team: string }, callback) => {
      const room = rooms.get(data.roomCode);
      if (!room) {
        callback({ success: false, error: "Room not found" });
        return;
      }

      if (room.status !== "waiting") {
        callback({ success: false, error: "Room is not accepting new players" });
        return;
      }

      if (room.players.size >= 4 && data.team !== "spectator") {
        callback({ success: false, error: "Room is full" });
        return;
      }

      userSockets.set(data.userId, socket.id);
      room.players.set(socket.id, {
        userId: data.userId,
        socketId: socket.id,
        username: data.username,
        team: data.team as "home" | "away" | "spectator",
        isReady: false,
      });

      if (data.team === "spectator") {
        room.spectators.add(socket.id);
      }

      socket.join(data.roomCode);
      io.to(data.roomCode).emit("room:updated", {
        roomCode: data.roomCode,
        players: Array.from(room.players.values()),
        status: room.status,
      });

      callback({ success: true, roomCode: data.roomCode });
    });

    socket.on("room:leave", (data: { roomCode: string; userId: number }) => {
      const room = rooms.get(data.roomCode);
      if (!room) return;

      let socketId: string | null = null;
      room.players.forEach((player, sid) => {
        if (player.userId === data.userId) {
          socketId = sid;
        }
      });
      if (socketId) {
        room.players.delete(socketId);
        room.spectators.delete(socketId);
      }

      userSockets.delete(data.userId);
      socket.leave(data.roomCode);

      if (room.players.size === 0) {
        rooms.delete(data.roomCode);
      } else {
        io.to(data.roomCode).emit("room:updated", {
          roomCode: data.roomCode,
          players: Array.from(room.players.values()),
          status: room.status,
        });
      }
    });

    socket.on("player:ready", (data: { roomCode: string; userId: number; isReady: boolean }) => {
      const room = rooms.get(data.roomCode);
      if (!room) return;

      const player = Array.from(room.players.values()).find((p) => p.userId === data.userId);
      if (player) {
        player.isReady = data.isReady;
      }

      io.to(data.roomCode).emit("room:updated", {
        roomCode: data.roomCode,
        players: Array.from(room.players.values()),
        status: room.status,
      });
    });

    // ===== GAME STATE SYNC =====

    socket.on("game:action", (data: GameAction & { roomCode: string }) => {
      const room = rooms.get(data.roomCode);
      if (!room || room.status !== "playing") return;

      // Validate action on server (cheat prevention)
      if (!validateGameAction(room, data)) {
        console.warn(`[Socket] Invalid action from ${socket.id}:`, data);
        return;
      }

      // Broadcast to all players in room
      io.to(data.roomCode).emit("game:action", {
        playerId: data.playerId,
        type: data.type,
        timestamp: data.timestamp,
        data: data.data,
      });
    });

    socket.on("game:state", (data: { roomCode: string; state: any }) => {
      const room = rooms.get(data.roomCode);
      if (!room || room.status !== "playing") return;

      room.gameState = data.state;
      io.to(data.roomCode).emit("game:state", data.state);
    });

    socket.on("game:start", async (data: { roomCode: string; userId: number }, callback) => {
      const room = rooms.get(data.roomCode);
      if (!room || room.hostId !== data.userId) {
        callback({ success: false, error: "Only host can start game" });
        return;
      }

      const allReady = Array.from(room.players.values()).every((p) => p.team === "spectator" || p.isReady);
      if (!allReady) {
        callback({ success: false, error: "Not all players are ready" });
        return;
      }

      room.status = "playing";
      room.gameState = {
        homeScore: 0,
        awayScore: 0,
        ballPos: { x: 0, y: 0 },
        players: {} as Record<string, PlayerGameState>,
      };

      io.to(data.roomCode).emit("game:started", {
        roomCode: data.roomCode,
        gameState: room.gameState,
      });

      callback({ success: true });
    });

    socket.on("game:end", async (data: { roomCode: string; userId: number; winner: "home" | "away" | "draw" }) => {
      const room = rooms.get(data.roomCode);
      if (!room) return;

      room.status = "finished";
      io.to(data.roomCode).emit("game:ended", {
        roomCode: data.roomCode,
        winner: data.winner,
        finalScore: {
          home: room.gameState?.homeScore || 0,
          away: room.gameState?.awayScore || 0,
        },
      });
    });

    // ===== CHAT =====

    socket.on("chat:send", (data: { roomCode: string; userId: number; username: string; message: string }) => {
      const room = rooms.get(data.roomCode);
      if (!room) return;

      io.to(data.roomCode).emit("chat:message", {
        userId: data.userId,
        username: data.username,
        message: data.message,
        timestamp: Date.now(),
      });
    });

    // ===== CLEANUP =====

    socket.on("disconnect", () => {
      console.log(`[Socket] Player disconnected: ${socket.id}`);

      // Find and remove player from all rooms
      for (const roomCode of Array.from(rooms.keys())) {
        const room = rooms.get(roomCode);
        if (!room) continue;
        
        let foundPlayer: PlayerInRoom | null = null;
        let foundSocketId: string | null = null;
        
        room.players.forEach((player, socketId) => {
          if (socketId === socket.id) {
            foundPlayer = player;
            foundSocketId = socketId;
          }
        });
        
        if (foundPlayer && foundSocketId) {
          room.players.delete(foundSocketId);
          room.spectators.delete(foundSocketId);
          userSockets.delete((foundPlayer as PlayerInRoom).userId);

          if (room.players.size === 0) {
            rooms.delete(roomCode);
          } else {
            io.to(roomCode).emit("room:updated", {
              roomCode,
              players: Array.from(room.players.values()),
              status: room.status,
            });
          }
        }
      }
    });
  });

  return io;
}

function validateGameAction(room: GameRoomState, action: GameAction): boolean {
  // Basic validation - expand this with game-specific rules
  if (!action.playerId || !action.type || !action.timestamp) {
    return false;
  }

  // Check if player is in the room
  const player = Array.from(room.players.values()).find((p) => p.userId === action.playerId);
  if (!player) {
    return false;
  }

  // Add more game-specific validations here
  // e.g., check if move is within court bounds, check if player has ball for shoot, etc.

  return true;
}
