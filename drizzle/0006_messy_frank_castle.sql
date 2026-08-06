ALTER TABLE `run_configs` DROP COLUMN `last_run_pid`;--> statement-breakpoint
ALTER TABLE `run_configs` DROP COLUMN `last_run_status`;--> statement-breakpoint
ALTER TABLE `run_configs` DROP COLUMN `last_run_stdout`;--> statement-breakpoint
ALTER TABLE `run_configs` DROP COLUMN `last_run_stderr`;--> statement-breakpoint
ALTER TABLE `run_configs` DROP COLUMN `last_run_started_at`;--> statement-breakpoint
ALTER TABLE `run_configs` DROP COLUMN `last_run_stopped_at`;--> statement-breakpoint
ALTER TABLE `run_configs` DROP COLUMN `last_run_exit_code`;--> statement-breakpoint
ALTER TABLE `run_configs` DROP COLUMN `last_run_signal`;--> statement-breakpoint
ALTER TABLE `run_configs` DROP COLUMN `last_run_error`;