# nguyenhoangnha-fullstack-test

Dự án chia 2 mã nguồn backend và frontend

| Thư mục   | Công nghệ                                   | Port |
|-----------|---------------------------------------------|---------------|
| `server/` | Fastify + TypeScript + MySQL (Drizzle ORM)  | 3000          |
| `client/` | React + Vite + TypeScript                   | 5173          |

## Kiến trúc

![Kiến trúc client và server](docs/architecture.png)
### Kiến trúc backend
```
Routes ──► Controller ──► Service ──► Repository ──► MySQL
```

| Tầng         | File                         | Việc của tầng                                          |
|--------------|------------------------------|--------------------------------------------------------|
| Routes       | `<feature>.routes.ts`         | Khai báo URL, valid data input               |
| Controller   | `<feature>.controller.ts`     | Nhận request, gọi service, trả response / status code  |
| Service      | `<feature>.service.ts`        | Xử lý nghiệp vụ     |
| Repository   | `<feature>.repository.ts`     | Truy vấn DB                            |


### Kiến trúc frontend

React + Tailwind CSS, API axios.

```
pages/ + components/ ──thao tác──► hooks/ ──► application/ ──► api/ (axios) ──► Proxy
```
| Tầng trong module | Việc của tầng |
|---|---|
| `api/` | Gọi HTTP bằng axios (`shared/api/http.ts`), trả phần `data` trong `{ code, message, data }`; kiểu dữ liệu ở `*.types.ts` |
| `application/` | Logic nghiệp vụ, TypeScript thuần (không React): bộ lọc ↔ URL, carousel, chuẩn bị nhãn hiển thị |
| `hooks/` | State React: đang tải / lỗi / dữ liệu, debounce tìm kiếm, phím mũi tên; gọi `application/`, không gọi `api/` |
| `components/`, `pages/` | Chỉ hiển thị (Tailwind) và gọi callback của hook; không gọi API, không chứa logic |

```
nguyenhoangnha-fullstack-test/
├── server/
│   ├── src/
│   │   ├── index.ts
│   │   ├── app.ts
│   │   ├── config.ts
│   │   ├── errors.ts
│   │   ├── response.ts
│   │   ├── openapi.ts
│   │   ├── storage.ts
│   │   ├── modules/
│   │   └── db/
│   │       ├── schema.ts
│   │       ├── index.ts
│   │       ├── migrate.ts
│   │       └── seed.ts
│   ├── source/
│   ├── scripts/samples.py
│   ├── storage/
│   ├── test/
│   ├── drizzle/
│   ├── drizzle.config.ts
│   └── package.json
├── client/
│   ├── src/
│   │   ├── app/
│   │   ├── modules/
│   │   │   ├── templates/
│   │   │   └── documents/
│   │   ├── shared/
│   │   ├── App.tsx
│   │   └── index.css
│   ├── .env.example
│   └── vite.config.ts
└── docs/
    ├── architecture.png
    ├── database.md
    ├── de-bai.md
    ├── erd.png
    └── features.xlsx
```

## Cài đặt và chạy

Mở **2 terminal** tại thư mục gốc của dự án.

**Terminal 1 – Backend**

```bash
cd server
npm install
cp .env.example .env # rồi sửa thông tin MySQL trong .env nếu cần
npm run db:migrate   # tạo database template_library nếu chưa có + tạo bảng
npm run dev          # khi khởi động tự seed mẫu từ storage/templates/manifest.json
```
**Terminal 2 – Frontend**

```bash
cd client
npm install
cp .env.example .env # đổi API_PROXY_TARGET nếu backend không chạy ở 127.0.0.1:3000
npm run dev
```
## Cơ sở dữ liệu

![Sơ đồ cơ sở dữ liệu](docs/erd.png)

Sau đó chạy lại `npm run db:migrate`.

## API

Tài liệu API (Swagger UI): http://localhost:5173/api/docs (qua Vite proxy) hoặc http://localhost:3000/api/docs · OpenAPI JSON: `/api/docs/json`.

## Kiểm thử

```bash
cd server
npm test
```
## Biến môi trường (server)

Khai trong `server/.env` (copy từ `server/.env.example`; `.env` không commit). Không có `.env` thì dùng giá trị mặc định. Biến đặt sẵn trong môi trường (vd. `DB_PASSWORD=x npm run dev`) được ưu tiên hơn `.env`.

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `PORT` | `3000` | Cổng của Fastify |
| `DB_HOST` | `127.0.0.1` | Máy MySQL |
| `DB_PORT` | `3306` | Cổng MySQL |
| `DB_USER` | `root` | User MySQL |
| `DB_PASSWORD` | (trống) | Mật khẩu MySQL |
| `DB_NAME` | `template_library` | Database của app |
| `TEST_DB_NAME` | `template_library_test` | Database cho `npm test` |
| `DEFAULT_USER_ID` | `demo` | Chủ tài liệu khi chưa có đăng nhập (`storage/documents/<user>/`) |
| `STORAGE_ROOT` | `server/storage` | Thư mục file mẫu, preview, tài liệu |

Client (`client/.env`, copy từ `client/.env.example`):

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `API_PROXY_TARGET` | `http://127.0.0.1:3000` | Địa chỉ backend; Vite chuyển tiếp `/api` và `/files` tới đây |

## Thư viện bên thứ ba

| Thư viện     | Dùng cho                      | Giấy phép  |
|--------------|-------------------------------|------------|
| fastify      | HTTP server                   | MIT        |
| @fastify/swagger 9.9 + @fastify/swagger-ui 6.1 | Sinh tài liệu OpenAPI từ JSON schema của routes, giao diện Swagger UI ở `/api/docs` | MIT |
| drizzle-orm  | ORM, query builder            | Apache-2.0 |
| drizzle-kit  | Sinh migration (dev)          | MIT        |
| mysql2       | Driver MySQL                  | MIT        |
| jszip 3.10 (dev) | Đọc .docx trong test | MIT hoặc GPL-3.0 (chọn MIT) |
| @docx-editor.dev/react + core 2.33 | Editor DOCX trong trình duyệt (chỉ dùng bản core, không dùng tính năng Pro) | Apache-2.0 |
## Ghi chú

Dự án có dùng AI (Claude Code) hỗ trợ lập trình.
