import { Router } from "express";
import { z } from "zod";
import {
  getPlaceExpanded,
  searchPlacesExpanded,
  // createReview,
} from "../services/placeSelect";
import commentsRouter from "./place-comment";
import rankRouter from "./place-ranks";
import { computeRatingInfo } from "../utils/rating";

const router = Router();

/**
 * GET /places
 * 可選 query：type=food|spot、q=keyword、limit、offset
 */
router.get("/", async (req, res) => {
  const Query = z.object({
    type: z.enum(["food", "spot"]).optional(),
    q: z.string().optional(),
    limit: z.coerce.number().min(1).max(100).default(20),
    offset: z.coerce.number().min(0).default(0),
    photos: z.coerce.number().min(0).max(5).default(1),
  });

  const parsed = Query.safeParse(req.query);

  if (!parsed.success) {
    const errors = parsed.error.issues.map((e) => ({
      path: e.path.join("."),
      message: e.message,
    }));
    return res.status(400).json({ success: false, error: errors });
  }
  const { type, q, limit, offset, photos } = parsed.data;

  const rows = await searchPlacesExpanded({
    type,
    keyword: q,
    limit,
    offset,
    photosPerPlace: photos,
  });

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
