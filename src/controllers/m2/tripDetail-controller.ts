// src/controllers/m2/tripDetail-controller.ts
import type { Request, Response, NextFunction } from "express";
import {
  getTripDetailsByDayService,
  getTripDetailsAllByTripIdService,
  createTripDetailService,
  updateTripDetailService,
  deleteTripDetailService,
  batchUpdateOrderService,
} from "../../services/m2/tripDetail-service";
import { findTripByIdService } from "../../services/m2/trip-service";
import {
  tripIdSchema,
  tripDetailDayQuerySchema,
  tripDetailCreateSchema,
  tripDetailIdSchema,
  tripDetailUpdateSchema,
  batchUpdateOrderSchema,
} from "../../schemas/m2/tripDetail-schema";
import { PrismaClient } from "../../generated/prisma";

const prisma = new PrismaClient();

/** GET /api/m2/plan/:tripId/detail?day=YYYY-MM-DD */
export const getTripPlanDetailsByDay = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { tripId } = tripIdSchema.parse(req.params);
    const { day } = tripDetailDayQuerySchema.parse(req.query);

    const details = await getTripDetailsByDayService(tripId, day);
    res.json({ success: true, data: details });
  } catch (error) {
    next(error);
  }
};

/** GET /api/m2/plan/:tripId/detail-all */
export const getTripPlanDetailsAll = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { tripId } = tripIdSchema.parse(req.params);

    // 同時獲取 trip 和 details
    const [trip, details] = await Promise.all([
      findTripByIdService(tripId), // 獲取行程主檔
      getTripDetailsAllByTripIdService(tripId), // 獲取行程明細
    ]);

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    // 回傳符合前端期望的格式
    res.json({
      success: true,
      data: {
        trip: {
          id: trip.id,
          title: trip.title,
          type: trip.type || "",
          startDate: trip.startDate.toISOString().split("T")[0],
          endDate: trip.endDate.toISOString().split("T")[0],
          destination: trip.Destination?.name || trip.destination || "",
          destinationName: trip.Destination?.name || null,
        },
        details: details,
      },
    });
  } catch (error) {
    next(error);
  }
};

/** POST /api/m2/plan/:tripId/detail */
export const createTripDetail = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { tripId } = tripIdSchema.parse(req.params);
    const data = tripDetailCreateSchema.parse(req.body);

    const userId = req.user?.user_id;
    if (!userId) throw new Error("未登入");

    const detail = await createTripDetailService(tripId, data, userId);

    res.status(201).json({ success: true, data: detail });
  } catch (error) {
    next(error);
  }
};

/** PUT /api/m2/plan/detail/:id */
export const updateTripPlanDetail = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = tripDetailIdSchema.parse(req.params);
    const data = tripDetailUpdateSchema.parse(req.body);

    const updated = await updateTripDetailService(id, data);
    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

/** DELETE /api/m2/plan/detail/:id */
export const deleteTripPlanDetail = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = tripDetailIdSchema.parse(req.params);

    await deleteTripDetailService(id);
    res.json({ success: true, message: "Deleted successfully" });
  } catch (error) {
    next(error);
  }
};

/** PUT /api/m2/plan/:tripId/details/order - 批量更新 order */
export const batchUpdateOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { tripId } = tripIdSchema.parse(req.params);
    const { updates } = batchUpdateOrderSchema.parse(req.body);

    // 驗證所有 detail 都屬於該 trip
    const detailIds = updates.map((u) => u.id);
    const existingDetails = await prisma.tripPlanDetail.findMany({
      where: {
        id: { in: detailIds },
        TripPlanId: tripId,
      },
      select: { id: true },
    });

    if (existingDetails.length !== detailIds.length) {
      return res.status(400).json({
        success: false,
        message: "部分 detail 不存在或不属于該行程",
      });
    }

    const updated = await batchUpdateOrderService(updates);

    res.json({
      success: true,
      data: updated,
      message: `成功更新 ${updated.length} 筆排序`,
    });
  } catch (error) {
    next(error);
  }
};
