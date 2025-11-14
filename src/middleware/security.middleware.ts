// middleware/security.middleware.ts

import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import type { JwtPayload } from "../interfaces"; // 確保路徑正確
// 從 lib 匯入標準錯誤類
import { ApiError, ForbiddenError } from "../lib";

// JWT 設定
const JWT_SECRET: string =
  process.env.JWT_SECRET || "your-secret-key-change-in-production";

// ******************************************************
// 擴展 Request 型別以包含 JWT 用戶資訊 (建議放在 types/express.d.ts)
// 為了程式碼完整性，將其放在此處，但建議單獨放置。
// declare global {
//     namespace Express {
//         interface Request {
//             user?: JwtPayload;
//         }
//     }
// }
// ******************************************************

/**
 * 1. JWT 解析 middleware - 可選性驗證
 * 失敗時不會報錯，只是不設定 req.user
 */
export const jwtParseMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authorization = req.headers.authorization;

  if (authorization && authorization.startsWith("Bearer ")) {
    const token = authorization.substring(7);

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
      req.user = decoded;
    } catch (error) {
      console.warn(
        "JWT 驗證失敗 (無效或過期):",
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }

  next();
};

// ----------------------------------------------------
// 現有或共享的認證/授權中間件
// ----------------------------------------------------

/** * 2. 舊有的 requireAuth (保留以不影響其他檔案)
 */
export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    // 使用 ApiError 拋出，讓 globalErrorHandler 處理
    return next(new ApiError("您需要登入才能執行此操作", 401));
  }

  next();
};

/** * 3. 舊有的 requireSelfOrAdmin (保留以不影響其他檔案)
 */
export const requireSelfOrAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const tokenUserId = req.user?.user_id;
  const routeId = parseInt(req.params.id, 10);

  if (isNaN(routeId)) {
    return next(new ApiError("路由 ID 格式錯誤，必須為數字", 400));
  }

  if (tokenUserId && tokenUserId === routeId) {
    return next();
  }

  // if (req.user?.role === 'admin') {
  //     return next();
  // }

  // 使用標準 403 響應格式
  return res.status(403).json({
    success: false,
    code: 403,
    message: "您沒有權限訪問或修改此資源 (Forbidden)",
  });
};

// ----------------------------------------------------
// 專用於您的業務邏輯的中間件
// ----------------------------------------------------

/**
 * 4. [專用] 授權檢查：只允許角色為 'editor' 或資源擁有者 (self) 進行操作
 */
export const requireEditorOrSelf = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // 假設 req.user 已經被 requireUserLoggedIn 檢查過
  if (!req.user) {
    // 為了安全，如果沒有 req.user 則拋出 401
    return next(new ApiError("缺少登入資訊或權限不足", 401));
  }

  const tokenUserId = req.user.user_id;
  const routeId = parseInt(req.params.id, 10);
  // const userRole = req.user.role;

  if (isNaN(routeId)) {
    return next(new ApiError("路由 ID 格式錯誤", 400));
  }

  // 1. 檢查是否為自己的資料 (self)
  if (tokenUserId && tokenUserId === routeId) {
    return next();
  }

  // 2. 檢查是否為特定角色 (editor)
  // if (userRole === 'editor') {
  //     return next();
  // }

  // 3. 禁止訪問 - 拋出標準化的 403 錯誤
  return next(new ForbiddenError("權限不足：您必須是編輯者或資源擁有者"));
};
