import type { FastifyInstance } from 'fastify';
import * as templateController from './template.controller.js';

// id của mẫu là slug: chữ thường, số và dấu gạch ngang (vd. "hop-dong-lao-dong")
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
  app.get('/api/templates', { schema: { querystring: listTemplatesQuery } }, templateController.listTemplates);
  app.get('/api/templates/:id', { schema: { params: templateIdParams } }, templateController.getTemplate);
  app.get('/api/templates/:id/file', { schema: { params: templateIdParams } }, templateController.getTemplateFile);

  // Ảnh preview / thumbnail: /files/previews/<templateId>/<số thứ tự>.png
  app.get('/files/previews/*', templateController.getPreviewImage);
}
