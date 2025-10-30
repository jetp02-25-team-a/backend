// api 回應定義

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface ApiErrorResponse extends ApiResponse {
  success: false;
  error: string;
  details?: Array<{
    field: string;
    message: string;
  }>;
}
