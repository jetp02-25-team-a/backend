import express from "express";
import {
  getExpensesByTrip,
  createExpense,
  deleteExpense,
} from "../services/expense-service";

const router = express.Router();

// 取得支出
router.get("/:tripId/expenses", getExpensesByTrip);

// 新增支出
router.post("/:tripId/expenses", createExpense);

// 刪除支出
router.delete("/expenses/:id", deleteExpense);

export default router;
