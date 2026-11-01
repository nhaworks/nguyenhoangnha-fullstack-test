import { http, type ApiResponse } from '../../../shared/api/http';
import type { DocumentInfo, DocumentListItem } from './document.types';

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export async function getDocuments(): Promise<DocumentListItem[]> {
  const response = await http.get<ApiResponse<DocumentListItem[]>>('/documents');
  return response.data.data;
}

export async function getDocument(id: string): Promise<DocumentInfo> {
  const response = await http.get<ApiResponse<DocumentInfo>>(`/documents/${encodeURIComponent(id)}`);
  return response.data.data;
}

export async function getDocumentFile(id: string): Promise<ArrayBuffer> {
  const response = await http.get<ArrayBuffer>(`/documents/${encodeURIComponent(id)}/download`, {
    responseType: 'arraybuffer',
  });
  return response.data;
}

export async function saveDocumentFile(id: string, content: ArrayBuffer): Promise<DocumentInfo> {
  const response = await http.put<ApiResponse<DocumentInfo>>(`/documents/${encodeURIComponent(id)}`, content, {
    headers: { 'Content-Type': DOCX_MIME },
  });
  return response.data.data;
}

export async function renameDocumentTitle(id: string, title: string): Promise<DocumentInfo> {
  const response = await http.patch<ApiResponse<DocumentInfo>>(`/documents/${encodeURIComponent(id)}`, { title });
  return response.data.data;
}

export const KEEPALIVE_MAX_BYTES = 60 * 1024;

export function saveDocumentFileOnExit(id: string, content: ArrayBuffer) {
  void fetch(`/api/documents/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: content,
    headers: { 'Content-Type': DOCX_MIME },
    keepalive: true,
  });
}

export async function createDocumentFromTemplate(templateId: string, title?: string): Promise<DocumentInfo> {
  const response = await http.post<ApiResponse<DocumentInfo>>(
    `/templates/${encodeURIComponent(templateId)}/documents`,
    { title },
  );
  return response.data.data;
}
