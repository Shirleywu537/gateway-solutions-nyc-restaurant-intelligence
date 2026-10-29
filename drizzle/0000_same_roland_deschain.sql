CREATE TABLE `source_cache` (
	`key` text PRIMARY KEY NOT NULL,
	`payload` text NOT NULL,
	`fetched_at` text NOT NULL,
	`last_attempt_at` text NOT NULL,
	`error` text
);
