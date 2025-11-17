import type { Request, Response, NextFunction } from "express";
import {
  findAccommodationById,
  findAccommodationsList,
  findAccommodationsBySearch,
  findPopularAccommodations,
  findHighRatedAccommodations,
  getReviewsByAccommodationId,
  addReviewToAccommodation,
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

export const listAccommodationReviews = asyncWrapper(
  async (req: Request, res: Response) => {
    const accommodationIdString = req.params.id;
    const pageString = req.query.page as string | undefined;
    const limitString = req.query.limit as string | undefined; // 接收 limit 參數

    // 1. 驗證 ID 格式
    const accommodationId = parseInt(accommodationIdString, 10);
    if (isNaN(accommodationId) || accommodationId <= 0) {
      throw new BadRequestError("無效的住宿 ID 格式，ID 必須是正整數。");
    }

    // 2. 驗證分頁參數
    const page = parseInt(pageString ?? "1", 10);
    const limit = limitString ? parseInt(limitString, 10) : undefined; // 轉換 limit，如果不存在則為 undefined

    if (
      isNaN(page) ||
      page <= 0 ||
      (limit !== undefined && (isNaN(limit) || limit <= 0))
    ) {
      throw new BadRequestError("無效的分頁參數 (page/limit)，必須是正整數。");
    }

    // 3. 呼叫 Service 獲取分頁評論數據，並傳遞 limit
    const reviewsResult = await getReviewsByAccommodationId(
      accommodationId,
      page,
      limit // 傳遞 limit 給 Service
    );

    // 4. 標準化成功回應
    sendSuccess(res, {
      ...reviewsResult, // 包含 data, page, total, lastPage 等所有分頁資訊
      // message:
      //   reviewsResult.data.length === 0 ? "沒有更多評論了。" : "成功載入評論。",
    });
  }
);

export const addAccommodationReviews = asyncWrapper(
  async (req: Request, res: Response) => {
    const accommodationId = parseInt(req.params.id, 10);
    if (isNaN(accommodationId) || accommodationId <= 0) {
      throw new BadRequestError("無效的住宿 ID 格式。");
    }

    const { content, rating } = req.body;
    const userId = req.user?.user_id; // 假設 auth middleware 已經把 user 放到 req

    if (!userId) {
      throw new BadRequestError("必須登入才能撰寫評論。");
    }
    if (!content || typeof content !== "string") {
      throw new BadRequestError("評論內容不可為空。");
    }

    const ratingNumber = parseInt(rating, 10);

    if (isNaN(ratingNumber) || ratingNumber < 1 || ratingNumber > 5) {
      throw new BadRequestError("評分必須是 1 到 5 的數字。");
    }

    const newReview = await addReviewToAccommodation(accommodationId, {
      content,
      rating: ratingNumber,
      userId,
    });

    sendSuccess(res, {
      ...newReview,
    });
  }
);
