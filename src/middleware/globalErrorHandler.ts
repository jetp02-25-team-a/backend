import type { Request, Response, NextFunction } from "express";
import { ApiError } from "../lib"; // 假設匯入您的 ApiError

export const globalErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // 1. 處理自定義 ApiError (可預期的應用錯誤)
  if (err instanceof ApiError && err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      code: err.statusCode,
      message: err.message,
    });
  }

  // 2. 處理 JWT 相關錯誤 (如果沒有專門的 JWT 錯誤處理器)
  if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    return res.status(401).json({
      success: false,
      code: 401,
      message: "Token 無效或已過期，請重新登入。",
    });
  }

  // 3. 處理未預期的伺服器錯誤 (致命錯誤)
  console.error("❌ FATAL: 未預期伺服器錯誤:", err);

  // 安全回傳 500 錯誤，不暴露內部細節
  return res.status(500).json({
    success: false,
    code: 500,
    message: "內部伺服器錯誤，請稍後再試。",
  });
};
