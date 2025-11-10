import type { Request, Response } from "express";
import {
  getFavorites,
  addFavorite,
  deleteFavorite,
  toggleFavorite,
} from "../../services/m3/favorite.service";

import { successResponse, errorResponse } from "../../utils/m3";

export const getFavoritesAcc = async (req: Request, res: Response) => {
  const userId = Number(req.user.id);
  const favorites = await getFavorites(userId);
  res.json(successResponse(favorites));
};

export const addFavoriteAcc = async (req: Request, res: Response) => {
  const userId = Number(req.user.id);
  const accId = Number(req.params.accId);
  const fav = await addFavorite(userId, accId);
  res.json(successResponse(fav, "已加入收藏"));
};

export const deleteFavoriteAcc = async (req: Request, res: Response) => {
  const userId = Number(req.user.id);
  const accId = Number(req.params.accId);
  try {
    await deleteFavorite(userId, accId);
    res.json(successResponse(null, "收藏已移除"));
  } catch {
    res.status(404).json(errorResponse("收藏不存在", 404));
  }
};

export const toggleFavoriteAcc = async (req: Request, res: Response) => {
  const userId = Number(req.user.id);
  const accId = Number(req.params.accId);
  const result = await toggleFavorite(userId, accId);
  res.json(
    successResponse(result, result.toggled ? "已加入收藏" : "已取消收藏")
  );
};
