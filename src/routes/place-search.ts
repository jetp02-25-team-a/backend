import { Router } from "express";
import { z } from "zod";
import { searchPlaces, suggestRegions } from "../services/search-bar";

const router = Router();

/** GET /search/places?q=關鍵字&limit=20&offset=0
 *  只比對 region / address（contains）
 */
router.get("/", async (req, res) => {
  const Query = z.object({
    address: z.string().optional(),
    region: z.string().optional(),
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

  const { address, region, limit, offset } = parsed.data;
  // 三者都沒給時提示錯誤
  if (!address && !region) {
    return res
      .status(400)
      .json({ success: false, message: "請至少輸入 address 或 region" });
  }
  const rows = await searchPlaces(address, region, limit, offset);
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
