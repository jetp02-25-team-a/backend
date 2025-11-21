// src/controllers/m2/packing-controller.ts
import type { Request, Response, NextFunction } from "express";

import {
  getPackingItemsService,
  createPackingItemService,
  updatePackingItemService,
  deletePackingItemService,
} from "../../services/m2/packing-service";

import {
  packingTripIdSchema,
  packingCreateSchema,
  packingUpdateSchema,
  packingIdSchema,
} from "../../schemas/m2/packing-schema";

/**
 * GET /api/m2/packing/:tripId
 * 取得行李列表
 */
export const getPackingList = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { tripId } = packingTripIdSchema.parse(req.params);

    const items = await getPackingItemsService(tripId);

    res.json(items);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/m2/packing
 * 新增行李項目
 */
export const createPackingItem = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const data = packingCreateSchema.parse(req.body);

    // 如果沒有提供 userId，嘗試從 JWT 取得
    if (!data.userId && req.user?.user_id) {
      data.userId = req.user.user_id;
    }

    // 確保 isChecked 是 boolean
    if (data.isChecked === undefined) {
      data.isChecked = false;
    } else {
      data.isChecked = Boolean(data.isChecked);
    }

    const item = await createPackingItemService(data);

    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/m2/packing/:id
 * 更新行李項目
 */
export const updatePackingItem = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = packingIdSchema.parse(req.params);
    const data = packingUpdateSchema.parse(req.body);

    // 確保 isChecked 是 boolean（如果提供）
    if (data.isChecked !== undefined) {
      data.isChecked = Boolean(data.isChecked);
    }

    const item = await updatePackingItemService(id, data);

    res.json(item);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/m2/packing/:id
 * 刪除行李項目
 */
export const deletePackingItem = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = packingIdSchema.parse(req.params);

    await deletePackingItemService(id);

    res.json({ message: "Deleted successfully" });
  } catch (error) {
    next(error);
  }
};
