import axios from 'axios';

export type ApiResponse<T> = {
  code: number;
  message: string;
  data: T;
};

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const http = axios.create({
  baseURL: '/api',
  timeout: 15000,
});

http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response) {
      const status = error.response.status;
      const body = error.response.data as Partial<ApiResponse<null>> | undefined;

      let message = body?.message;
      if (!message) {
        message = status >= 500 ? 'Không kết nối được máy chủ, vui lòng thử lại sau' : 'Có lỗi xảy ra, vui lòng thử lại';
      }
      return Promise.reject(new ApiError(status, message));
    }

    return Promise.reject(new ApiError(0, 'Không kết nối được máy chủ'));
  },
);
