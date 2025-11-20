// src/schemas/m2/packing-schema.ts
import { z } from "zod";

// Packing ID
export const packingIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});

// 查詢行李 by TripPlan
export const packingTripIdSchema = z.object({
  tripId: z.coerce.number().int().positive(),
});

// 新增
export const packingCreateSchema = z.object({
  TripPlanId: z.number().int().positive(),
  userId: z.number().int().positive(),
  name: z.string().min(1),
  isChecked: z.boolean().optional(),
  templateId: z.number().optional().nullable(),
});

// 更新
export const packingUpdateSchema = z.object({
  name: z.string().optional(),
  isChecked: z.boolean().optional(),
  templateId: z.number().optional().nullable(),
});
