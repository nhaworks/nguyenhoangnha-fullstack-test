import { createReadStream, type ReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { STORAGE_ROOT } from './config.js';
import { AppError } from './errors.js';

export const MIME_TYPES: Record<string, string> = {
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  png: 'image/png',
};

export type StoredFile = {
  stream: ReadStream;
  size: number;
  mimeType: string;
};

export function getStoragePath(relativePath: string, allowedFolder: string): string {
  const allowedDir = path.resolve(STORAGE_ROOT, allowedFolder);
  const fullPath = path.resolve(STORAGE_ROOT, relativePath);

  const hasNullByte = relativePath.includes('\0');
  const isInsideAllowedDir = fullPath.startsWith(allowedDir + path.sep);

  if (hasNullByte || !isInsideAllowedDir) {
    throw new AppError(404, 'Không tìm thấy file');
  }
  return fullPath;
}

export function getMimeType(filePath: string): string {
  const extension = path.extname(filePath).slice(1).toLowerCase();
  return MIME_TYPES[extension] || 'application/octet-stream';
}

export async function openStoredFile(relativePath: string, allowedFolder: string): Promise<StoredFile> {
  const fullPath = getStoragePath(relativePath, allowedFolder);

  const fileInfo = await stat(fullPath).catch(() => null);
  if (!fileInfo || !fileInfo.isFile()) {
    throw new AppError(404, 'Không tìm thấy file');
  }

  return {
    stream: createReadStream(fullPath),
    size: fileInfo.size,
    mimeType: getMimeType(fullPath),
  };
}
