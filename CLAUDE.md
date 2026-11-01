# CLAUDE.md — Thư viện mẫu tài liệu

Bài test Fullstack, hạn nộp **15:00 ngày 02/11/2026**. Hai sản phẩm dùng chung một kiến trúc:

- **P1 Văn bản**: thư viện mẫu DOCX → tìm, lọc, xem trước → tạo tài liệu mới → sửa trong editor tích hợp → lưu / tải .docx.
- **P2 Trình chiếu**: thư viện bộ mẫu PPTX → tìm, lọc, xem trước từng slide → tạo bản sao độc lập → tải .pptx (chưa có editor slide, đề cho phép).

Ưu tiên: chạy được thật, rõ ràng, dễ bảo trì > nhiều tính năng. **Tạo tài liệu không bao giờ được sửa file mẫu gốc.**

## Nguồn sự thật

| File | Nội dung |
|---|---|
| `docs/de-bai.md` | Đề bài gốc — yêu cầu chức năng, kỹ thuật, bàn giao |
| `docs/features.xlsx` | 1 sheet `Tính năng`: task API / UI dự kiến làm (Bài 1, Bài 2) + trạng thái |
| `docs/database.md` | Schema, quyết định thiết kế, truy vấn chính |
| `README.md` | Hướng dẫn cài đặt, kiến trúc, API (tài liệu bàn giao) |

## Lệnh

```bash
cd server && npm run dev      # Fastify :3000 (tsx watch)
cd server && npm run build    # tsc (strict)
cd server && npm run db:generate -- --name <ten>   # sinh migration từ src/db/schema.ts
cd server && npm run db:migrate                    # tạo DB nếu chưa có + áp dụng migration
cd server && npm test                              # node:test, DB template_library_test + storage tạm
cd server && npm run samples                       # source/ → storage/templates + previews (cần uv + LibreOffice)
cd client && npm run dev      # Vite :5173, proxy /api → :3000
cd client && npm run build    # tsc + vite build
uv run scripts/features.py list [pending|in_progress|done|blocked]
uv run scripts/features.py show 3
uv run scripts/features.py set 3 done "ghi chú"
uv run scripts/features.py edit 3 "Tính năng" "tên mới"
uv run scripts/features.py add "Bài 1|Bài 2" "<API: ... | UI: ...>"
```

## Quy trình làm tính năng (bắt buộc)

`features.xlsx` cột: `ID · Bài test · Tính năng · Trạng thái · Ghi chú · Cập nhật`. Mỗi dòng là một task chính, tên tiếng Anh, tiền tố `API:` (một endpoint) hoặc `UI:` (một màn / thao tác). ID = thứ tự làm: API Bài 1 → UI Bài 1 → UI Bài 2. API dùng chung hai bài nằm ở Bài 1 (lọc theo `type`); Bài 2 dùng lại.

Excel không có cột tiêu chí: tiêu chí của task = yêu cầu tương ứng trong `docs/de-bai.md` + rule kiến trúc + bảng API mục tiêu bên dưới.

1. **Xác định task**: `list` tìm ID, `show <ID>`. Yêu cầu không khớp dòng nào → báo người dùng, được đồng ý thì `add` rồi mới làm.
2. **Đánh dấu bắt đầu**: `set <ID> in_progress` trước khi sửa code.
3. **Làm đúng phạm vi** dòng đó theo rule kiến trúc, không làm thêm. Hạ tầng và dữ liệu (error handler, storage helper, khung test, bộ mẫu DOCX / PPTX + ảnh preview, seed từ manifest) không có dòng riêng: làm trong task đầu tiên cần nó (thường là task 1).
4. **Kiểm chứng**: `npm run build` cả hai phía không lỗi; `npm test` xanh (task `API:` phải có test); chạy thử luồng thật qua API hoặc trình duyệt. Test bắt buộc phải có trước khi nộp: tìm `hop dong` ra `Hợp đồng…`; tạo tài liệu xong SHA-256 file mẫu gốc không đổi; chặn path traversal; DOCX lưu xong vẫn còn heading, đậm, danh sách, bảng.
5. **Cập nhật trạng thái**:
   - Đạt đủ tiêu chí và đã kiểm chứng → `set <ID> done "<file chính · cách đã kiểm>"`.
   - Chưa xong → giữ `in_progress`, ghi chú phần còn thiếu.
   - Bị chặn → `set <ID> blocked "<lý do>"`.
