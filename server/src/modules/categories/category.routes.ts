import type { FastifyInstance } from 'fastify';
import { errorResponse, okResponse } from '../../openapi.js';
import * as categoryController from './category.controller.js';

const listCategoriesQuery = {
  type: 'object',
  properties: {
    type: { type: 'string', pattern: '^[a-z0-9]+$', maxLength: 10 },
  },
};

export async function categoryRoutes(app: FastifyInstance) {
  app.get(
    '/api/categories',
    {
      schema: {
        tags: ['Categories'],
        querystring: listCategoriesQuery,
        response: {
          200: okResponse({ type: 'array', items: { $ref: 'Category#' } }),
          400: errorResponse,
        },
      },
    },
    categoryController.listCategories,
  );
}
