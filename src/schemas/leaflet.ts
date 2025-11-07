// src/schemas/map.ts
import { z } from "zod";

export const bboxQuerySchema = z.object({
  bbox: z
    .string()
    .regex(/^[-\d.]+,[-\d.]+,[-\d.]+,[-\d.]+$/)
    .transform((s) => s.split(",").map(Number))
    .optional(),
  type: z.enum(["food", "spot"]).optional(),
  q: z.string().trim().optional(),
  limit: z.coerce.number().min(1).max(1000).default(200),
  geojson: z.coerce.boolean().optional(),
});

export const nearbyQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().min(10).max(50000).default(1500), // 10m ~ 50km
  type: z.enum(["food", "spot"]).optional(),
});
