CREATE TABLE `playoffs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`seasonId` int NOT NULL,
	`round` int NOT NULL,
	`matchNumber` int NOT NULL,
	`homeTeamId` varchar(64) NOT NULL,
	`awayTeamId` varchar(64) NOT NULL,
	`homeScore` int,
	`awayScore` int,
	`winnerId` varchar(64),
	`status` enum('scheduled','playing','finished') NOT NULL DEFAULT 'scheduled',
	`matchDate` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `playoffs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pyro_cup` (
	`id` int AUTO_INCREMENT NOT NULL,
	`seasonId` int NOT NULL,
	`team1Id` varchar(64) NOT NULL,
	`team2Id` varchar(64) NOT NULL,
	`team1Score` int,
	`team2Score` int,
	`winnerId` varchar(64),
	`status` enum('scheduled','playing','finished') NOT NULL DEFAULT 'scheduled',
	`matchDate` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pyro_cup_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `season_matches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`seasonId` int NOT NULL,
	`week` int NOT NULL,
	`homeTeamId` varchar(64) NOT NULL,
	`awayTeamId` varchar(64) NOT NULL,
	`homeScore` int,
	`awayScore` int,
	`status` enum('scheduled','playing','finished') NOT NULL DEFAULT 'scheduled',
	`matchDate` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `season_matches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `seasons` (
	`id` int AUTO_INCREMENT NOT NULL,
	`seasonNumber` int NOT NULL,
	`status` enum('upcoming','active','playoffs','finished') NOT NULL DEFAULT 'upcoming',
	`startDate` timestamp NOT NULL,
	`endDate` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `seasons_id` PRIMARY KEY(`id`),
	CONSTRAINT `seasons_seasonNumber_unique` UNIQUE(`seasonNumber`)
);
--> statement-breakpoint
CREATE TABLE `standings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`seasonId` int NOT NULL,
	`teamId` varchar(64) NOT NULL,
	`wins` int NOT NULL DEFAULT 0,
	`losses` int NOT NULL DEFAULT 0,
	`pointsFor` int NOT NULL DEFAULT 0,
	`pointsAgainst` int NOT NULL DEFAULT 0,
	`rank` int NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `standings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `playoffs` ADD CONSTRAINT `playoffs_seasonId_seasons_id_fk` FOREIGN KEY (`seasonId`) REFERENCES `seasons`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pyro_cup` ADD CONSTRAINT `pyro_cup_seasonId_seasons_id_fk` FOREIGN KEY (`seasonId`) REFERENCES `seasons`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `season_matches` ADD CONSTRAINT `season_matches_seasonId_seasons_id_fk` FOREIGN KEY (`seasonId`) REFERENCES `seasons`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `standings` ADD CONSTRAINT `standings_seasonId_seasons_id_fk` FOREIGN KEY (`seasonId`) REFERENCES `seasons`(`id`) ON DELETE no action ON UPDATE no action;