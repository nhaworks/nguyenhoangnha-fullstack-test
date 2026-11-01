import { and, desc, eq, like, sql } from 'drizzle-orm';
import { db, type DbTransaction } from '../../db/index.js';
import { docTypes, documents, templatePreviews, templates } from '../../db/schema.js';

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

export async function markDocumentUpdated(tx: DbTransaction, uuid: string) {
  await tx.update(documents).set({ updatedAt: sql`now()` }).where(eq(documents.uuid, uuid));
}
