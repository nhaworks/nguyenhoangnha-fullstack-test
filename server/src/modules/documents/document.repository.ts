import { and, desc, eq, like, sql } from 'drizzle-orm';
import { db, type DbTransaction } from '../../db/index.js';
import { docTypes, documents, templatePreviews, templates } from '../../db/schema.js';

// Một tài liệu đọc từ DB. Bảng documents không có cột loại,
// nên type, extension và tên mẫu lấy qua mẫu gốc (documents.template_id → templates → doc_types).
export type DocumentRow = {
  id: string;
  templateId: string;
  templateName: string;
  title: string;
  filePath: string;
  createdAt: Date;
  updatedAt: Date;
  type: string;
  extension: string;
};

export async function findDocumentById(id: string): Promise<DocumentRow | undefined> {
  const rows = await db
    .select({
      id: documents.id,
      templateId: documents.templateId,
      templateName: templates.name,
      title: documents.title,
      filePath: documents.filePath,
      createdAt: documents.createdAt,
      updatedAt: documents.updatedAt,
      type: templates.docTypeCode,
      extension: docTypes.extension,
    })
    .from(documents)
    .innerJoin(templates, eq(templates.id, documents.templateId))
    .innerJoin(docTypes, eq(docTypes.code, templates.docTypeCode))
    .where(eq(documents.id, id));

  return rows[0];
}

// Một dòng trong danh sách tài liệu, kèm ảnh thumbnail của mẫu gốc
export type DocumentListRow = {
  id: string;
  templateId: string;
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
      id: documents.id,
      templateId: documents.templateId,
      templateName: templates.name,
      title: documents.title,
      type: templates.docTypeCode,
      thumbnailPath: templatePreviews.imagePath,
      createdAt: documents.createdAt,
      updatedAt: documents.updatedAt,
    })
    .from(documents)
    .innerJoin(templates, eq(templates.id, documents.templateId))
    .leftJoin(
      templatePreviews,
      and(eq(templatePreviews.templateId, templates.id), eq(templatePreviews.position, 1)),
    )
    .where(like(documents.filePath, `documents/${userId}/%`))
    .orderBy(desc(documents.updatedAt), desc(documents.createdAt));
}

export async function insertDocument(
  tx: DbTransaction,
  document: { id: string; templateId: string; title: string; filePath: string },
) {
  await tx.insert(documents).values(document);
}

export async function updateDocumentTitle(id: string, title: string) {
  await db.update(documents).set({ title }).where(eq(documents.id, id));
}

// Ghi nhận tài liệu vừa được lưu: cập nhật updated_at theo giờ của MySQL
export async function markDocumentUpdated(tx: DbTransaction, id: string) {
  await tx.update(documents).set({ updatedAt: sql`now()` }).where(eq(documents.id, id));
}
