import type { FastifyReply, FastifyRequest } from 'fastify';
import { sendFile, sendSuccess } from '../../response.js';
import * as templateService from './template.service.js';

type ListTemplatesRequest = FastifyRequest<{ Querystring: { type?: string; q?: string; category?: string } }>;
type TemplateIdRequest = FastifyRequest<{ Params: { id: string } }>;
type PreviewImageRequest = FastifyRequest<{ Params: { '*': string } }>;

// GET /api/templates?type=&q=&category=
export async function listTemplates(request: ListTemplatesRequest, reply: FastifyReply) {
  const templates = await templateService.getTemplates(request.query);
  return sendSuccess(reply, templates);
}

// GET /api/templates/:id
export async function getTemplate(request: TemplateIdRequest, reply: FastifyReply) {
  const template = await templateService.getTemplateDetail(request.params.id);
  return sendSuccess(reply, template);
}

// GET /api/templates/:id/file
export async function getTemplateFile(request: TemplateIdRequest, reply: FastifyReply) {
  const file = await templateService.getTemplateFile(request.params.id);
  return sendFile(reply, file);
}

// GET /files/previews/*
export async function getPreviewImage(request: PreviewImageRequest, reply: FastifyReply) {
  const file = await templateService.getPreviewImage(request.params['*']);
  return sendFile(reply, file);
}
