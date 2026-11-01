import type { FastifyReply, FastifyRequest } from 'fastify';
import { AppError } from '../../errors.js';
import { sendFile, sendSuccess } from '../../response.js';
import * as documentService from './document.service.js';

type CreateDocumentRequest = FastifyRequest<{ Params: { id: string }; Body?: { title?: string } }>;
type DocumentIdRequest = FastifyRequest<{ Params: { id: string } }>;
type RenameDocumentRequest = FastifyRequest<{ Params: { id: string }; Body: { title: string } }>;
type SaveDocumentRequest = FastifyRequest<{ Params: { id: string }; Body: unknown }>;

export async function createDocument(request: CreateDocumentRequest, reply: FastifyReply) {
  const document = await documentService.createDocument(request.params.id, request.body?.title);
  reply.header('Location', `/api/documents/${document.id}`);
  return sendSuccess(reply, document, 'Đã tạo tài liệu', 201);
}

export async function listDocuments(_request: FastifyRequest, reply: FastifyReply) {
  const documents = await documentService.listDocuments();
  return sendSuccess(reply, documents);
}

export async function getDocument(request: DocumentIdRequest, reply: FastifyReply) {
  const document = await documentService.getDocument(request.params.id);
  return sendSuccess(reply, document);
}

export async function saveDocument(request: SaveDocumentRequest, reply: FastifyReply) {
  if (!Buffer.isBuffer(request.body)) {
    throw new AppError(415, 'Cần gửi nội dung file .docx (Content-Type DOCX)');
  }
  const document = await documentService.saveDocument(request.params.id, request.body);
  return sendSuccess(reply, document, 'Đã lưu tài liệu');
}

export async function renameDocument(request: RenameDocumentRequest, reply: FastifyReply) {
  const document = await documentService.renameDocument(request.params.id, request.body.title);
  return sendSuccess(reply, document, 'Đã đổi tên tài liệu');
}

export async function downloadDocument(request: DocumentIdRequest, reply: FastifyReply) {
  const { file, fileName } = await documentService.getDocumentDownload(request.params.id);
  return sendFile(reply, file, fileName);
}
