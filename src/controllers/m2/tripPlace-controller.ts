import type { Request, Response, NextFunction } from "express";
import { addPlaceToTripService } from "../../services/m2/tripPlace-service";
import { tripIdSchema } from "../../schemas/m2/trip-schema";

export const addPlaceToTripController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { tripId } = tripIdSchema.parse(req.params);
    const { placeId } = req.body;
    const userId = req.user?.user_id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "未登入" });
    }

    const created = await addPlaceToTripService(tripId, placeId, userId);

    res.json({ success: true, data: created });
  } catch (error) {
    next(error);
  }
};
