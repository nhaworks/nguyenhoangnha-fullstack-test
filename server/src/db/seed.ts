import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { inArray } from 'drizzle-orm';
import { getStoragePath } from '../storage.js';
import { db } from './index.js';
import { categories, docTypes, templatePreviews, templates } from './schema.js';

type Manifest = {
  docTypes: { code: string; name: string; extension: string }[];
  categories: { id: string; name: string; description: string }[];
  templates: { id: string; type: string; category: string; name: string; description: string }[];
};

type TemplateRow = {
  slug: string;
  docTypeCode: string;
  categorySlug: string;
  name: string;
  description: string;
  filePath: string;
};

type PreviewRow = { templateSlug: string; position: number; imagePath: string };

async function findPreviewImages(templateSlug: string): Promise<PreviewRow[]> {
  const folder = `previews/${templateSlug}`;

  let fileNames: string[];
  try {
    fileNames = await readdir(getStoragePath(folder, 'previews'));
  } catch {
    return [];
  }

  const previews: PreviewRow[] = [];
  for (const fileName of fileNames) {
    if (/^\d+\.png$/.test(fileName)) {
      previews.push({ templateSlug, position: parseInt(fileName), imagePath: `${folder}/${fileName}` });
    }
  }
  return previews;
}

export async function seed() {
  const manifestPath = getStoragePath('templates/manifest.json', 'templates');
  const manifest: Manifest = JSON.parse(await readFile(manifestPath, 'utf8'));

  const templateRows: TemplateRow[] = [];
  const previewRows: PreviewRow[] = [];

  for (const item of manifest.templates) {
    const docType = manifest.docTypes.find((type) => type.code === item.type);
    if (!docType) {
      throw new Error(`manifest.json: mẫu "${item.id}" có type "${item.type}" không tồn tại`);
    }

    const filePath = `templates/${item.type}/${item.id}.${docType.extension}`;
    if (!existsSync(getStoragePath(filePath, 'templates'))) {
      throw new Error(`manifest.json: mẫu "${item.id}" thiếu file storage/${filePath}`);
    }

    templateRows.push({
      slug: item.id,
      docTypeCode: item.type,
      categorySlug: item.category,
      name: item.name,
      description: item.description,
      filePath,
    });
    previewRows.push(...(await findPreviewImages(item.id)));
  }

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
        .values({ slug: category.id, name: category.name, description: category.description })
        .onDuplicateKeyUpdate({ set: { name: category.name, description: category.description } });
    }

    const docTypeIds = toIdMap(await tx.select({ id: docTypes.id, key: docTypes.code }).from(docTypes));
    const categoryIds = toIdMap(await tx.select({ id: categories.id, key: categories.slug }).from(categories));

    for (const template of templateRows) {
      const categoryId = categoryIds.get(template.categorySlug);
      if (categoryId === undefined) {
        throw new Error(`manifest.json: mẫu "${template.slug}" có category "${template.categorySlug}" không tồn tại`);
      }
      const values = {
        slug: template.slug,
        docTypeId: docTypeIds.get(template.docTypeCode)!,
        categoryId,
        name: template.name,
        description: template.description,
        filePath: template.filePath,
      };
      await tx.insert(templates).values(values).onDuplicateKeyUpdate({ set: values });
    }

    const templateIds = toIdMap(await tx.select({ id: templates.id, key: templates.slug }).from(templates));
    const seededTemplateIds = templateRows.map((template) => templateIds.get(template.slug)!);
    if (seededTemplateIds.length > 0) {
      await tx.delete(templatePreviews).where(inArray(templatePreviews.templateId, seededTemplateIds));
    }
    if (previewRows.length > 0) {
      await tx.insert(templatePreviews).values(
        previewRows.map((preview) => ({
          templateId: templateIds.get(preview.templateSlug)!,
          position: preview.position,
          imagePath: preview.imagePath,
        })),
      );
    }
  });
}

function toIdMap(rows: { id: number; key: string }[]): Map<string, number> {
  return new Map(rows.map((row) => [row.key, row.id]));
}
