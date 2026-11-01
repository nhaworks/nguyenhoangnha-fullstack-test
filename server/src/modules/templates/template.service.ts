import { AppError } from '../../errors.js';
import { openStoredFile } from '../../storage.js';
import * as templateRepository from './template.repository.js';
import type { TemplateFilter, TemplateRow } from './template.repository.js';

function toImageUrl(imagePath: string) {
  return '/files/' + imagePath;
}

function toTemplateResponse(row: TemplateRow) {
  return {
    id: row.slug,
    type: row.type,
    name: row.name,
    description: row.description,
    category: { id: row.categorySlug, name: row.categoryName },
    thumbnailUrl: row.thumbnailPath ? toImageUrl(row.thumbnailPath) : null,
  };
}

export async function getTemplates(filter: TemplateFilter) {
  const rows = await templateRepository.findTemplates({
    ...filter,
    q: filter.q?.trim(),
  });
  return rows.map(toTemplateResponse);
}

export async function findTemplateOrThrow(slug: string) {
  const template = await templateRepository.findTemplateBySlug(slug);
  if (!template) {
    throw new AppError(404, 'Không tìm thấy mẫu');
  }
  return template;
}

export async function getTemplateDetail(slug: string) {
  const template = await findTemplateOrThrow(slug);
  const previews = await templateRepository.findPreviews(template.id);

  return {
    ...toTemplateResponse(template),
    fileUrl: `/api/templates/${template.slug}/file`,
    previews: previews.map((preview) => ({
      position: preview.position,
      url: toImageUrl(preview.imagePath),
    })),
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
  };
}

export async function getTemplateFile(slug: string) {
  const template = await findTemplateOrThrow(slug);
  return openStoredFile(template.filePath, 'templates');
}

export async function getPreviewImage(imagePath: string) {
  return openStoredFile('previews/' + imagePath, 'previews');
}
