import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { inArray } from 'drizzle-orm';
import { getStoragePath } from '../storage.js';
import { db } from './index.js';
import { categories, docTypes, templatePreviews, templates } from './schema.js';

// Cấu trúc file storage/templates/manifest.json
// (trường `source` của mỗi mẫu chỉ dùng cho scripts/samples.py, seed không cần)
type Manifest = {
  docTypes: { code: string; name: string; extension: string }[];
  categories: { id: string; name: string; description: string }[];
  templates: { id: string; type: string; category: string; name: string; description: string }[];
};

type TemplateRow = {
  id: string;
  docTypeCode: string;
  categoryId: string;
  name: string;
  description: string;
  filePath: string;
};

type PreviewRow = { templateId: string; position: number; imagePath: string };

// Tìm ảnh preview của một mẫu trên ổ đĩa: storage/previews/<templateId>/1.png, 2.png...
async function findPreviewImages(templateId: string): Promise<PreviewRow[]> {
  const folder = `previews/${templateId}`;

  let fileNames: string[];
  try {
    fileNames = await readdir(getStoragePath(folder, 'previews'));
  } catch {
    return []; // mẫu chưa có ảnh preview
  }

  const previews: PreviewRow[] = [];
  for (const fileName of fileNames) {
    if (/^\d+\.png$/.test(fileName)) {
      previews.push({ templateId, position: parseInt(fileName), imagePath: `${folder}/${fileName}` });
    }
  }
  return previews;
}

/**
 * Đồng bộ dữ liệu mẫu từ manifest.json vào DB. Chạy mỗi lần server khởi động.
 * Dùng upsert: chưa có thì thêm, có rồi thì cập nhật.
 * Mẫu bị xoá khỏi manifest vẫn giữ trong DB, vì có thể đang có tài liệu tạo từ mẫu đó.
 */
export async function seed() {
  const manifestPath = getStoragePath('templates/manifest.json', 'templates');
  const manifest: Manifest = JSON.parse(await readFile(manifestPath, 'utf8'));

  // Bước 1: chuẩn bị dữ liệu từng mẫu và kiểm tra file mẫu có tồn tại không
  const templateRows: TemplateRow[] = [];
  const previewRows: PreviewRow[] = [];

  for (const item of manifest.templates) {
    const docType = manifest.docTypes.find((type) => type.code === item.type);
    if (!docType) {
      throw new Error(`manifest.json: mẫu "${item.id}" có type "${item.type}" không tồn tại`);
    }

    const filePath = `templates/${item.type}/${item.id}.${docType.extension}`;
    if (!existsSync(getStoragePath(filePath, 'templates'))) {
      throw new Error(`Thiếu file storage/${filePath}, hãy chạy: npm run samples`);
    }

    templateRows.push({
      id: item.id,
      docTypeCode: item.type,
      categoryId: item.category,
      name: item.name,
      description: item.description,
      filePath,
    });
    previewRows.push(...(await findPreviewImages(item.id)));
  }

  // Bước 2: ghi vào DB trong một transaction
  await db.transaction(async (tx) => {
    for (const docType of manifest.docTypes) {
      await tx
        .insert(docTypes)
        .values(docType)
        .onDuplicateKeyUpdate({ set: { name: docType.name, extension: docType.extension } });
    }

    for (const category of manifest.categories) {
      await tx
        .insert(categories)
        .values(category)
        .onDuplicateKeyUpdate({ set: { name: category.name, description: category.description } });
    }

    for (const template of templateRows) {
      await tx
        .insert(templates)
        .values(template)
        .onDuplicateKeyUpdate({
          set: {
            docTypeCode: template.docTypeCode,
            categoryId: template.categoryId,
            name: template.name,
            description: template.description,
            filePath: template.filePath,
          },
        });
    }

    // Ảnh preview: xoá ảnh cũ của các mẫu rồi thêm lại theo những gì đang có trên ổ đĩa
    const templateIds = templateRows.map((template) => template.id);
    if (templateIds.length > 0) {
      await tx.delete(templatePreviews).where(inArray(templatePreviews.templateId, templateIds));
    }
    if (previewRows.length > 0) {
      await tx.insert(templatePreviews).values(previewRows);
    }
  });
}
