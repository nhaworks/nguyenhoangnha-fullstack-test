import { getCategories } from '../api/category.api';
import { getTemplateById, getTemplates } from '../api/template.api';
import type { Category, TemplateDetail, TemplateSummary } from '../api/template.types';
import { findDocType } from './doc-types';
import type { LibraryFilters } from './library-filters';

export type TemplateDetailView = TemplateDetail & {
  typeLabel: string;
  pageCountText: string;
  updatedAtText: string;
};

export async function loadTemplates(docType: string, filters: LibraryFilters): Promise<TemplateSummary[]> {
  const keyword = filters.keyword.trim();

  return getTemplates({
    type: docType,
    q: keyword || undefined,
    category: filters.categoryId || undefined,
  });
}

export async function loadCategories(docType: string): Promise<Category[]> {
  return getCategories(docType);
}

export async function loadTemplateDetail(id: string): Promise<TemplateDetailView> {
  const template = await getTemplateById(id);
  const docType = findDocType(template.type);

  return {
    ...template,
    typeLabel: docType.label,
    pageCountText: `${template.previews.length} ${docType.pageUnit}`,
    updatedAtText: new Date(template.updatedAt).toLocaleDateString('vi-VN'),
  };
}
