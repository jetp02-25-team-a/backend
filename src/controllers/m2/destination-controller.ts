import type { Request, Response, NextFunction } from "express";
import { getAllDestinationsService } from "../../services/m2/destination-service";

export const getAllDestinationsController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const cities = await getAllDestinationsService();
    res.json(cities);
  } catch (error) {
    next(error);
  }
};
