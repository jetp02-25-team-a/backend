// src/routes/ranks.router.ts
import { Router } from "express";
import { z } from "zod";
import {
  createRank,
  updateRank,
  deleteRank,
  getUserRankForPlace /* , upsertRank */,
} from "../services/rank";

const router = Router({ mergeParams: true });

/** POST /places/:id/ranks  建立評分（同一 userId 同一 place 建議只允許一筆） */
router.post("/", async (req, res) => {
  const placeId = Number(req.params.id);
  if (!Number.isInteger(placeId)) {
    return res
      .status(400)
      .json({
        success: false,
        error: [{ path: "id", message: "Invalid place id" }],
      });
  }

  const Body = z.object({
    userId: z.coerce.number().int().positive(), // 之後可改從 req.user.id 取得
    score: z.coerce.number().int().min(1).max(5),
  });
  const parsed = Body.safeParse(req.body);
  if (!parsed.success) {
    const errors = parsed.error.issues.map((e) => ({
      path: e.path.join("."),
      message: e.message,
    }));
    return res.status(400).json({ success: false, error: errors });
  }

  const { userId, score } = parsed.data;

  // 可選：若你不想允許重複，先查有沒有舊的
  const existing = await getUserRankForPlace(placeId, userId);
  if (existing) {
    return res
      .status(409)
      .json({
        success: false,
        error: [
          { path: "score", message: "Rank already exists for this user/place" },
        ],
        existing,
      });
  }

  const created = await createRank(placeId, userId, score);
  return res.status(201).json({ success: true, data: created });
});

/** PATCH /places/:id/ranks/:rankId  更新評分 */
router.patch("/:rankId", async (req, res) => {
  const placeId = Number(req.params.id);
  const rankId = Number(req.params.rankId);
  if (!Number.isInteger(placeId) || !Number.isInteger(rankId)) {
    return res
      .status(400)
      .json({
        success: false,
        error: [{ path: "ids", message: "Invalid ids" }],
      });
  }

  const Body = z.object({ score: z.coerce.number().int().min(1).max(5) });
  const parsed = Body.safeParse(req.body);
  if (!parsed.success) {
    const errors = parsed.error.issues.map((e) => ({
      path: e.path.join("."),
      message: e.message,
    }));
    return res.status(400).json({ success: false, error: errors });
  }

  const updated = await updateRank(placeId, rankId, parsed.data.score);
  if (!updated) {
    return res
      .status(404)
      .json({
        success: false,
        error: [{ path: "rankId", message: "Rank not found in this place" }],
      });
  }
  return res.json({ success: true, data: updated });
});

/** DELETE /places/:id/ranks/:rankId  刪除評分 */
router.delete("/:rankId", async (req, res) => {
  const placeId = Number(req.params.id);
  const rankId = Number(req.params.rankId);
  if (!Number.isInteger(placeId) || !Number.isInteger(rankId)) {
    return res
      .status(400)
      .json({
        success: false,
        error: [{ path: "ids", message: "Invalid ids" }],
      });
  }

  const ok = await deleteRank(placeId, rankId);
  if (!ok) {
    return res
      .status(404)
      .json({
        success: false,
        error: [{ path: "rankId", message: "Rank not found in this place" }],
      });
  }
  return res.json({ success: true, data: { id: rankId } });
});

export default router;
