import type { FastifyInstance } from 'fastify';
import { errorResponse, fileResponse, okResponse } from '../../openapi.js';
import { MIME_TYPES } from '../../storage.js';
import * as templateController from './template.controller.js';

const templateIdParams = {
  type: 'object',
  required: ['id'],
  properties: {
    id: { type: 'string', pattern: '^[a-z0-9-]+$', maxLength: 100 },
  },
};

const listTemplatesQuery = {
  type: 'object',
  properties: {
    type: { type: 'string', pattern: '^[a-z0-9]+$', maxLength: 10 },
    q: { type: 'string', maxLength: 100 },
    category: { type: 'string', pattern: '^[a-z0-9-]+$', maxLength: 100 },
  },
};

export async function templateRoutes(app: FastifyInstance) {
  app.get(
    '/api/templates',
    {
      schema: {
        tags: ['Templates'],
        querystring: listTemplatesQuery,
        response: {
          200: okResponse({ type: 'array', items: { $ref: 'Template#' } }),
          400: errorResponse,
        },
      },
    },
    templateController.listTemplates,
  );

  app.get(
    '/api/templates/:id',
    {
      schema: {
        tags: ['Templates'],
        params: templateIdParams,
        response: { 200: okResponse({ $ref: 'TemplateDetail#' }), 400: errorResponse, 404: errorResponse },
      },
    },
    templateController.getTemplate,
  );

  app.get(
    '/api/templates/:id/file',
    {
      schema: {
        tags: ['Templates'],
        params: templateIdParams,
        response: { 200: fileResponse([MIME_TYPES.docx, MIME_TYPES.pptx]), 404: errorResponse },
      },
    },
    templateController.getTemplateFile,
  );

  app.get(
    '/files/previews/*',
    {
      schema: {
        tags: ['Files'],
        response: { 200: fileResponse(['image/png']), 404: errorResponse },
      },
    },
    templateController.getPreviewImage,
  );
}
