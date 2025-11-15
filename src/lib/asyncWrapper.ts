import type { Request, Response, NextFunction } from "express";

// 定義異步控制器函式類型
type AsyncFn = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<any>;

// 捕獲 Controller 中的異步錯誤，並自動傳遞給全域錯誤處理器
export const asyncWrapper =
  (fn: AsyncFn) => (req: Request, res: Response, next: NextFunction) => {
    // 執行 Controller 函數，並捕獲它拋出的任何錯誤 (包括拋出的 ApiError)
    Promise.resolve(fn(req, res, next)).catch(next);
  };
