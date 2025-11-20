// src/schemas/m2/expense-schema.ts
import { z } from "zod";

// Expense 主鍵
export const expenseIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});

// 依行程查詢
export const expenseTripIdSchema = z.object({
  tripId: z.coerce.number().int().positive(),
});

// 新增消費
export const expenseCreateSchema = z.object({
  tripPlanId: z.number().int().positive(),
  userId: z.number().int().positive(),
  title: z.string().min(1),
  amount: z.number().min(0),
  typeId: z.number().optional().nullable(),
  area: z.string().optional().nullable(),
  expenseDate: z.string().optional(),
});

// 更新消費
export const expenseUpdateSchema = z.object({
  title: z.string().optional(),
  amount: z.number().optional(),
  typeId: z.number().optional().nullable(),
  area: z.string().optional().nullable(),
  expenseDate: z.string().optional(),
});
