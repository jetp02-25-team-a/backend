// src/routes/m2/tripDetail-routes.ts
import { Router } from "express";
import {
  getTripPlanDetailsByDay,
  getTripPlanDetailsAll,
  createTripDetail,
  updateTripPlanDetail,
  deleteTripPlanDetail,
  batchUpdateOrder,
} from "../../controllers/m2/tripDetail-controller";
import { requireAuth } from "../../middleware";
import { z } from "zod";
import { tripIdSchema } from "../../schemas/m2/tripDetail-schema";

const router = Router();

// 讀取
router.get("/plan/:tripId/detail", getTripPlanDetailsByDay);
router.get("/plan/:tripId/detail-all", getTripPlanDetailsAll);

// 寫入要登入
router.post("/plan/:tripId/detail", requireAuth, createTripDetail);
router.put("/plan/detail/:id", requireAuth, updateTripPlanDetail);
router.delete("/plan/detail/:id", requireAuth, deleteTripPlanDetail);

// 批量更新 order 的 schema
export const batchUpdateOrderSchema = z.object({
  updates: z
    .array(
      z.object({
        id: z.number().int().positive(),
        order: z.number().int().nonnegative(),
      })
    )
    .min(1),
});

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

// 批量更新 order
router.put("/plan/:tripId/details/order", requireAuth, batchUpdateOrder);

export default router;
