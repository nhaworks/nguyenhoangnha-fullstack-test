import { sql } from 'drizzle-orm';
import { char, check, index, int, mysqlTable, primaryKey, timestamp, varchar } from 'drizzle-orm/mysql-core';

// Edit this file, then `npm run db:generate` writes the SQL migration into drizzle/.
// Tables inherit utf8mb4_0900_ai_ci from the database: LIKE/ORDER BY ignore case and Vietnamese accents (đ = d).

const timestamps = {
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
};

export const docTypes = mysqlTable('doc_types', {
  code: varchar('code', { length: 10 }).primaryKey(), // 'docx' | 'pptx'
  name: varchar('name', { length: 100 }).notNull(),
  extension: varchar('extension', { length: 10 }).notNull(),
});

export const categories = mysqlTable('categories', {
  id: varchar('id', { length: 100 }).primaryKey(), // slug: 'hanh-chinh'
  name: varchar('name', { length: 100 }).notNull().unique(),
  description: varchar('description', { length: 500 }).notNull().default(''),
});

export const templates = mysqlTable(
  'templates',
  {
    id: varchar('id', { length: 100 }).primaryKey(), // slug: 'hop-dong-lao-dong'
    docTypeCode: varchar('doc_type_code', { length: 10 }).notNull().references(() => docTypes.code),
    categoryId: varchar('category_id', { length: 100 }).notNull().references(() => categories.id),
    name: varchar('name', { length: 200 }).notNull(),
    description: varchar('description', { length: 1000 }).notNull().default(''),
    filePath: varchar('file_path', { length: 500 }).notNull().unique(), // relative to STORAGE_ROOT
    ...timestamps,
  },
  (t) => [index('idx_templates_type_category').on(t.docTypeCode, t.categoryId)],
);

// Slide (pptx) or page (docx) images; position 1 is the thumbnail
export const templatePreviews = mysqlTable(
  'template_previews',
  {
    templateId: varchar('template_id', { length: 100 })
      .notNull()
      .references(() => templates.id, { onDelete: 'cascade' }),
    position: int('position').notNull(),
    imagePath: varchar('image_path', { length: 500 }).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.templateId, t.position] }),
    check('chk_preview_position', sql`\`position\` >= 1`),
  ],
);

// Documents created from a template. The file is an independent copy; type comes from the template.
export const documents = mysqlTable(
  'documents',
  {
    id: char('id', { length: 36 }).primaryKey(), // crypto.randomUUID()
    templateId: varchar('template_id', { length: 100 }).notNull().references(() => templates.id),
    title: varchar('title', { length: 200 }).notNull(),
    filePath: varchar('file_path', { length: 500 }).notNull().unique(),
    ...timestamps,
  },
  (t) => [check('chk_document_title', sql`char_length(\`title\`) >= 1`)],
);
