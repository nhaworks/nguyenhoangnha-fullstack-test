import type { FastifyReply } from 'fastify';
import type { StoredFile } from './storage.js';

// Mọi API trả JSON theo cùng một dạng: { code, message, data }
// - code: luôn bằng HTTP status (200, 201, 400, 404...)
// - message: câu thông báo cho người dùng
// - data: dữ liệu trả về, bằng null khi có lỗi

export function sendSuccess(reply: FastifyReply, data: unknown, message = 'Thành công', statusCode = 200) {
  return reply.status(statusCode).send({ code: statusCode, message, data });
}

export function sendError(reply: FastifyReply, statusCode: number, message: string) {
  return reply.status(statusCode).send({ code: statusCode, message, data: null });
}

// Gửi file về client. Có downloadName thì trình duyệt sẽ tải file về với tên đó.
export function sendFile(reply: FastifyReply, file: StoredFile, downloadName?: string) {
  reply.header('Content-Type', file.mimeType);
  reply.header('Content-Length', file.size);

  if (downloadName) {
    // Mã hoá tên file để giữ được tiếng Việt
    reply.header('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(downloadName)}`);
  }

  return reply.send(file.stream);
}
