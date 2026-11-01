// Lỗi có kèm mã HTTP, dùng khi muốn báo lỗi cho client (404, 409...).
// Error handler trong app.ts sẽ đổi lỗi này thành response { code, message, data: null }.
export class AppError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}
