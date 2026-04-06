import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Game rooms for multiplayer matches
 */
export const gameRooms = mysqlTable("game_rooms", {
  id: int("id").autoincrement().primaryKey(),
  roomCode: varchar("roomCode", { length: 8 }).notNull().unique(),
  hostId: int("hostId").notNull().references(() => users.id),
  status: mysqlEnum("status", ["waiting", "playing", "finished"]).default("waiting").notNull(),
  difficulty: mysqlEnum("difficulty", ["rookie", "pro", "allstar"]).default("pro").notNull(),
  homeTeamId: int("homeTeamId"),
  awayTeamId: int("awayTeamId"),
  maxPlayers: int("maxPlayers").default(4).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  startedAt: timestamp("startedAt"),
  endedAt: timestamp("endedAt"),
});

export type GameRoom = typeof gameRooms.$inferSelect;
export type InsertGameRoom = typeof gameRooms.$inferInsert;

/**
 * Players in a room (join table)
 */
export const roomPlayers = mysqlTable("room_players", {
  id: int("id").autoincrement().primaryKey(),
  roomId: int("roomId").notNull().references(() => gameRooms.id),
  playerId: int("playerId").notNull().references(() => users.id),
  team: mysqlEnum("team", ["home", "away", "spectator"]).default("spectator").notNull(),
  isReady: int("isReady").default(0).notNull(),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
});

export type RoomPlayer = typeof roomPlayers.$inferSelect;
export type InsertRoomPlayer = typeof roomPlayers.$inferInsert;

/**
 * Match history and results
 */
export const matches = mysqlTable("matches", {
  id: int("id").autoincrement().primaryKey(),
  roomId: int("roomId").notNull().references(() => gameRooms.id),
  homeTeamScore: int("homeTeamScore").default(0).notNull(),
  awayTeamScore: int("awayTeamScore").default(0).notNull(),
  winnerId: int("winnerId").references(() => users.id),
  duration: int("duration"), // in seconds
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  endedAt: timestamp("endedAt"),
});

export type Match = typeof matches.$inferSelect;
export type InsertMatch = typeof matches.$inferInsert;

/**
 * Player statistics per match
 */
export const playerStats = mysqlTable("player_stats", {
  id: int("id").autoincrement().primaryKey(),
  matchId: int("matchId").notNull().references(() => matches.id),
  playerId: int("playerId").notNull().references(() => users.id),
  goalsScored: int("goalsScored").default(0).notNull(),
  assists: int("assists").default(0).notNull(),
  steals: int("steals").default(0).notNull(),
  blocks: int("blocks").default(0).notNull(),
  shotAccuracy: int("shotAccuracy").default(0).notNull(), // percentage
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PlayerStats = typeof playerStats.$inferSelect;
export type InsertPlayerStats = typeof playerStats.$inferInsert;

/**
 * Chat messages in rooms
 */
export const chatMessages = mysqlTable("chat_messages", {
  id: int("id").autoincrement().primaryKey(),
  roomId: int("roomId").notNull().references(() => gameRooms.id),
  senderId: int("senderId").notNull().references(() => users.id),
  message: text("message").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = typeof chatMessages.$inferInsert;

/**
 * Spectators watching matches
 */
export const spectators = mysqlTable("spectators", {
  id: int("id").autoincrement().primaryKey(),
  matchId: int("matchId").notNull().references(() => matches.id),
  spectatorId: int("spectatorId").notNull().references(() => users.id),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
});

export type Spectator = typeof spectators.$inferSelect;
export type InsertSpectator = typeof spectators.$inferInsert;

/**
 * Extended user stats (career statistics)
 */
export const userStats = mysqlTable("user_stats", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique().references(() => users.id),
  wins: int("wins").default(0).notNull(),
  losses: int("losses").default(0).notNull(),
  totalGoals: int("totalGoals").default(0).notNull(),
  totalAssists: int("totalAssists").default(0).notNull(),
  totalSteals: int("totalSteals").default(0).notNull(),
  totalBlocks: int("totalBlocks").default(0).notNull(),
  matchesPlayed: int("matchesPlayed").default(0).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserStats = typeof userStats.$inferSelect;
export type InsertUserStats = typeof userStats.$inferInsert;