// src/schemas/m2/trip-schema.ts
import { z } from "zod";

// ------- 基本 ID -------
export const tripIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});

// ------- 依 userId 查詢 -------
export const tripUserIdSchema = z.object({
  userId: z.coerce.number().int().positive(),
});

// ------- 新增行程 -------
export const tripCreateSchema = z.object({
  userId: z.number().int().positive(),
  title: z.string().min(1),
  type: z.string().optional(), // 旅遊類型（獨旅/家族/朋友）
  destinationId: z.number().optional().nullable(), // City
  startDate: z.string(),
  endDate: z.string(),
  url: z.string().optional().default(""),
});

// ------- 更新行程 -------
export const tripUpdateSchema = z.object({
  title: z.string().optional(),
  type: z.string().optional(),
  destinationId: z.number().optional().nullable(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  url: z.string().optional(),
});
