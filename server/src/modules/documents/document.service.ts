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

// Các loại tài liệu sửa được trong editor (docx-editor chạy ở trình duyệt). Hiện chỉ có docx;
// pptx chỉ tạo bản sao, xem slide và tải về (chưa có editor slide).
const EDITABLE_TYPES = ['docx'];

type DocumentFields = {
  id: string;
  templateId: string;
  templateName: string;
  type: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
};

// Dữ liệu tài liệu trả cho client (không trả đường dẫn file trên server)
function toDocumentResponse(row: DocumentFields) {
  return {
    id: row.id,
    templateId: row.templateId,
    templateName: row.templateName,
    type: row.type,
    title: row.title,
    editable: EDITABLE_TYPES.includes(row.type),
    downloadUrl: `/api/documents/${row.id}/download`,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt, // lần lưu gần nhất; bằng createdAt nếu chưa sửa
  };
}

// File .docx là file zip (bắt đầu bằng "PK\x03\x04") và luôn có word/document.xml.
// Tên file trong zip được lưu dạng chữ thường nên tìm thẳng trong nội dung.
function isDocxFile(content: Buffer) {
  const ZIP_SIGNATURE = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
  return content.subarray(0, 4).equals(ZIP_SIGNATURE) && content.includes('word/document.xml');
}

async function findDocumentOrThrow(id: string) {
  const document = await documentRepository.findDocumentById(id);
  if (!document) {
    throw new AppError(404, 'Không tìm thấy tài liệu');
  }
  return document;
}

// Danh sách tài liệu user đã tạo (cả docx và pptx), sửa gần nhất lên đầu
export async function listDocuments() {
  const rows = await documentRepository.findDocumentsOfUser(DEFAULT_USER_ID);

  return rows.map((row) => ({
    ...toDocumentResponse(row),
    thumbnailUrl: row.thumbnailPath ? '/files/' + row.thumbnailPath : null,
  }));
}

export async function getDocument(id: string) {
  const document = await findDocumentOrThrow(id);
  return toDocumentResponse(document);
}

/**
 * Tạo tài liệu mới từ mẫu:
 *   1. Thêm 1 dòng vào bảng documents
 *   2. Copy file mẫu sang storage/documents/<user>/<id>.<đuôi file>
 * Hai bước nằm chung một transaction: bước nào lỗi thì DB rollback và xoá file đã copy.
 * File mẫu gốc chỉ được đọc, không bị sửa.
 */
export async function createDocument(templateId: string, title?: string) {
  const template = await findTemplateOrThrow(templateId);

  const documentId = randomUUID();
  const filePath = `documents/${DEFAULT_USER_ID}/${documentId}.${template.extension}`;
  const sourceFile = getStoragePath(template.filePath, 'templates');
  const targetFile = getStoragePath(filePath, 'documents');

  try {
    await db.transaction(async (tx) => {
      await documentRepository.insertDocument(tx, {
        id: documentId,
        templateId,
        title: title?.trim() || template.name,
        filePath,
      });

      await mkdir(path.dirname(targetFile), { recursive: true });
      // COPYFILE_EXCL: nếu file đích đã tồn tại thì báo lỗi, không ghi đè
      await copyFile(sourceFile, targetFile, constants.COPYFILE_EXCL);
    });
  } catch (error) {
    // Xoá file copy dở. Lỗi EEXIST nghĩa là file có sẵn từ trước (không phải do mình tạo) nên giữ lại.
    const fileAlreadyExists = (error as NodeJS.ErrnoException).code === 'EEXIST';
    if (!fileAlreadyExists) {
      await rm(targetFile, { force: true });
    }
    throw error;
  }

  return getDocument(documentId);
}

/**
 * Lưu file .docx do editor ở trình duyệt gửi lên:
 *   - Ghi đè file của tài liệu (file mẫu gốc không bị đụng tới)
 *   - Cập nhật updated_at để biết lần lưu gần nhất
 */
export async function saveDocument(id: string, content: Buffer) {
  const document = await findDocumentOrThrow(id);

  if (!EDITABLE_TYPES.includes(document.type)) {
    throw new AppError(409, 'Loại tài liệu này chưa hỗ trợ chỉnh sửa');
  }
  if (!isDocxFile(content)) {
    throw new AppError(400, 'File gửi lên không phải định dạng .docx');
  }

  // Ghi ra file tạm rồi đổi tên thành file thật,
  // để người đang tải xuống không bao giờ nhận phải file mới ghi được một nửa.
  const targetFile = getStoragePath(document.filePath, 'documents');
  const tempFile = `${targetFile}.${randomUUID()}.tmp`;

  try {
    await db.transaction(async (tx) => {
      await documentRepository.markDocumentUpdated(tx, id);
      await writeFile(tempFile, content);
      await rename(tempFile, targetFile);
    });
  } finally {
    // Nếu lỗi xảy ra trước khi rename thì file tạm vẫn còn, xoá đi
    await rm(tempFile, { force: true });
  }

  return getDocument(id);
}

// Đổi tiêu đề tài liệu (chỉ metadata, file không đổi). Tên file khi tải xuống lấy theo tiêu đề mới.
export async function renameDocument(id: string, title: string) {
  await findDocumentOrThrow(id);
  await documentRepository.updateDocumentTitle(id, title.trim());
  return getDocument(id);
}

// Trả về file để tải xuống, tên file = tiêu đề tài liệu
export async function getDocumentDownload(id: string) {
  const document = await findDocumentOrThrow(id);
  const file = await openStoredFile(document.filePath, 'documents');
  const fileName = `${document.title}.${document.extension}`;
  return { file, fileName };
}
