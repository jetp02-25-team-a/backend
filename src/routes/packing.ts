import express from "express";
import {
  getPackingItemsByTrip,
  addPackingItem,
  togglePackingItem,
  deletePackingItem,
} from "../services/packing-service";

const router = express.Router();

// 取得行李清單
router.get("/:tripId/packing", getPackingItemsByTrip);

// 新增項目
router.post("/:tripId/packing", addPackingItem);

// 勾選 / 取消勾選
router.patch("/packing/:id", togglePackingItem);

// 刪除項目
router.delete("/packing/:id", deletePackingItem);

export default router;
