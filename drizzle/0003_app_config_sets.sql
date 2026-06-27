ALTER TABLE `template_configs` ADD `set_name` text DEFAULT 'default' NOT NULL;--> statement-breakpoint
ALTER TABLE `run_configs` ADD `set_name` text DEFAULT 'default' NOT NULL;--> statement-breakpoint
DROP INDEX `run_configs_app_id_unique`;--> statement-breakpoint
CREATE UNIQUE INDEX `run_configs_app_set_name_unique` ON `run_configs` (`app_id`,`set_name`);--> statement-breakpoint
CREATE TABLE `app_config_sets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`app_id` integer NOT NULL,
	`set_name` text DEFAULT 'default' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
CREATE UNIQUE INDEX `app_config_sets_app_set_name_unique` ON `app_config_sets` (`app_id`,`set_name`);--> statement-breakpoint
INSERT OR IGNORE INTO `app_config_sets` (`app_id`, `set_name`)
	SELECT `id`, COALESCE(`active_variable_set`, 'default')
	FROM `apps`;--> statement-breakpoint
INSERT OR IGNORE INTO `app_config_sets` (`app_id`, `set_name`)
	SELECT `id`, 'default'
	FROM `apps`;--> statement-breakpoint
INSERT OR IGNORE INTO `app_config_sets` (`app_id`, `set_name`)
	SELECT `app_id`, `set_name`
	FROM `variable_configs`;--> statement-breakpoint
INSERT OR IGNORE INTO `app_config_sets` (`app_id`, `set_name`)
	SELECT `app_id`, `set_name`
	FROM `template_configs`;--> statement-breakpoint
INSERT OR IGNORE INTO `app_config_sets` (`app_id`, `set_name`)
	SELECT `app_id`, `set_name`
	FROM `run_configs`;
