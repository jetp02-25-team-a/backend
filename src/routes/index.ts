// 統一匯出所有 routes
// export * from './jwt';

import express from "express";
import tripRoutes from "./trip";
import expenseRoutes from "./expense";
import packingRoutes from "./packing";

const router = express.Router();

// 🧭 行程
router.use("/trip", tripRoutes);

// 💰 記帳
router.use("/expense", expenseRoutes);

// 🎒 行李
router.use("/packing", packingRoutes);

export default router;
