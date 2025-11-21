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

const router = Router();

// 讀取
router.get("/plan/:tripId/detail", getTripPlanDetailsByDay);
router.get("/plan/:tripId/detail-all", getTripPlanDetailsAll);

// 寫入要登入
router.post("/plan/:tripId/detail", requireAuth, createTripDetail);
router.put("/plan/detail/:id", requireAuth, updateTripPlanDetail);
router.delete("/plan/detail/:id", requireAuth, deleteTripPlanDetail);

// 批量更新 order
router.put("/plan/:tripId/details/order", requireAuth, batchUpdateOrder);

export default router;
