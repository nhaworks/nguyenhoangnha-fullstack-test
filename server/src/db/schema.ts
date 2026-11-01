import { sql } from 'drizzle-orm';
import { char, check, index, int, mysqlTable, timestamp, unique, varchar } from 'drizzle-orm/mysql-core';

const autoId = () => int('id').autoincrement().primaryKey();

const timestamps = {
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
};

export const docTypes = mysqlTable('doc_types', {
  id: autoId(),
  code: varchar('code', { length: 10 }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  extension: varchar('extension', { length: 10 }).notNull(),
});

export const categories = mysqlTable('categories', {
  id: autoId(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  description: varchar('description', { length: 500 }).notNull().default(''),
});

export const templates = mysqlTable(
  'templates',
  {
    id: autoId(),
    slug: varchar('slug', { length: 100 }).notNull().unique(),
    docTypeId: int('doc_type_id').notNull().references(() => docTypes.id),
    categoryId: int('category_id').notNull().references(() => categories.id),
    name: varchar('name', { length: 200 }).notNull(),
    description: varchar('description', { length: 1000 }).notNull().default(''),
    filePath: varchar('file_path', { length: 500 }).notNull().unique(),
    ...timestamps,
  },
  (t) => [index('idx_templates_type_category').on(t.docTypeId, t.categoryId)],
);

export const templatePreviews = mysqlTable(
  'template_previews',
  {
    id: autoId(),
    templateId: int('template_id')
      .notNull()
      .references(() => templates.id, { onDelete: 'cascade' }),
    position: int('position').notNull(),
    imagePath: varchar('image_path', { length: 500 }).notNull(),
  },
  (t) => [
    unique('uq_preview_template_position').on(t.templateId, t.position),
    check('chk_preview_position', sql`\`position\` >= 1`),
  ],
);

export const documents = mysqlTable(
  'documents',
  {
    id: autoId(),
    uuid: char('uuid', { length: 36 }).notNull().unique(),
    templateId: int('template_id').notNull().references(() => templates.id),
    title: varchar('title', { length: 200 }).notNull(),
    filePath: varchar('file_path', { length: 500 }).notNull().unique(),
    ...timestamps,
  },
  () => [check('chk_document_title', sql`char_length(\`title\`) >= 1`)],
);
