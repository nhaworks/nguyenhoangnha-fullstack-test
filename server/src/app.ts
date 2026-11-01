import Fastify, { type FastifyError, type FastifyServerOptions } from 'fastify';
import { sql } from 'drizzle-orm';
import { db } from './db/index.js';
import { errorResponse, okResponse, registerOpenApi } from './openapi.js';
import { categoryRoutes } from './modules/categories/category.routes.js';
import { documentRoutes } from './modules/documents/document.routes.js';
import { templateRoutes } from './modules/templates/template.routes.js';
import { sendError, sendSuccess } from './response.js';

export function buildApp(options: FastifyServerOptions = { logger: true }) {
  const app = Fastify(options);

  app.setSerializerCompiler(() => (data) => JSON.stringify(data));
  registerOpenApi(app);

  app.setErrorHandler((error: FastifyError, request, reply) => {
    if (error.validation) {
      return sendError(reply, 400, error.message);
    }

    const statusCode = error.statusCode || 500;
    if (statusCode < 500) {
      return sendError(reply, statusCode, error.message);
    }

    request.log.error(error);
    return sendError(reply, 500, 'Lỗi máy chủ, vui lòng thử lại');
  });

  app.setNotFoundHandler((request, reply) => {
    return sendError(reply, 404, `Không tìm thấy ${request.method} ${request.url}`);
  });

  const healthSchema = {
    tags: ['Health'],
    response: {
      200: okResponse({ type: 'object', properties: { status: { type: 'string' } } }),
      503: errorResponse,
    },
  };
  app.register(async (healthApp) => {
    healthApp.get('/api/health', { schema: healthSchema }, async (request, reply) => {
      try {
        await db.execute(sql`SELECT 1`);
        return sendSuccess(reply, { status: 'ok' });
      } catch (error) {
        request.log.error(error);
        return sendError(reply, 503, 'Không kết nối được cơ sở dữ liệu');
      }
    });
  });

  app.register(templateRoutes);
  app.register(categoryRoutes);
  app.register(documentRoutes);

  return app;
}
