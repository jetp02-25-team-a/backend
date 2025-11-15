import type { Response } from "express";

export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode: number = 200
) {
  res.status(statusCode).json({
    success: true,
    data: data,
  });
}
