CREATE TABLE `app_config_sets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`app_id` integer NOT NULL,
	`set_name` text DEFAULT 'default' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `app_config_sets_app_set_name_unique` ON `app_config_sets` (`app_id`,`set_name`);--> statement-breakpoint
CREATE TABLE `run_config_commands` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`run_config_id` integer NOT NULL,
	`command` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`run_config_id`) REFERENCES `run_configs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `run_config_commands_config_position_unique` ON `run_config_commands` (`run_config_id`,`position`);--> statement-breakpoint
DROP INDEX `run_configs_app_id_unique`;--> statement-breakpoint
ALTER TABLE `run_configs` ADD `set_name` text DEFAULT 'default' NOT NULL;--> statement-breakpoint
ALTER TABLE `run_configs` ADD `mode` text DEFAULT 'series' NOT NULL;--> statement-breakpoint
ALTER TABLE `run_configs` ADD `last_run_pid` integer;--> statement-breakpoint
ALTER TABLE `run_configs` ADD `last_run_status` text;--> statement-breakpoint
ALTER TABLE `run_configs` ADD `last_run_stdout` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `run_configs` ADD `last_run_stderr` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `run_configs` ADD `last_run_started_at` text;--> statement-breakpoint
ALTER TABLE `run_configs` ADD `last_run_stopped_at` text;--> statement-breakpoint
ALTER TABLE `run_configs` ADD `last_run_exit_code` integer;--> statement-breakpoint
ALTER TABLE `run_configs` ADD `last_run_signal` text;--> statement-breakpoint
ALTER TABLE `run_configs` ADD `last_run_error` text;--> statement-breakpoint
CREATE UNIQUE INDEX `run_configs_app_set_name_unique` ON `run_configs` (`app_id`,`set_name`);--> statement-breakpoint
ALTER TABLE `apps` ADD `name` text NOT NULL;--> statement-breakpoint
ALTER TABLE `apps` ADD `active_variable_set` text DEFAULT 'default' NOT NULL;--> statement-breakpoint
ALTER TABLE `apps` DROP COLUMN `file_path`;--> statement-breakpoint
ALTER TABLE `template_configs` ADD `set_name` text DEFAULT 'default' NOT NULL;--> statement-breakpoint
ALTER TABLE `template_configs` ADD `file_path` text NOT NULL;--> statement-breakpoint
ALTER TABLE `template_configs` ADD `position` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
INSERT OR IGNORE INTO `run_config_commands` (`run_config_id`, `command`, `position`)
	SELECT `id`, `command`, 0 FROM `run_configs` WHERE `command` != '';--> statement-breakpoint
ALTER TABLE `template_configs` DROP COLUMN `name`;--> statement-breakpoint
ALTER TABLE `variable_configs` ADD `set_name` text DEFAULT 'default' NOT NULL;--> statement-breakpoint
ALTER TABLE `variable_configs` ADD `position` integer DEFAULT 0 NOT NULL;