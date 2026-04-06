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

/**
 * Achievement definitions
 */
export const achievements = mysqlTable("achievements", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  icon: varchar("icon", { length: 255 }), // emoji or icon name
  rarity: mysqlEnum("rarity", ["common", "uncommon", "rare", "epic", "legendary"]).default("common").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Achievement = typeof achievements.$inferSelect;
export type InsertAchievement = typeof achievements.$inferInsert;

/**
 * Player achievements (join table with unlock date)
 */
export const playerAchievements = mysqlTable("player_achievements", {
  id: int("id").autoincrement().primaryKey(),
  playerId: int("playerId").notNull().references(() => users.id),
  achievementId: int("achievementId").notNull().references(() => achievements.id),
  unlockedAt: timestamp("unlockedAt").defaultNow().notNull(),
});

export type PlayerAchievement = typeof playerAchievements.$inferSelect;
export type InsertPlayerAchievement = typeof playerAchievements.$inferInsert;

/**
 * Player profile information
 */
export const playerProfiles = mysqlTable("player_profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique().references(() => users.id),
  displayName: varchar("displayName", { length: 64 }),
  bio: text("bio"),
  favoriteTeam: varchar("favoriteTeam", { length: 64 }),
  rating: int("rating").default(1000).notNull(), // ELO-style rating
  level: int("level").default(1).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PlayerProfile = typeof playerProfiles.$inferSelect;
export type InsertPlayerProfile = typeof playerProfiles.$inferInsert;
/**
 * Season management
 */
export const seasons = mysqlTable("seasons", {
  id: int("id").autoincrement().primaryKey(),
  seasonNumber: int("seasonNumber").notNull().unique(),
  status: mysqlEnum("status", ["upcoming", "active", "playoffs", "finished"]).default("upcoming").notNull(),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Season = typeof seasons.$inferSelect;
export type InsertSeason = typeof seasons.$inferInsert;

/**
 * Team standings for each season
 */
export const standings = mysqlTable("standings", {
  id: int("id").autoincrement().primaryKey(),
  seasonId: int("seasonId").notNull().references(() => seasons.id),
  teamId: varchar("teamId", { length: 64 }).notNull(), // Team ID from teams.ts
  wins: int("wins").default(0).notNull(),
  losses: int("losses").default(0).notNull(),
  pointsFor: int("pointsFor").default(0).notNull(), // Total goals scored
  pointsAgainst: int("pointsAgainst").default(0).notNull(), // Total goals allowed
  rank: int("rank").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Standing = typeof standings.$inferSelect;
export type InsertStanding = typeof standings.$inferInsert;

/**
 * Season schedule (round-robin matches)
 */
export const seasonMatches = mysqlTable("season_matches", {
  id: int("id").autoincrement().primaryKey(),
  seasonId: int("seasonId").notNull().references(() => seasons.id),
  week: int("week").notNull(), // Week number in season
  homeTeamId: varchar("homeTeamId", { length: 64 }).notNull(),
  awayTeamId: varchar("awayTeamId", { length: 64 }).notNull(),
  homeScore: int("homeScore"),
  awayScore: int("awayScore"),
  status: mysqlEnum("status", ["scheduled", "playing", "finished"]).default("scheduled").notNull(),
  matchDate: timestamp("matchDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SeasonMatch = typeof seasonMatches.$inferSelect;
export type InsertSeasonMatch = typeof seasonMatches.$inferInsert;

/**
 * Playoff bracket
 */
export const playoffs = mysqlTable("playoffs", {
  id: int("id").autoincrement().primaryKey(),
  seasonId: int("seasonId").notNull().references(() => seasons.id),
  round: int("round").notNull(), // 1 = semifinals, 2 = finals
  matchNumber: int("matchNumber").notNull(),
  homeTeamId: varchar("homeTeamId", { length: 64 }).notNull(),
  awayTeamId: varchar("awayTeamId", { length: 64 }).notNull(),
  homeScore: int("homeScore"),
  awayScore: int("awayScore"),
  winnerId: varchar("winnerId", { length: 64 }), // Team ID of winner
  status: mysqlEnum("status", ["scheduled", "playing", "finished"]).default("scheduled").notNull(),
  matchDate: timestamp("matchDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Playoff = typeof playoffs.$inferSelect;
export type InsertPlayoff = typeof playoffs.$inferInsert;

/**
 * Pyro Cup championship game
 */
export const pyroCup = mysqlTable("pyro_cup", {
  id: int("id").autoincrement().primaryKey(),
  seasonId: int("seasonId").notNull().references(() => seasons.id),
  team1Id: varchar("team1Id", { length: 64 }).notNull(),
  team2Id: varchar("team2Id", { length: 64 }).notNull(),
  team1Score: int("team1Score"),
  team2Score: int("team2Score"),
  winnerId: varchar("winnerId", { length: 64 }), // Team ID of champion
  status: mysqlEnum("status", ["scheduled", "playing", "finished"]).default("scheduled").notNull(),
  matchDate: timestamp("matchDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PyroCup = typeof pyroCup.$inferSelect;
export type InsertPyroCup = typeof pyroCup.$inferInsert;
