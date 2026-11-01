# Mô hình dữ liệu

MySQL 8+ (đang chạy 9.6), database `template_library`, collation `utf8mb4_0900_ai_ci`. Truy cập qua Drizzle ORM + mysql2. File tài liệu nằm trên đĩa dưới `server/storage/`, DB chỉ lưu đường dẫn tương đối (`file_path`, `image_path`).

| Nguồn | Vai trò |
|---|---|
| `server/src/db/schema.ts` | **Nguồn sự thật** của cấu trúc DB (Drizzle) |
| `server/drizzle/*.sql` | Migration sinh tự động từ schema, commit vào git |
| `server/src/db/migrate.ts` | Tạo database nếu chưa có, chạy migration còn thiếu |

## Quy trình đổi cấu trúc

```bash
cd server
# 1. Sửa src/db/schema.ts
npm run db:generate -- --name <ten_thay_doi>   # 2. sinh drizzle/NNNN_<ten>.sql (không cần kết nối DB)
npm run db:migrate                              # 3. áp dụng vào MySQL (chạy lại nhiều lần không sao)
```

Không sửa tay file migration đã áp dụng; muốn đổi thì sửa schema và sinh migration mới. Drizzle ghi lại các migration đã chạy trong bảng `__drizzle_migrations`.

## Quan hệ

```
doc_types 1──n templates n──1 categories
                 │1
                 ├──n template_previews   (xoá mẫu → xoá preview theo, CASCADE)
                 └──n documents           (mẫu đã có tài liệu thì không xoá được)
```

## Bảng

**`doc_types`** — loại tài liệu

| Cột | Kiểu | Ràng buộc |
|---|---|---|
| `code` | VARCHAR(10) | PK — `docx`, `pptx`, sau này `xlsx` |
| `name` | VARCHAR(100) | NOT NULL — `Văn bản` |
| `extension` | VARCHAR(10) | NOT NULL — `docx` |

**`categories`**

| Cột | Kiểu | Ràng buộc |
|---|---|---|
| `id` | VARCHAR(100) | PK, slug — `hanh-chinh` |
| `name` | VARCHAR(100) | NOT NULL, UNIQUE (không phân biệt hoa thường / dấu) |
| `description` | VARCHAR(500) | NOT NULL DEFAULT '' |

**`templates`**

| Cột | Kiểu | Ràng buộc |
|---|---|---|
| `id` | VARCHAR(100) | PK, slug — `hop-dong-lao-dong` |
| `doc_type_code` | VARCHAR(10) | NOT NULL, FK → `doc_types.code` |
| `category_id` | VARCHAR(100) | NOT NULL, FK → `categories.id` |
| `name` | VARCHAR(200) | NOT NULL |
| `description` | VARCHAR(1000) | NOT NULL DEFAULT '' |
| `file_path` | VARCHAR(500) | NOT NULL, UNIQUE — tương đối với `STORAGE_ROOT` |
| `created_at` | TIMESTAMP | DEFAULT now() |
| `updated_at` | TIMESTAMP | DEFAULT now(), tự cập nhật khi sửa dòng |

Index `idx_templates_type_category (doc_type_code, category_id)`.

**`template_previews`** — ảnh slide (pptx) hoặc trang (docx); `position = 1` là thumbnail

| Cột | Kiểu | Ràng buộc |
|---|---|---|
| `template_id` | VARCHAR(100) | FK → `templates.id` ON DELETE CASCADE |
| `position` | INT | NOT NULL, CHECK ≥ 1 |
| `image_path` | VARCHAR(500) | NOT NULL |

PK `(template_id, position)`.

**`documents`** — tài liệu tạo từ mẫu; file là bản sao độc lập

| Cột | Kiểu | Ràng buộc |
|---|---|---|
| `id` | CHAR(36) | PK — `crypto.randomUUID()` |
| `template_id` | VARCHAR(100) | NOT NULL, FK → `templates.id` (chặn xoá mẫu) |
| `title` | VARCHAR(200) | NOT NULL, CHECK độ dài ≥ 1 |
| `file_path` | VARCHAR(500) | NOT NULL, UNIQUE |
| `created_at`, `updated_at` | TIMESTAMP | như `templates` |

SQL: [0000_init_schema.sql](../server/drizzle/0000_init_schema.sql) (tạo bảng), [0001_drop_content_html.sql](../server/drizzle/0001_drop_content_html.sql) (bỏ cột `content_html` khi chuyển sang sửa thẳng file DOCX bằng docx-editor).

## Quyết định thiết kế