6. Người dùng nói "làm tiếp" → chọn dòng `pending` có ID nhỏ nhất; báo ID trước khi làm.
7. Chỉ sửa `features.xlsx` qua `scripts/features.py` (giữ định dạng). Script báo lỗi ghi file → nhắc người dùng đóng file trong Excel.
8. Tính năng đụng tới API hoặc schema → cập nhật README (mục API) / `docs/database.md` trong cùng lượt.
9. Cuối lượt báo: ID đã làm, trạng thái mới, phần chưa kiểm chứng.

## Kiến trúc mã

```
Trình duyệt ─► React (Vite :5173) ─/api/*─► Fastify (:3000) ─► MySQL
                                              └─► server/storage/ (file mẫu, preview, tài liệu)
```

### Backend (Fastify + TypeScript strict)

- `src/app.ts` `buildApp()`: tạo Fastify, error handler chung, đăng ký các module. `src/index.ts` chỉ `listen`. Test gọi `buildApp()` + `app.inject()`, không mở cổng.
- **Module theo domain** trong `src/modules/<domain>/`, domain: `templates`, `categories`, `documents`. Mỗi module gồm `<domain>.routes.ts`, `.controller.ts`, `.service.ts`, `.repository.ts` (domain số ít: `template.service.ts`).
- Tầng trong module: **Routes → Controller → Service → Repository → MySQL**.
  - Routes: khai URL + JSON schema cho params / query / body; export một plugin Fastify để `app.ts` đăng ký.
  - Controller: chỉ HTTP (đọc request, gọi service, chọn status code). Không truy vấn DB, không fs.
  - Service: nghiệp vụ, điều phối DB + storage, transaction. Không đụng `request` / `reply`.
  - Repository: chỉ truy vấn DB qua `db` (Drizzle). Không chứa nghiệp vụ.
  - Module dùng lại module khác qua service / repository của nó; không import routes / controller của nhau.
- Mọi input validate bằng JSON schema của Fastify; giới hạn kích thước body cho route lưu nội dung.
- Response JSON luôn có dạng `{ "code", "message", "data" }` (gửi bằng `sendSuccess()` / `sendError()` trong `src/response.ts`): `code` = HTTP status dạng số (200, 201, 400, 404, 409, 413, 500, 503), `message` câu tiếng Việt cho người dùng, `data` dữ liệu (lỗi → `null`). `code` trong body luôn bằng HTTP status. Endpoint trả file (preview, file mẫu, tải xuống) trả nhị phân, không bọc.
- Lỗi: ném `new AppError(statusCode, message)`; error handler chung trả `sendError(reply, status, message)` (400 validate, 404 không tìm thấy, 500 lỗi lạ). Không lộ stack hay đường dẫn file.
- Viết code cho fresher đọc được: tên biến / hàm rõ nghĩa, kiểu dữ liệu khai rõ (`type TemplateRow = {...}`) thay vì `ReturnType<...>`, mỗi dòng một việc, comment tiếng Việt ngắn ở chỗ không hiển nhiên.
- `LIKE`: escape `%`, `_`, `\` trong từ khoá người dùng nhập.
- Khác biệt theo loại tài liệu (docx / pptx) rẽ nhánh theo `doc_type_code` trong service, một chỗ; thêm loại mới (vd. xlsx) = 1 dòng `doc_types` + MIME trong `storage.ts` + mẫu trong manifest.

### Cơ sở dữ liệu (MySQL + Drizzle ORM)

- **`server/src/db/schema.ts` là nguồn sự thật.** Đổi cấu trúc = sửa schema → `npm run db:generate -- --name <ten>` → `npm run db:migrate`. Commit cả file trong `server/drizzle/`. **Không sửa tay migration đã áp dụng**, không ALTER trực tiếp trên DB.
- Kết nối dùng chung `db` từ `src/db/index.ts`; cấu hình lấy từ `src/config.ts`, đọc `server/.env` (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`; mẫu ở `server/.env.example`, `.env` không commit).
- Database collation `utf8mb4_0900_ai_ci`: `LIKE` và `ORDER BY` tự bỏ qua hoa thường và dấu tiếng Việt (`đ` = `d`). Tìm kiếm dùng `like()` thẳng trên cột, **không** viết hàm bỏ dấu, không thêm cột phụ.
- Phiên MySQL chạy UTC (đặt sẵn trong `src/db/index.ts`); không đổi, nếu không thời gian lệch 7 tiếng.
- Query bằng Drizzle query builder; raw SQL chỉ qua `sql\`\`` có tham số, không nối chuỗi từ input.
- `templates.id` là slug; `documents.id` = `crypto.randomUUID()`.
- Loại của tài liệu lấy qua `documents.template_id → templates.doc_type_code`; không thêm cột loại vào `documents`.
- Ghi nhiều bảng, hoặc ghi file + DB → bọc trong `db.transaction(async (tx) => ...)`.

