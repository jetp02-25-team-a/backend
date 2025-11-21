// src/schemas/m2/tripDetail-schema.ts
import { z } from "zod";

export const tripIdSchema = z.object({
  tripId: z.string().transform(Number),
});

// detail ID（更新/刪除）
export const tripDetailIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});

// Query：查某天
export const tripDetailDayQuerySchema = z.object({
  day: z.string().min(1),
});

// 行程明細類型
export const tripDetailTypeSchema = z.enum(["spot", "hotel", "food", "custom"]);

// 建立 TripDetail
export const tripDetailCreateSchema = z.object({
  type: tripDetailTypeSchema,
  referenceId: z.number().optional(), // spot/hotel 才會用到
  title: z.string().optional(),
  address: z.string().optional(),
  url: z.string().optional(),
  startDate: z.string(),
  endDate: z.string(),
  stayHour: z.number().optional(),
  stayMin: z.number().optional(),
  order: z.number().optional(),
});

// 更新 TripDetail
export const tripDetailUpdateSchema = z.object({
  title: z.string().optional(),
  address: z.string().optional(),
  url: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  stayHour: z.number().optional(),
  stayMin: z.number().optional(),
  order: z.number().optional(),
});

// 批量更新 order 的 schema
export const batchUpdateOrderSchema = z.object({
  updates: z
    .array(
      z.object({
        id: z.number().int().positive(),
        order: z.number().int().nonnegative(),
      })
    )
    .min(1),
});
