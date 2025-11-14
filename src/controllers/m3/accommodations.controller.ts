import type { Request, Response, NextFunction } from "express";
import {
  findAccommodationById,
  findAccommodationsList,
  findAccommodationsBySearch,
  findPopularAccommodations,
  findHighRatedAccommodations,
} from "../../services/m3";

import {
  asyncWrapper,
  BadRequestError,
  sendSuccess,
  NotFoundError,
} from "../../lib";

// ++++++++++++++++++++++++++++++

export const listAccommodations = asyncWrapper(
  async (req: Request, res: Response) => {
    const accommodations = await findAccommodationsList();
    sendSuccess(res, accommodations);
  }
);

// 熱門列表
export const listPopularAccommodations = asyncWrapper(
  async (req: Request, res: Response) => {
    const accommodations = await findPopularAccommodations();
    sendSuccess(res, accommodations);
  }
);

// 高星列表
export const listHighRatedAccommodations = asyncWrapper(
  async (req: Request, res: Response) => {
    const accommodations = await findHighRatedAccommodations();
    sendSuccess(res, accommodations);
  }
);

// 搜尋列表
export const searchAccommodations = asyncWrapper(
  async (req: Request, res: Response) => {
    const params = {
      keyword: req.query.keyword as string,
      city: req.query.city as string,
      boundingBox: req.query.boundingBox
        ? JSON.parse(req.query.boundingBox as string)
        : undefined,
      checkInDate: req.query.checkInDate as string,
      checkOutDate: req.query.checkOutDate as string,
      guestCount: req.query.guestCount
        ? parseInt(req.query.guestCount as string)
        : undefined,
      cursor: req.query.cursor as string,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
      hasUserInputDate: !!(req.query.checkInDate && req.query.checkOutDate),
      accommodationAmenities: req.query.accommodationAmenities
        ? (req.query.accommodationAmenities as string).split(",")
        : undefined,
      roomTypeAmenities: req.query.roomTypeAmenities
        ? (req.query.roomTypeAmenities as string).split(",")
        : undefined,
      favorites: req.query.favorites === "true",
      userId: req.query.userId
        ? parseInt(req.query.userId as string, 10)
        : undefined,
    };

    const result = await findAccommodationsBySearch(params);
    sendSuccess(res, result);
  }
);

export const getAccommodationById = asyncWrapper(
  async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id) || id <= 0) {
      // 假設你有一個 BadRequestError 類型
      throw new BadRequestError("無效的住宿 ID 格式，ID 必須是正整數。");
    }

    const accommodation = await findAccommodationById(id);
    if (!accommodation) {
      throw new NotFoundError("住宿不存在");
    }

    sendSuccess(res, accommodation);
  }
);
