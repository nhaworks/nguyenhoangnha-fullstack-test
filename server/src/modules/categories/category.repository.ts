import { asc, count, eq } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { categories, docTypes, templates } from '../../db/schema.js';

export async function findCategories(type?: string) {
  return db
    .select({
      id: categories.slug,
      name: categories.name,
      description: categories.description,
      total: count(templates.id),
    })
    .from(categories)
    .innerJoin(templates, eq(templates.categoryId, categories.id))
    .innerJoin(docTypes, eq(docTypes.id, templates.docTypeId))
    .where(type ? eq(docTypes.code, type) : undefined)
    .groupBy(categories.id)
    .orderBy(asc(categories.name));
}
