import type { Request, Response } from "express";
import { asyncWrapper, sendSuccess, ApiError } from "../../lib";
import { favoriteService } from "../../services/m3";

export const getFavoritesAcc = asyncWrapper(
  async (req: Request, res: Response) => {
    // 1. 獲取用戶 ID (由 m3RequireUserLoggedIn 中間件設置)
    const userId = req.user?.user_id;

    // 理論上 m3RequireUserLoggedIn 會確保用戶存在，但此處再次檢查以確保程式碼健全
    if (!userId) {
      throw new ApiError("用戶驗證失敗，請重新登入", 401);
    }

    // 2. 調用服務獲取 ID 列表
    const favoriteIds = await favoriteService.getFavorites(userId);

    // 3. 回傳標準成功響應
    sendSuccess(res, {
      favoriteIds: favoriteIds,
      count: favoriteIds.length,
    });
  }
);

export const toggleFavoriteAcc = asyncWrapper(
  async (req: Request, res: Response) => {
    // 1. 獲取並驗證用戶 ID 和路徑參數
    const userId = req.user?.user_id;
    const accId = parseInt(req.params.accId, 10);

    if (!userId) {
      throw new ApiError("用戶驗證失敗，請重新登入", 401);
    }

    // 驗證 accId 格式 (如果中間件沒有做)
    if (isNaN(accId)) {
      throw new ApiError("住宿 ID 格式錯誤，必須為數字", 400);
    }

    // 2. 調用服務執行切換邏輯 (Service 會處理 NotFoundError 拋出)
    const isAdded = await favoriteService.toggleFavorite(userId, accId);

    // 3. 回傳標準成功響應 (根據操作結果返回不同的狀態碼)
    const statusCode = isAdded ? 201 : 200;

    sendSuccess(
      res,
      {
        message: isAdded ? "已成功新增到收藏" : "已從收藏中移除",
        isFavorite: isAdded,
      },
      statusCode
    );
  }
);
