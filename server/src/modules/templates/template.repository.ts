import { and, asc, eq, like, or, type SQL } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { categories, docTypes, templatePreviews, templates } from '../../db/schema.js';

// Một mẫu đọc từ DB, đã kèm loại, danh mục, đuôi file và ảnh thumbnail.
// id: số tự tăng, chỉ dùng trong DB; slug / categorySlug: khoá công khai trả cho client.
export type TemplateRow = {
  id: number;
  slug: string;
  type: string;
  name: string;
  description: string;
  categorySlug: string;
  categoryName: string;
  thumbnailPath: string | null;
  filePath: string;
  extension: string;
  createdAt: Date;
  updatedAt: Date;
};

export type TemplateFilter = {
  type?: string;
  q?: string;
  category?: string;
};

// Câu SELECT dùng chung cho danh sách và chi tiết mẫu.
// LEFT JOIN ảnh preview có position = 1 để lấy thumbnail (mẫu chưa có ảnh vẫn được trả về).
function selectTemplates() {
  return db
    .select({
      id: templates.id,
      slug: templates.slug,
      type: docTypes.code,
      name: templates.name,
      description: templates.description,
      categorySlug: categories.slug,
      categoryName: categories.name,
      thumbnailPath: templatePreviews.imagePath,
      filePath: templates.filePath,
      extension: docTypes.extension,
      createdAt: templates.createdAt,
      updatedAt: templates.updatedAt,
    })
    .from(templates)
    .innerJoin(categories, eq(categories.id, templates.categoryId))
    .innerJoin(docTypes, eq(docTypes.id, templates.docTypeId))
    .leftJoin(
      templatePreviews,
      and(eq(templatePreviews.templateId, templates.id), eq(templatePreviews.position, 1)),
    );
}

// Thêm dấu \ trước %, _ và \ để người dùng gõ "%" thì tìm đúng ký tự "%"
function escapeLike(text: string) {
  return text.replace(/[\\%_]/g, '\\$&');
}

export async function findTemplates(filter: TemplateFilter): Promise<TemplateRow[]> {
  const conditions: (SQL | undefined)[] = [];

  if (filter.type) {
    conditions.push(eq(docTypes.code, filter.type));
  }
  if (filter.category) {
    conditions.push(eq(categories.slug, filter.category));
  }
  if (filter.q) {
    // Database dùng collation utf8mb4_0900_ai_ci nên LIKE không phân biệt hoa thường và dấu:
    // "hop dong" sẽ khớp "Hợp đồng"
    const pattern = `%${escapeLike(filter.q)}%`;
    conditions.push(or(like(templates.name, pattern), like(templates.description, pattern)));
  }

  return selectTemplates()
    .where(and(...conditions))
    .orderBy(asc(templates.name));
}

export async function findTemplateBySlug(slug: string): Promise<TemplateRow | undefined> {
  const rows = await selectTemplates().where(eq(templates.slug, slug));
  return rows[0];
}

export async function findPreviews(templateId: number) {
  return db
    .select({ position: templatePreviews.position, imagePath: templatePreviews.imagePath })
    .from(templatePreviews)
    .where(eq(templatePreviews.templateId, templateId))
    .orderBy(asc(templatePreviews.position));
}