### Lưu trữ và template

- Mọi file nằm dưới `STORAGE_ROOT` (`server/storage`); DB chỉ lưu `file_path` / `image_path` **tương đối**. **Mọi đường dẫn đi qua storage helper** `src/storage.ts` (resolve + kiểm tra nằm trong root). Không bao giờ nhận đường dẫn file từ client.
- MIME không lưu DB: map theo `extension` đặt một chỗ trong `storage.ts`.
- Thumbnail = ảnh `template_previews` position 1 (DOCX: ảnh trang đầu, PPTX: slide đầu). Không có preview → UI hiện icon theo loại.
- `storage/templates/` **chỉ đọc lúc runtime**: không ghi, không mở ở chế độ write.
- Tạo tài liệu = `copyFile(src, dst, COPYFILE_EXCL)` vào `storage/documents/{user}/{uuid}.{ext}` (chưa có đăng nhập: `user` = `DEFAULT_USER_ID`, mặc định `demo`), cùng transaction với `INSERT documents`; lỗi thì xoá file dở.
- Thêm / cập nhật mẫu = file gốc vào `server/source/` + entry trong `storage/templates/manifest.json` → `npm run samples` (copy vào `storage/templates/`, render `storage/previews/`) → seed upsert khi khởi động (`src/db/seed.ts`). Không hardcode mẫu trong code hay UI.
- Sửa DOCX bằng **docx-editor** (`@docx-editor.dev/react`, chạy ở trình duyệt): client tải file qua `/download`, editor sửa thẳng trên DOCX, `PUT /api/documents/:id` gửi lại nguyên file (Content-Type DOCX). Server kiểm tra là .docx, ghi file tạm rồi `rename`, cập nhật `updated_at` (= lần lưu gần nhất; bằng `created_at` khi chưa sửa). Không lưu HTML, không chuyển đổi định dạng ở server.
- Mẫu tài liệu do script trong repo tự sinh (`server/scripts/`); không dùng tài liệu có bản quyền hay dữ liệu của công ty khác.

### Frontend (React + Vite)

- UI dùng **Tailwind CSS v4** (`@tailwindcss/vite`, `src/index.css` chỉ có `@import "tailwindcss"`). Gọi API bằng **axios**.
- **Chia theo module nghiệp vụ** trong `src/modules/<module>/` (`templates`, `documents`, giống backend). Mỗi module tự chứa đủ tầng của nó; luồng: thao tác ở view → hook → application → api → backend, dữ liệu đi ngược lại. Mỗi tầng chỉ gọi tầng ngay dưới:
  - `api/`: mỗi resource một file `<resource>.api.ts` dùng axios instance chung `src/shared/api/http.ts` (baseURL `/api`, đổi lỗi thành `ApiError`), trả phần `data` của `{ code, message, data }`. Kiểu dữ liệu trong `<module>.types.ts`.
  - `application/`: logic nghiệp vụ, TypeScript thuần, **không import React**. Vd. bộ lọc ↔ URL, carousel, chuẩn bị nhãn hiển thị.
  - `hooks/`: state React (`useAsyncData` cho đang tải / lỗi / dữ liệu), gọi application, **không import api** (trừ `import type`). Trả về dữ liệu đã sẵn để hiển thị + các hàm thao tác.
  - `components/`, `pages/`: chỉ render + gọi callback; **không gọi api / application, không tự tính trạng thái** (vd. hook trả `status: 'loading' | 'error' | 'empty' | 'not-found' | 'ready'`, view chỉ `switch`).
  - Module dùng module khác qua **hook** của nó (vd. `templates/pages` dùng `documents/hooks/useCreateDocument`); không import thẳng api / application của module khác.
