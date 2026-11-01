import { AppError } from '../../errors.js';
import { openStoredFile } from '../../storage.js';
import * as templateRepository from './template.repository.js';
import type { TemplateFilter, TemplateRow } from './template.repository.js';

// DB lưu đường dẫn ảnh dạng "previews/<id>/1.png", client cần URL "/files/previews/<id>/1.png"
function toImageUrl(imagePath: string) {
  return '/files/' + imagePath;
}

// Dữ liệu mẫu trả cho client (không trả đường dẫn file trên server)
function toTemplateResponse(row: TemplateRow) {
  return {
    id: row.id,
    type: row.type,
    name: row.name,
    description: row.description,
    category: { id: row.categoryId, name: row.categoryName },
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

// Lấy mẫu theo id, không có thì báo 404. Module documents cũng dùng hàm này.
export async function findTemplateOrThrow(id: string) {
  const template = await templateRepository.findTemplateById(id);
  if (!template) {
    throw new AppError(404, 'Không tìm thấy mẫu');
  }
  return template;
}

export async function getTemplateDetail(id: string) {
  const template = await findTemplateOrThrow(id);
  const previews = await templateRepository.findPreviews(id);

  return {
    ...toTemplateResponse(template),
    fileUrl: `/api/templates/${id}/file`,
    previews: previews.map((preview) => ({
      position: preview.position,
      url: toImageUrl(preview.imagePath),
    })),
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
  };
}

export async function getTemplateFile(id: string) {
  const template = await findTemplateOrThrow(id);
  return openStoredFile(template.filePath, 'templates');
}

// imagePath lấy từ URL (vd. "hop-dong-lao-dong/1.png"), chỉ được đọc trong thư mục previews/
export async function getPreviewImage(imagePath: string) {
  return openStoredFile('previews/' + imagePath, 'previews');
}
