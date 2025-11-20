// src/routes/m2/index.ts
import express from "express";
import { jwtParseMiddleware } from "../../middleware";

// 模組路由
import tripRoutes from "./trip-routes";
import tripDetailRoutes from "./tripDetail-routes";
import expenseRoutes from "./expense-routes";
import packingRoutes from "./packing-routes";
import destinationRoutes from "./destination-routes";

const router = express.Router();

// 可選 JWT（解析但不強制）
router.use(jwtParseMiddleware);

// 🧭 Trip 行程主檔
router.use("/trip", tripRoutes);

// 📅 TripDetail 行程明細（已含 /api/m2/plan/... 路徑）
router.use("/", tripDetailRoutes);

// 💰 記帳
router.use("/expense", expenseRoutes);

// 🎒 行李
router.use("/packing", packingRoutes);

// 🗺 目的地
router.use("/destinations", destinationRoutes);

export default router;
