// JWT 相關介面定義
import type { ApiResponse } from "./api.js";
import type { User } from "./model.js";

export interface JwtPayload {
  user_id: number;
  email: string;
  nickname: string | null;
}

export interface LoginSuccessResponse extends ApiResponse {
  success: true;
  data: {
    user: Omit<User, "password_hash">;
    token: string;
  };
}
