import { Router } from "express";
import { z } from "zod";
import {
  getPlaceById,
  getPhotos,
  searchPlacesWithPhotos,
  // createReview,
} from "../services/placeSelect";
import { computeRatingInfo } from "../utils/rating";

const router = Router();

/**
 * GET /places
 * 可選 query：type=food|spot、q=keyword、limit、offset
 */
router.get("/", async (req, res) => {
  const id = Number(req.params.id);
  const type = (req.query.type as "food" | "spot" | undefined) || undefined;
  const q = (req.query.q as string | undefined) || undefined;
  const limit = Math.min(Number(req.query.limit ?? 20), 100);
  const offset = Number(req.query.offset ?? 0);
  const photosPerPlace = Math.min(Number(req.query.photos ?? 1), 5); // 可透過 query 控制

  const rows = await searchPlacesWithPhotos(
    type,
    q,
    limit,
    offset,
    photosPerPlace
  );

  res.json({ success: true, data: rows });
});

/**
 * GET /places/:id
 * 回傳：place、photos、reviews、rating(平均/分布/數量)
 */
router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id))
    return res
      .status(400)
      .json({ success: false, error: { message: "Invalid id" } });

  const place = await getPlaceById(id);
  if (!place)
    return res
      .status(404)
      .json({ success: false, error: { message: "Place not found" } });

  const [photos] = await Promise.all([getPhotos(id)]);
  // const rating = computeRatingInfo(reviews);

  res.json({
    success: true,
    data: {
      place,
      photos,

      // rating,
    },
  });
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

export default router;
