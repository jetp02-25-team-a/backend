import type { Request, Response, NextFunction } from "express";

import {
  findTripsByUserService,
  findTripByIdService,
  createTripService,
  updateTripService,
  deleteTripService,
  searchTripsService,
} from "../../services/m2/trip-service";

import {
  tripIdSchema,
  tripUserIdSchema,
  tripCreateSchema,
  tripUpdateSchema,
} from "../../schemas/m2/trip-schema";

/**
 * GET /api/m2/plan/user/:userId
 * 取得使用者所有行程
 */
export const getTripsByUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId } = tripUserIdSchema.parse(req.params);

    const trips = await findTripsByUserService(userId);

    res.json(trips);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/m2/plan/:id
 * 取得單筆行程
 */
export const getTripById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = tripIdSchema.parse(req.params);

    const trip = await findTripByIdService(id);

    if (!trip) return res.status(404).json({ message: "Trip not found" });

    res.json(trip);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/m2/trip
 * 新增行程
 */
export const createTrip = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // 從 JWT token 中獲取 userId（更安全，防止用戶偽造）
    const userId = req.user?.user_id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "需要登入才能建立行程",
      });
    }

    // 從 req.body 中獲取其他資料，並添加從 JWT 獲取的 userId
    const bodyData = {
      ...req.body,
      userId: userId, // 從 JWT 中獲取，而不是從客戶端
    };

    const data = tripCreateSchema.parse(bodyData);

    const trip = await createTripService(data);

    res.status(201).json({ success: true, data: trip });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/m2/plan/:id
 * 更新行程
 */
export const updateTrip = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = tripIdSchema.parse(req.params);
    const data = tripUpdateSchema.parse(req.body);

    const updated = await updateTripService(id, data);

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/m2/plan/:id
 * 刪除行程
 */
export const deleteTrip = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = tripIdSchema.parse(req.params);

    await deleteTripService(id);

    res.json({ message: "Deleted successfully" });
  } catch (error) {
    next(error);
  }
};

export const searchTrips = async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.userId);

    const { area, startDate, endDate } = req.query;

    if (!userId || Number.isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid userId",
      });
    }

    const trips = await searchTripsService(userId, {
      area: area ? String(area) : undefined,
      startDate: startDate ? String(startDate) : undefined,
      endDate: endDate ? String(endDate) : undefined,
    });

    return res.json({
      success: true,
      data: trips,
    });
  } catch (error) {
    console.error("❌ searchTrips Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
