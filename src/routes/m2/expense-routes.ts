import { Router } from "express";
import {
  getExpenseList,
  getExpenseById,
  createExpense,
  updateExpense,
  deleteExpense,
} from "../../controllers/m2/expense-controller";

const router = Router();

// 取得某 Trip 的所有記帳
router.get("/trip/:tripId", getExpenseList);

// 取得單筆記帳
router.get("/:id", getExpenseById);

// 新增記帳
router.post("/", createExpense);

// 更新記帳
router.put("/:id", updateExpense);

// 刪除記帳
router.delete("/:id", deleteExpense);

export default router;
