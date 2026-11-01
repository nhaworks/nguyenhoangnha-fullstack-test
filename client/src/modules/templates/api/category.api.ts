import { http, type ApiResponse } from '../../../shared/api/http';
import type { Category } from './template.types';

export async function getCategories(type: string): Promise<Category[]> {
  const response = await http.get<ApiResponse<Category[]>>('/categories', { params: { type } });
  return response.data.data;
}
