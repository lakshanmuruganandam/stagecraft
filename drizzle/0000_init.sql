CREATE TABLE `act_votes` (
	`contest_id` text NOT NULL,
	`act_id` text NOT NULL,
	`user_id` text NOT NULL,
	PRIMARY KEY(`act_id`, `user_id`),
	FOREIGN KEY (`contest_id`) REFERENCES `contests`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`act_id`) REFERENCES `acts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `act_votes_contest_user_idx` ON `act_votes` (`contest_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `acts` (
	`id` text PRIMARY KEY NOT NULL,
	`contest_id` text NOT NULL,
	`performer` text NOT NULL,
	`title` text NOT NULL,
	`house_id` text,
	`user_id` text,
	`position` integer NOT NULL,
	FOREIGN KEY (`contest_id`) REFERENCES `contests`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`house_id`) REFERENCES `houses`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `acts_contest_idx` ON `acts` (`contest_id`);--> statement-breakpoint
CREATE TABLE `audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_id` text,
	`event_id` text,
	`action` text NOT NULL,
	`detail` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `audit_event_idx` ON `audit_log` (`event_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `brackets` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`title` text NOT NULL,
	`game` text,
	`third_place` integer DEFAULT true NOT NULL,
	`best_of` integer DEFAULT 3 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `certificates` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`user_id` text,
	`recipient_name` text NOT NULL,
	`house_id` text,
	`kind` text NOT NULL,
	`achievement` text NOT NULL,
	`payload` text NOT NULL,
	`signature` text NOT NULL,
	`issued_at` integer NOT NULL,
	`revoked_at` integer,
	`revoke_reason` text,
	`dedupe_key` text NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`house_id`) REFERENCES `houses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `certificates_dedupe_key_unique` ON `certificates` (`dedupe_key`);--> statement-breakpoint
CREATE INDEX `certs_user_idx` ON `certificates` (`user_id`);--> statement-breakpoint
CREATE INDEX `certs_event_idx` ON `certificates` (`event_id`);--> statement-breakpoint
CREATE TABLE `changes` (
	`seq` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`channel` text NOT NULL,
	`type` text NOT NULL,
	`payload` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `changes_channel_idx` ON `changes` (`channel`,`seq`);--> statement-breakpoint
CREATE TABLE `chat_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`user_id` text NOT NULL,
	`body` text NOT NULL,
	`hidden` integer DEFAULT false NOT NULL,
	`pinned` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `chat_event_idx` ON `chat_messages` (`event_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `contests` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`title` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`judge_weight` integer DEFAULT 60 NOT NULL,
	`votes_per_user` integer DEFAULT 1 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `entrants` (
	`id` text PRIMARY KEY NOT NULL,
	`bracket_id` text NOT NULL,
	`name` text NOT NULL,
	`house_id` text,
	`member_ids` text DEFAULT '[]' NOT NULL,
	`seed` integer NOT NULL,
	FOREIGN KEY (`bracket_id`) REFERENCES `brackets`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`house_id`) REFERENCES `houses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `entrants_bracket_idx` ON `entrants` (`bracket_id`);--> statement-breakpoint
CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`tagline` text,
	`description` text DEFAULT '' NOT NULL,
	`kind` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`stream_url` text,
	`host_house_ids` text DEFAULT '[]' NOT NULL,
	`starts_at` integer NOT NULL,
	`ends_at` integer NOT NULL,
	`hue` integer DEFAULT 260 NOT NULL,
	`settings` text NOT NULL,
	`current_segment_id` text,
	`stage_scene` text DEFAULT 'auto' NOT NULL,
	`spotlight_question_id` text,
	`lower_third` text,
	`wrapped_at` integer,
	`created_by` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `events_slug_unique` ON `events` (`slug`);--> statement-breakpoint
CREATE INDEX `events_status_idx` ON `events` (`status`,`starts_at`);--> statement-breakpoint
CREATE TABLE `house_points` (
	`id` text PRIMARY KEY NOT NULL,
	`house_id` text NOT NULL,
	`event_id` text,
	`points` integer NOT NULL,
	`reason` text NOT NULL,
	`dedupe_key` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`house_id`) REFERENCES `houses`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `house_points_dedupe_key_unique` ON `house_points` (`dedupe_key`);--> statement-breakpoint
CREATE INDEX `points_house_idx` ON `house_points` (`house_id`);--> statement-breakpoint
CREATE TABLE `houses` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`color` text NOT NULL,
	`motto` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `houses_slug_unique` ON `houses` (`slug`);--> statement-breakpoint
CREATE TABLE `judge_scores` (
	`act_id` text NOT NULL,
	`judge_id` text NOT NULL,
	`score` real NOT NULL,
	PRIMARY KEY(`act_id`, `judge_id`),
	FOREIGN KEY (`act_id`) REFERENCES `acts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`judge_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `matches` (
	`id` text PRIMARY KEY NOT NULL,
	`bracket_id` text NOT NULL,
	`round` integer NOT NULL,
	`slot` integer NOT NULL,
	`lane` text DEFAULT 'main' NOT NULL,
	`a_id` text,
	`b_id` text,
	`score_a` integer,
	`score_b` integer,
	`winner_id` text,
	`status` text DEFAULT 'pending' NOT NULL,
	FOREIGN KEY (`bracket_id`) REFERENCES `brackets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `matches_pos_idx` ON `matches` (`bracket_id`,`lane`,`round`,`slot`);--> statement-breakpoint
CREATE TABLE `poll_votes` (
	`poll_id` text NOT NULL,
	`user_id` text NOT NULL,
	`option` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	PRIMARY KEY(`poll_id`, `user_id`),
	FOREIGN KEY (`poll_id`) REFERENCES `polls`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `polls` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`question` text NOT NULL,
	`options` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`live_results` integer DEFAULT true NOT NULL,
	`correct_index` integer,
	`opened_at` integer,
	`closes_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `polls_event_idx` ON `polls` (`event_id`);--> statement-breakpoint
CREATE TABLE `predictions` (
	`match_id` text NOT NULL,
	`user_id` text NOT NULL,
	`pick_id` text NOT NULL,
	PRIMARY KEY(`match_id`, `user_id`),
	FOREIGN KEY (`match_id`) REFERENCES `matches`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `question_votes` (
	`question_id` text NOT NULL,
	`user_id` text NOT NULL,
	PRIMARY KEY(`question_id`, `user_id`),
	FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `questions` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`user_id` text NOT NULL,
	`body` text NOT NULL,
	`anonymous` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'live' NOT NULL,
	`votes` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `questions_event_idx` ON `questions` (`event_id`,`status`);--> statement-breakpoint
CREATE TABLE `rate_buckets` (
	`key` text PRIMARY KEY NOT NULL,
	`tokens` real NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `registrations` (
	`event_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text DEFAULT 'attendee' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	PRIMARY KEY(`event_id`, `user_id`),
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `segments` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`title` text NOT NULL,
	`speaker` text,
	`duration_min` integer DEFAULT 15 NOT NULL,
	`position` integer NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `segments_event_idx` ON `segments` (`event_id`,`position`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`house_id` text,
	`role` text DEFAULT 'member' NOT NULL,
	`muted_until` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`house_id`) REFERENCES `houses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `users_house_idx` ON `users` (`house_id`);