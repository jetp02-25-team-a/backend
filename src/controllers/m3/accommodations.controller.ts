import type { Request, Response, NextFunction } from "express";
import {
  findAllAccommodations,
  findAccommodationById,
  findAccommodationsList,
  searchAccommodations,
} from "../../services/m3";
import {
  accommodationQuerySchema,
  accommodationIdSchema,
} from "../../schemas/m3";
import type { SortType } from "../../interfaces/m3";

export const getAccommodations = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const query = accommodationQuerySchema.parse(req.query);
    const accommodations = await findAllAccommodations(query);
    res.json(accommodations);
  } catch (error) {
    next(error);
  }
};

export const getAccommodationById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = accommodationIdSchema.parse(req.params);
    const accommodation = await findAccommodationById(id);
    if (!accommodation) return res.status(404).json({ message: "Not found" });
    res.json(accommodation);
  } catch (error) {
    next(error);
  }
};

// 顯示卡片用
export const getAccommodationList = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const sort = req.query.sort as SortType | undefined;

    const accommodations = await findAccommodationsList(sort);
    res.json(accommodations);
  } catch (error) {
    next(error);
  }
};

// 搜尋結果列表用
export const getAccommodationSearch = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      keyword,
      city,
      boundingBox,
      checkInDate,
      checkOutDate,
      guestCount,
      sort,
      direction,
      cursor,
      limit,
      accommodationAmenities,
      roomTypeAmenities,
      favorites,
      userId,
    } = req.query;
    console.log(req.query);
    const hasUserInputDate =
      typeof checkInDate === "string" &&
      typeof checkOutDate === "string" &&
      checkInDate.trim() !== "" &&
      checkOutDate.trim() !== "";

    const result = await searchAccommodations({
      keyword: keyword as string,
      city: city as string,
      boundingBox: boundingBox ? JSON.parse(boundingBox as string) : undefined,
      checkInDate: hasUserInputDate ? (checkInDate as string) : undefined,
      checkOutDate: hasUserInputDate ? (checkOutDate as string) : undefined,
      guestCount: guestCount ? parseInt(guestCount as string) : undefined,
      sort: sort as any,
      direction: (direction as "asc" | "desc") ?? "desc",
      cursor: cursor as string,
      limit: limit ? parseInt(limit as string) : 10,
      hasUserInputDate,
      accommodationAmenities: accommodationAmenities
        ? (accommodationAmenities as string).split(",")
        : undefined,
      roomTypeAmenities: roomTypeAmenities
        ? (roomTypeAmenities as string).split(",")
        : undefined,
      favorites: favorites === "true",
      userId: userId ? parseInt(userId as string, 10) : undefined,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
};
