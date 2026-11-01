import { sql } from 'drizzle-orm';
import { char, check, index, int, mysqlTable, timestamp, unique, varchar } from 'drizzle-orm/mysql-core';

// Edit this file, then `npm run db:generate` writes the SQL migration into drizzle/.
// Tables inherit utf8mb4_0900_ai_ci from the database: LIKE/ORDER BY ignore case and Vietnamese accents (đ = d).

// Every table: `id` INT AUTO_INCREMENT primary key, used only inside the DB (foreign keys).
// The API exposes the unique public key instead: code / slug (stable across re-seeds) or uuid (not guessable).
const autoId = () => int('id').autoincrement().primaryKey();

const timestamps = {
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
};

export const docTypes = mysqlTable('doc_types', {
  id: autoId(),
  code: varchar('code', { length: 10 }).notNull().unique(), // 'docx' | 'pptx'
  name: varchar('name', { length: 100 }).notNull(),
  extension: varchar('extension', { length: 10 }).notNull(),
});

export const categories = mysqlTable('categories', {
  id: autoId(),
  slug: varchar('slug', { length: 100 }).notNull().unique(), // 'hanh-chinh'
  name: varchar('name', { length: 100 }).notNull().unique(),
  description: varchar('description', { length: 500 }).notNull().default(''),
});

export const templates = mysqlTable(
  'templates',
  {
    id: autoId(),
    slug: varchar('slug', { length: 100 }).notNull().unique(), // 'hop-dong-lao-dong'
    docTypeId: int('doc_type_id').notNull().references(() => docTypes.id),
    categoryId: int('category_id').notNull().references(() => categories.id),
    name: varchar('name', { length: 200 }).notNull(),
    description: varchar('description', { length: 1000 }).notNull().default(''),
    filePath: varchar('file_path', { length: 500 }).notNull().unique(), // relative to STORAGE_ROOT
    ...timestamps,
  },
  (t) => [index('idx_templates_type_category').on(t.docTypeId, t.categoryId)],
);

// Slide (pptx) or page (docx) images; position 1 is the thumbnail
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

// Documents created from a template. The file is an independent copy; type comes from the template.
export const documents = mysqlTable(
  'documents',
  {
    id: autoId(),
    uuid: char('uuid', { length: 36 }).notNull().unique(), // crypto.randomUUID(), used in API URLs and file names
    templateId: int('template_id').notNull().references(() => templates.id),
    title: varchar('title', { length: 200 }).notNull(),
    filePath: varchar('file_path', { length: 500 }).notNull().unique(),
    ...timestamps,
  },
  (t) => [check('chk_document_title', sql`char_length(\`title\`) >= 1`)],
);
