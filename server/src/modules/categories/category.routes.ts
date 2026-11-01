import type { FastifyInstance } from 'fastify';
import * as categoryController from './category.controller.js';

const listCategoriesQuery = {
  type: 'object',
  properties: {
    type: { type: 'string', pattern: '^[a-z0-9]+$', maxLength: 10 },
  },
};

export async function categoryRoutes(app: FastifyInstance) {
  app.get('/api/categories', { schema: { querystring: listCategoriesQuery } }, categoryController.listCategories);
}
