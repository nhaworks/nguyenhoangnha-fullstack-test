import { http, type ApiResponse } from '../../../shared/api/http';
import type { TemplateDetail, TemplateSummary } from './template.types';

export type TemplateQuery = {
  type?: string;
  q?: string;
  category?: string;
};

export async function getTemplates(query: TemplateQuery): Promise<TemplateSummary[]> {
  const response = await http.get<ApiResponse<TemplateSummary[]>>('/templates', { params: query });
  return response.data.data;
}

export async function getTemplateById(id: string): Promise<TemplateDetail> {
  const response = await http.get<ApiResponse<TemplateDetail>>(`/templates/${encodeURIComponent(id)}`);
  return response.data.data;
}
