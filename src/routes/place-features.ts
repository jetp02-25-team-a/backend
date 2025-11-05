// src/routes/featured.router.ts
import { Router } from "express";
import { z } from "zod";
import { getFeatured } from "../services/featured";

const router = Router();

/** GET /places/featured?take=10  → { food: [...10], spot: [...10] } */
router.get("/", async (req, res) => {
  const Query = z.object({
    take: z.coerce.number().int().min(1).max(20).default(10),
  });

  const parsed = Query.safeParse(req.query);
  if (!parsed.success) {
    const errors = parsed.error.issues.map((e) => ({
      path: e.path.join("."),
      message: e.message,
    }));
    return res.status(400).json({ success: false, error: errors });
  }

  const data = await getFeatured(parsed.data.take);
  res.json({ success: true, data });
});

export default router;
