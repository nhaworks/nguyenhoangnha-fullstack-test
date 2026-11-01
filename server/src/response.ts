import type { FastifyReply } from 'fastify';
import type { StoredFile } from './storage.js';

export function sendSuccess(reply: FastifyReply, data: unknown, message = 'Thành công', statusCode = 200) {
  return reply.status(statusCode).send({ code: statusCode, message, data });
}

export function sendError(reply: FastifyReply, statusCode: number, message: string) {
  return reply.status(statusCode).send({ code: statusCode, message, data: null });
}

export function sendFile(reply: FastifyReply, file: StoredFile, downloadName?: string) {
  reply.header('Content-Type', file.mimeType);
  reply.header('Content-Length', file.size);

  if (downloadName) {
    reply.header('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(downloadName)}`);
  }

  return reply.send(file.stream);
}
