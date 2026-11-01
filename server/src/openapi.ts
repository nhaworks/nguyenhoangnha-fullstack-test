import type { FastifyInstance } from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

// Tài liệu API (OpenAPI 3) sinh từ JSON schema khai ở các file routes:
//   - GET /api/docs       : giao diện Swagger UI (mở được qua Vite proxy :5173 hoặc thẳng :3000)
//   - GET /api/docs/json  : file OpenAPI dạng JSON
//
// Schema `response` ở routes CHỈ dùng để viết tài liệu: app.ts đặt serializer là JSON.stringify,
// nên Fastify không lọc bớt hay đổi dữ liệu trả về theo schema này.

const nullableString = { type: ['string', 'null'] };
const dateTime = { type: 'string', format: 'date-time' };

// Kiểu dữ liệu dùng chung, routes tham chiếu bằng { $ref: '<$id>#' }
const SHARED_SCHEMAS = [
  {
    $id: 'Category',
    type: 'object',
    properties: {
      id: { type: 'string' },
      name: { type: 'string' },
      description: { type: 'string' },
      total: { type: 'integer' },
    },
  },
  {
    $id: 'Template',
    type: 'object',
    properties: {
      id: { type: 'string' },
      type: { type: 'string' },
      name: { type: 'string' },
      description: { type: 'string' },
      category: {
        type: 'object',
        properties: { id: { type: 'string' }, name: { type: 'string' } },
      },
      thumbnailUrl: nullableString,
    },
  },
  {
    $id: 'TemplateDetail',
    type: 'object',
    allOf: [
      { $ref: 'Template#' },
      {
        type: 'object',
        properties: {
          fileUrl: { type: 'string' },
          previews: {
            type: 'array',
            items: {
              type: 'object',
              properties: { position: { type: 'integer' }, url: { type: 'string' } },
            },
          },
          createdAt: dateTime,
          updatedAt: dateTime,
        },
      },
    ],
  },
  {
    $id: 'Document',
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      templateId: { type: 'string' },
      templateName: { type: 'string' },
      type: { type: 'string' },
      title: { type: 'string' },
      editable: { type: 'boolean' },
      downloadUrl: { type: 'string' },
      createdAt: dateTime,
      updatedAt: dateTime,
    },
  },
  {
    $id: 'DocumentListItem',
    type: 'object',
    allOf: [{ $ref: 'Document#' }, { type: 'object', properties: { thumbnailUrl: nullableString } }],
  },
];

// Response JSON thành công: { code, message, data }
export function okResponse(data: object) {
  return {
    type: 'object',
    properties: { code: { type: 'integer' }, message: { type: 'string' }, data },
  };
}

// Response JSON lỗi: { code, message, data: null }
export const errorResponse = {
  type: 'object',
  properties: { code: { type: 'integer' }, message: { type: 'string' }, data: { type: 'null' } },
};

// Response là file nhị phân (ảnh preview, file mẫu, tải tài liệu)
export function fileResponse(mimeTypes: string[]) {
  const content: Record<string, object> = {};
  for (const mimeType of mimeTypes) {
    content[mimeType] = { schema: { type: 'string', format: 'binary' } };
  }
  return { content };
}

// Gọi thẳng trong buildApp() (không bọc trong plugin con) để swagger thấy route của mọi module
// và các module tham chiếu được SHARED_SCHEMAS.
export function registerOpenApi(app: FastifyInstance) {
  for (const schema of SHARED_SCHEMAS) {
    app.addSchema(schema);
  }

  app.register(swagger, {
    openapi: {
      info: {
        title: 'Thư viện mẫu tài liệu API',
        version: '1.0.0',
      },
      tags: [
        { name: 'Health' },
        { name: 'Templates' },
        { name: 'Categories' },
        { name: 'Documents' },
        { name: 'Files' },
      ],
    },
    // Giữ tên kiểu dữ liệu ($id) trong components/schemas thay vì def-0, def-1...
    refResolver: { buildLocalReference: (json, baseUri, fragment, index) => String(json.$id || `def-${index}`) },
    // Route nhận file nhị phân (khai `consumes`) không có body schema, vì Fastify sẽ kiểm tra body theo schema đó.
    // Chỉ thêm body dạng binary vào tài liệu để Swagger UI cho chọn file gửi lên.
    transform: ({ schema, url }) => {
      if (!schema || !schema.consumes || schema.body) {
        return { schema, url };
      }
      return { schema: { ...schema, body: { type: 'string', format: 'binary' } }, url };
    },
  });

  app.register(swaggerUi, { routePrefix: '/api/docs' });
}
