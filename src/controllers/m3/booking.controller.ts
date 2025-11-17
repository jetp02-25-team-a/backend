import type { Request, Response } from "express";
import { asyncWrapper } from "../../lib";
import { BadRequestError } from "../../lib";
import { sendSuccess } from "../../lib";
import {
  getInventoriesByAccommodation,
  getInventoriesByRoomType,
  createBookingService,
  getBookingByIdService,
  updateBookingService,
  cancelBookingService,
} from "../../services/m3";

// 查住宿一週房型庫存
export const getAccommodationWeeklyInventories = asyncWrapper(
  async (req: Request, res: Response) => {
    const accommodationId = parseInt(req.params.id, 10);
    const { checkInDate } = req.query;

    if (isNaN(accommodationId) || !checkInDate) {
      throw new BadRequestError("住宿 ID 與入住日必填。");
    }

    const start = new Date(checkInDate as string);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);

    const inventories = await getInventoriesByAccommodation(
      accommodationId,
      start,
      end
    );
    sendSuccess(res, inventories);
  }
);

// 查房型一週庫存
export const getRoomTypeWeeklyInventories = asyncWrapper(
  async (req: Request, res: Response) => {
    const roomTypeId = parseInt(req.params.id, 10);
    if (isNaN(roomTypeId)) {
      throw new BadRequestError("房型 ID 必填。");
    }

    const start = new Date();
    const end = new Date(start);
    end.setDate(start.getDate() + 7);

    const inventories = await getInventoriesByRoomType(roomTypeId, start, end);
    sendSuccess(res, inventories);
  }
);

// 建立訂單
export const createBooking = asyncWrapper(
  async (req: Request, res: Response) => {
    const userId = req.user?.user_id;
    if (!userId) throw new BadRequestError("必須登入才能建立訂單。");

    const booking = await createBookingService(userId, req.body);
    sendSuccess(res, booking);
  }
);

// 查詢訂單
export const getBookingById = asyncWrapper(
  async (req: Request, res: Response) => {
    const bookingId = parseInt(req.params.id, 10);
    const userId = req.user?.user_id;
    if (!userId) throw new BadRequestError("必須登入才能查詢訂單。");

    const booking = await getBookingByIdService(bookingId, userId);
    sendSuccess(res, booking);
  }
);

// 編輯訂單
export const updateBooking = asyncWrapper(
  async (req: Request, res: Response) => {
    const bookingId = parseInt(req.params.id, 10);
    const userId = req.user?.user_id;
    if (!userId) throw new BadRequestError("必須登入才能編輯訂單。");

    const updated = await updateBookingService(bookingId, userId, req.body);
    sendSuccess(res, updated);
  }
);

// 取消訂單
export const cancelBooking = asyncWrapper(
  async (req: Request, res: Response) => {
    const bookingId = parseInt(req.params.id, 10);
    const userId = req.user?.user_id;
    if (!userId) throw new BadRequestError("必須登入才能取消訂單。");

    const cancelled = await cancelBookingService(bookingId, userId);
    sendSuccess(res, cancelled);
  }
);
