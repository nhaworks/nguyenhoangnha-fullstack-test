-- Đổi khoá chính mọi bảng sang `id` INT AUTO_INCREMENT; code / slug / uuid thành cột UNIQUE.
-- Xoá rồi tạo lại bảng (không chuyển dữ liệu cũ): seed nạp lại loại, danh mục, mẫu từ manifest.json khi server khởi động;
-- tài liệu đã tạo trước migration này bị xoá (file cũ trong storage/documents/ không còn dòng DB tương ứng).
DROP TABLE IF EXISTS `documents`;
--> statement-breakpoint
DROP TABLE IF EXISTS `template_previews`;
--> statement-breakpoint
DROP TABLE IF EXISTS `templates`;
--> statement-breakpoint
DROP TABLE IF EXISTS `categories`;
--> statement-breakpoint
DROP TABLE IF EXISTS `doc_types`;
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(100) NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` varchar(500) NOT NULL DEFAULT '',
	CONSTRAINT `categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `categories_slug_unique` UNIQUE(`slug`),
	CONSTRAINT `categories_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `doc_types` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(10) NOT NULL,
	`name` varchar(100) NOT NULL,
	`extension` varchar(10) NOT NULL,
	CONSTRAINT `doc_types_id` PRIMARY KEY(`id`),
	CONSTRAINT `doc_types_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`uuid` char(36) NOT NULL,
	`template_id` int NOT NULL,
	`title` varchar(200) NOT NULL,
	`file_path` varchar(500) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `documents_id` PRIMARY KEY(`id`),
	CONSTRAINT `documents_uuid_unique` UNIQUE(`uuid`),
	CONSTRAINT `documents_file_path_unique` UNIQUE(`file_path`),
	CONSTRAINT `chk_document_title` CHECK(char_length(`title`) >= 1)
);
--> statement-breakpoint
CREATE TABLE `template_previews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`template_id` int NOT NULL,
	`position` int NOT NULL,
	`image_path` varchar(500) NOT NULL,
	CONSTRAINT `template_previews_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_preview_template_position` UNIQUE(`template_id`,`position`),
	CONSTRAINT `chk_preview_position` CHECK(`position` >= 1)
);
--> statement-breakpoint
CREATE TABLE `templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(100) NOT NULL,
	`doc_type_id` int NOT NULL,
	`category_id` int NOT NULL,
	`name` varchar(200) NOT NULL,
	`description` varchar(1000) NOT NULL DEFAULT '',
	`file_path` varchar(500) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `templates_id` PRIMARY KEY(`id`),
	CONSTRAINT `templates_slug_unique` UNIQUE(`slug`),
	CONSTRAINT `templates_file_path_unique` UNIQUE(`file_path`)
);
--> statement-breakpoint
ALTER TABLE `documents` ADD CONSTRAINT `documents_template_id_templates_id_fk` FOREIGN KEY (`template_id`) REFERENCES `templates`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `template_previews` ADD CONSTRAINT `template_previews_template_id_templates_id_fk` FOREIGN KEY (`template_id`) REFERENCES `templates`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `templates` ADD CONSTRAINT `templates_doc_type_id_doc_types_id_fk` FOREIGN KEY (`doc_type_id`) REFERENCES `doc_types`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `templates` ADD CONSTRAINT `templates_category_id_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_templates_type_category` ON `templates` (`doc_type_id`,`category_id`);