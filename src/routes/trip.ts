import express from "express";
import {
  createTripPlan,
  getAllTripPlans,
  getTripPlanById,
  updateTripPlan,
  deleteTripPlan,
} from "../services/trip-service";
import { createTripDetailsBatch } from "../services/tripDetail-servicee";
import { createExpenseBatch } from "../services/expense-service";

const router = express.Router();

// 行程 CRUD
router.post("/", createTripPlan);
router.get("/", getAllTripPlans);
router.get("/:id", getTripPlanById);
router.put("/:id", updateTripPlan);
router.delete("/:id", deleteTripPlan);

// 行程明細（TripPlanDetail）
router.post("/detail", createTripDetailsBatch);

// 支出資料（Expense）
router.post("/expense", createExpenseBatch);

export default router;
