import type { FastifyInstance } from 'fastify';
import { errorResponse, fileResponse, okResponse } from '../../openapi.js';
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

const documentData = { $ref: 'Document#' };

export async function documentRoutes(app: FastifyInstance) {
  // Nhận body là file .docx nguyên bản (Buffer) khi Content-Type là DOCX
  app.addContentTypeParser(MIME_TYPES.docx, { parseAs: 'buffer', bodyLimit: SAVE_BODY_LIMIT }, (request, body, done) => {
    done(null, body);
  });

  app.post(
    '/api/templates/:id/documents',
    {
      schema: {
        tags: ['Documents'],
        params: templateIdParams,
        body: createDocumentBody,
        response: {
          201: okResponse(documentData),
          400: errorResponse,
          404: errorResponse,
        },
      },
    },
    documentController.createDocument,
  );

  app.get(
    '/api/documents',
    {
      schema: {
        tags: ['Documents'],
        response: { 200: okResponse({ type: 'array', items: { $ref: 'DocumentListItem#' } }) },
      },
    },
    documentController.listDocuments,
  );

  app.get(
    '/api/documents/:id',
    {
      schema: {
        tags: ['Documents'],
        params: documentIdParams,
        response: { 200: okResponse(documentData), 400: errorResponse, 404: errorResponse },
      },
    },
    documentController.getDocument,
  );

  app.put(
    '/api/documents/:id',
    {
      bodyLimit: SAVE_BODY_LIMIT,
      schema: {
        tags: ['Documents'],
        params: documentIdParams,
        consumes: [MIME_TYPES.docx],
        response: {
          200: okResponse(documentData),
          400: errorResponse,
          404: errorResponse,
          409: errorResponse,
          413: errorResponse,
          415: errorResponse,
        },
      },
    },
    documentController.saveDocument,
  );

  app.patch(
    '/api/documents/:id',
    {
      schema: {
        tags: ['Documents'],
        params: documentIdParams,
        body: renameDocumentBody,
        response: { 200: okResponse(documentData), 400: errorResponse, 404: errorResponse },
      },
    },
    documentController.renameDocument,
  );

  app.get(
    '/api/documents/:id/download',
    {
      schema: {
        tags: ['Documents'],
        params: documentIdParams,
        response: { 200: fileResponse([MIME_TYPES.docx, MIME_TYPES.pptx]), 400: errorResponse, 404: errorResponse },
      },
    },
    documentController.downloadDocument,
  );
}
