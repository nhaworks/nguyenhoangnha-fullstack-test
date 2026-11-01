import { AppError } from '../../errors.js';
import { openStoredFile } from '../../storage.js';
import * as templateRepository from './template.repository.js';
import type { TemplateFilter, TemplateRow } from './template.repository.js';

// DB lưu đường dẫn ảnh dạng "previews/<slug>/1.png", client cần URL "/files/previews/<slug>/1.png"
function toImageUrl(imagePath: string) {
  return '/files/' + imagePath;
}

// Dữ liệu mẫu trả cho client (không trả đường dẫn file trên server).
// `id` trả cho client là slug; id số tự tăng chỉ dùng trong DB.
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
    q: filter.q?.trim(), // bỏ khoảng trắng thừa, chuỗi rỗng coi như không tìm
  });
  return rows.map(toTemplateResponse);
}

// Lấy mẫu theo slug (id trên URL), không có thì báo 404. Module documents cũng dùng hàm này.
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

// imagePath lấy từ URL (vd. "hop-dong-lao-dong/1.png"), chỉ được đọc trong thư mục previews/
export async function getPreviewImage(imagePath: string) {
  return openStoredFile('previews/' + imagePath, 'previews');
}