- `src/shared/`: chỉ chứa thứ dùng chung nhiều module (axios instance, hook chung `useAsyncData` / `useDebouncedValue` / `useDialog`, component chung `SearchBox` / `StatusView` / `Toast` / `icons`); **không import từ `modules/`**. Thứ chỉ một module dùng thì để trong module đó.
- `src/app/`: khung ứng dụng (`menu.tsx`, `fullScreenPages.tsx`, `useNavigation`, `DashboardLayout`, `Sidebar`). Mỗi mục menu khai `path`, `label`, `icon`, `page`; `App.tsx` render `page` của mục đang chọn trong dashboard. Màn cần toàn màn hình (vd. sửa tài liệu `/documents/:id`) khai trong `fullScreenPages.tsx` (`pattern`, `page`) và render **không có** `DashboardLayout`.
- Trang sửa DOCX: thanh tiêu đề của docx-editor chỉ có nút quay lại (`renderTitleBarLeft`) + ô tên tài liệu (`onTitleChange`); không thêm header riêng, không nút trạng thái lưu, không hiện thời gian lưu. Menu File khai lại trong `DocxEditorPane` (`menu.children`, `preset={false}`): Open · Save · Export › Word (.docx) (tải xuống, lưu trước) · Page setup. Không đưa vào mục cần converter chưa cài (PDF, Markdown, Print). Tự lưu trong `useOpenedDocument`: 2 giây sau lần gõ cuối; quay lại / tải xuống thì lưu xong mới đi; ẩn tab thì lưu; `beforeunload` gửi bản chuẩn bị sẵn (0,4 giây sau mỗi lần gõ) bằng `fetch keepalive`, chỉ hỏi "Rời trang?" khi còn phần chưa gửi được (trình duyệt không chờ được lời gọi async khi refresh).
- CSS của thư viện ngoài (vd. docx-editor) import vào **cascade layer** riêng nằm dưới `utilities` của Tailwind (`src/index.css`: `@layer theme, base, docx-editor, components, utilities;`; file `docx-editor.css`: `@import "…" layer(docx-editor);`). Không import thẳng: CSS không layer của thư viện (vd. `.hidden{display:none}`) sẽ đè class responsive của Tailwind trên toàn app.
- Frontend **không viết comment** trong code (kể cả `vite.config.ts`, `.env.example`); đặt tên biến / hàm / type cho tự giải thích. Giải thích nếu cần thì ghi vào README.
- Khác biệt theo loại tài liệu khai một chỗ trong `src/modules/templates/application/doc-types.ts` (`code`, `label`, `pageUnit`, tiêu đề / mô tả / chữ gợi ý ô tìm kiếm); không rải `if (type === 'docx')` khắp nơi.
- Dashboard giao diện sáng (tông tím `violet`), menu trái **3 mục** trong `src/app/menu.tsx`: Mẫu tài liệu (`/templates/docx`) và Mẫu trình chiếu (`/templates/pptx`) render `TemplateLibraryPage` với `docType`; Quản lý tài liệu (`/documents`) render `DocumentListPage` (module `documents`). Loại mẫu lấy theo menu (path), không để trên query. Lưới mẫu 4 cột từ `lg`.
- Trạng thái màn hình (từ khoá, danh mục, mẫu đang xem trước) nằm trên URL; dùng History API + `URLSearchParams`, chưa cần thư viện router.
- Chỉ hiển thị dữ liệu có thật / dùng được (số mẫu, danh mục từ API). Không thêm số liệu giả, nút trang trí hay mục menu chưa có chức năng.
- `client/.env` (`API_PROXY_TARGET`) cho Vite proxy `/api` và `/files`; code client chỉ gọi đường dẫn tương đối.
- Mọi màn có dữ liệu xử lý đủ: đang tải, lỗi (có nút Thử lại), rỗng / không tìm thấy — dùng chung một component trạng thái.
- Không hardcode danh sách mẫu hay danh mục ở client.
- Accessibility cơ bản: `alt` cho thumbnail, nút có nhãn, modal dùng `<dialog>` đóng được bằng Esc.

### Chung

- Ưu tiên stdlib / tính năng native trước thư viện. Thêm thư viện → ghi tên, phiên bản, license vào README (mục Thư viện bên thứ ba). Thư viện AGPL hoặc license không rõ: hỏi người dùng trước.
- Test: `node:test` + `app.inject()`, `test/setup.ts` đổi `DB_NAME` sang `TEST_DB_NAME` (mặc định `template_library_test`, migrate trước khi chạy) và `STORAGE_ROOT` tạm; không đụng dữ liệu thật.
- README phải ghi rõ có dùng AI (Claude Code) hỗ trợ lập trình.

## API mục tiêu

