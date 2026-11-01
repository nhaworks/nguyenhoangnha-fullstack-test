import { and, desc, eq, like, sql } from 'drizzle-orm';
import { db, type DbTransaction } from '../../db/index.js';
import { docTypes, documents, templatePreviews, templates } from '../../db/schema.js';

// Một tài liệu đọc từ DB. Bảng documents không có cột loại,
// nên type, extension và tên mẫu lấy qua mẫu gốc (documents.template_id → templates → doc_types).
// uuid / templateSlug là khoá công khai trả cho client; id số tự tăng chỉ dùng trong DB.
export type DocumentRow = {
  uuid: string;
  templateSlug: string;
  templateName: string;
  title: string;
  filePath: string;
  createdAt: Date;
  updatedAt: Date;
  type: string;
  extension: string;
};

export async function findDocumentByUuid(uuid: string): Promise<DocumentRow | undefined> {
  const rows = await db
    .select({
      uuid: documents.uuid,
      templateSlug: templates.slug,
      templateName: templates.name,
      title: documents.title,
      filePath: documents.filePath,
      createdAt: documents.createdAt,
      updatedAt: documents.updatedAt,
      type: docTypes.code,
      extension: docTypes.extension,
    })
    .from(documents)
    .innerJoin(templates, eq(templates.id, documents.templateId))
    .innerJoin(docTypes, eq(docTypes.id, templates.docTypeId))
    .where(eq(documents.uuid, uuid));

  return rows[0];
}

// Một dòng trong danh sách tài liệu, kèm ảnh thumbnail của mẫu gốc
export type DocumentListRow = {
  uuid: string;
  templateSlug: string;
  templateName: string;
  title: string;
  type: string;
  thumbnailPath: string | null;
  createdAt: Date;
  updatedAt: Date;
};

// Tài liệu của một user: file của user nằm trong documents/<userId>/.
// Chưa phân trang; khi số tài liệu lớn thì thêm limit / offset.
export async function findDocumentsOfUser(userId: string): Promise<DocumentListRow[]> {
  return db
    .select({
      uuid: documents.uuid,
      templateSlug: templates.slug,
      templateName: templates.name,
      title: documents.title,
      type: docTypes.code,
      thumbnailPath: templatePreviews.imagePath,
      createdAt: documents.createdAt,
      updatedAt: documents.updatedAt,
    })
    .from(documents)
    .innerJoin(templates, eq(templates.id, documents.templateId))
    .innerJoin(docTypes, eq(docTypes.id, templates.docTypeId))
    .leftJoin(
      templatePreviews,
      and(eq(templatePreviews.templateId, templates.id), eq(templatePreviews.position, 1)),
    )
    .where(like(documents.filePath, `documents/${userId}/%`))
    .orderBy(desc(documents.updatedAt), desc(documents.createdAt));
}

export async function insertDocument(
  tx: DbTransaction,
  document: { uuid: string; templateId: number; title: string; filePath: string },
) {
  await tx.insert(documents).values(document);
}

export async function updateDocumentTitle(uuid: string, title: string) {
  await db.update(documents).set({ title }).where(eq(documents.uuid, uuid));
}

// Ghi nhận tài liệu vừa được lưu: cập nhật updated_at theo giờ của MySQL
export async function markDocumentUpdated(tx: DbTransaction, uuid: string) {
  await tx.update(documents).set({ updatedAt: sql`now()` }).where(eq(documents.uuid, uuid));
}
