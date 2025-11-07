import { z } from "zod";

export const accommodationQuerySchema = z.object({
  city: z.string().optional(),
  type: z.string().optional(),
  keyword: z.string().optional(),
});

export const accommodationIdSchema = z.object({
  id: z.string().regex(/^\d+$/).transform(Number),
});
