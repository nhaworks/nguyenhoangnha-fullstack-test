import Fastify, { type FastifyError, type FastifyServerOptions } from 'fastify';
import { sql } from 'drizzle-orm';
import { db } from './db/index.js';
import { errorResponse, okResponse, registerOpenApi } from './openapi.js';
import { categoryRoutes } from './modules/categories/category.routes.js';
import { documentRoutes } from './modules/documents/document.routes.js';
import { templateRoutes } from './modules/templates/template.routes.js';
import { sendError, sendSuccess } from './response.js';

// Tạo app nhưng chưa mở cổng, để test gọi API bằng app.inject()
export function buildApp(options: FastifyServerOptions = { logger: true }) {
  const app = Fastify(options);

  // Schema `response` ở routes chỉ để viết tài liệu Swagger: trả JSON như cũ, không lọc theo schema
  app.setSerializerCompiler(() => (data) => JSON.stringify(data));
  registerOpenApi(app);

  // Xử lý lỗi chung cho mọi route
  app.setErrorHandler((error: FastifyError, request, reply) => {
    // Sai tham số / body so với JSON schema
    if (error.validation) {
      return sendError(reply, 400, error.message);
    }

    // Lỗi mình chủ động ném (AppError) hoặc lỗi 4xx của Fastify (vd. body quá lớn)
    const statusCode = error.statusCode || 500;
    if (statusCode < 500) {
      return sendError(reply, statusCode, error.message);
    }

    // Lỗi không lường trước: ghi log chi tiết, client chỉ nhận câu thông báo chung
    request.log.error(error);
    return sendError(reply, 500, 'Lỗi máy chủ, vui lòng thử lại');
  });

  // Gọi vào URL không có route nào
  app.setNotFoundHandler((request, reply) => {
    return sendError(reply, 404, `Không tìm thấy ${request.method} ${request.url}`);
  });

  // Kiểm tra server còn chạy và kết nối được DB
  const healthSchema = {
    tags: ['Health'],
    response: {
      200: okResponse({ type: 'object', properties: { status: { type: 'string' } } }),
      503: errorResponse,
    },
  };
  // Bọc trong register để route được tạo sau plugin swagger (nếu không sẽ thiếu trong tài liệu)
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
