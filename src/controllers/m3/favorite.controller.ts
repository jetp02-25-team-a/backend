import type { Request, Response } from "express";
import { asyncWrapper, sendSuccess, ApiError } from "../../lib";
import { favoriteService } from "../../services/m3";

export const getFavoritesAcc = asyncWrapper(
  async (req: Request, res: Response) => {
    const userId = req.user?.user_id;

    if (!userId) {
      throw new ApiError("用戶驗證失敗，請重新登入", 401);
    }

    const favoriteAccList = await favoriteService.getFavorites(userId);

    sendSuccess(res, {
      favoriteAccList: favoriteAccList,
      count: favoriteAccList.length,
    });
  }
);

export const toggleFavoriteAcc = asyncWrapper(
  async (req: Request, res: Response) => {
    const userId = req.user?.user_id;
    const accId = parseInt(req.params.accId, 10);

    if (!userId) {
      throw new ApiError("用戶驗證失敗，請重新登入", 401);
    }

    if (isNaN(accId)) {
      throw new ApiError("住宿 ID 格式錯誤，必須為數字", 400);
    }

    const isAdded = await favoriteService.toggleFavorite(userId, accId);

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
