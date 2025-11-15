import type { Request, Response } from "express";
import {
  getFavorites,
  addFavorite,
  deleteFavorite,
  toggleFavorite,
} from "../../services/m3/favorite.service";

import { successResponse, errorResponse } from "../../utils/m3";

export const getFavoritesAcc = async (req: Request, res: Response) => {
  const userId = Number(req.user!.user_id);
  try {
    const favorites = await getFavorites(userId);
    res.json(successResponse(favorites));
  } catch (error) {
    console.error("Error fetching favorites:", error);
    // 返回 500 伺服器錯誤，告訴客戶端操作失敗
    res.status(500).json(errorResponse("無法獲取收藏列表，請稍後再試", 500));
  }
};

export const addFavoriteAcc = async (req: Request, res: Response) => {
  const userId = Number(req.user!.user_id);
  const accId = parseInt(req.params.accId ?? "", 10);

  if (Number.isNaN(accId)) {
    return res.status(400).json(errorResponse("無效的住宿 ID", 400));
  }

  const fav = await addFavorite(userId, accId);
  res.json(successResponse(fav, "已加入收藏"));
};

export const deleteFavoriteAcc = async (req: Request, res: Response) => {
  const userId = Number(req.user!.user_id);
  const accId = parseInt(req.params.accId ?? "", 10);

  if (Number.isNaN(accId)) {
    return res.status(400).json(errorResponse("無效的住宿 ID", 400));
  }

  try {
    await deleteFavorite(userId, accId);
    res.json(successResponse(null, "收藏已移除"));
  } catch {
    res.status(404).json(errorResponse("收藏不存在", 404));
  }
};

export const toggleFavoriteAcc = async (req: Request, res: Response) => {
  const userId = Number(req.user!.user_id);
  const accId = parseInt(req.params.accId ?? "", 10);

  if (Number.isNaN(accId)) {
    return res.status(400).json(errorResponse("無效的住宿 ID", 400));
  }

  // 🌟 修正點：加入 try...catch 區塊來處理服務層錯誤
  try {
    const result = await toggleFavorite(userId, accId);
    res.json(
      successResponse(result, result.toggled ? "已加入收藏" : "已取消收藏")
    );
  } catch (error) {
    console.error("Error toggling favorite status:", error);
    // 雖然 500 是通用的伺服器錯誤，但如果服務層能提供更精確的錯誤類型
    // 這裡可以回傳更具體的錯誤碼 (例如 404 如果 accId 不存在)
    res
      .status(500)
      .json(errorResponse("收藏操作失敗，請檢查住宿 ID 或伺服器狀態", 500));
  }
};