| Quyết định | Lý do | Phương án đã loại |
|---|---|---|
| Drizzle ORM + drizzle-kit | Schema viết bằng TypeScript, `db:generate` sinh migration SQL từ thay đổi schema; query có kiểu; nhẹ, không cần engine riêng | Prisma: nặng, có engine binary; viết SQL tay: không tự sinh migration |
| Collation `utf8mb4_0900_ai_ci` | Không phân biệt hoa thường và dấu, coi `đ` = `d`: `LIKE '%hop dong%'` khớp `Hợp đồng`, `hđlđ` khớp `HĐLĐ`; `ORDER BY name` xếp `Đào tạo` trước `Hành chính`. Không cần hàm hay cột phụ | `utf8mb4_unicode_ci`, `utf8mb4_vi_0900_ai_ci`: coi `đ` ≠ `d`; cột `search_text` |
| Phiên MySQL chạy UTC (`SET time_zone = '+00:00'` khi mở kết nối) | Drizzle đọc `TIMESTAMP` như giờ UTC; phiên theo giờ máy (+07) làm lệch 7 tiếng (đã gặp khi kiểm tra) | Để mặc định `SYSTEM` |
| Một bảng `templates` cho mọi loại, phân biệt bằng `doc_type_code` | Hai loại cùng trường; một API, một component UI | Bảng riêng mỗi loại |
| Bảng tra cứu `doc_types` | Thêm xlsx = 1 INSERT (+ 1 dòng MIME trong code) | ENUM: đổi giá trị phải ALTER TABLE |
| MIME không lưu DB, map theo `extension` trong `storage.ts` | Bảng gọn; MIME của định dạng Office không đổi | Cột `mime_type` |
| Thumbnail = `template_previews` position 1 | Đề bắt buộc mẫu có thumbnail; không cần cột riêng | Cột `thumbnail_path` |
| `templates.id` là slug | Ổn định khi seed lại, upsert theo id | Số tự tăng |
| `documents.id` là UUID | Chưa có đăng nhập; id khó đoán, không dò được tài liệu người khác | Số tự tăng |
| File trên đĩa, DB lưu `file_path` tương đối | Stream được, DB nhẹ, dễ chuyển S3; server tự ghép đường dẫn → chặn path traversal | BLOB trong DB |
| `documents` không có cột loại, lấy qua `templates` | Tránh dư thừa; `template_id NOT NULL` + FK chặn xoá mẫu đang có tài liệu, nên luôn JOIN ra được loại | `type_code` + `ON DELETE SET NULL` |
| Độc lập với mẫu gốc nằm ở **file** | Tài liệu là bản sao riêng; mẫu cập nhật file sau này thì tài liệu cũ không đổi | — |
| Nội dung tài liệu chỉ nằm ở **file .docx**, không lưu bản HTML (cột `content_html` đã bỏ ở migration `0001_drop_content_html`) | Editor (docx-editor) sửa thẳng trên DOCX ở trình duyệt và gửi lại nguyên file; không chuyển qua lại HTML nên không mất định dạng. `updated_at` = lần lưu gần nhất, bằng `created_at` khi chưa sửa | Lưu HTML trong `content_html` rồi sinh lại DOCX ở server (mất định dạng khi chuyển đổi) |
| Độ dài VARCHAR giới hạn sẵn | MySQL strict mode từ chối dữ liệu quá dài (`Data too long`) thay vì cắt ngầm | TEXT cho mọi cột |

Cố ý bỏ qua: bảng người dùng / phân quyền (ngoài phạm vi, sau thêm `owner_id`), tag, lịch sử phiên bản tài liệu, xoá mềm, checksum lưu DB (test tự tính SHA-256 trước/sau).

## Truy vấn chính (Drizzle)

```ts
// Danh sách mẫu + thumbnail: lọc loại, danh mục, từ khoá (escape % _ \ trong q)
db.select({ id: templates.id, name: templates.name, description: templates.description,
            categoryId: categories.id, categoryName: categories.name, thumbnailPath: templatePreviews.imagePath })
  .from(templates)
  .innerJoin(categories, eq(categories.id, templates.categoryId))
  .leftJoin(templatePreviews, and(eq(templatePreviews.templateId, templates.id), eq(templatePreviews.position, 1)))
  .where(and(
    eq(templates.docTypeCode, type),
    category ? eq(templates.categoryId, category) : undefined,
    q ? or(like(templates.name, `%${q}%`), like(templates.description, `%${q}%`)) : undefined,
  ))
  .orderBy(asc(templates.name));

// Danh mục có mẫu của một loại, kèm số lượng
db.select({ id: categories.id, name: categories.name, description: categories.description, total: count() })
  .from(categories)
  .innerJoin(templates, and(eq(templates.categoryId, categories.id), eq(templates.docTypeCode, type)))
  .groupBy(categories.id)
  .orderBy(asc(categories.name));

// Tài liệu kèm loại (lấy qua mẫu)
db.select({ ...getTableColumns(documents), docTypeCode: templates.docTypeCode, extension: docTypes.extension })
  .from(documents)
  .innerJoin(templates, eq(templates.id, documents.templateId))
  .innerJoin(docTypes, eq(docTypes.code, templates.docTypeCode))
  .where(eq(documents.id, id));
```

## Thư mục lưu trữ

```
server/storage/
├── templates/manifest.json            # nguồn khai báo loại / danh mục / mẫu, seed upsert khi khởi động
├── templates/{docx|pptx}/{id}.{ext}   # file mẫu, chỉ đọc lúc runtime
├── previews/{id}/{n}.png              # n = 1 là thumbnail
└── documents/{user}/{uuid}.{ext}      # bản sao người dùng tạo (gitignore); chưa có đăng nhập → user = DEFAULT_USER_ID (demo)
```

Seed (`src/db/seed.ts`) đọc `manifest.json`: upsert `doc_types`, `categories`, `templates` (`file_path = templates/{type}/{id}.{ext}`), rồi thay `template_previews` bằng các ảnh `previews/{id}/{n}.png` có trên đĩa. Mẫu bị bỏ khỏi manifest vẫn giữ trong DB (có thể đang có tài liệu tham chiếu). File mẫu và ảnh do `scripts/samples.py` dựng từ `server/source/`.

Thư mục `{user}` chỉ nằm trong `documents.file_path`, chưa có cột chủ sở hữu; khi thêm đăng nhập thì thêm `owner_id`.
