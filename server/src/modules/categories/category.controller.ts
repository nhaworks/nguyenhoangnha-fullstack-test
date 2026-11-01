import type { FastifyReply, FastifyRequest } from 'fastify';
import { sendSuccess } from '../../response.js';
import * as categoryService from './category.service.js';

type ListCategoriesRequest = FastifyRequest<{ Querystring: { type?: string } }>;

export async function listCategories(request: ListCategoriesRequest, reply: FastifyReply) {
  const categories = await categoryService.getCategories(request.query.type);
  return sendSuccess(reply, categories);
}
