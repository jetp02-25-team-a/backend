// JWT 相關介面定義
import type { ApiResponse } from "./api.js";

export interface JwtPayload {
  user_id: number;
  email: string;
  nickname: string | null;
  avatar: string | null;
}

export interface LoginSuccessResponse extends ApiResponse {
  success: true;
  data: {
    user_id: number;
    email: string;
    nickname: string;
    avatar: string;
    token: string;
  };
}