| Method | URL | Mục đích |
|---|---|---|
| GET | `/api/health` | Server + kết nối DB (đã có) |
| GET | `/api/templates?type=&q=&category=` | Danh sách, tìm kiếm, lọc |
| GET | `/api/categories?type=` | Danh mục kèm số lượng |
| GET | `/api/templates/:id` | Chi tiết + previews |
| GET | `/api/templates/:id/file` | Đọc file mẫu (xem trước DOCX) |
| POST | `/api/templates/:id/documents` | Tạo tài liệu từ mẫu (201) |
| GET | `/api/documents` | Danh sách tài liệu đã tạo |
| GET | `/api/documents/:id` | Metadata tài liệu |
| PUT | `/api/documents/:id` | Lưu file .docx từ editor (body là file) |
| GET | `/api/documents/:id/download` | Tải file |
| GET | `/files/previews/*` | Ảnh preview / thumbnail |

## Cấu trúc thư mục đích

```
server/src/
├── index.ts               # listen
├── app.ts                 # buildApp(): Fastify, error handler, đăng ký module
├── config.ts              # đọc server/.env: PORT, DB_*, STORAGE_ROOT, DEFAULT_USER_ID
├── errors.ts              # AppError(statusCode, message)
├── response.ts            # sendSuccess / sendError / sendFile
├── storage.ts             # STORAGE_ROOT, resolve file_path an toàn, map MIME
├── db/schema.ts           # cấu trúc DB (Drizzle) — nguồn sự thật
├── db/index.ts            # pool mysql2 + instance drizzle
├── db/migrate.ts          # tạo DB nếu thiếu + chạy migration
├── db/seed.ts             # upsert danh mục + mẫu từ manifest.json
└── modules/
    ├── templates/         # template.routes|controller|service|repository.ts
    ├── categories/        # category.*.ts
    └── documents/         # document.*.ts
server/scripts/            # sinh file mẫu DOCX / PPTX + ảnh preview
server/drizzle/            # migration SQL sinh tự động (commit)
server/source/             # file gốc dựng mẫu: docx/ có sẵn + docx|pptx tự sinh
server/storage/            # templates/ previews/ documents/{user}/
server/test/               # node:test
client/src/
├── App.tsx                # chọn page theo menu
├── app/                   # menu.tsx, fullScreenPages.tsx, useNavigation, DashboardLayout, Sidebar
├── shared/                # api/http.ts · navigation.ts · hooks/ (useAsyncData, useDebouncedValue, useDialog, useCurrentPath) · components/ (CardGrid, Thumbnail, ImageCarousel, FilterChips, SearchBox, StatusView, Toast, icons)
└── modules/
    ├── templates/         # thư viện mẫu cho cả 2 menu
    │   ├── api/           # template.api.ts, category.api.ts, template.types.ts
    │   ├── application/   # doc-types, library-filters, template.application, carousel
    │   ├── hooks/         # useTemplateLibrary, useTemplatePreview
    │   ├── components/    # TemplateGrid, TemplateCard, CategoryChips, TemplatePreviewDialog
    │   └── pages/         # TemplateLibraryPage
    └── documents/         # tài liệu tạo từ mẫu
        ├── api/           # document.api.ts, document.types.ts
        ├── application/   # document.application.ts (đường dẫn /documents/:id, nhãn trạng thái)
        ├── hooks/         # useCreateDocument, useDocumentList, useDocumentRoute, useOpenedDocument
        ├── components/    # DocumentGrid, DocumentCard, EditorTitleBar, DocumentDetailHeader, DocxEditorPane (tải lười) + docx-editor.css, SlidePreviewPane
        └── pages/         # DocumentListPage (menu Quản lý tài liệu), DocumentDetailPage (toàn màn hình /documents/:id)
docs/  de-bai.md  features.xlsx  database.md
scripts/features.py
```

Thư mục / file chưa có thì tạo khi tính năng đầu tiên cần; không dựng khung rỗng trước.

## Bàn giao (mục V đề bài)

Không nằm trong `features.xlsx`; kiểm trước khi nộp:

- README: kiến trúc, công nghệ, cài đặt + chạy thử, API (request / response / mã lỗi), cách lưu trữ và tạo bản sao, xử lý lỗi + kiểm thử, thư viện + license, khai báo dùng AI.
- `docs/database.md` khớp `schema.ts`.
- README mục **Trạng thái**: đã làm / chưa làm (lấy từ `features.xlsx`), giới hạn kỹ thuật (editor DOCX, chưa có editor PPTX) và hướng mở rộng (ONLYOFFICE / Collabora).
- Bộ mẫu thử nghiệm commit sẵn, chạy được không cần LibreOffice.
- **Người dùng tự làm**: đẩy git lên GitHub + cấp quyền người chấm, quay video demo. Không tự coi là xong khi chưa được xác nhận.
