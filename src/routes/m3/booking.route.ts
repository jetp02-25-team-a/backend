import { Router } from "express";
import { m3RequireAuth } from "../../middleware";
import {
  getAccommodationWeeklyInventories,
  getRoomTypeWeeklyInventories,
  createBooking,
  getBookingById,
  updateBooking,
  cancelBooking,
  getAllUserBookings,
} from "../../controllers/m3";

const router = Router();

/**
 * 查庫存 API
 * - 依住宿查一週內所有房型庫存
 * - 依房型查今天起一週內庫存
 */
router.get(
  "/accommodations/:id/weekly-inventories",
  getAccommodationWeeklyInventories
);
router.get("/room-type/:id/weekly-inventories", getRoomTypeWeeklyInventories);

/**
 * 訂單 API
 * - 查看訂單列表
 * - 建立訂單
 * - 查詢訂單
 * - 編輯訂單
 * - 取消訂單
 */
router.get("/bookings", m3RequireAuth, getAllUserBookings);
router.post("/bookings", m3RequireAuth, createBooking);
router.get("/bookings/:id", m3RequireAuth, getBookingById);
router.patch("/bookings/:id", m3RequireAuth, updateBooking);
router.patch("/bookings/:id/cancel", m3RequireAuth, cancelBooking);

export default router;
