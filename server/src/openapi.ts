import type { FastifyInstance } from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

const nullableString = { type: ['string', 'null'] };
const dateTime = { type: 'string', format: 'date-time' };

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

export function okResponse(data: object) {
  return {
    type: 'object',
    properties: { code: { type: 'integer' }, message: { type: 'string' }, data },
  };
}

export const errorResponse = {
  type: 'object',
  properties: { code: { type: 'integer' }, message: { type: 'string' }, data: { type: 'null' } },
};

export function fileResponse(mimeTypes: string[]) {
  const content: Record<string, object> = {};
  for (const mimeType of mimeTypes) {
    content[mimeType] = { schema: { type: 'string', format: 'binary' } };
  }
  return { content };
}

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
    refResolver: { buildLocalReference: (json, baseUri, fragment, index) => String(json.$id || `def-${index}`) },
    transform: ({ schema, url }) => {
      if (!schema || !schema.consumes || schema.body) {
        return { schema, url };
      }
      return { schema: { ...schema, body: { type: 'string', format: 'binary' } }, url };
    },
  });

  app.register(swaggerUi, { routePrefix: '/api/docs' });
}
