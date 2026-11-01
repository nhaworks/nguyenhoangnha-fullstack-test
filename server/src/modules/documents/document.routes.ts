import type { FastifyInstance } from 'fastify';
import { MIME_TYPES } from '../../storage.js';
import * as documentController from './document.controller.js';

// Giới hạn file .docx gửi lên khi lưu: 20 MB (tài liệu có thể chứa ảnh)
const SAVE_BODY_LIMIT = 20 * 1024 * 1024;

const titleSchema = { type: 'string', minLength: 1, maxLength: 200, pattern: '\\S' }; // \S: không được toàn khoảng trắng

const templateIdParams = {
  type: 'object',
  required: ['id'],
  properties: {
    id: { type: 'string', pattern: '^[a-z0-9-]+$', maxLength: 100 },
  },
};

const documentIdParams = {
  type: 'object',
  required: ['id'],
  properties: {
    id: { type: 'string', format: 'uuid' },
  },
};

// Body khi tạo tài liệu là tuỳ chọn, nên không khai `type: 'object'`
// (khai thì request không có body sẽ bị báo lỗi 400)
const createDocumentBody = {
  additionalProperties: false,
  properties: { title: titleSchema },
};

const renameDocumentBody = {
  type: 'object',
  required: ['title'],
  additionalProperties: false,
  properties: { title: titleSchema },
};

export async function documentRoutes(app: FastifyInstance) {
  // Nhận body là file .docx nguyên bản (Buffer) khi Content-Type là DOCX
  app.addContentTypeParser(MIME_TYPES.docx, { parseAs: 'buffer', bodyLimit: SAVE_BODY_LIMIT }, (request, body, done) => {
    done(null, body);
  });

  app.post(
    '/api/templates/:id/documents',
    { schema: { params: templateIdParams, body: createDocumentBody } },
    documentController.createDocument,
  );

  app.get('/api/documents', documentController.listDocuments);

  app.get('/api/documents/:id', { schema: { params: documentIdParams } }, documentController.getDocument);

  app.put(
    '/api/documents/:id',
    { bodyLimit: SAVE_BODY_LIMIT, schema: { params: documentIdParams } },
    documentController.saveDocument,
  );

  app.patch(
    '/api/documents/:id',
    { schema: { params: documentIdParams, body: renameDocumentBody } },
    documentController.renameDocument,
  );

  app.get('/api/documents/:id/download', { schema: { params: documentIdParams } }, documentController.downloadDocument);
}
