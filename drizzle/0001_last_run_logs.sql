ALTER TABLE `run_configs` ADD `last_run_pid` integer;--> statement-breakpoint
ALTER TABLE `run_configs` ADD `last_run_status` text;--> statement-breakpoint
ALTER TABLE `run_configs` ADD `last_run_stdout` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `run_configs` ADD `last_run_stderr` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `run_configs` ADD `last_run_started_at` text;--> statement-breakpoint
ALTER TABLE `run_configs` ADD `last_run_stopped_at` text;--> statement-breakpoint
ALTER TABLE `run_configs` ADD `last_run_exit_code` integer;--> statement-breakpoint
ALTER TABLE `run_configs` ADD `last_run_signal` text;--> statement-breakpoint
ALTER TABLE `run_configs` ADD `last_run_error` text;
