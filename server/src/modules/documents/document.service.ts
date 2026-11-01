import { randomUUID } from 'node:crypto';
import { constants } from 'node:fs';
import { copyFile, mkdir, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DEFAULT_USER_ID } from '../../config.js';
import { db } from '../../db/index.js';
import { AppError } from '../../errors.js';
import { getStoragePath, openStoredFile } from '../../storage.js';
import { findTemplateOrThrow } from '../templates/template.service.js';
import * as documentRepository from './document.repository.js';
import type { DocumentRow } from './document.repository.js';

const EDITABLE_TYPES = ['docx'];

type DocumentFields = {
  uuid: string;
  templateSlug: string;
  templateName: string;
  type: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
};

function toDocumentResponse(row: DocumentFields) {
  return {
    id: row.uuid,
    templateId: row.templateSlug,
    templateName: row.templateName,
    type: row.type,
    title: row.title,
    editable: EDITABLE_TYPES.includes(row.type),
    downloadUrl: `/api/documents/${row.uuid}/download`,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function isDocxFile(content: Buffer) {
  const ZIP_SIGNATURE = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
  return content.subarray(0, 4).equals(ZIP_SIGNATURE) && content.includes('word/document.xml');
}

async function findDocumentOrThrow(uuid: string) {
  const document = await documentRepository.findDocumentByUuid(uuid);
  if (!document) {
    throw new AppError(404, 'Không tìm thấy tài liệu');
  }
  return document;
}

export async function listDocuments() {
  const rows = await documentRepository.findDocumentsOfUser(DEFAULT_USER_ID);

  return rows.map((row) => ({
    ...toDocumentResponse(row),
    thumbnailUrl: row.thumbnailPath ? '/files/' + row.thumbnailPath : null,
  }));
}

export async function getDocument(uuid: string) {
  const document = await findDocumentOrThrow(uuid);
  return toDocumentResponse(document);
}

export async function createDocument(templateSlug: string, title?: string) {
  const template = await findTemplateOrThrow(templateSlug);

  const documentUuid = randomUUID();
  const filePath = `documents/${DEFAULT_USER_ID}/${documentUuid}.${template.extension}`;
  const sourceFile = getStoragePath(template.filePath, 'templates');
  const targetFile = getStoragePath(filePath, 'documents');

  try {
    await db.transaction(async (tx) => {
      await documentRepository.insertDocument(tx, {
        uuid: documentUuid,
        templateId: template.id,
        title: title?.trim() || template.name,
        filePath,
      });

      await mkdir(path.dirname(targetFile), { recursive: true });
      await copyFile(sourceFile, targetFile, constants.COPYFILE_EXCL);
    });
  } catch (error) {
    const fileAlreadyExists = (error as NodeJS.ErrnoException).code === 'EEXIST';
    if (!fileAlreadyExists) {
      await rm(targetFile, { force: true });
    }
    throw error;
  }

  return getDocument(documentUuid);
}

export async function saveDocument(uuid: string, content: Buffer) {
  const document = await findDocumentOrThrow(uuid);

  if (!EDITABLE_TYPES.includes(document.type)) {
    throw new AppError(409, 'Loại tài liệu này chưa hỗ trợ chỉnh sửa');
  }
  if (!isDocxFile(content)) {
    throw new AppError(400, 'File gửi lên không phải định dạng .docx');
  }

  const targetFile = getStoragePath(document.filePath, 'documents');
  const tempFile = `${targetFile}.${randomUUID()}.tmp`;

  try {
    await db.transaction(async (tx) => {
      await documentRepository.markDocumentUpdated(tx, uuid);
      await writeFile(tempFile, content);
      await rename(tempFile, targetFile);
    });
  } finally {
    await rm(tempFile, { force: true });
  }

  return getDocument(uuid);
}

export async function renameDocument(uuid: string, title: string) {
  await findDocumentOrThrow(uuid);
  await documentRepository.updateDocumentTitle(uuid, title.trim());
  return getDocument(uuid);
}

export async function getDocumentDownload(uuid: string) {
  const document = await findDocumentOrThrow(uuid);
  const file = await openStoredFile(document.filePath, 'documents');
  const fileName = `${document.title}.${document.extension}`;
  return { file, fileName };
}
