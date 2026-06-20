ALTER TABLE `apps` ADD `active_variable_set` text DEFAULT 'default' NOT NULL;--> statement-breakpoint
ALTER TABLE `variable_configs` ADD `set_name` text DEFAULT 'default' NOT NULL;
