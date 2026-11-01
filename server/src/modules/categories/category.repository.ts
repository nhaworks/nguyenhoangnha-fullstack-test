import { and, asc, count, eq } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { categories, templates } from '../../db/schema.js';

// Lấy các danh mục đang có mẫu, kèm số lượng mẫu trong mỗi danh mục.
// Có type thì chỉ đếm mẫu của loại đó (docx / pptx).
export async function findCategories(type?: string) {
  const joinCondition = type
    ? and(eq(templates.categoryId, categories.id), eq(templates.docTypeCode, type))
    : eq(templates.categoryId, categories.id);

  return db
    .select({
      id: categories.id,
      name: categories.name,
      description: categories.description,
      total: count(templates.id),
    })
    .from(categories)
    .innerJoin(templates, joinCondition)
    .groupBy(categories.id)
    .orderBy(asc(categories.name));
}
