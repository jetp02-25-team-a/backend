// src/routes/m2/trip.routes.ts
import { Router } from "express";
import {
  getTripsByUser,
  getTripById,
  createTrip,
  updateTrip,
  deleteTrip,
  searchTrips,
} from "../../controllers/m2/trip-controller";
import { requireAuth } from "../../middleware";

const router = Router();

// 🔍 搜尋行程（area、日期區間）
router.get("/user/:userId/search", searchTrips);

/**
 * GET /api/m2/trip/user/:userId
 * 取得某使用者所有行程
 */
router.get("/user/:userId", getTripsByUser);

/**
 * GET /api/m2/trip/:id
 * 取得單筆行程
 */
router.get("/:id", getTripById);

/**
 * POST /api/m2/trip
 * 建立行程（需要登入）
 */
router.post("/", requireAuth, createTrip);

/**
 * PUT /api/m2/trip/:id
 * 更新行程
 */
router.put("/:id", updateTrip);

/**
 * DELETE /api/m2/trip/:id
 * 刪除行程
 */
router.delete("/:id", deleteTrip);

export default router;
