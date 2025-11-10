import { Router } from "express";
import { z } from "zod";
import {
  getPlaceExpanded,
  searchPlacesExpanded,
  // createReview,
} from "../services/placeSelect";
import commentsRouter from "./place-comment";
import rankRouter from "./place-ranks";

const router = Router();

/**
 * GET /places
 * Query:
 *  - type=food|spot
 *  - q=keyword
 *  - limit
 *  - offset  (或 page，兩者擇一；若兩者皆有，以 offset 優先)
 *  - page
 *  - sort=rank_desc|rank_asc（暫時先解析，等 service 支援後再串）
 *  - photos=每筆要帶幾張照片
 */

router.get("/", async (req, res) => {
  const Query = z.object({
    type: z.enum(["food", "spot"]).optional(),
    q: z.string().optional(),
    // 新增 page/sort；保留原本 limit/offset（兼容舊邏輯）
    page: z.coerce.number().int().gte(1).optional(),
    sort: z.enum(["rank_desc", "rank_asc"]).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).optional(),
    photos: z.coerce.number().int().min(0).max(5).default(1),
  });

  const parsed = Query.safeParse(req.query);

  if (!parsed.success) {
    const errors = parsed.error.issues.map((e) => ({
      path: e.path.join("."),
      message: e.message,
    }));
    return res.status(400).json({ success: false, error: errors });
  }

  const { type, q, page, sort, limit, offset, photos } = parsed.data;

  // 1) 將 page 轉成 offset；若同時提供 offset 與 page，offset 優先
  const effectiveOffset =
    typeof offset === "number"
      ? offset
      : typeof page === "number"
      ? (page - 1) * limit
      : 0;

  // 2) keyword 正規化（空字串視為 undefined）
  const keyword = q && q.trim().length > 0 ? q.trim() : undefined;

  // 3) 先只把分頁參數餵給 service（不動 service 簽名）
  //    sort 先解析下來但暫時不傳，下一步你要去改 service 來支援它
  const rows = await searchPlacesExpanded({
    type,
    keyword,
    limit,
    offset: effectiveOffset,
    photosPerPlace: photos,
    sort,
  } as any);

  // 可選：把實際採用的分頁資訊/排序寫到回應 header，方便前端除錯
  res.setHeader("X-Limit", String(limit));
  res.setHeader("X-Offset", String(effectiveOffset));
  if (sort) res.setHeader("X-Sort", sort);

  res.json({ success: true, data: rows });
});

/**
 * GET /places/:id
 * 回傳：place、photos、reviews、rating(平均/分布/數量)
 */
/** GET /places/:id : 單筆詳情（含多張照片、統計、最新留言） */
router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res
      .status(400)
      .json({ success: false, error: { message: "Invalid id" } });
  }

  const data = await getPlaceExpanded(id, { photoLimit: 12, commentLimit: 20 });
  if (!data)
    return res
      .status(404)
      .json({ success: false, error: { message: "Place not found" } });

  res.json({ success: true, data });
});

/**
 * POST /places/:id/reviews
 * body: { user_name, rating(1~5), content, user_avatar? }
 */
const ReviewSchema = z.object({
  user_name: z.string().min(1).max(50),
  rating: z.number().int().min(1).max(5),
  content: z.string().min(1),
  user_avatar: z
    .string()
    .url()
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

// router.post("/:id/reviews", async (req, res) => {
//   const id = Number(req.params.id);
//   if (Number.isNaN(id))
//     return res
//       .status(400)
//       .json({ success: false, error: { message: "Invalid id" } });

//   const parsed = ReviewSchema.safeParse({
//     ...req.body,
//     rating: Number(req.body?.rating),
//   });
//   if (!parsed.success) {
//     return res.status(400).json({
//       success: false,
//       error: { message: "Invalid input", issues: parsed.error.issues },
//     });
//   }

//   const created = await createReview(id, parsed.data);
//   res.status(201).json({ success: true, data: created });
// });
// 🟢 把 comments 子路由掛進來（仍是 /places/:id/comments）

router.use("/:id/comments", commentsRouter);
router.use("/:id/ranks", rankRouter);

export default router;
