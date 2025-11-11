import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import type { JwtPayload } from "../interfaces/index.js";

// JWT 設定
const JWT_SECRET: string =
  process.env.JWT_SECRET || "your-secret-key-change-in-production";

// 擴展 Request 型別以包含 JWT 用戶資訊
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * JWT 解析 middleware - 可選性驗證
 * 如果有提供 JWT token，則解析並掛載到 req.user 和 res.locals.user
 * 沒有 token 或 token 無效時不會報錯，只是不設定用戶資訊
 */
export const jwtParseMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authorization = req.headers.authorization;

  // 檢查是否有提供 Authorization header
  if (authorization && authorization.startsWith("Bearer ")) {
    const token = authorization.substring(7); // 移除 "Bearer " 前綴

    try {
      // 解析 JWT token
      const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
      // 將解析後的用戶資訊掛載到 req 和 res.locals
      req.user = decoded;
      res.locals.user = decoded;
      res.locals.isAuthenticated = true;
    } catch (error) {
      // JWT 無效或過期，但不報錯，只是不設定用戶資訊
      console.warn(
        "JWT 驗證失敗:",
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }

  // 確保 res.locals 有預設值
  if (!res.locals.user) {
    res.locals.user = null;
    res.locals.isAuthenticated = false;
  }

  next();
};

/**
 * 需要驗證的路由 middleware
 * 檢查 req.user 是否存在，沒有則返回 401 錯誤
 */
export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: "需要登入才能訪問此資源",
      message: "請提供有效的 JWT token",
    });
  }

  next();
};
