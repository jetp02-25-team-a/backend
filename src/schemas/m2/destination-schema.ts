// src/schemas/m2/destination-schema.ts
import { z } from "zod";

export const destinationIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});
