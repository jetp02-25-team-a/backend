import { Router } from "express";
import { z } from "zod";
import { searchPlaces, suggestRegions } from "../services/search-bar";

const router = Router();

/** GET /search/places?q=關鍵字&limit=20&offset=0
 *  只比對 region / address（contains）
 */
router.get("/", async (req, res) => {
  const Query = z.object({
    q: z.string().min(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).default(0),
  });

  const parsed = Query.safeParse(req.query);
  if (!parsed.success) {
    const errors = parsed.error.issues.map((e) => ({
      path: e.path.join("."),
      message: e.message,
    }));
    return res.status(400).json({ success: false, error: errors });
  }

  const { q, limit, offset } = parsed.data;
  const rows = await searchPlaces(q, limit, offset);
  res.json({ success: true, data: rows, pagination: { limit, offset } });
});

/** GET /search/region-suggest?q=新  → ["新店區","新莊區",...]
 *  只建議 region，不混入 address
 */
router.get("/region", async (req, res) => {
  const Query = z.object({
    q: z.string().min(1),
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

  const list = await suggestRegions(parsed.data.q, parsed.data.take);
  res.json({ success: true, data: list });
});

export default router;
