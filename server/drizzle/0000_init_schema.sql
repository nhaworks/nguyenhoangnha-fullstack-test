CREATE TABLE `categories` (
	`id` varchar(100) NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` varchar(500) NOT NULL DEFAULT '',
	CONSTRAINT `categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `categories_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `doc_types` (
	`code` varchar(10) NOT NULL,
	`name` varchar(100) NOT NULL,
	`extension` varchar(10) NOT NULL,
	CONSTRAINT `doc_types_code` PRIMARY KEY(`code`)
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` char(36) NOT NULL,
	`template_id` varchar(100) NOT NULL,
	`title` varchar(200) NOT NULL,
	`file_path` varchar(500) NOT NULL,
	`content_html` mediumtext,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `documents_id` PRIMARY KEY(`id`),
	CONSTRAINT `documents_file_path_unique` UNIQUE(`file_path`),
	CONSTRAINT `chk_document_title` CHECK(char_length(`title`) >= 1)
);
--> statement-breakpoint
CREATE TABLE `template_previews` (
	`template_id` varchar(100) NOT NULL,
	`position` int NOT NULL,
	`image_path` varchar(500) NOT NULL,
	CONSTRAINT `template_previews_template_id_position_pk` PRIMARY KEY(`template_id`,`position`),
	CONSTRAINT `chk_preview_position` CHECK(`position` >= 1)
);
--> statement-breakpoint
CREATE TABLE `templates` (
	`id` varchar(100) NOT NULL,
	`doc_type_code` varchar(10) NOT NULL,
	`category_id` varchar(100) NOT NULL,
	`name` varchar(200) NOT NULL,
	`description` varchar(1000) NOT NULL DEFAULT '',
	`file_path` varchar(500) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `templates_id` PRIMARY KEY(`id`),
	CONSTRAINT `templates_file_path_unique` UNIQUE(`file_path`)
);
--> statement-breakpoint
ALTER TABLE `documents` ADD CONSTRAINT `documents_template_id_templates_id_fk` FOREIGN KEY (`template_id`) REFERENCES `templates`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `template_previews` ADD CONSTRAINT `template_previews_template_id_templates_id_fk` FOREIGN KEY (`template_id`) REFERENCES `templates`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `templates` ADD CONSTRAINT `templates_doc_type_code_doc_types_code_fk` FOREIGN KEY (`doc_type_code`) REFERENCES `doc_types`(`code`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `templates` ADD CONSTRAINT `templates_category_id_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_templates_type_category` ON `templates` (`doc_type_code`,`category_id`);