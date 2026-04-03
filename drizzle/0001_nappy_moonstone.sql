CREATE TABLE `chat_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`roomId` int NOT NULL,
	`senderId` int NOT NULL,
	`message` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `chat_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `game_rooms` (
	`id` int AUTO_INCREMENT NOT NULL,
	`roomCode` varchar(8) NOT NULL,
	`hostId` int NOT NULL,
	`status` enum('waiting','playing','finished') NOT NULL DEFAULT 'waiting',
	`difficulty` enum('rookie','pro','allstar') NOT NULL DEFAULT 'pro',
	`homeTeamId` int,
	`awayTeamId` int,
	`maxPlayers` int NOT NULL DEFAULT 4,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`startedAt` timestamp,
	`endedAt` timestamp,
	CONSTRAINT `game_rooms_id` PRIMARY KEY(`id`),
	CONSTRAINT `game_rooms_roomCode_unique` UNIQUE(`roomCode`)
);
--> statement-breakpoint
CREATE TABLE `matches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`roomId` int NOT NULL,
	`homeTeamScore` int NOT NULL DEFAULT 0,
	`awayTeamScore` int NOT NULL DEFAULT 0,
	`winnerId` int,
	`duration` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`endedAt` timestamp,
	CONSTRAINT `matches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `player_stats` (
	`id` int AUTO_INCREMENT NOT NULL,
	`matchId` int NOT NULL,
	`playerId` int NOT NULL,
	`goalsScored` int NOT NULL DEFAULT 0,
	`assists` int NOT NULL DEFAULT 0,
	`steals` int NOT NULL DEFAULT 0,
	`blocks` int NOT NULL DEFAULT 0,
	`shotAccuracy` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `player_stats_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `room_players` (
	`id` int AUTO_INCREMENT NOT NULL,
	`roomId` int NOT NULL,
	`playerId` int NOT NULL,
	`team` enum('home','away','spectator') NOT NULL DEFAULT 'spectator',
	`isReady` int NOT NULL DEFAULT 0,
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `room_players_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `spectators` (
	`id` int AUTO_INCREMENT NOT NULL,
	`matchId` int NOT NULL,
	`spectatorId` int NOT NULL,
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `spectators_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_stats` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`wins` int NOT NULL DEFAULT 0,
	`losses` int NOT NULL DEFAULT 0,
	`totalGoals` int NOT NULL DEFAULT 0,
	`totalAssists` int NOT NULL DEFAULT 0,
	`totalSteals` int NOT NULL DEFAULT 0,
	`totalBlocks` int NOT NULL DEFAULT 0,
	`matchesPlayed` int NOT NULL DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_stats_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_stats_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
ALTER TABLE `chat_messages` ADD CONSTRAINT `chat_messages_roomId_game_rooms_id_fk` FOREIGN KEY (`roomId`) REFERENCES `game_rooms`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chat_messages` ADD CONSTRAINT `chat_messages_senderId_users_id_fk` FOREIGN KEY (`senderId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `game_rooms` ADD CONSTRAINT `game_rooms_hostId_users_id_fk` FOREIGN KEY (`hostId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `matches` ADD CONSTRAINT `matches_roomId_game_rooms_id_fk` FOREIGN KEY (`roomId`) REFERENCES `game_rooms`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `matches` ADD CONSTRAINT `matches_winnerId_users_id_fk` FOREIGN KEY (`winnerId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `player_stats` ADD CONSTRAINT `player_stats_matchId_matches_id_fk` FOREIGN KEY (`matchId`) REFERENCES `matches`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `player_stats` ADD CONSTRAINT `player_stats_playerId_users_id_fk` FOREIGN KEY (`playerId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `room_players` ADD CONSTRAINT `room_players_roomId_game_rooms_id_fk` FOREIGN KEY (`roomId`) REFERENCES `game_rooms`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `room_players` ADD CONSTRAINT `room_players_playerId_users_id_fk` FOREIGN KEY (`playerId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `spectators` ADD CONSTRAINT `spectators_matchId_matches_id_fk` FOREIGN KEY (`matchId`) REFERENCES `matches`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `spectators` ADD CONSTRAINT `spectators_spectatorId_users_id_fk` FOREIGN KEY (`spectatorId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_stats` ADD CONSTRAINT `user_stats_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;